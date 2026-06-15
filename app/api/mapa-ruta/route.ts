import { NextRequest, NextResponse } from "next/server"

async function geocode(address: string, apiKey: string) {
  const tryAddress = async (text: string) => {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text)}&limit=1&lang=es&apiKey=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.features?.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates
      return { lat, lon }
    }
    return null
  }

  let result = await tryAddress(address)
  if (result) return result

  const parts = address.split(",")
  for (let i = 1; i < parts.length; i++) {
    const simplified = parts.slice(i).join(",").trim()
    result = await tryAddress(simplified)
    if (result) return result
  }

  return null
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.searchParams.get("origin") ?? ""
  const destination = req.nextUrl.searchParams.get("destination") ?? ""
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_KEY ?? ""

  const [o, d] = await Promise.all([
    geocode(origin, apiKey),
    geocode(destination, apiKey),
  ])

  if (!o || !d) {
    return NextResponse.json({ error: "No se pudo geocodificar" }, { status: 400 })
  }

  // Línea de ruta REAL por carretera: Geoapify Routing → geometría simplificada.
  // Geoapify static maps NO acepta polyline codificada (devuelve 400) ni la lista
  // completa de coordenadas (una ruta de 70 km son ~1000 puntos → URL >18k chars → 400),
  // así que muestreamos a ~60 puntos: la forma real de la carretera se mantiene en un
  // mapa de 900×380 y la URL queda ~1,3k chars (probado, 200). Si el routing falla,
  // el mapa sigue saliendo con los 2 marcadores (sin línea).
  let geometryParam = ""
  // Puntos para el encuadre. Por defecto los 2 extremos; si hay ruta, TODA la geometría
  // (encuadrar sobre los extremos dejaba la ruta descentrada y tocando los bordes).
  let bboxPoints: number[][] = [[o.lon, o.lat], [d.lon, d.lat]]
  try {
    const routeRes = await fetch(
      `https://api.geoapify.com/v1/routing?waypoints=${o.lat},${o.lon}|${d.lat},${d.lon}&mode=drive&apiKey=${apiKey}`
    )
    if (routeRes.ok) {
      const routeData = await routeRes.json()
      const geom = routeData.features?.[0]?.geometry
      let coords: number[][] = []
      if (geom?.type === "LineString") coords = geom.coordinates
      else if (geom?.type === "MultiLineString") coords = geom.coordinates.flat()
      if (coords.length >= 2) {
        bboxPoints = coords
        const MAX_PUNTOS = 60
        const step = Math.max(1, Math.ceil(coords.length / MAX_PUNTOS))
        const simplificada = coords.filter((_, i) => i % step === 0 || i === coords.length - 1)
        const lista = simplificada.map(c => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join(",")
        geometryParam = `&geometry=polyline:${lista};linecolor:%231e3a5f;linewidth:4;lineopacity:0.85`
      }
    }
  } catch {
    // Routing caído → marcadores solo, sin romper el mapa.
  }

  // Bounding box (con margen) de los puntos → Geoapify centra y hace zoom solo (area=rect)
  // para abrazar la ruta. Margen 12% (mínimo absoluto para rutas muy cortas).
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
  for (const [lon, lat] of bboxPoints) {
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  const padLon = Math.max((maxLon - minLon) * 0.12, 0.004)
  const padLat = Math.max((maxLat - minLat) * 0.12, 0.004)
  const area = `area=rect:${(minLon - padLon).toFixed(5)},${(minLat - padLat).toFixed(5)},${(maxLon + padLon).toFixed(5)},${(maxLat + padLat).toFixed(5)}`

  const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=900&height=380&${area}&marker=lonlat:${o.lon},${o.lat};type:material;color:%23111827;size:medium|lonlat:${d.lon},${d.lat};type:material;color:%23ef4444;size:medium${geometryParam}&apiKey=${apiKey}`

  return NextResponse.json({ mapUrl, origin: o, destination: d })
}
