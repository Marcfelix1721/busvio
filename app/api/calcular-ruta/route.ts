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

function esDiaEspecial(tripDate: string, tipo: string): boolean {
  const fecha = new Date(tripDate)
  const diaSemana = fecha.getDay() // 0=dom, 1=lun, ..., 6=sab
  if (tipo === 'sabado') return diaSemana === 6
  if (tipo === 'domingo') return diaSemana === 0
  // festivo_nacional y festivo_local se gestionan manualmente por el gestor
  return false
}

function servicioTocaFranja(
  horaSalida: string | null,
  horaLlegada: string | null,
  franjaInicio: number,
  franjaFin: number
): boolean {
  if (!horaSalida) return false
  const [hS] = horaSalida.split(':').map(Number)
  const hL = horaLlegada ? Number(horaLlegada.split(':')[0]) : hS + 8

  if (franjaInicio < franjaFin) {
    if (hS <= hL) return hS < franjaFin && hL > franjaInicio
    else return hS < franjaFin || hL > franjaInicio
  }
  if (franjaInicio > franjaFin) {
    if (hS <= hL) return hL > franjaInicio || hS < franjaFin
    else return true
  }
  return false
}

function calcularCosteVariable(
  variable: {
    tipo: string; valor: number; intervalo_km: number | null
    franja_hora_inicio: number | null; franja_hora_fin: number | null
    condicion_tipo: string | null; condicion_valor: any
  },
  km: number, dias: number, horas: number,
  horaSalida: string | null, horaLlegada: string | null,
  tripDate: string | null, subtotalPrevio: number
): { coste: number; aplica: boolean } {

  // Primero evaluar si la condición de activación se cumple
  if (variable.condicion_tipo && variable.condicion_tipo !== 'siempre') {
    switch (variable.condicion_tipo) {
      case 'franja':
        if (variable.condicion_valor?.inicio !== undefined && variable.condicion_valor?.fin !== undefined) {
          const toca = servicioTocaFranja(horaSalida, horaLlegada, variable.condicion_valor.inicio, variable.condicion_valor.fin)
          if (!toca) return { coste: 0, aplica: false }
        }
        break
      case 'umbral_horas':
        if (variable.condicion_valor?.min !== undefined && horas < variable.condicion_valor.min) {
          return { coste: 0, aplica: false }
        }
        break
      case 'umbral_km':
        if (variable.condicion_valor?.min !== undefined && km < variable.condicion_valor.min) {
          return { coste: 0, aplica: false }
        }
        break
      case 'dia_especial':
        if (tripDate && variable.condicion_valor?.dia) {
          const esEspecial = esDiaEspecial(tripDate, variable.condicion_valor.dia)
          if (!esEspecial) return { coste: 0, aplica: false }
        }
        break
    }
  }

  // Calcular el coste según el tipo
  switch (variable.tipo) {
    case 'per_km': return { coste: variable.valor * km, aplica: true }
    case 'per_day': return { coste: variable.valor * dias, aplica: true }
    case 'per_hour': return { coste: variable.valor * horas, aplica: true }
    case 'per_x_km':
      if (!variable.intervalo_km || variable.intervalo_km === 0) return { coste: 0, aplica: true }
      return { coste: (variable.valor / variable.intervalo_km) * km, aplica: true }
    case 'fixed': return { coste: variable.valor, aplica: true }
    case 'percent': return { coste: subtotalPrevio * (variable.valor / 100), aplica: true }
    case 'per_franja': {
      if (variable.franja_hora_inicio === null || variable.franja_hora_fin === null) return { coste: 0, aplica: false }
      const toca = servicioTocaFranja(horaSalida, horaLlegada, variable.franja_hora_inicio, variable.franja_hora_fin)
      return { coste: toca ? variable.valor : 0, aplica: toca }
    }
    default: return { coste: 0, aplica: false }
  }
}

function pad(n: number | null) { return n !== null ? String(n).padStart(2, '0') : '00' }

function construirFormula(variable: any, valorFinal: number, kmTotal: number, dias: number, horas: number): string {
  switch (variable.tipo) {
    case 'per_km': return `${kmTotal} km × ${valorFinal}€/km`
    case 'per_day': return `${dias} día${dias !== 1 ? 's' : ''} × ${valorFinal}€/día`
    case 'per_hour': return `${horas} horas × ${valorFinal}€/h`
    case 'per_x_km': return `${kmTotal} km / ${variable.intervalo_km?.toLocaleString()} km × ${valorFinal}€`
    case 'fixed': return `Fijo`
    case 'percent': return `${valorFinal}% sobre subtotal`
    case 'per_franja': return `Cubre ${pad(variable.franja_hora_inicio)}:00–${pad(variable.franja_hora_fin)}:00 → +${valorFinal}€`
    default: return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      origin, destination, stops = [],
      trip_date, return_date, departure_time, return_time,
      company_id, quote_request_id, vehicle_id,
    } = body

    // 1. Garaje
    const { data: pricingSettings } = await supabase
      .from('pricing_settings').select('garage_address').eq('company_id', company_id).single()
    const garageAddress = pricingSettings?.garage_address || null

    // 2. Km servicio
    const kmServicio = await calcularKmEntrePuntos([origin, ...stops, destination])

    // 3. Km vacío
    let kmVacioIda = 0, kmVacioVuelta = 0
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
      const { data: v } = await supabase.from('vehicles')
        .select('id, matricula, marca_modelo, consumo, precio_combustible, amortizacion_km, mantenimiento_km, seguro_dia')
        .eq('id', vehicle_id).single()
      vehiculo = v
    }

    // 6. Costes vehículo
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

    // 7. Variables de coste + grupos de exclusión
    const { data: variables } = await supabase
      .from('cost_variables').select('*')
      .eq('company_id', company_id).eq('activa', true).order('orden')

    const { data: grupos } = await supabase
      .from('exclusion_groups').select('*').eq('company_id', company_id)

    const gruposMap: Record<string, { nombre: string; modo: 'max' | 'sum' }> = {}
    for (const g of grupos || []) gruposMap[g.id] = { nombre: g.nombre, modo: g.modo }

    let overrides: Record<string, { activa: boolean; valor_custom: number | null }> = {}
    if (quote_request_id) {
      const { data: overrideData } = await supabase
        .from('quote_cost_overrides').select('*').eq('quote_request_id', quote_request_id)
      if (overrideData) {
        overrideData.forEach((o: any) => {
          overrides[o.cost_variable_id] = { activa: o.activa, valor_custom: o.valor_custom }
        })
      }
    }

    // Paso A — calcular coste candidato para cada variable
    type VariableCalculada = {
      id: string; nombre: string; tipo: string; valor: number
      intervalo_km: number | null; franja_hora_inicio: number | null; franja_hora_fin: number | null
      condicion_tipo: string | null; condicion_valor: any
      grupo_exclusion_id: string | null; prioridad: number
      obligatoria: boolean; activa: boolean; formula: string; coste: number
      excluida?: boolean; motivo_exclusion?: string
    }

    const candidatas: VariableCalculada[] = []

    for (const variable of variables || []) {
      const override = overrides[variable.id]

      // Gestor la desactivó manualmente
      if (!variable.obligatoria && override && !override.activa) {
        candidatas.push({ ...variable, formula: '—', coste: 0, activa: false, excluida: false })
        continue
      }

      const valorFinal = override?.valor_custom ?? variable.valor
      const subtotalPrevio = totalVehiculo // para el tipo percent

      const { coste, aplica } = calcularCosteVariable(
        {
          tipo: variable.tipo, valor: valorFinal,
          intervalo_km: variable.intervalo_km,
          franja_hora_inicio: variable.franja_hora_inicio,
          franja_hora_fin: variable.franja_hora_fin,
          condicion_tipo: variable.condicion_tipo,
          condicion_valor: variable.condicion_valor,
        },
        kmTotal, dias, horas,
        departure_time || null, return_time || null,
        trip_date || null, subtotalPrevio
      )

      if (!aplica) {
        const motivo = variable.condicion_tipo === 'franja' || variable.tipo === 'per_franja'
          ? `Fuera de franja ${pad(variable.franja_hora_inicio)}:00–${pad(variable.franja_hora_fin)}:00`
          : `Condición no cumplida`
        candidatas.push({ ...variable, valor: valorFinal, formula: motivo, coste: 0, activa: false, excluida: false })
        continue
      }

      const costeR = Math.round(coste * 100) / 100
      const formula = construirFormula(variable, valorFinal, kmTotal, dias, horas)

      candidatas.push({
        ...variable, valor: valorFinal, formula, coste: costeR,
        activa: true, excluida: false,
      })
    }

    // Paso B — aplicar grupos de exclusión
    // Agrupar candidatas activas por grupo
    const porGrupo: Record<string, VariableCalculada[]> = {}
    for (const v of candidatas) {
      if (!v.activa || !v.grupo_exclusion_id) continue
      if (!porGrupo[v.grupo_exclusion_id]) porGrupo[v.grupo_exclusion_id] = []
      porGrupo[v.grupo_exclusion_id].push(v)
    }

    // Para cada grupo aplicar la lógica
    for (const grupoId of Object.keys(porGrupo)) {
      const grupo = gruposMap[grupoId]
      if (!grupo) continue
      const vars = porGrupo[grupoId]

      if (grupo.modo === 'max' && vars.length > 1) {
        // Ordenar por prioridad desc, luego por coste desc
        vars.sort((a, b) => {
          if (b.prioridad !== a.prioridad) return b.prioridad - a.prioridad
          return b.coste - a.coste
        })
        // La primera gana, el resto se excluyen
        const ganadora = vars[0]
        for (let i = 1; i < vars.length; i++) {
          const idx = candidatas.findIndex(c => c.id === vars[i].id)
          if (idx !== -1) {
            candidatas[idx].activa = false
            candidatas[idx].excluida = true
            candidatas[idx].coste = 0
            candidatas[idx].motivo_exclusion = `Excluida por grupo "${grupo.nombre}" — aplica "${ganadora.nombre}"`
            candidatas[idx].formula = `Excluida — grupo "${grupo.nombre}" solo aplica el mayor`
          }
        }
      }
      // modo 'sum' → no hacer nada, se suman todas
    }

    // Paso C — construir desglose final y sumar
    const desgloseVariables = candidatas.map(v => ({
      id: v.id,
      nombre: v.nombre,
      tipo: v.tipo,
      valor: v.valor,
      intervalo_km: v.intervalo_km,
      franja_hora_inicio: v.franja_hora_inicio,
      franja_hora_fin: v.franja_hora_fin,
      condicion_tipo: v.condicion_tipo,
      grupo_exclusion_id: v.grupo_exclusion_id,
      obligatoria: v.obligatoria,
      activa: v.activa,
      excluida: v.excluida ?? false,
      motivo_exclusion: v.motivo_exclusion,
      formula: v.formula,
      coste: v.coste,
    }))

    const totalVariables = Math.round(
      desgloseVariables.filter(v => v.activa).reduce((s, v) => s + v.coste, 0) * 100
    ) / 100

    // 8. Totales
    const subtotal = Math.round((totalVehiculo + totalVariables) * 100) / 100

    const { data: settings } = await supabase
      .from('company_settings').select('margen_beneficio, iva, precio_minimo_servicio')
      .eq('company_id', company_id).single()

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
      totalVariables,
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