'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { AlertTriangle, RefreshCw, Loader2, MapPin, Calendar, Clock, Warehouse, Bus, Settings, Wallet, Check, Mail } from 'lucide-react'
import { COLORS, RADIUS, FONT_BODY, FONT_DISPLAY } from '@/lib/dashboard-ui'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type CostoVehiculo = {
  concepto: string
  formula: string
  coste: number
}

type DesgloseVariable = {
  id: string
  nombre: string
  tipo: string
  valor: number
  intervalo_km: number | null
  obligatoria: boolean
  activa: boolean
  formula: string
  coste: number
}

type CalcResult = {
  km: number
  kmServicio: number
  kmVacioIda: number
  kmVacioVuelta: number
  garageAddress: string | null
  dias: number
  horas: number
  vehiculo: { marca_modelo: string; matricula: string } | null
  costesVehiculo: CostoVehiculo[]
  totalVehiculo: number
  desgloseVariables: DesgloseVariable[]
  totalVariables: number
  subtotal: number
  margen: number
  margenImporte: number
  iva: number
  baseImponible: number
  totalIva: number
  precio_final: number
}

type Props = {
  quote: any
  companyId: string
  vehicles: any[]
  busyVehicleIds?: string[]
  companyName?: string | null
}

const ESTADOS = [
  { value: 'nuevo',       label: 'Nuevo',       color: COLORS.textMuted, bg: '#eef1f4' },
  { value: 'en_revision', label: 'En revisión', color: COLORS.warning,   bg: COLORS.warningSoft },
  { value: 'enviado',     label: 'Enviado',     color: COLORS.navy,      bg: COLORS.navySoft },
  { value: 'aceptado',    label: 'Aceptado',    color: COLORS.teal,      bg: COLORS.tealSoft },
  { value: 'rechazado',   label: 'Rechazado',   color: COLORS.danger,    bg: COLORS.dangerSoft },
  { value: 'cancelado',   label: 'Cancelado',   color: COLORS.textFaint, bg: COLORS.surfaceAlt },
]

// --- Generación del PDF del presupuesto en el cliente (jspdf) ---
// Se construye a partir de calcResult para que el PDF refleje EXACTAMENTE el
// desglose que la empresa ve en pantalla. Devuelve base64 crudo (sin el prefijo
// "data:...;base64,"), que es lo que Resend espera en attachments[].content.
// jspdf se importa dinámicamente para no engordar el bundle inicial del dashboard.
async function generarPresupuestoPdf(params: {
  numeroPresupuesto: string
  companyName: string
  quote: any
  calc: CalcResult
  precioFinal: number
  iva: number
  baseImponible: number
  importeIva: number
}): Promise<string> {
  const { numeroPresupuesto, companyName, quote, calc, precioFinal, iva, baseImponible, importeIva } = params
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  const NAVY: [number, number, number] = [30, 58, 95]   // #1e3a5f
  const TEAL: [number, number, number] = [8, 145, 178]  // #0891b2
  const DARK: [number, number, number] = [17, 24, 39]
  const MUTED: [number, number, number] = [107, 114, 128]
  const LINE: [number, number, number] = [226, 232, 240]

  const M = 40
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const f = (n: number) => `${n.toFixed(2)} €`
  let y = 0

  const ensure = (space: number) => {
    if (y + space > H - 60) { doc.addPage(); y = 48 }
  }

  // Cabecera (banda navy con marca de la empresa)
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 92, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20)
  doc.text(companyName, M, 42)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text('Gestión de transporte discrecional', M, 60)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text(`Presupuesto Nº ${numeroPresupuesto}`, M, 80)
  const fechaEmision = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(fechaEmision, W - M, 42, { align: 'right' })
  y = 122

  const sectionTitle = (label: string) => {
    ensure(30)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...NAVY)
    doc.text(label.toUpperCase(), M, y); y += 7
    doc.setDrawColor(...LINE); doc.line(M, y, W - M, y); y += 16
  }
  const row = (label: string, value: string, opts?: { color?: [number, number, number]; bold?: boolean }) => {
    ensure(18)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...MUTED)
    doc.text(label, M, y)
    doc.setTextColor(...(opts?.color ?? DARK)); doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
    doc.text(value, W - M, y, { align: 'right' })
    y += 16
  }

  // Cliente
  sectionTitle('Cliente')
  row('Nombre', quote.requester_name || '—')
  row('Email', quote.requester_email || '—')
  row('Teléfono', quote.requester_phone || '—')
  y += 8

  // Datos del viaje
  const stops: string[] = (() => { try { return JSON.parse(quote.stops || '[]') } catch { return [] } })()
  const fechaViaje = quote.trip_date
    ? new Date(quote.trip_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'
  sectionTitle('Datos del viaje')
  row('Origen', quote.origin || '—')
  stops.forEach((s, i) => row(`Parada ${i + 1}`, s))
  row('Destino', quote.destination || '—')
  row('Fecha', fechaViaje)
  if (quote.departure_time) row('Hora de salida', quote.departure_time)
  row('Pasajeros', String(quote.passengers ?? '—'))
  row('Kilómetros', `${calc.km} km`)
  row('Duración', `${calc.dias} día${calc.dias !== 1 ? 's' : ''} · ${calc.horas} h`)
  y += 8

  // Vehículo
  if (calc.vehiculo) {
    sectionTitle('Vehículo')
    row('Modelo', `${calc.vehiculo.marca_modelo} · ${calc.vehiculo.matricula}`)
    y += 8
  }

  // Costes del vehículo
  if (calc.costesVehiculo?.length) {
    sectionTitle('Costes del vehículo')
    calc.costesVehiculo.forEach(c => row(c.concepto, f(c.coste)))
    row('Subtotal vehículo', f(calc.totalVehiculo), { color: NAVY, bold: true })
    y += 8
  }

  // Variables de la empresa (solo las activas, igual que en pantalla)
  const variablesActivas = calc.desgloseVariables?.filter(v => v.activa) ?? []
  if (variablesActivas.length) {
    sectionTitle('Variables de la empresa')
    variablesActivas.forEach(v => row(`${v.nombre}${v.obligatoria ? ' (fija)' : ' (opcional)'}`, f(v.coste)))
    row('Subtotal variables', f(calc.totalVariables), { bold: true })
    y += 8
  }

  // Resumen (base e IVA recalculados desde el precio final editado)
  sectionTitle('Resumen')
  row('Subtotal costes', f(calc.subtotal))
  row(`Margen (${calc.margen}%)`, `+${f(calc.margenImporte)}`, { color: TEAL })
  row('Base imponible', f(baseImponible))
  row(`IVA (${iva}%)`, `+${f(importeIva)}`)
  y += 6

  // Total
  ensure(46)
  doc.setFillColor(...NAVY); doc.rect(M, y, W - 2 * M, 36, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  doc.text('TOTAL (IVA incl.)', M + 16, y + 23)
  doc.setFontSize(16)
  doc.text(f(precioFinal), W - M - 16, y + 23, { align: 'right' })
  y += 60

  // Pie
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
  doc.text(`${companyName} — Presupuesto con validez de 30 días`, M, H - 40)

  return doc.output('datauristring').split(',')[1]
}

export default function QuoteActions({ quote, companyId, vehicles, busyVehicleIds = [], companyName }: Props) {
  const busyVehicles = new Set(busyVehicleIds)
  const [estado, setEstado] = useState(quote.status)
  const [vehicleId, setVehicleId] = useState(quote.vehicle_id || '')
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [precioFinal, setPrecioFinal] = useState<string>(quote.final_price ? String(quote.final_price) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sending, setSending] = useState(false)
  const [nota, setNota] = useState(quote.internal_notes || '')

  const f = (n: number) => n.toFixed(2) + '€'

  // DEUDA TÉCNICA (temporal): el número de presupuesto se deriva del id.
  // En el futuro será un correlativo secuencial por empresa (columna en BD +
  // contador). Único punto a reemplazar cuando llegue esa tarea.
  const numeroPresupuesto = String(quote.id).slice(0, 8).toUpperCase()

  const s = {
    card: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, padding: 20, marginBottom: 14, fontFamily: FONT_BODY },
    label: { fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' },
    select: { width: '100%', height: 36, border: `1px solid ${COLORS.borderStrong}`, borderRadius: RADIUS.sm, padding: '0 12px', fontSize: 13, background: COLORS.surfaceAlt, fontFamily: FONT_BODY, color: COLORS.text, boxSizing: 'border-box' as const },
    input: { width: '100%', height: 36, border: `1px solid ${COLORS.borderStrong}`, borderRadius: RADIUS.sm, padding: '0 12px', fontSize: 13, background: COLORS.surfaceAlt, fontFamily: FONT_BODY, color: COLORS.text, boxSizing: 'border-box' as const },
    btn: { width: '100%', height: 40, background: COLORS.navy, color: COLORS.onDark, border: 'none', borderRadius: RADIUS.sm, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 },
    btnSecondary: { width: '100%', height: 40, background: COLORS.navySoft, color: COLORS.navy, border: 'none', borderRadius: RADIUS.sm, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 },
    sectionTitle: { fontSize: 10, fontWeight: 700, color: COLORS.textFaint, textTransform: 'uppercase' as const, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 },
    divider: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
    dividerLine: { height: 1, flex: 1, background: COLORS.border },
  }

  async function calcular() {
    setLoading(true)
    try {
      const stops = (() => { try { return JSON.parse(quote.stops || '[]') } catch { return [] } })()
      const res = await fetch('/api/calcular-ruta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: quote.origin,
          destination: quote.destination,
          stops,
          trip_date: quote.trip_date,
          return_date: quote.return_date,
          departure_time: quote.departure_time,
          return_time: quote.return_time,
          company_id: companyId,
          quote_request_id: quote.id,
          vehicle_id: vehicleId || null,
        }),
      })
      const data = await res.json()
      setCalcResult(data)
      setPrecioFinal(String(data.precio_final))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function handleGuardar() {
    setSaving(true)
    await supabase.from('quote_requests').update({
      status: estado,
      vehicle_id: vehicleId || null,
      final_price: precioFinal ? Number(precioFinal) : null,
      estimated_km: calcResult?.km || quote.estimated_km,
      internal_notes: nota,
    }).eq('id', quote.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleEnviarPresupuesto() {
    // Guards previos: sin cálculo no se puede generar un PDF completo.
    if (!calcResult) return alert('Calcula el precio antes de enviar el presupuesto')
    if (!precioFinal) return alert('Primero calcula o introduce el precio final')
    if (!quote.requester_email) return alert('Este cliente no tiene email; no se puede enviar el presupuesto')
    // Marca blanca: sin nombre de empresa el email saldría como "FlotaFly",
    // que el cliente final no reconoce. Mejor avisar y NO enviar.
    if (!companyName) return alert('Falta el nombre de la empresa; no se puede enviar el presupuesto')

    const precioNum = Number(precioFinal)
    const ivaPct = calcResult.iva
    // Caveat (b): recalcular base e IVA desde el precio final EDITADO para que el
    // PDF y el email siempre cuadren, aunque la empresa ajuste el total a mano.
    const baseImponible = precioNum / (1 + ivaPct / 100)
    const importeIva = precioNum - baseImponible

    setSending(true)
    try {
      const pdfBase64 = await generarPresupuestoPdf({
        numeroPresupuesto,
        companyName,
        quote,
        calc: calcResult,
        precioFinal: precioNum,
        iva: ivaPct,
        baseImponible,
        importeIva,
      })

      const fecha = quote.trip_date
        ? new Date(quote.trip_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
        : ''

      const res = await fetch('/api/enviar-presupuesto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: quote.requester_email,
          nombre: quote.requester_name,
          pdfBase64,
          numeroPresupuesto,
          origen: quote.origin,
          destino: quote.destination,
          fecha,
          precio: precioNum.toFixed(2),
          empresaNombre: companyName,
          iva: ivaPct,
          baseImponible: baseImponible.toFixed(2),
          importeIva: importeIva.toFixed(2),
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error('Envío de presupuesto falló:', res.status, body)
        alert('No se pudo enviar el presupuesto. Inténtalo de nuevo.')
        return // NO marcar 'enviado' si el email falló
      }

      // Solo si el email salió bien: persistir el estado 'enviado'.
      setEstado('enviado')
      const { error } = await supabase.from('quote_requests').update({ status: 'enviado' }).eq('id', quote.id)
      if (error) console.error('No se pudo persistir el estado enviado:', error)
    } catch (e) {
      console.error(e)
      alert('No se pudo generar o enviar el presupuesto.')
    } finally {
      setSending(false)
    }
  }

  const estadoActual = ESTADOS.find(e => e.value === estado)
  const variablesActivas = calcResult?.desgloseVariables.filter(v => v.activa) ?? []

  return (
    <div style={{ fontFamily: FONT_BODY }}>

      {/* ESTADO */}
      <div style={s.card}>
        <label style={s.label}>Estado del presupuesto</label>
        <select style={s.select} value={estado} onChange={e => setEstado(e.target.value)}>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        {estadoActual && (
          <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: estadoActual.bg, borderRadius: 6, padding: '4px 10px' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: estadoActual.color }}>{estadoActual.label}</span>
          </div>
        )}
      </div>

      {/* VEHÍCULO */}
      <div style={s.card}>
        <label style={s.label}>Vehículo asignado</label>
        <select style={s.select} value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
          <option value="">Sin asignar</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>
              {v.marca_modelo} — {v.matricula} ({v.plazas} plazas){busyVehicles.has(v.id) ? "  — ya asignado ese día" : ""}
            </option>
          ))}
        </select>
        {vehicleId && busyVehicles.has(vehicleId) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: COLORS.warningSoft, border: `1px solid ${COLORS.warning}40`, borderRadius: RADIUS.sm, padding: '7px 11px', marginTop: 8 }}>
            <AlertTriangle style={{ width: 14, height: 14, color: COLORS.warning, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.warning }}>Este vehículo ya está asignado a otro servicio ese día</span>
          </div>
        )}
      </div>

      {/* BOTÓN CALCULAR */}
      <div style={{ marginBottom: 14 }}>
        {!vehicleId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: COLORS.warningSoft, border: `1px solid ${COLORS.warning}40`, borderRadius: RADIUS.sm, padding: '8px 11px', marginBottom: 10 }}>
            <AlertTriangle style={{ width: 14, height: 14, color: COLORS.warning, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.warning }}>Asigna un vehículo para calcular el precio</span>
          </div>
        )}
        <button style={{ ...s.btn, ...(loading || !vehicleId ? { opacity: 0.55, cursor: 'not-allowed' } : {}) }} onClick={calcular} disabled={loading || !vehicleId}>
          {loading
            ? (<><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Calculando...</>)
            : (<><RefreshCw style={{ width: 15, height: 15 }} /> Calcular precio</>)}
        </button>
      </div>

      {/* DESGLOSE COMPLETO */}
      {calcResult && (
        <div style={s.card}>

          {/* CHIPS INFO SERVICIO */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
            {[
              { Icon: MapPin, label: `${calcResult.km} km totales` },
              { Icon: Calendar, label: `${calcResult.dias} día${calcResult.dias !== 1 ? 's' : ''}` },
              { Icon: Clock, label: `${calcResult.horas} horas` },
            ].map(item => (
              <div key={item.label} style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.sm, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <item.Icon style={{ width: 13, height: 13, color: COLORS.textMuted }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* DESGLOSE KM EN VACÍO */}
          {(calcResult.kmVacioIda > 0 || calcResult.kmVacioVuelta > 0) && (
            <div style={{ background: COLORS.warningSoft, border: `1px solid ${COLORS.warning}40`, borderRadius: RADIUS.md, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: COLORS.warning, textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 8px' }}>
                <Warehouse style={{ width: 13, height: 13 }} /> Kilómetros del servicio
              </p>
              {[
                { label: 'Garaje → Origen (en vacío)', km: calcResult.kmVacioIda },
                { label: 'Recorrido del servicio', km: calcResult.kmServicio },
                { label: 'Destino → Garaje (en vacío)', km: calcResult.kmVacioVuelta },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.warning, paddingBottom: i < arr.length - 1 ? 5 : 0, marginBottom: i < arr.length - 1 ? 5 : 0, borderBottom: i < arr.length - 1 ? `1px dashed ${COLORS.warning}40` : 'none' }}>
                  <span>{row.label}</span>
                  <span style={{ fontWeight: 700 }}>{row.km} km</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.warning, borderTop: `1px solid ${COLORS.warning}40`, paddingTop: 6, marginTop: 6 }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontWeight: 800 }}>{calcResult.km} km</span>
              </div>
            </div>
          )}

          {/* COSTES DEL VEHÍCULO */}
          {calcResult.vehiculo && calcResult.costesVehiculo.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={s.divider}>
                <div style={s.dividerLine} />
                <span style={s.sectionTitle}><Bus style={{ width: 12, height: 12 }} /> {calcResult.vehiculo.marca_modelo} · {calcResult.vehiculo.matricula}</span>
                <div style={s.dividerLine} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
                {calcResult.costesVehiculo.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < calcResult.costesVehiculo.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{c.concepto}</div>
                      <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 2 }}>{c.formula}</div>
                    </div>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: COLORS.navy, whiteSpace: 'nowrap' as const, marginLeft: 16 }}>{f(c.coste)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: COLORS.navySoft, border: `1px solid ${COLORS.navy}26`, borderRadius: RADIUS.sm, padding: '8px 12px', marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy }}>Subtotal vehículo</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: COLORS.navy }}>{f(calcResult.totalVehiculo)}</span>
              </div>
            </div>
          )}

          {/* VARIABLES DE EMPRESA */}
          {variablesActivas.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={s.divider}>
                <div style={s.dividerLine} />
                <span style={s.sectionTitle}><Settings style={{ width: 12, height: 12 }} /> Variables de la empresa</span>
                <div style={s.dividerLine} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
                {variablesActivas.map((v, i) => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < variablesActivas.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>{v.nombre}</span>
                        {v.obligatoria
                          ? <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.navy, background: COLORS.navySoft, borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em' }}>FIJA</span>
                          : <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.warning, background: COLORS.warningSoft, borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em' }}>OPCIONAL</span>
                        }
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.textFaint, marginTop: 2 }}>{v.formula}</div>
                    </div>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: COLORS.text, whiteSpace: 'nowrap' as const, marginLeft: 16 }}>{f(v.coste)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.sm, padding: '8px 12px', marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>Subtotal variables</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{f(calcResult.totalVariables)}</span>
              </div>
            </div>
          )}

          {/* RESUMEN FINAL */}
          <div style={{ borderTop: `2px solid ${COLORS.border}`, paddingTop: 16 }}>
            <div style={s.divider}>
              <div style={s.dividerLine} />
              <span style={s.sectionTitle}><Wallet style={{ width: 12, height: 12 }} /> Resumen</span>
              <div style={s.dividerLine} />
            </div>
            {[
              { label: 'Subtotal costes', value: f(calcResult.subtotal), color: COLORS.text },
              { label: `Margen (${calcResult.margen}%)`, value: `+${f(calcResult.margenImporte)}`, color: COLORS.teal },
              { label: 'Base imponible', value: f(calcResult.baseImponible), color: COLORS.text },
              { label: `IVA (${calcResult.iva}%)`, value: `+${f(calcResult.totalIva)}`, color: COLORS.textMuted },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                <span style={{ fontSize: 13, color: COLORS.textMuted }}>{row.label}</span>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
              </div>
            ))}
            <div style={{ background: COLORS.navy, borderRadius: RADIUS.md, padding: '14px 18px', marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.onDark }}>TOTAL</span>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: COLORS.onDark }}>{f(calcResult.precio_final)}</span>
            </div>
          </div>
        </div>
      )}

      {/* PRECIO FINAL EDITABLE */}
      <div style={s.card}>
        <label style={s.label}>Precio final (editable)</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            style={s.input}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={precioFinal}
            onChange={e => setPrecioFinal(e.target.value)}
          />
          <span style={{ fontSize: 14, color: COLORS.textMuted, whiteSpace: 'nowrap' as const }}>€ + IVA</span>
        </div>
      </div>

      {/* NOTAS INTERNAS */}
      <div style={s.card}>
        <label style={s.label}>Notas internas</label>
        <textarea
          style={{ ...s.input, height: 80, padding: '8px 12px', resize: 'vertical' as const }}
          placeholder="Notas visibles solo para el equipo..."
          value={nota}
          onChange={e => setNota(e.target.value)}
        />
      </div>

      {/* ACCIONES */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        <button style={s.btn} onClick={handleGuardar} disabled={saving}>
          {saved ? (<><Check style={{ width: 15, height: 15 }} /> Guardado</>) : saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button
          style={{ ...s.btn, ...(sending || !calcResult ? { opacity: 0.55, cursor: 'not-allowed' } : {}) }}
          onClick={handleEnviarPresupuesto}
          disabled={sending || !calcResult}
        >
          {sending
            ? (<><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Enviando...</>)
            : (<><Mail style={{ width: 15, height: 15 }} /> Enviar presupuesto por email</>)}
        </button>
      </div>
    </div>
  )
}
