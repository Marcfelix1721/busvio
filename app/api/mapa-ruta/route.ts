import { NextRequest, NextResponse } from "next/server"

type Punto = { lat: number; lon: number }

async function geocode(address: string, apiKey: string): Promise<Punto | null> {
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

  // Paradas intermedias (JSON array de direcciones). Las que no geocodifiquen se saltan.
  let stopsList: string[] = []
  try {
    const parsed = JSON.parse(req.nextUrl.searchParams.get("stops") ?? "[]")
    if (Array.isArray(parsed)) stopsList = parsed.filter((s: unknown) => typeof s === "string" && s.trim())
  } catch {
    // sin paradas
  }

  const [o, d] = await Promise.all([
    geocode(origin, apiKey),
    geocode(destination, apiKey),
  ])

  if (!o || !d) {
    return NextResponse.json({ error: "No se pudo geocodificar" }, { status: 400 })
  }

  // Geocodificar las paradas (en paralelo); descartar las que fallen.
  const geocodedStops = (await Promise.all(stopsList.map(s => geocode(s, apiKey))))
    .filter((p): p is Punto => p !== null)

  // Línea de ruta REAL por carretera, PASANDO POR LAS PARADAS:
  //   waypoints = origen | parada1 | … | destino.
  // Geoapify static maps NO acepta polyline codificada (400) ni la lista completa de
  // coordenadas (URL >18k → 400), así que muestreamos a ~60 puntos. Si el routing falla,
  // el mapa sigue saliendo con los 2 marcadores (sin línea).
  let geometryParam = ""
  // Puntos para el encuadre. Por defecto extremos + paradas; si hay ruta, TODA la geometría.
  let bboxPoints: number[][] = [
    [o.lon, o.lat],
    ...geocodedStops.map(s => [s.lon, s.lat]),
    [d.lon, d.lat],
  ]
  try {
    const waypoints = [o, ...geocodedStops, d].map(p => `${p.lat},${p.lon}`).join("|")
    const routeRes = await fetch(
      `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&apiKey=${apiKey}`
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
  // para abrazar la ruta (incluidas las paradas). Margen 12% (mínimo absoluto para rutas cortas).
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
