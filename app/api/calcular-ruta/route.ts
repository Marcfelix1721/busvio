import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function calcularKmGeoapify(origin: string, destination: string, stops: string[]): Promise<number> {
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_KEY!
  const waypoints = [origin, ...stops, destination]
  const coords: { lat: number; lon: number }[] = []

  for (const place of waypoints) {
    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(place)}&apiKey=${apiKey}`
    )
    const data = await res.json()
    if (data.features?.length > 0) {
      const { lat, lon } = data.features[0].properties
      coords.push({ lat, lon })
    }
  }

  if (coords.length < 2) return 0

  const waypointsStr = coords.map(c => `${c.lat},${c.lon}`).join('|')
  const routeRes = await fetch(
    `https://api.geoapify.com/v1/routing?waypoints=${waypointsStr}&mode=drive&apiKey=${apiKey}`
  )
  const routeData = await routeRes.json()

  if (routeData.features?.length > 0) {
    const distanceM = routeData.features[0].properties.distance
    return Math.round(distanceM / 1000)
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

function calcularCosteVariable(
  variable: { tipo: string; valor: number; intervalo_km: number | null },
  km: number,
  dias: number,
  horas: number
): number {
  switch (variable.tipo) {
    case 'per_km': return variable.valor * km
    case 'per_day': return variable.valor * dias
    case 'per_hour': return variable.valor * horas
    case 'per_x_km':
      if (!variable.intervalo_km || variable.intervalo_km === 0) return 0
      return (variable.valor / variable.intervalo_km) * km
    case 'fixed': return variable.valor
    default: return 0
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      origin,
      destination,
      stops = [],
      trip_date,
      return_date,
      departure_time,
      return_time,
      company_id,
      quote_request_id,
      vehicle_id,
    } = body

    // 1. Calcular km reales
    const km = await calcularKmGeoapify(origin, destination, stops)

    // 2. Calcular días y horas
    const dias = calcularDias(trip_date, return_date)
    const horas = calcularHoras(departure_time, return_time, dias)

    // 3. Obtener datos del vehículo si hay uno asignado
    let vehiculo: any = null
    if (vehicle_id) {
      const { data: v } = await supabase
        .from('vehicles')
        .select('id, matricula, marca_modelo, consumo, precio_combustible, amortizacion_km, mantenimiento_km, seguro_dia')
        .eq('id', vehicle_id)
        .single()
      vehiculo = v
    }

    // 4. Calcular costes del vehículo
    const costesVehiculo: {
      concepto: string
      formula: string
      coste: number
    }[] = []

    let totalVehiculo = 0

    if (vehiculo) {
      // Combustible: km × (consumo/100) × precio_combustible
      if (vehiculo.consumo && vehiculo.precio_combustible) {
        const coste = km * (vehiculo.consumo / 100) * vehiculo.precio_combustible
        const costeR = Math.round(coste * 100) / 100
        costesVehiculo.push({
          concepto: 'Combustible',
          formula: `${km} km × ${vehiculo.consumo}L/100km × ${vehiculo.precio_combustible}€/L`,
          coste: costeR,
        })
        totalVehiculo += costeR
      }

      // Amortización: km × €/km
      if (vehiculo.amortizacion_km) {
        const coste = km * vehiculo.amortizacion_km
        const costeR = Math.round(coste * 100) / 100
        costesVehiculo.push({
          concepto: 'Amortización',
          formula: `${km} km × ${vehiculo.amortizacion_km}€/km`,
          coste: costeR,
        })
        totalVehiculo += costeR
      }

      // Mantenimiento: km × €/km
      if (vehiculo.mantenimiento_km) {
        const coste = km * vehiculo.mantenimiento_km
        const costeR = Math.round(coste * 100) / 100
        costesVehiculo.push({
          concepto: 'Mantenimiento',
          formula: `${km} km × ${vehiculo.mantenimiento_km}€/km`,
          coste: costeR,
        })
        totalVehiculo += costeR
      }

      // Seguro: días × €/día
      if (vehiculo.seguro_dia) {
        const coste = dias * vehiculo.seguro_dia
        const costeR = Math.round(coste * 100) / 100
        costesVehiculo.push({
          concepto: 'Seguro',
          formula: `${dias} día${dias !== 1 ? 's' : ''} × ${vehiculo.seguro_dia}€/día`,
          coste: costeR,
        })
        totalVehiculo += costeR
      }

      // Guardar snapshot del vehículo en BD
      if (quote_request_id) {
        await supabase.from('vehicle_cost_snapshots').upsert({
          quote_request_id,
          vehicle_id: vehiculo.id,
          matricula: vehiculo.matricula,
          marca_modelo: vehiculo.marca_modelo,
          consumo: vehiculo.consumo,
          precio_combustible: vehiculo.precio_combustible,
          amortizacion_km: vehiculo.amortizacion_km,
          mantenimiento_km: vehiculo.mantenimiento_km,
          seguro_dia: vehiculo.seguro_dia,
        }, { onConflict: 'quote_request_id' })
      }
    }

    // 5. Obtener variables de coste de la empresa
    const { data: variables } = await supabase
      .from('cost_variables')
      .select('*')
      .eq('company_id', company_id)
      .eq('activa', true)
      .order('orden')

    // 6. Obtener overrides del presupuesto
    let overrides: Record<string, { activa: boolean; valor_custom: number | null }> = {}
    if (quote_request_id) {
      const { data: overrideData } = await supabase
        .from('quote_cost_overrides')
        .select('*')
        .eq('quote_request_id', quote_request_id)

      if (overrideData) {
        overrideData.forEach((o: any) => {
          overrides[o.cost_variable_id] = {
            activa: o.activa,
            valor_custom: o.valor_custom,
          }
        })
      }
    }

    // 7. Calcular variables de empresa
    const desgloseVariables: {
      id: string
      nombre: string
      tipo: string
      valor: number
      intervalo_km: number | null
      obligatoria: boolean
      activa: boolean
      formula: string
      coste: number
    }[] = []

    let totalVariables = 0

    for (const variable of variables || []) {
      const override = overrides[variable.id]
      if (!variable.obligatoria && override && !override.activa) {
        desgloseVariables.push({ ...variable, formula: '—', coste: 0, activa: false })
        continue
      }

      const valorFinal = override?.valor_custom ?? variable.valor
      const coste = calcularCosteVariable(
        { tipo: variable.tipo, valor: valorFinal, intervalo_km: variable.intervalo_km },
        km, dias, horas
      )
      const costeR = Math.round(coste * 100) / 100

      // Generar fórmula legible
      let formula = ''
      switch (variable.tipo) {
        case 'per_km': formula = `${km} km × ${valorFinal}€/km`; break
        case 'per_day': formula = `${dias} día${dias !== 1 ? 's' : ''} × ${valorFinal}€/día`; break
        case 'per_hour': formula = `${horas} horas × ${valorFinal}€/h`; break
        case 'per_x_km': formula = `${km} km / ${variable.intervalo_km?.toLocaleString()} km × ${valorFinal}€`; break
        case 'fixed': formula = `Fijo`; break
      }

      desgloseVariables.push({ ...variable, valor: valorFinal, formula, coste: costeR, activa: true })
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
      km,
      dias,
      horas,
      vehiculo: vehiculo ? {
        marca_modelo: vehiculo.marca_modelo,
        matricula: vehiculo.matricula,
      } : null,
      costesVehiculo,
      totalVehiculo: Math.round(totalVehiculo * 100) / 100,
      desgloseVariables,
      totalVariables: Math.round(totalVariables * 100) / 100,
      subtotal,
      margen,
      margenImporte: Math.round(subtotal * margen / 100 * 100) / 100,
      iva,
      baseImponible,
      totalIva,
      precio_final: Math.round(precioFinal * 100) / 100,
    })

  } catch (error: any) {
    console.error('Error calcular-ruta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}