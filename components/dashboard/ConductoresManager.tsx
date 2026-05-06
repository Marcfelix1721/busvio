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

export default function ConductoresManager({ staff, serviciosHoy, assignments, logs, companyId }: Props) {
  const [showForm, setShowForm] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [staffState, setStaffState] = useState<Staff[]>(staff)

  function getServicioHoy(staffId: string) {
    const assignment = assignments.find(a => a.staff_id === staffId)
    if (!assignment) return null
    return serviciosHoy.find(s => s.id === assignment.quote_request_id) ?? null
  }

  function getServiciosAll(staffId: string) {
    return assignments.filter(a => a.staff_id === staffId)
  }

  function getLog(staffId: string) {
    const assignment = assignments.find(a => a.staff_id === staffId)
    if (!assignment) return null
    return logs.find(l => l.quote_request_id === assignment.quote_request_id && l.staff_id === staffId) ?? null
  }

  function getEstado(staffId: string): { label: string; color: string; bg: string; dot: string } {
    const servicio = getServicioHoy(staffId)
    if (!servicio) return { label: 'Sin servicio hoy', color: '#6b7280', bg: '#f9fafb', dot: '#d1d5db' }
    const log = getLog(staffId)
    if (log?.fin) return { label: 'Completado', color: '#166534', bg: '#f0fdf4', dot: '#22c55e' }
    if (log?.inicio) return { label: 'En servicio', color: '#b45309', bg: '#fffbeb', dot: '#f59e0b' }
    return { label: 'Pendiente', color: '#1e40af', bg: '#eff6ff', dot: '#3b82f6' }
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

  const s = {
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, marginBottom: 12 },
    label: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' },
    input: { width: '100%', height: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const },
    btnPrimary: { background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" },
    btnSecondary: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" },
  }

  // KPIs
  const enServicio = staffState.filter(s => {
    const log = getLog(s.id)
    return log?.inicio && !log?.fin
  }).length
  const completados = staffState.filter(s => !!getLog(s.id)?.fin).length
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
          { label: 'En servicio ahora', value: enServicio, icon: <Clock style={{ width: 16, height: 16 }} />, color: '#d97706', bg: '#fffbeb' },
          { label: 'Completados hoy', value: completados, icon: <CheckCircle style={{ width: 16, height: 16 }} />, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Sin acceso app', value: sinAcceso, icon: <Circle style={{ width: 16, height: 16 }} />, color: '#6b7280', bg: '#f9fafb' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: kpi.color }}>
              <div style={{ width: 32, height: 32, background: kpi.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kpi.icon}
              </div>
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>{kpi.value}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0', fontWeight: 500 }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* LISTA CONDUCTORES */}
      <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Estado en tiempo real — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {staffState.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <p style={{ fontSize: 14 }}>No hay conductores registrados</p>
          <p style={{ fontSize: 12 }}>Añádelos en <a href="/dashboard/staff" style={{ color: '#1e3a5f' }}>Personal</a></p>
        </div>
      ) : staffState.map(conductor => {
        const estado = getEstado(conductor.id)
        const isFormOpen = showForm === conductor.id

        return (
          <div key={conductor.id} style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>

              {/* Avatar + info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>{conductor.nombre[0].toUpperCase()}</span>
                  <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: estado.dot, border: '2px solid #fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{conductor.nombre}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                    {conductor.email || 'Sin acceso a app'}
                  </p>
                </div>
              </div>

              {/* Estado badge */}
              <span style={{ fontSize: 11, fontWeight: 700, background: estado.bg, color: estado.color, borderRadius: 20, padding: '4px 10px', whiteSpace: 'nowrap' as const }}>
                {estado.label}
              </span>

              {/* Botón dar acceso */}
              {!conductor.user_id && (
                <button
                  style={s.btnPrimary}
                  onClick={() => { setShowForm(isFormOpen ? null : conductor.id); setError('') }}
                >
                  <UserPlus style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />
                  Dar acceso
                </button>
              )}
            </div>

            {/* Todos los servicios asignados */}
            {(() => {
              const todosServicios = getServiciosAll(conductor.id)
              if (todosServicios.length === 0) return null
              return (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {todosServicios.map(assignment => {
                    const s = [...serviciosHoy].find(sv => sv.id === assignment.quote_request_id)
                    const estadoLabel = assignment.estado_conductor || 'asignado'
                    const estadoCfg: Record<string, { label: string; color: string; bg: string }> = {
                      asignado:   { label: 'Asignado',   color: '#1e40af', bg: '#eff6ff' },
                      visto:      { label: 'Visto',      color: '#6b7280', bg: '#f9fafb' },
                      iniciado:   { label: 'En curso',   color: '#b45309', bg: '#fffbeb' },
                      finalizado: { label: 'Finalizado', color: '#166534', bg: '#f0fdf4' },
                      incidencia: { label: 'Incidencia', color: '#991b1b', bg: '#fef2f2' },
                    }
                    const cfg = estadoCfg[estadoLabel] || estadoCfg.asignado
                    return (
                      <div key={assignment.quote_request_id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>
                            {s ? `${s.origin.split(',')[0]} → ${s.destination.split(',')[0]}` : assignment.quote_request_id.slice(0, 8)}
                          </p>
                          <span style={{ fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '2px 8px' }}>
                            {cfg.label}
                          </span>
                        </div>
                        {s && <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>Salida: {s.departure_time}</p>}
                        {assignment.iniciado_at && (
                          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>▶ {fmtTime(assignment.iniciado_at)}</span>
                            {assignment.finalizado_at && (
                              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>■ {fmtTime(assignment.finalizado_at)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* Formulario dar acceso */}
            {isFormOpen && (
              <div style={{ marginTop: 14, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
                  Crear acceso para {conductor.nombre}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={s.label}>Email</label>
                    <input style={s.input} type="email" placeholder="conductor@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label style={s.label}>Contraseña</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        style={{ ...s.input, paddingRight: 36 }}
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
                  <button style={s.btnPrimary} onClick={() => handleCrearAcceso(conductor.id)} disabled={saving}>
                    {saving ? 'Creando...' : 'Crear acceso'}
                  </button>
                  <button style={s.btnSecondary} onClick={() => setShowForm(null)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}