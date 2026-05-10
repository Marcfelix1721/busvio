import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function geocodificar(place: string): Promise<{ lat: number; lon: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_KEY!
  const res = await fetch(
    `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(place)}&apiKey=${apiKey}`
  )
  const data = await res.json()
  if (data.features?.length > 0) {
    const { lat, lon } = data.features[0].properties
    return { lat, lon }
  }
  return null
}

async function calcularKmEntrePuntos(puntos: string[]): Promise<number> {
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_KEY!
  const coords: { lat: number; lon: number }[] = []

  for (const place of puntos) {
    const coord = await geocodificar(place)
    if (coord) coords.push(coord)
  }

  if (coords.length < 2) return 0

  const waypointsStr = coords.map(c => `${c.lat},${c.lon}`).join('|')
  const routeRes = await fetch(
    `https://api.geoapify.com/v1/routing?waypoints=${waypointsStr}&mode=drive&apiKey=${apiKey}`
  )
  const routeData = await routeRes.json()

  if (routeData.features?.length > 0) {
    return Math.round(routeData.features[0].properties.distance / 1000)
  }
  return 0
}

function calcularDias(fechaSalida: string, fechaRegreso: string | null): number {
  if (!fechaRegreso) return 1
  const inicio = new Date(fechaSalida)
  const fin = new Date(fechaRegreso)
  const diff = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, diff + 1)
}

function calcularHoras(horaSalida: string, horaRegreso: string | null, dias: number): number {
  if (!horaRegreso || !horaSalida) return dias * 8
  const [hS, mS] = horaSalida.split(':').map(Number)
  const [hR, mR] = horaRegreso.split(':').map(Number)
  const minutosS = hS * 60 + mS
  const minutosR = hR * 60 + mR
  let minutosTotales = (minutosR - minutosS) + (dias - 1) * 24 * 60
  if (minutosTotales <= 0) minutosTotales += 24 * 60
  return Math.max(1, Math.round(minutosTotales / 60))
}

// Detecta si el servicio toca una franja horaria
// Lógica: si la hora de salida o llegada cae dentro de la franja, aplica
// También aplica si el servicio "atraviesa" la franja (ej. servicio 9h-23h atraviesa nocturnidad 22h-6h)
function servicioTocaFranja(
  horaSalida: string | null,
  horaLlegada: string | null,
  franjaInicio: number,
  franjaFin: number
): boolean {
  if (!horaSalida) return false

  const [hS] = horaSalida.split(':').map(Number)
  const hL = horaLlegada ? Number(horaLlegada.split(':')[0]) : hS + 8

  // Franja normal (ej. 13–16): inicio < fin
  if (franjaInicio < franjaFin) {
    // El servicio toca la franja si hay solapamiento
    // Servicio va de hS a hL (puede cruzar medianoche si hL < hS)
    if (hS <= hL) {
      // Servicio dentro del mismo día
      return hS < franjaFin && hL > franjaInicio
    } else {
      // Servicio cruza medianoche: cubre hS–24 y 0–hL
      return hS < franjaFin || hL > franjaInicio
    }
  }

  // Franja nocturna que cruza medianoche (ej. 22–6): inicio > fin
  if (franjaInicio > franjaFin) {
    if (hS <= hL) {
      // Servicio dentro del mismo día: toca si llega después del inicio o sale antes del fin
      return hL > franjaInicio || hS < franjaFin
    } else {
      // Servicio también cruza medianoche: siempre toca
      return true
    }
  }

  return false
}

function calcularCosteVariable(
  variable: { tipo: string; valor: number; intervalo_km: number | null; franja_hora_inicio: number | null; franja_hora_fin: number | null },
  km: number, dias: number, horas: number,
  horaSalida: string | null, horaLlegada: string | null
): { coste: number; aplica: boolean } {
  switch (variable.tipo) {
    case 'per_km': return { coste: variable.valor * km, aplica: true }
    case 'per_day': return { coste: variable.valor * dias, aplica: true }
    case 'per_hour': return { coste: variable.valor * horas, aplica: true }
    case 'per_x_km':
      if (!variable.intervalo_km || variable.intervalo_km === 0) return { coste: 0, aplica: true }
      return { coste: (variable.valor / variable.intervalo_km) * km, aplica: true }
    case 'fixed': return { coste: variable.valor, aplica: true }
    case 'per_franja': {
      if (variable.franja_hora_inicio === null || variable.franja_hora_fin === null) return { coste: 0, aplica: false }
      const aplica = servicioTocaFranja(horaSalida, horaLlegada, variable.franja_hora_inicio, variable.franja_hora_fin)
      return { coste: aplica ? variable.valor : 0, aplica }
    }
    default: return { coste: 0, aplica: false }
  }
}

function pad(n: number) { return String(n).padStart(2, '0') }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      origin, destination, stops = [],
      trip_date, return_date, departure_time, return_time,
      company_id, quote_request_id, vehicle_id,
    } = body

    // 1. Dirección del garaje
    const { data: pricingSettings } = await supabase
      .from('pricing_settings')
      .select('garage_address')
      .eq('company_id', company_id)
      .single()

    const garageAddress = pricingSettings?.garage_address || null

    // 2. Km del servicio
    const kmServicio = await calcularKmEntrePuntos([origin, ...stops, destination])

    // 3. Km en vacío
    let kmVacioIda = 0
    let kmVacioVuelta = 0
    if (garageAddress) {
      kmVacioIda = await calcularKmEntrePuntos([garageAddress, origin])
      kmVacioVuelta = await calcularKmEntrePuntos([destination, garageAddress])
    }

    const kmTotal = kmServicio + kmVacioIda + kmVacioVuelta

    // 4. Días y horas
    const dias = calcularDias(trip_date, return_date)
    const horas = calcularHoras(departure_time, return_time, dias)

    // 5. Vehículo
    let vehiculo: any = null
    if (vehicle_id) {
      const { data: v } = await supabase
        .from('vehicles')
        .select('id, matricula, marca_modelo, consumo, precio_combustible, amortizacion_km, mantenimiento_km, seguro_dia')
        .eq('id', vehicle_id)
        .single()
      vehiculo = v
    }

    // 6. Costes del vehículo
    const costesVehiculo: { concepto: string; formula: string; coste: number }[] = []
    let totalVehiculo = 0

    if (vehiculo) {
      if (vehiculo.consumo && vehiculo.precio_combustible) {
        const coste = Math.round(kmTotal * (vehiculo.consumo / 100) * vehiculo.precio_combustible * 100) / 100
        costesVehiculo.push({ concepto: 'Combustible', formula: `${kmTotal} km × ${vehiculo.consumo}L/100km × ${vehiculo.precio_combustible}€/L`, coste })
        totalVehiculo += coste
      }
      if (vehiculo.amortizacion_km) {
        const coste = Math.round(kmTotal * vehiculo.amortizacion_km * 100) / 100
        costesVehiculo.push({ concepto: 'Amortización', formula: `${kmTotal} km × ${vehiculo.amortizacion_km}€/km`, coste })
        totalVehiculo += coste
      }
      if (vehiculo.mantenimiento_km) {
        const coste = Math.round(kmTotal * vehiculo.mantenimiento_km * 100) / 100
        costesVehiculo.push({ concepto: 'Mantenimiento', formula: `${kmTotal} km × ${vehiculo.mantenimiento_km}€/km`, coste })
        totalVehiculo += coste
      }
      if (vehiculo.seguro_dia) {
        const coste = Math.round(dias * vehiculo.seguro_dia * 100) / 100
        costesVehiculo.push({ concepto: 'Seguro', formula: `${dias} día${dias !== 1 ? 's' : ''} × ${vehiculo.seguro_dia}€/día`, coste })
        totalVehiculo += coste
      }

      if (quote_request_id) {
        await supabase.from('vehicle_cost_snapshots').upsert({
          quote_request_id, vehicle_id: vehiculo.id,
          matricula: vehiculo.matricula, marca_modelo: vehiculo.marca_modelo,
          consumo: vehiculo.consumo, precio_combustible: vehiculo.precio_combustible,
          amortizacion_km: vehiculo.amortizacion_km, mantenimiento_km: vehiculo.mantenimiento_km,
          seguro_dia: vehiculo.seguro_dia,
        }, { onConflict: 'quote_request_id' })
      }
    }

    // 7. Variables de coste
    const { data: variables } = await supabase
      .from('cost_variables')
      .select('*')
      .eq('company_id', company_id)
      .eq('activa', true)
      .order('orden')

    let overrides: Record<string, { activa: boolean; valor_custom: number | null }> = {}
    if (quote_request_id) {
      const { data: overrideData } = await supabase
        .from('quote_cost_overrides')
        .select('*')
        .eq('quote_request_id', quote_request_id)
      if (overrideData) {
        overrideData.forEach((o: any) => {
          overrides[o.cost_variable_id] = { activa: o.activa, valor_custom: o.valor_custom }
        })
      }
    }

    const desgloseVariables: {
      id: string; nombre: string; tipo: string; valor: number
      intervalo_km: number | null; franja_hora_inicio: number | null; franja_hora_fin: number | null
      obligatoria: boolean; activa: boolean; formula: string; coste: number
      franjaDetectada?: boolean
    }[] = []

    let totalVariables = 0

    for (const variable of variables || []) {
      const override = overrides[variable.id]

      // Si el gestor la desactivó manualmente → fuera
      if (!variable.obligatoria && override && !override.activa) {
        desgloseVariables.push({ ...variable, formula: '—', coste: 0, activa: false })
        continue
      }

      const valorFinal = override?.valor_custom ?? variable.valor

      const { coste, aplica } = calcularCosteVariable(
        { tipo: variable.tipo, valor: valorFinal, intervalo_km: variable.intervalo_km, franja_hora_inicio: variable.franja_hora_inicio, franja_hora_fin: variable.franja_hora_fin },
        kmTotal, dias, horas,
        departure_time || null, return_time || null
      )

      // Franja que no aplica (el servicio no toca esa franja) y el gestor no la ha forzado
      if (variable.tipo === 'per_franja' && !aplica && !override) {
        desgloseVariables.push({ ...variable, valor: valorFinal, formula: `Servicio fuera de la franja ${pad(variable.franja_hora_inicio)}:00–${pad(variable.franja_hora_fin)}:00`, coste: 0, activa: false, franjaDetectada: false })
        continue
      }

      const costeR = Math.round(coste * 100) / 100

      let formula = ''
      switch (variable.tipo) {
        case 'per_km': formula = `${kmTotal} km × ${valorFinal}€/km`; break
        case 'per_day': formula = `${dias} día${dias !== 1 ? 's' : ''} × ${valorFinal}€/día`; break
        case 'per_hour': formula = `${horas} horas × ${valorFinal}€/h`; break
        case 'per_x_km': formula = `${kmTotal} km / ${variable.intervalo_km?.toLocaleString()} km × ${valorFinal}€`; break
        case 'fixed': formula = `Fijo`; break
        case 'per_franja':
          formula = `Servicio cubre las ${pad(variable.franja_hora_inicio)}:00–${pad(variable.franja_hora_fin)}:00 → +${valorFinal}€`
          break
      }

      desgloseVariables.push({ ...variable, valor: valorFinal, formula, coste: costeR, activa: true, franjaDetectada: aplica })
      totalVariables += costeR
    }

    // 8. Totales
    const subtotal = Math.round((totalVehiculo + totalVariables) * 100) / 100

    const { data: settings } = await supabase
      .from('company_settings')
      .select('margen_beneficio, iva, precio_minimo_servicio')
      .eq('company_id', company_id)
      .single()

    const margen = settings?.margen_beneficio ?? 20
    const iva = settings?.iva ?? 10
    const precioMinimo = settings?.precio_minimo_servicio ?? 0

    const baseImponible = Math.round(subtotal * (1 + margen / 100) * 100) / 100
    const totalIva = Math.round(baseImponible * (iva / 100) * 100) / 100
    const precioFinal = Math.max(baseImponible + totalIva, precioMinimo)

    return NextResponse.json({
      km: kmTotal, kmServicio, kmVacioIda, kmVacioVuelta, garageAddress,
      dias, horas,
      vehiculo: vehiculo ? { marca_modelo: vehiculo.marca_modelo, matricula: vehiculo.matricula } : null,
      costesVehiculo,
      totalVehiculo: Math.round(totalVehiculo * 100) / 100,
      desgloseVariables,
      totalVariables: Math.round(totalVariables * 100) / 100,
      subtotal,
      margen,
      margenImporte: Math.round(subtotal * margen / 100 * 100) / 100,
      iva, baseImponible, totalIva,
      precio_final: Math.round(precioFinal * 100) / 100,
    })

  } catch (error: any) {
    console.error('Error calcular-ruta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}