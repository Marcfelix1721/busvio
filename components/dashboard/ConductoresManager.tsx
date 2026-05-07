'use client'

import { useState } from 'react'
import { CheckCircle, Clock, Circle, Eye, EyeOff, UserPlus } from 'lucide-react'

type Staff = {
  id: string
  nombre: string
  rol: string
  estado: string
  email: string | null
  user_id: string | null
}

type Servicio = {
  id: string
  origin: string
  destination: string
  departure_time: string
  trip_date: string
}

type Assignment = {
  staff_id: string
  quote_request_id: string
  rol_en_servicio: string
  estado_conductor?: string | null
  visto_at?: string | null
  iniciado_at?: string | null
  finalizado_at?: string | null
}

type Log = {
  id: string
  quote_request_id: string
  staff_id: string
  inicio: string | null
  fin: string | null
}

type Props = {
  staff: Staff[]
  serviciosHoy: Servicio[]
  assignments: Assignment[]
  logs: Log[]
  companyId: string
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const ESTADO_CFG: Record<string, { emoji: string; label: string; color: string; bg: string; dot: string; border: string }> = {
  asignado:   { emoji: '📋', label: 'Asignado',   color: '#1e40af', bg: '#eff6ff', dot: '#3b82f6', border: '#bfdbfe' },
  visto:      { emoji: '👁️',  label: 'Visto',      color: '#6b7280', bg: '#f9fafb', dot: '#9ca3af', border: '#e5e7eb' },
  iniciado:   { emoji: '🟢', label: 'En curso',   color: '#b45309', bg: '#fffbeb', dot: '#f59e0b', border: '#fde68a' },
  finalizado: { emoji: '✅', label: 'Finalizado', color: '#166534', bg: '#f0fdf4', dot: '#22c55e', border: '#bbf7d0' },
  incidencia: { emoji: '🚨', label: 'Incidencia', color: '#991b1b', bg: '#fef2f2', dot: '#ef4444', border: '#fecaca' },
  sin_servicio: { emoji: '💤', label: 'Sin servicio', color: '#9ca3af', bg: '#f9fafb', dot: '#d1d5db', border: '#e5e7eb' },
}

// Orden de progreso para barra visual
const PROGRESO: Record<string, number> = { asignado: 1, visto: 2, iniciado: 3, finalizado: 4, incidencia: 0 }

export default function ConductoresManager({ staff, serviciosHoy, assignments, logs, companyId }: Props) {
  const [showForm, setShowForm] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [staffState, setStaffState] = useState<Staff[]>(staff)

  function getServiciosAll(staffId: string) {
    return assignments.filter(a => a.staff_id === staffId)
  }

  function getLog(staffId: string) {
    const assignment = assignments.find(a => a.staff_id === staffId)
    if (!assignment) return null
    return logs.find(l => l.quote_request_id === assignment.quote_request_id && l.staff_id === staffId) ?? null
  }

  function getEstadoPrincipal(staffId: string) {
    const asignaciones = assignments.filter(a => a.staff_id === staffId)
    if (asignaciones.length === 0) return ESTADO_CFG.sin_servicio
    // Mostrar el estado más activo (prioridad: incidencia > iniciado > visto > asignado > finalizado)
    const prioridad = ['incidencia', 'iniciado', 'visto', 'asignado', 'finalizado']
    for (const p of prioridad) {
      if (asignaciones.some(a => (a.estado_conductor || 'asignado') === p)) return ESTADO_CFG[p]
    }
    return ESTADO_CFG.sin_servicio
  }

  async function handleCrearAcceso(staffId: string) {
    if (!email.trim() || !password.trim()) return setError('Rellena email y contraseña')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    setSaving(true)
    setError('')
    const res = await fetch('/api/crear-conductor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId, email, password, company_id: companyId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Error al crear acceso')
    } else {
      setSuccess('Acceso creado correctamente')
      setStaffState(prev => prev.map(s => s.id === staffId ? { ...s, email, user_id: data.user_id } : s))
      setShowForm(null)
      setEmail('')
      setPassword('')
      setTimeout(() => setSuccess(''), 3000)
    }
    setSaving(false)
  }

  const st = {
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, marginBottom: 12 },
    label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' },
    input: { width: '100%', height: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const },
    btnPrimary: { background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" },
    btnSecondary: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" },
  }

  const enServicio = staffState.filter(s => {
    const asigs = assignments.filter(a => a.staff_id === s.id)
    return asigs.some(a => (a.estado_conductor || '') === 'iniciado')
  }).length
  const completados = staffState.filter(s => {
    const asigs = assignments.filter(a => a.staff_id === s.id)
    return asigs.every(a => a.estado_conductor === 'finalizado') && asigs.length > 0
  }).length
  const sinAcceso = staffState.filter(s => !s.user_id).length

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#166534', fontWeight: 500 }}>
          ✅ {success}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'En servicio', value: enServicio, emoji: '🟢', color: '#d97706', bg: '#fffbeb' },
          { label: 'Completados', value: completados, emoji: '✅', color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Sin acceso app', value: sinAcceso, emoji: '💤', color: '#6b7280', bg: '#f9fafb' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{kpi.emoji}</div>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>{kpi.value}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0', fontWeight: 500 }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Estado en tiempo real — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {staffState.length === 0 ? (
        <div style={{ ...st.card, textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <p style={{ fontSize: 14 }}>No hay conductores registrados</p>
          <p style={{ fontSize: 12 }}>Añádelos en <a href="/dashboard/staff" style={{ color: '#1e3a5f' }}>Personal</a></p>
        </div>
      ) : staffState.map(conductor => {
        const estadoPrincipal = getEstadoPrincipal(conductor.id)
        const isFormOpen = showForm === conductor.id
        const todosServicios = getServiciosAll(conductor.id)

        return (
          <div key={conductor.id} style={{ ...st.card, borderLeft: `4px solid ${estadoPrincipal.border}` }}>
            {/* Cabecera conductor */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                {/* Avatar con emoji de estado */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#374151' }}>{conductor.nombre[0].toUpperCase()}</span>
                  </div>
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #e5e7eb', fontSize: 11
                  }}>
                    {estadoPrincipal.emoji}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{conductor.nombre}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                    {conductor.email || 'Sin acceso a app'}
                  </p>
                </div>
              </div>

              {/* Badge estado principal */}
              <span style={{
                fontSize: 12, fontWeight: 700,
                background: estadoPrincipal.bg, color: estadoPrincipal.color,
                borderRadius: 20, padding: '4px 12px', whiteSpace: 'nowrap' as const,
                border: `1px solid ${estadoPrincipal.border}`
              }}>
                {estadoPrincipal.emoji} {estadoPrincipal.label}
              </span>

              {!conductor.user_id && (
                <button style={st.btnPrimary} onClick={() => { setShowForm(isFormOpen ? null : conductor.id); setError('') }}>
                  <UserPlus style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />
                  Dar acceso
                </button>
              )}
            </div>

            {/* Servicios asignados */}
            {todosServicios.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todosServicios.map(assignment => {
                  const servicio = [...serviciosHoy].find(sv => sv.id === assignment.quote_request_id)
                  const estadoLabel = assignment.estado_conductor || 'asignado'
                  const cfg = ESTADO_CFG[estadoLabel] || ESTADO_CFG.asignado
                  const progreso = PROGRESO[estadoLabel] || 0

                  return (
                    <div key={assignment.quote_request_id} style={{
                      background: '#f9fafb', border: `1px solid ${cfg.border}`,
                      borderRadius: 12, padding: '12px 14px'
                    }}>
                      {/* Ruta y estado */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
                          {servicio
                            ? `${servicio.origin.split(',')[0]} → ${servicio.destination.split(',')[0]}`
                            : assignment.quote_request_id.slice(0, 8)}
                        </p>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          background: cfg.bg, color: cfg.color,
                          borderRadius: 20, padding: '3px 10px',
                          border: `1px solid ${cfg.border}`
                        }}>
                          {cfg.emoji} {cfg.label}
                        </span>
                      </div>

                      {/* Hora salida */}
                      {servicio && (
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>
                          ⏰ Salida: <strong>{servicio.departure_time}</strong>
                        </p>
                      )}

                      {/* Barra de progreso */}
                      {estadoLabel !== 'incidencia' && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {[
                            { step: 1, label: '📋', title: 'Asignado' },
                            { step: 2, label: '👁️', title: 'Visto' },
                            { step: 3, label: '🟢', title: 'En curso' },
                            { step: 4, label: '✅', title: 'Finalizado' },
                          ].map((item, i, arr) => (
                            <div key={item.step} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 'none' }}>
                              <div style={{ textAlign: 'center' as const }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%',
                                  background: progreso >= item.step ? cfg.bg : '#f3f4f6',
                                  border: `2px solid ${progreso >= item.step ? cfg.dot : '#e5e7eb'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 13
                                }}>
                                  {item.label}
                                </div>
                              </div>
                              {i < arr.length - 1 && (
                                <div style={{
                                  flex: 1, height: 2, margin: '0 4px',
                                  background: progreso > item.step ? cfg.dot : '#e5e7eb',
                                  borderRadius: 2
                                }} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Timestamps */}
                      {(assignment.visto_at || assignment.iniciado_at || assignment.finalizado_at) && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' as const }}>
                          {assignment.visto_at && (
                            <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', borderRadius: 6, padding: '2px 8px' }}>
                              👁️ {fmtTime(assignment.visto_at)}
                            </span>
                          )}
                          {assignment.iniciado_at && (
                            <span style={{ fontSize: 11, color: '#b45309', background: '#fffbeb', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                              🟢 {fmtTime(assignment.iniciado_at)}
                            </span>
                          )}
                          {assignment.finalizado_at && (
                            <span style={{ fontSize: 11, color: '#166534', background: '#f0fdf4', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                              ✅ {fmtTime(assignment.finalizado_at)}
                            </span>
                          )}
                        </div>
                      )}

                      {estadoLabel === 'incidencia' && (
                        <div style={{ marginTop: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px' }}>
                          <p style={{ fontSize: 12, color: '#991b1b', fontWeight: 600, margin: 0 }}>🚨 Hay una incidencia reportada</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Formulario dar acceso */}
            {isFormOpen && (
              <div style={{ marginTop: 14, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
                  Crear acceso para {conductor.nombre}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={st.label}>Email</label>
                    <input style={st.input} type="email" placeholder="conductor@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label style={st.label}>Contraseña</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        style={{ ...st.input, paddingRight: 36 }}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: 10, top: 9, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                      >
                        {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                  </div>
                </div>
                {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{error}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={st.btnPrimary} onClick={() => handleCrearAcceso(conductor.id)} disabled={saving}>
                    {saving ? 'Creando...' : 'Crear acceso'}
                  </button>
                  <button style={st.btnSecondary} onClick={() => setShowForm(null)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}