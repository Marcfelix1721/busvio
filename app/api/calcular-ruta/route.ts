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
      vehicle_id,
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
      const stopList = Array.isArray(stops)
        ? stops
        : stops.split(",").map((s: string) => s.trim()).filter(Boolean)
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

    // 3. OBTENER COSTES DEL VEHÍCULO ASIGNADO (si existe)
    let vehicleData: any = null
    if (vehicle_id) {
      const { data } = await supabase
        .from("vehicles")
        .select("consumo, precio_combustible, amortizacion_km, mantenimiento_km, seguro_dia, tipo")
        .eq("id", vehicle_id)
        .maybeSingle()
      vehicleData = data
    }

    // Tipo de vehículo — del vehículo asignado o del campo vehicle_type
    const tipoVehiculo = vehicleData?.tipo ?? vehicle_type

    // Consumo — del vehículo asignado o fallback global por tipo
    const consumo = vehicleData?.consumo ?? (
      tipoVehiculo === "minibus" ? s.consumo_minibus
      : tipoVehiculo === "autobus" ? s.consumo_autobus
      : s.consumo_autocar
    )

    // Precio combustible — del vehículo asignado o fallback global
    const precio_combustible = vehicleData?.precio_combustible ?? s.precio_combustible

    // Amortización, mantenimiento y seguro — del vehículo asignado o fallback global
    const amortizacion_km = vehicleData?.amortizacion_km ?? s.amortizacion_km
    const mantenimiento_km = vehicleData?.mantenimiento_km ?? s.mantenimiento_km
    const seguro_dia = vehicleData?.seguro_dia ?? s.seguro_dia

    // 4. COMBUSTIBLE
    const coste_combustible = (distanceKm * consumo / 100) * precio_combustible

    // 5. VEHÍCULO
    const coste_vehiculo = distanceKm * (amortizacion_km + mantenimiento_km) + seguro_dia

    // 6. PEAJES
    const coste_peajes = distanceKm * s.peajes_nacional / 100

    // 7. CONDUCTOR
    const horas_totales = (estimated_duration_minutes ?? durationMinutes) / 60
    const coste_conductor_base = horas_totales * s.coste_hora_conductor

    // 8. PLUSES AUTOMÁTICOS
    let pluses = 0
    const desglose_pluses: string[] = []

    if (trip_date && departure_time) {
      const fecha = new Date(`${trip_date}T${departure_time}`)
      const diaSemana = fecha.getDay()
      const horaInicio = fecha.getHours()

      if (diaSemana === 6) {
        pluses += s.plus_sabado
        desglose_pluses.push(`Plus sábado: ${s.plus_sabado}€`)
      }
      if (diaSemana === 0) {
        pluses += s.plus_domingo
        desglose_pluses.push(`Plus domingo: ${s.plus_domingo}€`)
      }
      if (horaInicio >= 22 || horaInicio < 5) {
        pluses += s.plus_nocturnidad
        desglose_pluses.push(`Nocturnidad: ${s.plus_nocturnidad}€`)
      }
      if (horas_totales > 11) {
        pluses += s.plus_11horas
        desglose_pluses.push(`Plus +11h: ${s.plus_11horas}€`)
      }
    }

    // 9. COSTE BASE
    const coste_base = coste_combustible + coste_vehiculo + coste_peajes + coste_conductor_base + pluses

    // 10. MARGEN
    const precio_sin_iva = coste_base * (1 + s.margen_beneficio / 100)

    // 11. IVA
    const iva_porcentaje = s.iva ?? 21
    const importe_iva = precio_sin_iva * (iva_porcentaje / 100)
    const precio_con_iva = precio_sin_iva + importe_iva

    // 12. PRECIO MÍNIMO
    const precio_final_sin_iva = Math.max(Math.round(precio_sin_iva), s.precio_minimo_servicio)
    const precio_final_con_iva = Math.round(precio_final_sin_iva * (1 + iva_porcentaje / 100))

    const desglose = {
      combustible: Math.round(coste_combustible),
      vehiculo: Math.round(coste_vehiculo),
      peajes: Math.round(coste_peajes),
      conductor: Math.round(coste_conductor_base),
      pluses: Math.round(pluses),
      desglose_pluses,
      subtotal: Math.round(coste_base),
      margen: Math.round(precio_sin_iva - coste_base),
      base_imponible: precio_final_sin_iva,
      iva_porcentaje,
      importe_iva: Math.round(precio_final_sin_iva * iva_porcentaje / 100),
      total: precio_final_con_iva,
      vehiculo_nombre: vehicleData ? null : null,
      usando_costes_propios: !!vehicleData,
    }

    return NextResponse.json({ distanceKm, durationText, precioSugerido: precio_final_con_iva, desglose })

  } catch (err) {
    console.error("Error calcular-ruta:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}