'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Clock, Users, Bus, Phone, AlertTriangle, CheckCircle, PlayCircle, Navigation, Eye } from 'lucide-react'
import Link from 'next/link'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TIPOS_INCIDENCIA = [
  { value: 'retraso', label: '⏰ Retraso' },
  { value: 'averia', label: '🔧 Avería' },
  { value: 'cliente_no_aparece', label: '👤 Cliente no aparece' },
  { value: 'cambio_ruta', label: '🗺️ Cambio de ruta' },
  { value: 'accidente', label: '🚨 Accidente/Emergencia' },
  { value: 'otro', label: '📝 Otro' },
]

const ESTADO_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string; dot: string; border: string }> = {
  asignado:   { emoji: '📋', label: 'Asignado',   color: '#1e40af', bg: '#eff6ff', dot: '#3b82f6', border: '#bfdbfe' },
  visto:      { emoji: '👁️',  label: 'Visto',      color: '#6b7280', bg: '#f9fafb', dot: '#9ca3af', border: '#e5e7eb' },
  iniciado:   { emoji: '🟢', label: 'En curso',   color: '#b45309', bg: '#fffbeb', dot: '#f59e0b', border: '#fde68a' },
  finalizado: { emoji: '✅', label: 'Finalizado', color: '#166534', bg: '#f0fdf4', dot: '#22c55e', border: '#bbf7d0' },
  incidencia: { emoji: '🚨', label: 'Incidencia', color: '#991b1b', bg: '#fef2f2', dot: '#ef4444', border: '#fecaca' },
}

const ROL_LABELS: Record<string, string> = {
  conductor_principal: '🚌 Conductor principal',
  conductor_relevo: '🔄 Conductor relevo',
  guia: '🗺️ Guía',
  monitor: '👁️ Monitor',
}

const PROGRESO_PASOS = [
  { key: 'asignado',   emoji: '📋', label: 'Asignado' },
  { key: 'visto',      emoji: '👁️',  label: 'Visto' },
  { key: 'iniciado',   emoji: '🟢', label: 'En curso' },
  { key: 'finalizado', emoji: '✅', label: 'Finalizado' },
]
const PROGRESO_IDX: Record<string, number> = { asignado: 0, visto: 1, iniciado: 2, finalizado: 3, incidencia: -1 }

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

type Props = {
  servicio: any
  assignment: any
  vehiculo: any
  incidencias: any[]
  company: any
  staffId: string
}

export default function ServicioDetalle({ servicio, assignment, vehiculo, incidencias, company, staffId }: Props) {
  const [estado, setEstado] = useState(assignment.estado_conductor)
  const [visitoAt, setVistoAt] = useState(assignment.visto_at)
  const [iniciadoAt, setIniciadoAt] = useState(assignment.iniciado_at)
  const [finalizadoAt, setFinalizadoAt] = useState(assignment.finalizado_at)
  const [loading, setLoading] = useState(false)
  const [showIncidencia, setShowIncidencia] = useState(false)
  const [tipoIncidencia, setTipoIncidencia] = useState('retraso')
  const [comentarioIncidencia, setComentarioIncidencia] = useState('')
  const [enviandoIncidencia, setEnviandoIncidencia] = useState(false)
  const [incidenciasState, setIncidenciasState] = useState(incidencias)

  const accentColor = company?.color_primario || '#1e3a5f'
  const estadoCfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.asignado
  const progresoIdx = PROGRESO_IDX[estado] ?? 0

  const stops = (() => { try { return JSON.parse(servicio.stops || '[]') } catch { return [] } })()

  const mapsUrl = () => {
    const waypoints = stops.length > 0 ? `&waypoints=${stops.map(encodeURIComponent).join('|')}` : ''
    return `https://www.google.com/maps/dir/${encodeURIComponent(servicio.origin)}/${encodeURIComponent(servicio.destination)}${waypoints}`
  }

  async function handleVisto() {
    setLoading(true)
    const now = new Date().toISOString()
    await supabase.from('service_assignments').update({ estado_conductor: 'visto', visto_at: now }).eq('id', assignment.id)
    setEstado('visto'); setVistoAt(now); setLoading(false)
  }

  async function handleIniciar() {
    setLoading(true)
    const now = new Date().toISOString()
    await supabase.from('service_assignments').update({ estado_conductor: 'iniciado', iniciado_at: now }).eq('id', assignment.id)
    setEstado('iniciado'); setIniciadoAt(now); setLoading(false)
  }

  async function handleFinalizar() {
    setLoading(true)
    const now = new Date().toISOString()
    await supabase.from('service_assignments').update({ estado_conductor: 'finalizado', finalizado_at: now }).eq('id', assignment.id)
    setEstado('finalizado'); setFinalizadoAt(now); setLoading(false)
  }

  async function handleIncidencia() {
    setEnviandoIncidencia(true)
    const { data } = await supabase.from('service_incidents').insert({
      service_assignment_id: assignment.id,
      tipo: tipoIncidencia,
      comentario: comentarioIncidencia,
    }).select().single()
    await supabase.from('service_assignments').update({ estado_conductor: 'incidencia' }).eq('id', assignment.id)
    if (data) setIncidenciasState(prev => [data, ...prev])
    setEstado('incidencia')
    setShowIncidencia(false)
    setComentarioIncidencia('')
    setEnviandoIncidencia(false)
  }

  const st = {
    page: { minHeight: '100vh', background: '#f5f5f4', fontFamily: "'DM Sans', system-ui, sans-serif" },
    header: { background: '#111827', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 10 },
    main: { maxWidth: 640, margin: '0 auto', padding: '20px 16px 100px' },
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, marginBottom: 12 },
    sectionTitle: { fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 },
    infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' },
    infoLabel: { fontSize: 13, color: '#6b7280', fontWeight: 500 },
    infoValue: { fontSize: 13, color: '#111827', fontWeight: 600, textAlign: 'right' as const, maxWidth: '60%' },
    textarea: { width: '100%', minHeight: 80, border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const, resize: 'vertical' as const },
    select: { width: '100%', height: 42, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const },
  }

  return (
    <div style={st.page}>
      {/* HEADER */}
      <div style={st.header}>
        <Link href="/conductor" style={{ color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Mis servicios
        </Link>
        <span style={{
          fontSize: 12, fontWeight: 700,
          background: estadoCfg.bg, color: estadoCfg.color,
          borderRadius: 20, padding: '4px 12px',
          border: `1px solid ${estadoCfg.border}`
        }}>
          {estadoCfg.emoji} {estadoCfg.label}
        </span>
      </div>

      <div style={st.main}>

        {/* BARRA DE PROGRESO */}
        {estado !== 'incidencia' && (
          <div style={{ ...st.card, padding: '16px 20px' }}>
            <p style={st.sectionTitle}>Progreso del servicio</p>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {PROGRESO_PASOS.map((paso, i) => {
                const activo = progresoIdx >= i
                const esCurrent = progresoIdx === i
                return (
                  <div key={paso.key} style={{ display: 'flex', alignItems: 'center', flex: i < PROGRESO_PASOS.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: activo ? accentColor : '#f3f4f6',
                        border: `2px solid ${activo ? accentColor : '#e5e7eb'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                        boxShadow: esCurrent ? `0 0 0 4px ${accentColor}22` : 'none',
                        transition: 'all 0.2s'
                      }}>
                        {activo ? <span style={{ fontSize: 16 }}>{paso.emoji}</span> : <span style={{ fontSize: 14, opacity: 0.3 }}>{paso.emoji}</span>}
                      </div>
                      <span style={{ fontSize: 10, color: activo ? accentColor : '#9ca3af', fontWeight: activo ? 700 : 500, whiteSpace: 'nowrap' as const }}>
                        {paso.label}
                      </span>
                    </div>
                    {i < PROGRESO_PASOS.length - 1 && (
                      <div style={{
                        flex: 1, height: 3, margin: '0 4px', marginBottom: 18,
                        background: progresoIdx > i ? accentColor : '#e5e7eb',
                        borderRadius: 2
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {estado === 'incidencia' && (
          <div style={{ ...st.card, background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', margin: 0 }}>🚨 Incidencia activa</p>
            <p style={{ fontSize: 13, color: '#b91c1c', margin: '4px 0 0' }}>Hay una incidencia reportada en este servicio</p>
          </div>
        )}

        {/* RUTA PRINCIPAL */}
        <div style={{ ...st.card, borderLeft: `4px solid ${accentColor}` }}>
          <p style={st.sectionTitle}>Ruta del servicio</p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#111827', flexShrink: 0 }} />
              <div style={{ width: 2, height: stops.length > 0 ? 32 * (stops.length + 1) : 32, background: '#e5e7eb' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: stops.length > 0 ? 12 : 0 }}>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Origen</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{servicio.origin}</p>
              </div>
              {stops.map((stop: string, i: number) => (
                <div key={i} style={{ margin: '12px 0' }}>
                  <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parada {i + 1}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>{stop}</p>
                </div>
              ))}
              <div style={{ marginTop: stops.length > 0 ? 12 : 32 }}>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destino</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{servicio.destination}</p>
              </div>
            </div>
          </div>

          
            href={mapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, height: 46, background: '#111827', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            <Navigation style={{ width: 16, height: 16 }} />
            Abrir ruta en Google Maps
          </a>
        </div>

        {/* DETALLES */}
        <div style={st.card}>
          <p style={st.sectionTitle}>Detalles del servicio</p>
          <div style={st.infoRow}>
            <span style={st.infoLabel}>📅 Fecha salida</span>
            <span style={st.infoValue}>{fmt(servicio.trip_date)}</span>
          </div>
          <div style={st.infoRow}>
            <span style={st.infoLabel}>⏰ Hora salida</span>
            <span style={{ ...st.infoValue, fontSize: 17, color: accentColor, fontWeight: 800 }}>{servicio.departure_time}</span>
          </div>
          {servicio.return_date && (
            <div style={st.infoRow}>
              <span style={st.infoLabel}>📅 Fecha regreso</span>
              <span style={st.infoValue}>{fmt(servicio.return_date)}</span>
            </div>
          )}
          {servicio.return_time && (
            <div style={st.infoRow}>
              <span style={st.infoLabel}>⏰ Hora regreso</span>
              <span style={st.infoValue}>{servicio.return_time}</span>
            </div>
          )}
          <div style={st.infoRow}>
            <span style={st.infoLabel}>👥 Pasajeros</span>
            <span style={st.infoValue}>{servicio.passengers} personas</span>
          </div>
          <div style={{ ...st.infoRow, borderBottom: 'none' }}>
            <span style={st.infoLabel}>🎭 Tu rol</span>
            <span style={st.infoValue}>{ROL_LABELS[assignment.rol_en_servicio] || assignment.rol_en_servicio}</span>
          </div>
        </div>

        {/* VEHÍCULO */}
        {vehiculo && (
          <div style={st.card}>
            <p style={st.sectionTitle}>Vehículo asignado</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, background: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bus style={{ width: 22, height: 22, color: '#374151' }} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{vehiculo.marca_modelo}</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>
                  {vehiculo.matricula} · {vehiculo.plazas} plazas · {vehiculo.tipo}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CLIENTE */}
        <div style={st.card}>
          <p style={st.sectionTitle}>Cliente</p>
          <div style={st.infoRow}>
            <span style={st.infoLabel}>👤 Nombre</span>
            <span style={st.infoValue}>{servicio.requester_name}</span>
          </div>
          {servicio.requester_phone && (
            <div style={{ ...st.infoRow, borderBottom: 'none' }}>
              <span style={st.infoLabel}>📞 Teléfono</span>
              
                href={`tel:${servicio.requester_phone}`}
                style={{ fontSize: 15, fontWeight: 700, color: accentColor, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Phone style={{ width: 15, height: 15 }} />
                {servicio.requester_phone}
              </a>
            </div>
          )}
        </div>

        {/* NOTAS */}
        {servicio.internal_notes && (
          <div style={{ ...st.card, background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p style={{ ...st.sectionTitle, color: '#92400e' }}>📋 Notas del servicio</p>
            <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, margin: 0 }}>{servicio.internal_notes}</p>
          </div>
        )}

        {/* REGISTRO DE TIEMPOS */}
        {(visitoAt || iniciadoAt || finalizadoAt) && (
          <div style={st.card}>
            <p style={st.sectionTitle}>Registro de tiempos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visitoAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 10 }}>
                  <span style={{ fontSize: 18 }}>👁️</span>
                  <div>
                    <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, margin: 0 }}>Confirmado visto</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>{fmtTime(visitoAt)}</p>
                  </div>
                </div>
              )}
              {iniciadoAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fffbeb', borderRadius: 10 }}>
                  <span style={{ fontSize: 18 }}>🟢</span>
                  <div>
                    <p style={{ fontSize: 11, color: '#92400e', fontWeight: 600, margin: 0 }}>Servicio iniciado</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#b45309', margin: 0 }}>{fmtTime(iniciadoAt)}</p>
                  </div>
                </div>
              )}
              {finalizadoAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f0fdf4', borderRadius: 10 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div>
                    <p style={{ fontSize: 11, color: '#166534', fontWeight: 600, margin: 0 }}>Servicio finalizado</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#166534', margin: 0 }}>{fmtTime(finalizadoAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTONES DE ACCIÓN */}
        {estado === 'finalizado' ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: '28px 20px', textAlign: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 40, margin: '0 0 8px' }}>✅</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#166534', margin: 0 }}>Servicio completado</p>
            <p style={{ fontSize: 13, color: '#16a34a', margin: '6px 0 0' }}>
              Finalizado a las {finalizadoAt ? fmtTime(finalizadoAt) : '—'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {estado === 'asignado' && (
              <button
                style={{ height: 56, background: '#eff6ff', color: '#1e40af', border: '2px solid #bfdbfe', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                onClick={handleVisto}
                disabled={loading}
              >
                <span style={{ fontSize: 20 }}>👁️</span>
                {loading ? 'Registrando...' : 'Confirmar que he visto el servicio'}
              </button>
            )}
            {(estado === 'visto' || estado === 'asignado') && (
              <button
                style={{ height: 56, background: '#f0fdf4', color: '#166534', border: '2px solid #bbf7d0', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                onClick={handleIniciar}
                disabled={loading}
              >
                <span style={{ fontSize: 20 }}>🟢</span>
                {loading ? 'Registrando...' : 'Iniciar servicio'}
              </button>
            )}
            {estado === 'iniciado' && (
              <button
                style={{ height: 60, background: '#166534', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 12px rgba(22,101,52,0.3)' }}
                onClick={handleFinalizar}
                disabled={loading}
              >
                <span style={{ fontSize: 22 }}>✅</span>
                {loading ? 'Registrando...' : 'Finalizar servicio'}
              </button>
            )}

            <button
              style={{ height: 48, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => setShowIncidencia(!showIncidencia)}
            >
              <span style={{ fontSize: 16 }}>🚨</span>
              Reportar incidencia
            </button>
          </div>
        )}

        {/* FORMULARIO INCIDENCIA */}
        {showIncidencia && (
          <div style={{ ...st.card, border: '1px solid #fecaca', background: '#fef2f2', marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', margin: '0 0 14px' }}>🚨 Reportar incidencia</p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Tipo de incidencia</label>
              <select style={st.select} value={tipoIncidencia} onChange={e => setTipoIncidencia(e.target.value)}>
                {TIPOS_INCIDENCIA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Comentario</label>
              <textarea style={st.textarea} placeholder="Describe la incidencia..." value={comentarioIncidencia} onChange={e => setComentarioIncidencia(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, height: 44, background: '#991b1b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }} onClick={handleIncidencia} disabled={enviandoIncidencia}>
                {enviandoIncidencia ? 'Enviando...' : '🚨 Enviar incidencia'}
              </button>
              <button style={{ flex: 1, height: 44, background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }} onClick={() => setShowIncidencia(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* INCIDENCIAS PREVIAS */}
        {incidenciasState.length > 0 && (
          <div style={st.card}>
            <p style={st.sectionTitle}>Incidencias reportadas</p>
            {incidenciasState.map((inc, i) => (
              <div key={inc.id} style={{ padding: '10px 0', borderBottom: i < incidenciasState.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', background: '#fef2f2', borderRadius: 6, padding: '2px 8px', border: '1px solid #fecaca' }}>
                    {TIPOS_INCIDENCIA.find(t => t.value === inc.tipo)?.label || inc.tipo}
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmtTime(inc.created_at)}</span>
                </div>
                {inc.comentario && <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.5 }}>{inc.comentario}</p>}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}