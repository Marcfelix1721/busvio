import { NextRequest, NextResponse } from "next/server"

async function geocode(address: string, apiKey: string) {
  // Intentar primero con la dirección completa
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

  // Primero intenta dirección completa
  let result = await tryAddress(address)
  if (result) return result

  // Si falla, intenta solo con la ciudad (última parte tras la coma)
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

  const midLon = (o.lon + d.lon) / 2
  const midLat = (o.lat + d.lat) / 2
  const diffLon = Math.abs(o.lon - d.lon)
  const diffLat = Math.abs(o.lat - d.lat)
  const maxDiff = Math.max(diffLon, diffLat)
  const zoom = maxDiff > 10 ? 5 : maxDiff > 5 ? 6 : maxDiff > 2 ? 7 : maxDiff > 1 ? 8 : 10

  // Línea conectando origen y destino
  const polyline = `polyline:${o.lon},${o.lat},${d.lon},${d.lat};linewidth:3;linecolor:%231e3a5f;lineopacity:0.8`

  const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=900&height=380&center=lonlat:${midLon},${midLat}&zoom=${zoom}&geometry=${encodeURIComponent(polyline)}&marker=lonlat:${o.lon},${o.lat};type:material;color:%23111827;size:medium|lonlat:${d.lon},${d.lat};type:material;color:%23ef4444;size:medium&apiKey=${apiKey}`

  return NextResponse.json({ mapUrl, origin: o, destination: d })
}