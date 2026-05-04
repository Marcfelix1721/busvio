import { NextRequest, NextResponse } from "next/server"

const GEOAPIFY_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_KEY!

async function geocode(address: string): Promise<[number, number] | null> {
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${GEOAPIFY_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  const feature = data.features?.[0]
  if (!feature) return null
  const [lon, lat] = feature.geometry.coordinates
  return [lat, lon]
}

export async function POST(req: NextRequest) {
  try {
    const { origin, destination, stops } = await req.json()

    if (!origin || !destination) {
      return NextResponse.json({ error: "Origen y destino son obligatorios" }, { status: 400 })
    }

    const originCoords = await geocode(origin)
    if (!originCoords) {
      return NextResponse.json({ error: `No se encontró: ${origin}` }, { status: 400 })
    }

    const destinationCoords = await geocode(destination)
    if (!destinationCoords) {
      return NextResponse.json({ error: `No se encontró: ${destination}` }, { status: 400 })
    }

    const waypointCoords: [number, number][] = []
    if (stops) {
      const stopList = stops.split(",").map((s: string) => s.trim()).filter(Boolean)
      for (const stop of stopList) {
        const coords = await geocode(stop)
        if (coords) waypointCoords.push(coords)
      }
    }

    const allPoints = [originCoords, ...waypointCoords, destinationCoords]
    const waypoints = allPoints.map(([lat, lon]) => `${lat},${lon}`).join("|")
    const routeUrl = `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&apiKey=${GEOAPIFY_KEY}`

    const routeRes = await fetch(routeUrl)
    const routeData = await routeRes.json()

    const feature = routeData.features?.[0]
    if (!feature) {
      return NextResponse.json({ error: "No se pudo calcular la ruta" }, { status: 400 })
    }

    const distanceKm = Math.round(feature.properties.distance / 1000)
    const durationMinutes = Math.round(feature.properties.time / 60)
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    const durationText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`

    return NextResponse.json({ distanceKm, durationText })
  } catch (err) {
    console.error("Error calcular-ruta:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}