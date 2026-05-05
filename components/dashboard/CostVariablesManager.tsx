'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TIPOS = [
  { value: 'per_km', label: '€ por km', descripcion: 'Se multiplica por los km del servicio' },
  { value: 'per_day', label: '€ por día', descripcion: 'Se multiplica por los días del servicio' },
  { value: 'per_hour', label: '€ por hora', descripcion: 'Se multiplica por las horas estimadas' },
  { value: 'per_x_km', label: '€ cada X km', descripcion: 'Se reparte entre los km (ej. ruedas cada 10.000 km)' },
  { value: 'fixed', label: '€ fijo', descripcion: 'Siempre suma el mismo importe' },
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

type Props = {
  companyId: string
}

const emptyForm = {
  nombre: '',
  tipo: 'per_km',
  valor: '',
  intervalo_km: '',
  obligatoria: true,
}

export default function CostVariablesManager({ companyId }: Props) {
  const [variables, setVariables] = useState<CostVariable[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchVariables()
  }, [])

  async function fetchVariables() {
    setLoading(true)
    const { data } = await supabase
      .from('cost_variables')
      .select('*')
      .eq('company_id', companyId)
      .order('orden')
    setVariables(data || [])
    setLoading(false)
  }

  function openNew() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError('')
  }

  function openEdit(v: CostVariable) {
    setForm({
      nombre: v.nombre,
      tipo: v.tipo,
      valor: String(v.valor),
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
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      valor: Number(form.valor),
      intervalo_km: form.tipo === 'per_x_km' ? Number(form.intervalo_km) : null,
      obligatoria: form.obligatoria,
    }

    if (editingId) {
      await supabase.from('cost_variables').update(payload).eq('id', editingId)
    } else {
      const maxOrden = variables.length > 0 ? Math.max(...variables.map(v => v.orden)) + 1 : 1
      await supabase.from('cost_variables').insert({
        ...payload,
        company_id: companyId,
        activa: true,
        orden: maxOrden,
      })
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
    if (!confirm('¿Eliminar esta variable de coste?')) return
    await supabase.from('cost_variables').delete().eq('id', id)
    setVariables(prev => prev.filter(v => v.id !== id))
  }

  function tipoLabel(tipo: string) {
    return TIPOS.find(t => t.value === tipo)?.label || tipo
  }

  function formatCosteEjemplo(v: CostVariable) {
    switch (v.tipo) {
      case 'per_km': return `${v.valor}€ × km`
      case 'per_day': return `${v.valor}€ × días`
      case 'per_hour': return `${v.valor}€ × horas`
      case 'per_x_km': return `${v.valor}€ cada ${v.intervalo_km?.toLocaleString()} km`
      case 'fixed': return `${v.valor}€ fijo`
      default: return ''
    }
  }

  const s = {
    wrap: { fontFamily: "'DM Sans', system-ui, sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 },
    subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
    btnPrimary: { background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
    btnSecondary: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
    btnDanger: { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16 },
    badge: (color: string, bg: string) => ({ background: bg, color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }),
    formWrap: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 20 },
    label: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' },
    input: { width: '100%', height: 36, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, background: '#fff', boxSizing: 'border-box' as const },
    select: { width: '100%', height: 36, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, background: '#fff', boxSizing: 'border-box' as const },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
    errorMsg: { color: '#dc2626', fontSize: 12, marginTop: 8 },
  }

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <p style={s.title}>Variables de coste</p>
          <p style={s.subtitle}>Define los conceptos que forman el precio de cada servicio</p>
        </div>
        <button style={s.btnPrimary} onClick={openNew}>+ Nueva variable</button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div style={s.formWrap}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
            {editingId ? 'Editar variable' : 'Nueva variable de coste'}
          </p>

          <div style={s.grid2}>
            <div>
              <label style={s.label}>Nombre</label>
              <input
                style={s.input}
                placeholder="Ej: Coste por km, Dieta conductor..."
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div>
              <label style={s.label}>Tipo de cálculo</label>
              <select
                style={s.select}
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              >
                {TIPOS.map(t => (
                  <option key={t.value} value={t.value}>{t.label} — {t.descripcion}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={s.grid2}>
            <div>
              <label style={s.label}>
                {form.tipo === 'per_x_km' ? 'Coste total (€)' : 'Valor (€)'}
              </label>
              <input
                style={s.input}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
              />
            </div>
            {form.tipo === 'per_x_km' && (
              <div>
                <label style={s.label}>Cada cuántos km</label>
                <input
                  style={s.input}
                  type="number"
                  placeholder="Ej: 10000"
                  value={form.intervalo_km}
                  onChange={e => setForm(f => ({ ...f, intervalo_km: e.target.value }))}
                />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.obligatoria}
                onChange={e => setForm(f => ({ ...f, obligatoria: e.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, color: '#374151' }}>
                <strong>Obligatoria</strong> — se aplica siempre en todos los servicios.
                Si no, será opcional y se podrá activar/desactivar por presupuesto.
              </span>
            </label>
          </div>

          {error && <p style={s.errorMsg}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button style={s.btnSecondary} onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de variables */}
      {loading ? (
        <p style={{ color: '#6b7280', fontSize: 13 }}>Cargando...</p>
      ) : variables.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>
          No hay variables de coste. Crea la primera.
        </div>
      ) : (
        variables.map(v => (
          <div key={v.id} style={{ ...s.card, opacity: v.activa ? 1 : 0.5 }}>
            {/* Toggle activa */}
            <div
              onClick={() => toggleActiva(v)}
              style={{
                width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                background: v.activa ? '#1e3a5f' : '#d1d5db',
                position: 'relative', flexShrink: 0, transition: 'background 0.2s'
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: v.activa ? 18 : 4, transition: 'left 0.2s'
              }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{v.nombre}</span>
                <span style={s.badge(v.obligatoria ? '#1e3a5f' : '#6b7280', v.obligatoria ? '#eff6ff' : '#f3f4f6')}>
                  {v.obligatoria ? 'Obligatoria' : 'Opcional'}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                {tipoLabel(v.tipo)} · {formatCosteEjemplo(v)}
              </span>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.btnSecondary} onClick={() => openEdit(v)}>Editar</button>
              <button style={s.btnDanger} onClick={() => handleDelete(v.id)}>Eliminar</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}