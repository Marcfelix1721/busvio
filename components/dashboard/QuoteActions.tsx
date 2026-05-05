'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type CostVariable = {
  id: string
  nombre: string
  tipo: string
  valor: number
  intervalo_km: number | null
  obligatoria: boolean
  activa: boolean
  coste: number
}

type CalcResult = {
  km: number
  dias: number
  horas: number
  desglose: CostVariable[]
  subtotal: number
  margen: number
  iva: number
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

  const s = {
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20, marginBottom: 16, fontFamily: "'DM Sans', system-ui, sans-serif" },
    label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' },
    select: { width: '100%', height: 36, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif" },
    input: { width: '100%', height: 36, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const },
    btn: { width: '100%', height: 38, background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" },
    btnSecondary: { width: '100%', height: 38, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' },
    rowLabel: { fontSize: 13, color: '#374151' },
    rowValue: { fontSize: 13, fontWeight: 600, color: '#111827' },
    toggle: (activa: boolean) => ({
      width: 32, height: 18, borderRadius: 9, cursor: 'pointer',
      background: activa ? '#1e3a5f' : '#d1d5db',
      position: 'relative' as const, flexShrink: 0, transition: 'background 0.2s', border: 'none'
    }),
    toggleDot: (activa: boolean) => ({
      width: 12, height: 12, borderRadius: '50%', background: '#fff',
      position: 'absolute' as const, top: 3,
      left: activa ? 16 : 3, transition: 'left 0.2s'
    }),
  }

  async function calcular() {
    setLoading(true)
    try {
      const stops = (() => {
        try { return JSON.parse(quote.stops || '[]') } catch { return [] }
      })()

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
        }),
      })

      const data = await res.json()
      setCalcResult(data)
      setPrecioFinal(String(data.precio_final))

      // Inicializar overrides con el estado actual de cada variable
      const initialOverrides: Record<string, boolean> = {}
      data.desglose.forEach((v: CostVariable) => {
        initialOverrides[v.id] = v.activa
      })
      setOverrides(initialOverrides)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function toggleOverride(variableId: string, currentActiva: boolean) {
    const newActiva = !currentActiva

    // Guardar override en BD
    await supabase.from('quote_cost_overrides').upsert({
      quote_request_id: quote.id,
      cost_variable_id: variableId,
      activa: newActiva,
    }, { onConflict: 'quote_request_id,cost_variable_id' })

    setOverrides(prev => ({ ...prev, [variableId]: newActiva }))

    // Recalcular
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
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const estadoActual = ESTADOS.find(e => e.value === estado)

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ESTADO */}
      <div style={s.card}>
        <label style={s.label}>Estado del presupuesto</label>
        <select style={s.select} value={estado} onChange={e => setEstado(e.target.value)}>
          {ESTADOS.map(e => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
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
      </div>

      {/* CÁLCULO */}
      <div style={s.card}>
        <label style={s.label}>Cálculo de precio</label>
        <button style={s.btn} onClick={calcular} disabled={loading}>
          {loading ? 'Calculando...' : '🔄 Calcular precio'}
        </button>

        {calcResult && (
          <div style={{ marginTop: 16 }}>
            {/* Info del servicio */}
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 20 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>📍 <strong>{calcResult.km} km</strong></span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>📅 <strong>{calcResult.dias} día{calcResult.dias !== 1 ? 's' : ''}</strong></span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>⏱ <strong>{calcResult.horas} horas</strong></span>
              </div>
            </div>

            {/* Desglose de variables */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Desglose de costes
              </p>
              {calcResult.desglose.map(v => {
                const activa = overrides[v.id] !== undefined ? overrides[v.id] : v.activa
                return (
                  <div key={v.id} style={{ ...s.row, opacity: activa ? 1 : 0.4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {!v.obligatoria && (
                        <button
                          style={s.toggle(activa)}
                          onClick={() => toggleOverride(v.id, activa)}
                        >
                          <div style={s.toggleDot(activa)} />
                        </button>
                      )}
                      {v.obligatoria && <div style={{ width: 32 }} />}
                      <span style={s.rowLabel}>{v.nombre}</span>
                    </div>
                    <span style={{ ...s.rowValue, color: activa ? '#111827' : '#9ca3af' }}>
                      {activa ? `${v.coste.toFixed(2)}€` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Totales */}
            <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: 12 }}>
              <div style={s.row}>
                <span style={s.rowLabel}>Subtotal</span>
                <span style={s.rowValue}>{calcResult.subtotal.toFixed(2)}€</span>
              </div>
              <div style={s.row}>
                <span style={s.rowLabel}>Margen ({calcResult.margen}%)</span>
                <span style={s.rowValue}>+{(calcResult.subtotal * calcResult.margen / 100).toFixed(2)}€</span>
              </div>
              <div style={s.row}>
                <span style={s.rowLabel}>IVA ({calcResult.iva}%)</span>
                <span style={s.rowValue}>+{(calcResult.subtotal * (1 + calcResult.margen / 100) * calcResult.iva / 100).toFixed(2)}€</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>TOTAL</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#1e3a5f' }}>{calcResult.precio_final.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
          <span style={{ fontSize: 14, color: '#6b7280', whiteSpace: 'nowrap' }}>€ + IVA</span>
        </div>
      </div>

      {/* NOTAS INTERNAS */}
      <div style={s.card}>
        <label style={s.label}>Notas internas</label>
        <textarea
          style={{ ...s.input, height: 80, padding: '8px 12px', resize: 'vertical' }}
          placeholder="Notas visibles solo para el equipo..."
          value={nota}
          onChange={e => setNota(e.target.value)}
        />
      </div>

      {/* ACCIONES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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