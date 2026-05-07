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
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
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
    sectionTitle: { fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8, marginTop: 4 },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f3f4f6' },
    rowLast: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0' },
    rowLabel: { fontSize: 13, color: '#374151' },
    rowFormula: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
    rowValue: { fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' as const },
    toggle: (activa: boolean) => ({
      width: 30, height: 17, borderRadius: 9, cursor: 'pointer',
      background: activa ? '#1e3a5f' : '#d1d5db',
      position: 'relative' as const, flexShrink: 0,
      transition: 'background 0.2s', border: 'none', padding: 0,
    }),
    toggleDot: (activa: boolean) => ({
      width: 11, height: 11, borderRadius: '50%', background: '#fff',
      position: 'absolute' as const, top: 3,
      left: activa ? 15 : 3, transition: 'left 0.2s',
    }),
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
      const initialOverrides: Record<string, boolean> = {}
      data.desgloseVariables.forEach((v: DesgloseVariable) => {
        initialOverrides[v.id] = v.activa
      })
      setOverrides(initialOverrides)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function toggleOverride(variableId: string, currentActiva: boolean) {
    const newActiva = !currentActiva
    await supabase.from('quote_cost_overrides').upsert({
      quote_request_id: quote.id,
      cost_variable_id: variableId,
      activa: newActiva,
    }, { onConflict: 'quote_request_id,cost_variable_id' })
    setOverrides(prev => ({ ...prev, [variableId]: newActiva }))
    await calcular()
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

          {/* INFO SERVICIO */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' as const }}>
            {[
              { icon: '📍', label: `${calcResult.km} km totales` },
              { icon: '📅', label: `${calcResult.dias} día${calcResult.dias !== 1 ? 's' : ''}` },
              { icon: '⏱', label: `${calcResult.horas} horas` },
            ].map(item => (
              <div key={item.label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* DESGLOSE KM EN VACÍO */}
          {(calcResult.kmVacioIda > 0 || calcResult.kmVacioVuelta > 0) && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 6px' }}>🏭 Desglose km</p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#78350f' }}>
                  <span>Garaje → Origen (vacío)</span>
                  <span style={{ fontWeight: 700 }}>{calcResult.kmVacioIda} km</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#78350f' }}>
                  <span>Origen → Destino (servicio)</span>
                  <span style={{ fontWeight: 700 }}>{calcResult.kmServicio} km</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#78350f' }}>
                  <span>Destino → Garaje (vacío)</span>
                  <span style={{ fontWeight: 700 }}>{calcResult.kmVacioVuelta} km</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#92400e', borderTop: '1px solid #fde68a', paddingTop: 4, marginTop: 2 }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 800 }}>{calcResult.km} km</span>
                </div>
              </div>
            </div>
          )}

          {/* COSTES DEL VEHÍCULO */}
          {calcResult.vehiculo && calcResult.costesVehiculo.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
                <span style={s.sectionTitle}>🚌 {calcResult.vehiculo.marca_modelo} · {calcResult.vehiculo.matricula}</span>
                <div style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
              </div>
              {calcResult.costesVehiculo.map((c, i) => (
                <div key={i} style={i < calcResult.costesVehiculo.length - 1 ? s.row : s.rowLast}>
                  <div>
                    <div style={s.rowLabel}>{c.concepto}</div>
                    <div style={s.rowFormula}>{c.formula}</div>
                  </div>
                  <span style={{ ...s.rowValue, color: '#1e3a5f' }}>{f(c.coste)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f0f4ff', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e3a5f' }}>Subtotal vehículo</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f' }}>{f(calcResult.totalVehiculo)}</span>
              </div>
            </div>
          )}

          {/* VARIABLES DE EMPRESA */}
          {calcResult.desgloseVariables.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
                <span style={s.sectionTitle}>⚙️ Variables de la empresa</span>
                <div style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
              </div>
              {calcResult.desgloseVariables.map((v, i) => {
                const activa = overrides[v.id] !== undefined ? overrides[v.id] : v.activa
                const isLast = i === calcResult.desgloseVariables.length - 1
                return (
                  <div key={v.id} style={{ ...(isLast ? s.rowLast : s.row), opacity: activa ? 1 : 0.4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      {!v.obligatoria ? (
                        <button style={s.toggle(activa)} onClick={() => toggleOverride(v.id, activa)}>
                          <div style={s.toggleDot(activa)} />
                        </button>
                      ) : (
                        <div style={{ width: 30, height: 17, borderRadius: 9, background: '#e5e7eb', position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#9ca3af', position: 'absolute', top: 3, left: 15 }} />
                        </div>
                      )}
                      <div>
                        <div style={{ ...s.rowLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {v.nombre}
                          {v.obligatoria && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#1e3a5f', background: '#eff6ff', borderRadius: 4, padding: '1px 5px' }}>FIJA</span>
                          )}
                        </div>
                        {activa && <div style={s.rowFormula}>{v.formula}</div>}
                      </div>
                    </div>
                    <span style={{ ...s.rowValue, color: activa ? '#111827' : '#d1d5db' }}>
                      {activa ? f(v.coste) : '—'}
                    </span>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f9fafb', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Subtotal variables</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{f(calcResult.totalVariables)}</span>
              </div>
            </div>
          )}

          {/* RESUMEN FINAL */}
          <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
              <span style={s.sectionTitle}>💰 Resumen</span>
              <div style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
            </div>
            <div style={s.row}>
              <span style={s.rowLabel}>Subtotal costes</span>
              <span style={s.rowValue}>{f(calcResult.subtotal)}</span>
            </div>
            <div style={s.row}>
              <span style={s.rowLabel}>Margen ({calcResult.margen}%)</span>
              <span style={{ ...s.rowValue, color: '#16a34a' }}>+{f(calcResult.margenImporte)}</span>
            </div>
            <div style={s.row}>
              <span style={s.rowLabel}>Base imponible</span>
              <span style={s.rowValue}>{f(calcResult.baseImponible)}</span>
            </div>
            <div style={s.rowLast}>
              <span style={s.rowLabel}>IVA ({calcResult.iva}%)</span>
              <span style={{ ...s.rowValue, color: '#6b7280' }}>+{f(calcResult.totalIva)}</span>
            </div>
            <div style={{ background: '#111827', borderRadius: 10, padding: '14px 16px', marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>TOTAL</span>
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