'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TIPOS = [
  { value: 'per_km', label: 'Por km recorrido', ejemplo: 'ej: 2.20€ × km', icon: '📍' },
  { value: 'per_day', label: 'Por día', ejemplo: 'ej: 18€ × días', icon: '📅' },
  { value: 'per_hour', label: 'Por hora', ejemplo: 'ej: 12€ × horas', icon: '⏱' },
  { value: 'per_x_km', label: 'Cada X km', ejemplo: 'ej: 800€ cada 10.000 km', icon: '🔧' },
  { value: 'fixed', label: 'Importe fijo', ejemplo: 'ej: 50€ siempre', icon: '📌' },
]

const SUGERENCIAS = [
  { nombre: 'Conductor', tipo: 'per_hour', valor: '12', icon: '👤' },
  { nombre: 'Dieta conductor', tipo: 'per_day', valor: '20', icon: '🍽️' },
  { nombre: 'Peaje', tipo: 'fixed', valor: '0', icon: '🛣️' },
  { nombre: 'Seguro', tipo: 'per_day', valor: '18', icon: '🛡️' },
  { nombre: 'Ruedas', tipo: 'per_x_km', valor: '800', icon: '🔧' },
  { nombre: 'Parking', tipo: 'fixed', valor: '0', icon: '🅿️' },
  { nombre: 'Limpieza', tipo: 'fixed', valor: '30', icon: '🧹' },
  { nombre: 'Coste por km', tipo: 'per_km', valor: '2.20', icon: '📍' },
]

type CostVariable = {
  id: string
  nombre: string
  tipo: string
  valor: number
  intervalo_km: number | null
  obligatoria: boolean
  activa: boolean
  orden: number
}

type Props = { companyId: string }

const emptyForm = { nombre: '', tipo: 'per_km', valor: '', intervalo_km: '', obligatoria: true }

function formatEjemplo(v: CostVariable) {
  switch (v.tipo) {
    case 'per_km': return `${v.valor}€ × km recorrido`
    case 'per_day': return `${v.valor}€ × días`
    case 'per_hour': return `${v.valor}€ × horas`
    case 'per_x_km': return `${v.valor}€ cada ${v.intervalo_km?.toLocaleString()} km`
    case 'fixed': return `${v.valor}€ fijo por servicio`
    default: return ''
  }
}

function tipoIcon(tipo: string) {
  return TIPOS.find(t => t.value === tipo)?.icon || '💰'
}

export default function CostVariablesManager({ companyId }: Props) {
  const [variables, setVariables] = useState<CostVariable[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchVariables() }, [])

  async function fetchVariables() {
    setLoading(true)
    const { data } = await supabase
      .from('cost_variables').select('*')
      .eq('company_id', companyId).order('orden')
    setVariables(data || [])
    setLoading(false)
  }

  function openNew(prefill?: Partial<typeof emptyForm>) {
    setForm({ ...emptyForm, ...prefill })
    setEditingId(null)
    setShowForm(true)
    setError('')
    setTimeout(() => document.getElementById('cv-nombre')?.focus(), 100)
  }

  function openEdit(v: CostVariable) {
    setForm({
      nombre: v.nombre, tipo: v.tipo, valor: String(v.valor),
      intervalo_km: v.intervalo_km ? String(v.intervalo_km) : '',
      obligatoria: v.obligatoria,
    })
    setEditingId(v.id)
    setShowForm(true)
    setError('')
  }

  async function handleSave() {
    if (!form.nombre.trim()) return setError('El nombre es obligatorio')
    if (!form.valor || isNaN(Number(form.valor))) return setError('El valor debe ser un número')
    if (form.tipo === 'per_x_km' && (!form.intervalo_km || isNaN(Number(form.intervalo_km)))) {
      return setError('Indica cada cuántos km se aplica este coste')
    }
    setSaving(true)
    setError('')
    const payload = {
      nombre: form.nombre.trim(), tipo: form.tipo,
      valor: Number(form.valor),
      intervalo_km: form.tipo === 'per_x_km' ? Number(form.intervalo_km) : null,
      obligatoria: form.obligatoria,
    }
    if (editingId) {
      await supabase.from('cost_variables').update(payload).eq('id', editingId)
    } else {
      const maxOrden = variables.length > 0 ? Math.max(...variables.map(v => v.orden)) + 1 : 1
      await supabase.from('cost_variables').insert({ ...payload, company_id: companyId, activa: true, orden: maxOrden })
    }
    await fetchVariables()
    setShowForm(false)
    setSaving(false)
  }

  async function toggleActiva(v: CostVariable) {
    await supabase.from('cost_variables').update({ activa: !v.activa }).eq('id', v.id)
    setVariables(prev => prev.map(x => x.id === v.id ? { ...x, activa: !x.activa } : x))
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('cost_variables').delete().eq('id', id)
    setVariables(prev => prev.filter(v => v.id !== id))
    setDeletingId(null)
  }

  const tipoActual = TIPOS.find(t => t.value === form.tipo)

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Variables de coste</p>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Define los conceptos que forman el precio de cada servicio
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => openNew()}
            style={{ height: 38, padding: '0 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}
          >
            + Nueva variable
          </button>
        )}
      </div>

      {/* FORMULARIO */}
      {showForm && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>
            {editingId ? '✏️ Editar variable' : '➕ Nueva variable de coste'}
          </p>

          {/* Nombre */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Nombre del concepto
            </label>
            <input
              id="cv-nombre"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Conductor, Peaje autopista, Dieta..."
              style={{ height: 42, width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '0 14px', fontSize: 14, background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const, outline: 'none' }}
            />
          </div>

          {/* Tipo — botones visuales */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              ¿Cómo se calcula?
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                  style={{
                    padding: '8px 14px', borderRadius: 10, border: `2px solid ${form.tipo === t.value ? '#1e3a5f' : '#e5e7eb'}`,
                    background: form.tipo === t.value ? '#1e3a5f' : '#fff',
                    color: form.tipo === t.value ? '#fff' : '#374151',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
            {tipoActual && (
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                {tipoActual.ejemplo}
              </p>
            )}
          </div>

          {/* Valor + intervalo */}
          <div style={{ display: 'grid', gridTemplateColumns: form.tipo === 'per_x_km' ? '1fr 1fr' : '1fr 2fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                {form.tipo === 'per_x_km' ? 'Coste (€)' : 'Valor (€)'}
              </label>
              <input
                type="number" step="0.01" placeholder="0.00"
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                style={{ height: 42, width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '0 14px', fontSize: 14, background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const, outline: 'none' }}
              />
            </div>
            {form.tipo === 'per_x_km' && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  Cada cuántos km
                </label>
                <input
                  type="number" placeholder="Ej: 10000"
                  value={form.intervalo_km}
                  onChange={e => setForm(f => ({ ...f, intervalo_km: e.target.value }))}
                  style={{ height: 42, width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '0 14px', fontSize: 14, background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const, outline: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Obligatoria */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              ¿Siempre se aplica?
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: true, label: '✅ Siempre', sub: 'Se incluye en todos los servicios' },
                { value: false, label: '☑️ Opcional', sub: 'Se puede activar o desactivar por presupuesto' },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, obligatoria: opt.value }))}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    border: `2px solid ${form.obligatoria === opt.value ? '#1e3a5f' : '#e5e7eb'}`,
                    background: form.obligatoria === opt.value ? '#f0f4ff' : '#fff',
                    cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif",
                    textAlign: 'left' as const, transition: 'all 0.15s',
                  }}
                >
                  <p style={{ fontSize: 13, fontWeight: 700, color: form.obligatoria === opt.value ? '#1e3a5f' : '#374151', margin: 0 }}>{opt.label}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave} disabled={saving}
              style={{ height: 40, padding: '0 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear variable'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError('') }}
              style={{ height: 40, padding: '0 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* SUGERENCIAS rápidas */}
      {!showForm && variables.length === 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10 }}>
            Conceptos habituales — añade con un clic
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
            {SUGERENCIAS.map(s => (
              <button
                key={s.nombre}
                onClick={() => openNew({ nombre: s.nombre, tipo: s.tipo, valor: s.valor })}
                style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px dashed #d1d5db', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {s.icon} {s.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LISTA */}
      {loading ? (
        <p style={{ fontSize: 13, color: '#9ca3af' }}>Cargando...</p>
      ) : variables.length === 0 && showForm ? null : variables.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: '40px 20px', color: '#9ca3af' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>💰</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>Sin variables de coste</p>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>Añade los conceptos que forman el precio de tus servicios</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {variables.map(v => (
            <div
              key={v.id}
              style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                opacity: v.activa ? 1 : 0.5, transition: 'opacity 0.2s',
                borderLeft: `4px solid ${v.obligatoria ? '#1e3a5f' : '#e5e7eb'}`,
              }}
            >
              {/* Icono tipo */}
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {tipoIcon(v.tipo)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{v.nombre}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 7px',
                    background: v.obligatoria ? '#eff6ff' : '#f3f4f6',
                    color: v.obligatoria ? '#1e3a5f' : '#6b7280',
                  }}>
                    {v.obligatoria ? 'SIEMPRE' : 'OPCIONAL'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{formatEjemplo(v)}</p>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggleActiva(v)}
                style={{
                  width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: v.activa ? '#1e3a5f' : '#d1d5db',
                  position: 'relative' as const, flexShrink: 0, transition: 'background 0.2s', padding: 0,
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  position: 'absolute' as const, top: 3,
                  left: v.activa ? 18 : 4, transition: 'left 0.2s',
                }} />
              </button>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => openEdit(v)}
                  style={{ height: 32, padding: '0 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  disabled={deletingId === v.id}
                  style={{ height: 32, padding: '0 12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  {deletingId === v.id ? '...' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sugerencias cuando ya hay variables */}
      {!showForm && variables.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
            Añadir rápido
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {SUGERENCIAS.map(s => (
              <button
                key={s.nombre}
                onClick={() => openNew({ nombre: s.nombre, tipo: s.tipo, valor: s.valor })}
                style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px dashed #d1d5db', background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}
              >
                {s.icon} {s.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}