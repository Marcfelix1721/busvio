import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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
    const {
      origin,
      destination,
      stops,
      company_id,
      vehicle_type,
      trip_date,
      departure_time,
      estimated_duration_minutes,
    } = await req.json()

    if (!origin || !destination) {
      return NextResponse.json({ error: "Origen y destino son obligatorios" }, { status: 400 })
    }

    // 1. CALCULAR KM CON GEOAPIFY
    const originCoords = await geocode(origin)
    if (!originCoords) return NextResponse.json({ error: `No se encontró: ${origin}` }, { status: 400 })

    const destinationCoords = await geocode(destination)
    if (!destinationCoords) return NextResponse.json({ error: `No se encontró: ${destination}` }, { status: 400 })

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
    if (!feature) return NextResponse.json({ error: "No se pudo calcular la ruta" }, { status: 400 })

    const distanceKm = Math.round(feature.properties.distance / 1000)
    const durationMinutes = Math.round(feature.properties.time / 60)
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    const durationText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`

    // 2. OBTENER AJUSTES DE LA EMPRESA
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )

    const { data: s } = await supabase
      .from("company_settings")
      .select("*")
      .eq("company_id", company_id)
      .maybeSingle()

    if (!s) {
      return NextResponse.json({ distanceKm, durationText, precioSugerido: null, desglose: null })
    }

    // 3. CALCULAR COSTE COMBUSTIBLE
    const consumo = vehicle_type === "minibus" ? s.consumo_minibus
      : vehicle_type === "autobus" ? s.consumo_autobus
      : s.consumo_autocar

    const coste_combustible = (distanceKm * consumo / 100) * s.precio_combustible

    // 4. CALCULAR COSTE VEHÍCULO
    const coste_vehiculo = distanceKm * (s.amortizacion_km + s.mantenimiento_km) + s.seguro_dia

    // 5. CALCULAR PEAJES
    const coste_peajes = distanceKm * s.peajes_nacional / 100

    // 6. CALCULAR COSTE CONDUCTOR
    const horas_totales = (estimated_duration_minutes ?? durationMinutes) / 60
    const coste_conductor_base = horas_totales * s.coste_hora_conductor

    // 7. CALCULAR PLUSES AUTOMÁTICOS
    let pluses = 0
    const desglose_pluses: string[] = []

    if (trip_date && departure_time) {
      const fecha = new Date(`${trip_date}T${departure_time}`)
      const diaSemana = fecha.getDay() // 0=domingo, 6=sábado
      const horaInicio = fecha.getHours()

      // Plus sábado
      if (diaSemana === 6) {
        pluses += s.plus_sabado
        desglose_pluses.push(`Plus sábado: ${s.plus_sabado}€`)
      }

      // Plus domingo
      if (diaSemana === 0) {
        pluses += s.plus_domingo
        desglose_pluses.push(`Plus domingo: ${s.plus_domingo}€`)
      }

      // Nocturnidad (salida entre 22h y 4:59h)
      if (horaInicio >= 22 || horaInicio < 5) {
        pluses += s.plus_nocturnidad
        desglose_pluses.push(`Nocturnidad: ${s.plus_nocturnidad}€`)
      }

      // Plus +11 horas
      if (horas_totales > 11) {
        pluses += s.plus_11horas
        desglose_pluses.push(`Plus +11h: ${s.plus_11horas}€`)
      }
    }

    // 8. COSTE TOTAL BASE
    const coste_base = coste_combustible + coste_vehiculo + coste_peajes + coste_conductor_base + pluses

    // 9. APLICAR MARGEN
    const precio_con_margen = coste_base * (1 + s.margen_beneficio / 100)

    // 10. APLICAR PRECIO MÍNIMO
    const precio_final = Math.max(Math.round(precio_con_margen), s.precio_minimo_servicio)

    // 11. DESGLOSE DETALLADO
    const desglose = {
      combustible: Math.round(coste_combustible),
      vehiculo: Math.round(coste_vehiculo),
      peajes: Math.round(coste_peajes),
      conductor: Math.round(coste_conductor_base),
      pluses: Math.round(pluses),
      desglose_pluses,
      subtotal: Math.round(coste_base),
      margen: Math.round(precio_con_margen - coste_base),
      total: precio_final,
    }

    return NextResponse.json({ distanceKm, durationText, precioSugerido: precio_final, desglose })

  } catch (err) {
    console.error("Error calcular-ruta:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}