'use client'

import { useState, useEffect, createElement } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { LucideIcon } from 'lucide-react'
import { MapPin, Calendar, Clock, Wrench, Pin, Percent, CircleCheck, Hourglass, Ruler, CalendarDays, Settings, Wallet, ClipboardList, Layers } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TIPOS_CALCULO: { value: string; label: string; ejemplo: string; icon: LucideIcon }[] = [
  { value: 'per_km', label: 'Por km', ejemplo: 'ej: 2.20€ × km', icon: MapPin },
  { value: 'per_day', label: 'Por día', ejemplo: 'ej: 18€ × días', icon: Calendar },
  { value: 'per_hour', label: 'Por hora', ejemplo: 'ej: 12€ × horas', icon: Clock },
  { value: 'per_x_km', label: 'Cada X km', ejemplo: 'ej: 800€ cada 10.000 km', icon: Wrench },
  { value: 'fixed', label: 'Importe fijo', ejemplo: 'ej: 50€ siempre', icon: Pin },
  { value: 'percent', label: '% sobre subtotal', ejemplo: 'ej: +15% sobre el total', icon: Percent },
]

const CONDICION_TIPOS: { value: string; label: string; desc: string; icon: LucideIcon }[] = [
  { value: 'siempre', label: 'Siempre', desc: 'Se aplica en todos los servicios', icon: CircleCheck },
  { value: 'franja', label: 'Franja horaria', desc: 'Si el servicio toca ese intervalo de horas', icon: Clock },
  { value: 'umbral_horas', label: 'Jornada mínima', desc: 'Si el servicio supera X horas', icon: Hourglass },
  { value: 'umbral_km', label: 'Km mínimos', desc: 'Si el servicio supera X km', icon: Ruler },
  { value: 'dia_especial', label: 'Día especial', desc: 'Si el servicio cae en un día concreto', icon: CalendarDays },
]

const DIAS_ESPECIALES = [
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
  { value: 'festivo_nacional', label: 'Festivo nacional' },
  { value: 'festivo_local', label: 'Festivo local' },
]

const HORAS = Array.from({ length: 24 }, (_, i) => i)
const pad = (n: number) => String(n).padStart(2, '0')

type ExclusionGroup = {
  id: string
  nombre: string
  modo: 'max' | 'sum'
}

type CostVariable = {
  id: string
  nombre: string
  tipo: string
  valor: number
  intervalo_km: number | null
  franja_hora_inicio: number | null
  franja_hora_fin: number | null
  condicion_tipo: string | null
  condicion_valor: any
  grupo_exclusion_id: string | null
  prioridad: number
  obligatoria: boolean
  activa: boolean
  orden: number
}

type Props = { companyId: string }

const emptyForm = {
  nombre: '',
  tipo: 'fixed',
  valor: '',
  intervalo_km: '',
  condicion_tipo: 'siempre',
  franja_inicio: '',
  franja_fin: '',
  umbral_valor: '',
  dia_especial: 'domingo',
  grupo_exclusion_id: '',
  prioridad: '0',
  obligatoria: false,
}

const emptyGroupForm = { nombre: '', modo: 'max' as 'max' | 'sum' }

function formatCondicion(v: CostVariable) {
  if (!v.condicion_tipo || v.condicion_tipo === 'siempre') return 'Siempre'
  if (v.condicion_tipo === 'franja') {
    return `Si cubre ${pad(v.franja_hora_inicio ?? 0)}:00–${pad(v.franja_hora_fin ?? 0)}:00`
  }
  if (v.condicion_tipo === 'umbral_horas') return `Si jornada > ${v.condicion_valor?.min}h`
  if (v.condicion_tipo === 'umbral_km') return `Si km > ${v.condicion_valor?.min}`
  if (v.condicion_tipo === 'dia_especial') return `En ${DIAS_ESPECIALES.find(d => d.value === v.condicion_valor?.dia)?.label ?? v.condicion_valor?.dia}`
  return ''
}

function formatCalculo(v: CostVariable) {
  switch (v.tipo) {
    case 'per_km': return `${v.valor}€ × km`
    case 'per_day': return `${v.valor}€ × días`
    case 'per_hour': return `${v.valor}€ × horas`
    case 'per_x_km': return `${v.valor}€ cada ${v.intervalo_km?.toLocaleString()} km`
    case 'fixed': return `${v.valor}€ fijo`
    case 'percent': return `${v.valor}% sobre subtotal`
    default: return ''
  }
}

export default function CostVariablesManager({ companyId }: Props) {
  const [variables, setVariables] = useState<CostVariable[]>([])
  const [groups, setGroups] = useState<ExclusionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'variables' | 'grupos'>('variables')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [groupForm, setGroupForm] = useState(emptyGroupForm)
  const [savingGroup, setSavingGroup] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: vars }, { data: grps }] = await Promise.all([
      supabase.from('cost_variables').select('*').eq('company_id', companyId).order('orden'),
      supabase.from('exclusion_groups').select('*').eq('company_id', companyId).order('nombre'),
    ])
    setVariables(vars || [])
    setGroups(grps || [])
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
      condicion_tipo: v.condicion_tipo || 'siempre',
      franja_inicio: v.franja_hora_inicio !== null ? String(v.franja_hora_inicio) : '',
      franja_fin: v.franja_hora_fin !== null ? String(v.franja_hora_fin) : '',
      umbral_valor: v.condicion_valor?.min ? String(v.condicion_valor.min) : '',
      dia_especial: v.condicion_valor?.dia || 'domingo',
      grupo_exclusion_id: v.grupo_exclusion_id || '',
      prioridad: String(v.prioridad || 0),
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
      return setError('Indica cada cuántos km se aplica')
    }
    if (form.condicion_tipo === 'franja' && (form.franja_inicio === '' || form.franja_fin === '')) {
      return setError('Indica la hora de inicio y fin de la franja')
    }
    if ((form.condicion_tipo === 'umbral_horas' || form.condicion_tipo === 'umbral_km') && !form.umbral_valor) {
      return setError('Indica el valor mínimo')
    }

    setSaving(true)
    setError('')

    let condicion_valor = null
    if (form.condicion_tipo === 'franja') {
      condicion_valor = { inicio: Number(form.franja_inicio), fin: Number(form.franja_fin) }
    } else if (form.condicion_tipo === 'umbral_horas' || form.condicion_tipo === 'umbral_km') {
      condicion_valor = { min: Number(form.umbral_valor) }
    } else if (form.condicion_tipo === 'dia_especial') {
      condicion_valor = { dia: form.dia_especial }
    }

    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      valor: Number(form.valor),
      intervalo_km: form.tipo === 'per_x_km' ? Number(form.intervalo_km) : null,
      franja_hora_inicio: form.condicion_tipo === 'franja' ? Number(form.franja_inicio) : null,
      franja_hora_fin: form.condicion_tipo === 'franja' ? Number(form.franja_fin) : null,
      condicion_tipo: form.condicion_tipo,
      condicion_valor,
      grupo_exclusion_id: form.grupo_exclusion_id || null,
      prioridad: Number(form.prioridad),
      obligatoria: form.obligatoria,
    }

    if (editingId) {
      await supabase.from('cost_variables').update(payload).eq('id', editingId)
    } else {
      const maxOrden = variables.length > 0 ? Math.max(...variables.map(v => v.orden)) + 1 : 1
      await supabase.from('cost_variables').insert({ ...payload, company_id: companyId, activa: true, orden: maxOrden })
    }

    await fetchAll()
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

  async function handleSaveGroup() {
    if (!groupForm.nombre.trim()) return
    setSavingGroup(true)
    if (editingGroupId) {
      await supabase.from('exclusion_groups').update({ nombre: groupForm.nombre, modo: groupForm.modo }).eq('id', editingGroupId)
    } else {
      await supabase.from('exclusion_groups').insert({ company_id: companyId, nombre: groupForm.nombre, modo: groupForm.modo })
    }
    await fetchAll()
    setShowGroupForm(false)
    setEditingGroupId(null)
    setGroupForm(emptyGroupForm)
    setSavingGroup(false)
  }

  async function handleDeleteGroup(id: string) {
    await supabase.from('exclusion_groups').delete().eq('id', id)
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  const s = {
    input: { height: 40, width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 12px', fontSize: 13, background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const, outline: 'none' },
    label: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', display: 'block', marginBottom: 5 },
    select: { height: 40, width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '0 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const, outline: 'none' },
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* HEADER + TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Variables de coste</p>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>Motor universal de reglas por empresa</p>
        </div>
        <button
          onClick={() => { tab === 'variables' ? openNew() : setShowGroupForm(true) }}
          style={{ height: 38, padding: '0 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          {tab === 'variables' ? '+ Nueva variable' : '+ Nuevo grupo'}
        </button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {[{ id: 'variables', label: `Variables (${variables.length})` }, { id: 'grupos', label: `Grupos de exclusión (${groups.length})` }].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id as any); setShowForm(false); setShowGroupForm(false) }}
            style={{ flex: 1, height: 34, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#111827' : '#6b7280', boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== TAB VARIABLES ===== */}
      {tab === 'variables' && (
        <>
          {/* FORMULARIO VARIABLE */}
          {showForm && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: 22, marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 18px' }}>
                {editingId ? 'Editar variable' : 'Nueva variable'}
              </p>

              {/* Nombre */}
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Nombre</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Nocturnidad, Plus comida, Plus 11h..." style={s.input} />
              </div>

              {/* Tipo de cálculo */}
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>¿Cómo se calcula?</label>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                  {TIPOS_CALCULO.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                      style={{ padding: '7px 12px', borderRadius: 9, border: `2px solid ${form.tipo === t.value ? '#1e3a5f' : '#e5e7eb'}`, background: form.tipo === t.value ? '#1e3a5f' : '#fff', color: form.tipo === t.value ? '#fff' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                      {createElement(t.icon, { style: { width: 14, height: 14 } })} {t.label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{TIPOS_CALCULO.find(t => t.value === form.tipo)?.ejemplo}</p>
              </div>

              {/* Valor + intervalo */}
              <div style={{ display: 'grid', gridTemplateColumns: form.tipo === 'per_x_km' ? '1fr 1fr' : '200px 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={s.label}>{form.tipo === 'percent' ? 'Porcentaje (%)' : 'Importe (€)'}</label>
                  <input type="number" step="0.01" placeholder="0" value={form.valor}
                    onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} style={s.input} />
                </div>
                {form.tipo === 'per_x_km' && (
                  <div>
                    <label style={s.label}>Cada cuántos km</label>
                    <input type="number" placeholder="Ej: 10000" value={form.intervalo_km}
                      onChange={e => setForm(f => ({ ...f, intervalo_km: e.target.value }))} style={s.input} />
                  </div>
                )}
              </div>

              {/* Condición de activación */}
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>¿Cuándo aplica?</label>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                  {CONDICION_TIPOS.map(c => (
                    <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, condicion_tipo: c.value }))}
                      style={{ padding: '10px 14px', borderRadius: 9, border: `2px solid ${form.condicion_tipo === c.value ? '#1e3a5f' : '#e5e7eb'}`, background: form.condicion_tipo === c.value ? '#f0f4ff' : '#fff', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {createElement(c.icon, { style: { width: 18, height: 18, color: form.condicion_tipo === c.value ? '#1e3a5f' : '#6b7280', flexShrink: 0 } })}
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: form.condicion_tipo === c.value ? '#1e3a5f' : '#374151', margin: 0 }}>{c.label}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{c.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detalles según condición */}
              {form.condicion_tipo === 'franja' && (
                <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <label style={s.label}>Franja horaria</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <select value={form.franja_inicio} onChange={e => setForm(f => ({ ...f, franja_inicio: e.target.value }))} style={{ ...s.select, width: 100 }}>
                      <option value="">--</option>
                      {HORAS.map(h => <option key={h} value={h}>{pad(h)}:00</option>)}
                    </select>
                    <span style={{ color: '#9ca3af' }}>→</span>
                    <select value={form.franja_fin} onChange={e => setForm(f => ({ ...f, franja_fin: e.target.value }))} style={{ ...s.select, width: 100 }}>
                      <option value="">--</option>
                      {HORAS.map(h => <option key={h} value={h}>{pad(h)}:00</option>)}
                    </select>
                  </div>
                  {form.franja_inicio !== '' && form.franja_fin !== '' && (
                    <div style={{ marginTop: 10, background: '#f0f4ff', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#1e3a5f', fontWeight: 600 }}>
                      Aplica si el servicio cubre las {pad(Number(form.franja_inicio))}:00–{pad(Number(form.franja_fin))}:00
                    </div>
                  )}
                </div>
              )}

              {(form.condicion_tipo === 'umbral_horas' || form.condicion_tipo === 'umbral_km') && (
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>{form.condicion_tipo === 'umbral_horas' ? 'Mínimo de horas' : 'Mínimo de km'}</label>
                  <input type="number" placeholder={form.condicion_tipo === 'umbral_horas' ? 'Ej: 11' : 'Ej: 500'}
                    value={form.umbral_valor} onChange={e => setForm(f => ({ ...f, umbral_valor: e.target.value }))}
                    style={{ ...s.input, maxWidth: 160 }} />
                </div>
              )}

              {form.condicion_tipo === 'dia_especial' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>Día especial</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                    {DIAS_ESPECIALES.map(d => (
                      <button key={d.value} type="button" onClick={() => setForm(f => ({ ...f, dia_especial: d.value }))}
                        style={{ padding: '7px 14px', borderRadius: 9, border: `2px solid ${form.dia_especial === d.value ? '#1e3a5f' : '#e5e7eb'}`, background: form.dia_especial === d.value ? '#1e3a5f' : '#fff', color: form.dia_especial === d.value ? '#fff' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grupo de exclusión */}
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Grupo de exclusión (opcional)</label>
                <select value={form.grupo_exclusion_id} onChange={e => setForm(f => ({ ...f, grupo_exclusion_id: e.target.value }))} style={s.select}>
                  <option value="">Sin grupo — se acumula con todo</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.nombre} ({g.modo === 'max' ? 'solo el mayor' : 'se suman'})</option>
                  ))}
                </select>
                {groups.length === 0 && (
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>
                    Crea grupos en la pestaña "Grupos de exclusión" para agrupar variables incompatibles
                  </p>
                )}
              </div>

              {/* Prioridad (solo si tiene grupo modo max) */}
              {form.grupo_exclusion_id && groups.find(g => g.id === form.grupo_exclusion_id)?.modo === 'max' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>Prioridad dentro del grupo</label>
                  <input type="number" placeholder="0" value={form.prioridad}
                    onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
                    style={{ ...s.input, maxWidth: 120 }} />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Mayor número = mayor prioridad. Si empatan, gana el de mayor importe.</p>
                </div>
              )}

              {/* Obligatoria */}
              <div style={{ marginBottom: 18 }}>
                <label style={s.label}>¿El gestor puede desactivarla?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ value: false, label: 'Sí, puede desactivarla', sub: 'Opcional por presupuesto' }, { value: true, label: 'No, siempre aplica', sub: 'Si la condición se cumple, no se puede quitar' }].map(opt => (
                    <button key={String(opt.value)} type="button" onClick={() => setForm(f => ({ ...f, obligatoria: opt.value }))}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 9, border: `2px solid ${form.obligatoria === opt.value ? '#1e3a5f' : '#e5e7eb'}`, background: form.obligatoria === opt.value ? '#f0f4ff' : '#fff', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: 'left' as const }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: form.obligatoria === opt.value ? '#1e3a5f' : '#374151', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{error}</p>}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ height: 40, padding: '0 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear variable'}
                </button>
                <button onClick={() => { setShowForm(false); setError('') }}
                  style={{ height: 40, padding: '0 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* LISTA VARIABLES */}
          {loading ? <p style={{ fontSize: 13, color: '#9ca3af' }}>Cargando...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {variables.length === 0 && !showForm ? (
                <div style={{ textAlign: 'center' as const, padding: '40px 20px' }}>
                  <Settings style={{ width: 30, height: 30, color: '#9ca3af', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>Sin variables aún</p>
                  <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>Crea la primera variable de coste</p>
                </div>
              ) : variables.map(v => {
                const grupo = groups.find(g => g.id === v.grupo_exclusion_id)
                return (
                  <div key={v.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, opacity: v.activa ? 1 : 0.5, borderLeft: `4px solid ${grupo ? '#7c3aed' : v.obligatoria ? '#1e3a5f' : '#e5e7eb'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{v.nombre}</span>
                        {v.obligatoria && <span style={{ fontSize: 9, fontWeight: 700, background: '#eff6ff', color: '#1e3a5f', borderRadius: 4, padding: '1px 5px' }}>FIJA</span>}
                        {grupo && <span style={{ fontSize: 9, fontWeight: 700, background: '#f5f3ff', color: '#7c3aed', borderRadius: 4, padding: '1px 5px' }}>G: {grupo.nombre}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}><Wallet style={{ width: 12, height: 12 }} /> {formatCalculo(v)}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}><ClipboardList style={{ width: 12, height: 12 }} /> {formatCondicion(v)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => toggleActiva(v)}
                        style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: v.activa ? '#1e3a5f' : '#d1d5db', position: 'relative' as const, padding: 0 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute' as const, top: 3, left: v.activa ? 18 : 4, transition: 'left 0.2s' }} />
                      </button>
                      <button onClick={() => openEdit(v)}
                        style={{ height: 32, padding: '0 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        Editar
                      </button>
                      <button onClick={() => handleDelete(v.id)} disabled={deletingId === v.id}
                        style={{ height: 32, padding: '0 12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        {deletingId === v.id ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ===== TAB GRUPOS ===== */}
      {tab === 'grupos' && (
        <>
          {showGroupForm && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: 22, marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
                {editingGroupId ? 'Editar grupo' : 'Nuevo grupo de exclusión'}
              </p>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>Nombre del grupo</label>
                <input value={groupForm.nombre} onChange={e => setGroupForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Día especial, Extras nocturnos..." style={s.input} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={s.label}>¿Cómo se comportan las variables del grupo?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'max', label: 'Solo el mayor', sub: 'Si aplican varias, solo se cobra la de mayor importe' },
                    { value: 'sum', label: 'Se acumulan', sub: 'Todas las que aplican se suman entre sí' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setGroupForm(f => ({ ...f, modo: opt.value as any }))}
                      style={{ flex: 1, padding: '12px 14px', borderRadius: 9, border: `2px solid ${groupForm.modo === opt.value ? '#1e3a5f' : '#e5e7eb'}`, background: groupForm.modo === opt.value ? '#f0f4ff' : '#fff', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: 'left' as const }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: groupForm.modo === opt.value ? '#1e3a5f' : '#374151', margin: 0 }}>{opt.label}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0' }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveGroup} disabled={savingGroup}
                  style={{ height: 40, padding: '0 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {savingGroup ? 'Guardando...' : editingGroupId ? 'Guardar cambios' : 'Crear grupo'}
                </button>
                <button onClick={() => { setShowGroupForm(false); setEditingGroupId(null); setGroupForm(emptyGroupForm) }}
                  style={{ height: 40, padding: '0 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {groups.length === 0 && !showGroupForm ? (
              <div style={{ textAlign: 'center' as const, padding: '40px 20px' }}>
                <Layers style={{ width: 30, height: 30, color: '#9ca3af', margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>Sin grupos aún</p>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>Los grupos definen qué variables son incompatibles entre sí</p>
              </div>
            ) : groups.map(g => {
              const varsDelGrupo = variables.filter(v => v.grupo_exclusion_id === g.id)
              return (
                <div key={g.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', borderLeft: '4px solid #7c3aed' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{g.nombre}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, background: g.modo === 'max' ? '#fef3c7' : '#dcfce7', color: g.modo === 'max' ? '#92400e' : '#166534', borderRadius: 4, padding: '1px 6px' }}>
                          {g.modo === 'max' ? 'Solo el mayor' : 'Se acumulan'}
                        </span>
                      </div>
                      {varsDelGrupo.length > 0 ? (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                          {varsDelGrupo.map(v => (
                            <span key={v.id} style={{ fontSize: 11, background: '#f5f3ff', color: '#7c3aed', borderRadius: 4, padding: '2px 7px', fontWeight: 500 }}>{v.nombre}</span>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Sin variables asignadas aún</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setEditingGroupId(g.id); setGroupForm({ nombre: g.nombre, modo: g.modo }); setShowGroupForm(true) }}
                        style={{ height: 32, padding: '0 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        Editar
                      </button>
                      <button onClick={() => handleDeleteGroup(g.id)}
                        style={{ height: 32, padding: '0 12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}