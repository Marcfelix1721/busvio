'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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
}

const ESTADOS = [
  { value: 'nuevo', label: 'Nuevo', color: '#6b7280', bg: '#f3f4f6' },
  { value: 'en_revision', label: 'En revisión', color: '#d97706', bg: '#fef3c7' },
  { value: 'enviado', label: 'Enviado', color: '#2563eb', bg: '#eff6ff' },
  { value: 'aceptado', label: 'Aceptado', color: '#16a34a', bg: '#f0fdf4' },
  { value: 'rechazado', label: 'Rechazado', color: '#dc2626', bg: '#fef2f2' },
  { value: 'cancelado', label: 'Cancelado', color: '#9ca3af', bg: '#f9fafb' },
]

export default function QuoteActions({ quote, companyId, vehicles }: Props) {
  const [estado, setEstado] = useState(quote.status)
  const [vehicleId, setVehicleId] = useState(quote.vehicle_id || '')
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [precioFinal, setPrecioFinal] = useState<string>(quote.final_price ? String(quote.final_price) : '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [nota, setNota] = useState(quote.internal_notes || '')

  const f = (n: number) => n.toFixed(2) + '€'

  const s = {
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20, marginBottom: 14, fontFamily: "'DM Sans', system-ui, sans-serif" },
    label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' },
    select: { width: '100%', height: 36, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const },
    input: { width: '100%', height: 36, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const },
    btn: { width: '100%', height: 40, background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" },
    btnSecondary: { width: '100%', height: 40, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" },
    sectionTitle: { fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
    divider: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
    dividerLine: { height: 1, flex: 1, background: '#e5e7eb' },
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
    if (!precioFinal) return alert('Primero calcula o introduce el precio final')
    setLoading(true)
    try {
      await fetch('/api/enviar-presupuesto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.id, companyId }),
      })
      setEstado('enviado')
      await supabase.from('quote_requests').update({ status: 'enviado' }).eq('id', quote.id)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const estadoActual = ESTADOS.find(e => e.value === estado)
  const variablesActivas = calcResult?.desgloseVariables.filter(v => v.activa) ?? []

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

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
              {v.marca_modelo} — {v.matricula} ({v.plazas} plazas)
            </option>
          ))}
        </select>
        {vehicleId && (
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
            ℹ️ Selecciona el vehículo antes de calcular para usar sus costes propios
          </p>
        )}
      </div>

      {/* BOTÓN CALCULAR */}
      <div style={{ marginBottom: 14 }}>
        <button style={s.btn} onClick={calcular} disabled={loading}>
          {loading ? '⏳ Calculando...' : '🔄 Calcular precio'}
        </button>
      </div>

      {/* DESGLOSE COMPLETO */}
      {calcResult && (
        <div style={s.card}>

          {/* CHIPS INFO SERVICIO */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
            {[
              { icon: '📍', label: `${calcResult.km} km totales` },
              { icon: '📅', label: `${calcResult.dias} día${calcResult.dias !== 1 ? 's' : ''}` },
              { icon: '⏱', label: `${calcResult.horas} horas` },
            ].map(item => (
              <div key={item.label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* DESGLOSE KM EN VACÍO */}
          {(calcResult.kmVacioIda > 0 || calcResult.kmVacioVuelta > 0) && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 8px' }}>🏭 Kilómetros del servicio</p>
              {[
                { label: 'Garaje → Origen (en vacío)', km: calcResult.kmVacioIda },
                { label: 'Recorrido del servicio', km: calcResult.kmServicio },
                { label: 'Destino → Garaje (en vacío)', km: calcResult.kmVacioVuelta },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#78350f', paddingBottom: i < arr.length - 1 ? 5 : 0, marginBottom: i < arr.length - 1 ? 5 : 0, borderBottom: i < arr.length - 1 ? '1px dashed #fde68a' : 'none' }}>
                  <span>{row.label}</span>
                  <span style={{ fontWeight: 700 }}>{row.km} km</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#92400e', borderTop: '1px solid #fde68a', paddingTop: 6, marginTop: 6 }}>
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
                <span style={s.sectionTitle}>🚌 {calcResult.vehiculo.marca_modelo} · {calcResult.vehiculo.matricula}</span>
                <div style={s.dividerLine} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
                {calcResult.costesVehiculo.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < calcResult.costesVehiculo.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{c.concepto}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{c.formula}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', whiteSpace: 'nowrap' as const, marginLeft: 16 }}>{f(c.coste)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e3a5f' }}>Subtotal vehículo</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f' }}>{f(calcResult.totalVehiculo)}</span>
              </div>
            </div>
          )}

          {/* VARIABLES DE EMPRESA */}
          {variablesActivas.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={s.divider}>
                <div style={s.dividerLine} />
                <span style={s.sectionTitle}>⚙️ Variables de la empresa</span>
                <div style={s.dividerLine} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
                {variablesActivas.map((v, i) => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < variablesActivas.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{v.nombre}</span>
                        {v.obligatoria
                          ? <span style={{ fontSize: 9, fontWeight: 700, color: '#1e3a5f', background: '#eff6ff', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em' }}>FIJA</span>
                          : <span style={{ fontSize: 9, fontWeight: 700, color: '#92400e', background: '#fef3c7', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em' }}>OPCIONAL</span>
                        }
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{v.formula}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' as const, marginLeft: 16 }}>{f(v.coste)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Subtotal variables</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{f(calcResult.totalVariables)}</span>
              </div>
            </div>
          )}

          {/* RESUMEN FINAL */}
          <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: 16 }}>
            <div style={s.divider}>
              <div style={s.dividerLine} />
              <span style={s.sectionTitle}>💰 Resumen</span>
              <div style={s.dividerLine} />
            </div>
            {[
              { label: 'Subtotal costes', value: f(calcResult.subtotal), color: '#374151' },
              { label: `Margen (${calcResult.margen}%)`, value: `+${f(calcResult.margenImporte)}`, color: '#16a34a' },
              { label: 'Base imponible', value: f(calcResult.baseImponible), color: '#374151' },
              { label: `IVA (${calcResult.iva}%)`, value: `+${f(calcResult.totalIva)}`, color: '#6b7280' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
              </div>
            ))}
            <div style={{ background: '#111827', borderRadius: 10, padding: '14px 18px', marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>TOTAL</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{f(calcResult.precio_final)}</span>
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
          <span style={{ fontSize: 14, color: '#6b7280', whiteSpace: 'nowrap' as const }}>€ + IVA</span>
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
          {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button style={s.btnSecondary} onClick={handleEnviarPresupuesto} disabled={loading}>
          📧 Enviar presupuesto por email
        </button>
      </div>
    </div>
  )
}