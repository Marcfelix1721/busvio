'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Clock, Users, Bus, Phone, AlertTriangle, CheckCircle, PlayCircle, StopCircle, Navigation, Eye } from 'lucide-react'
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

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  asignado:   { label: 'Asignado',   color: '#1e40af', bg: '#eff6ff', dot: '#3b82f6' },
  visto:      { label: 'Visto',      color: '#6b7280', bg: '#f9fafb', dot: '#9ca3af' },
  iniciado:   { label: 'En curso',   color: '#b45309', bg: '#fffbeb', dot: '#f59e0b' },
  finalizado: { label: 'Finalizado', color: '#166534', bg: '#f0fdf4', dot: '#22c55e' },
  incidencia: { label: 'Incidencia', color: '#991b1b', bg: '#fef2f2', dot: '#ef4444' },
}

const ROL_LABELS: Record<string, string> = {
  conductor_principal: 'Conductor principal',
  conductor_relevo: 'Conductor relevo',
  guia: 'Guía',
  monitor: 'Monitor',
}

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
  const router = useRouter()
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

  // Parsear paradas
  const stops = (() => { try { return JSON.parse(servicio.stops || '[]') } catch { return [] } })()

  // Google Maps URL
  const mapsUrl = () => {
    const waypoints = stops.length > 0 ? `&waypoints=${stops.map(encodeURIComponent).join('|')}` : ''
    return `https://www.google.com/maps/dir/${encodeURIComponent(servicio.origin)}/${encodeURIComponent(servicio.destination)}${waypoints}`
  }

  async function handleVisto() {
    setLoading(true)
    const now = new Date().toISOString()
    await supabase.from('service_assignments').update({
      estado_conductor: 'visto',
      visto_at: now,
    }).eq('id', assignment.id)
    setEstado('visto')
    setVistoAt(now)
    setLoading(false)
  }

  async function handleIniciar() {
    setLoading(true)
    const now = new Date().toISOString()
    await supabase.from('service_assignments').update({
      estado_conductor: 'iniciado',
      iniciado_at: now,
    }).eq('id', assignment.id)
    setEstado('iniciado')
    setIniciadoAt(now)
    setLoading(false)
  }

  async function handleFinalizar() {
    setLoading(true)
    const now = new Date().toISOString()
    await supabase.from('service_assignments').update({
      estado_conductor: 'finalizado',
      finalizado_at: now,
    }).eq('id', assignment.id)
    setEstado('finalizado')
    setFinalizadoAt(now)
    setLoading(false)
  }

  async function handleIncidencia() {
    setEnviandoIncidencia(true)
    const { data } = await supabase.from('service_incidents').insert({
      service_assignment_id: assignment.id,
      tipo: tipoIncidencia,
      comentario: comentarioIncidencia,
    }).select().single()

    await supabase.from('service_assignments').update({
      estado_conductor: 'incidencia',
    }).eq('id', assignment.id)

    if (data) setIncidenciasState(prev => [data, ...prev])
    setEstado('incidencia')
    setShowIncidencia(false)
    setComentarioIncidencia('')
    setEnviandoIncidencia(false)
  }

  const s = {
    page: { minHeight: '100vh', background: '#f5f5f4', fontFamily: "'DM Sans', system-ui, sans-serif" },
    header: { background: '#111827', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 10 },
    main: { maxWidth: 640, margin: '0 auto', padding: '20px 16px 80px' },
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, marginBottom: 12 },
    sectionTitle: { fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 10 },
    infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' },
    infoLabel: { fontSize: 12, color: '#6b7280', fontWeight: 500 },
    infoValue: { fontSize: 13, color: '#111827', fontWeight: 600, textAlign: 'right' as const, maxWidth: '60%' },
    btn: (color: string, bg: string) => ({
      flex: 1, height: 48, background: bg, color: color, border: `1px solid ${color}22`,
      borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }),
    input: { width: '100%', height: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const },
    select: { width: '100%', height: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const },
    textarea: { width: '100%', minHeight: 80, border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const, resize: 'vertical' as const },
  }

  return (
    <div style={s.page}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/conductor" style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Mis servicios
          </Link>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, background: estadoCfg.bg, color: estadoCfg.color, borderRadius: 20, padding: '4px 12px', border: `1px solid ${estadoCfg.dot}33` }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: estadoCfg.dot, marginRight: 5, verticalAlign: 'middle' }} />
          {estadoCfg.label}
        </span>
      </div>

      <div style={s.main}>

        {/* RUTA PRINCIPAL */}
        <div style={{ ...s.card, borderLeft: `4px solid ${accentColor}` }}>
          <p style={s.sectionTitle}>Ruta del servicio</p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3, gap: 0 }}>
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
                <div key={i} style={{ marginBottom: 12, marginTop: 12 }}>
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

          {/* Botón Google Maps */}
          <a
            href={mapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, height: 44, background: '#111827', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            <Navigation style={{ width: 15, height: 15 }} />
            Abrir ruta en Google Maps
          </a>
        </div>

        {/* DETALLES DEL SERVICIO */}
        <div style={s.card}>
          <p style={s.sectionTitle}>Detalles del servicio</p>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>📅 Fecha salida</span>
            <span style={s.infoValue}>{fmt(servicio.trip_date)}</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>⏰ Hora salida</span>
            <span style={{ ...s.infoValue, fontSize: 16, color: accentColor }}>{servicio.departure_time}</span>
          </div>
          {servicio.return_date && (
            <div style={s.infoRow}>
              <span style={s.infoLabel}>📅 Fecha regreso</span>
              <span style={s.infoValue}>{fmt(servicio.return_date)}</span>
            </div>
          )}
          {servicio.return_time && (
            <div style={s.infoRow}>
              <span style={s.infoLabel}>⏰ Hora regreso</span>
              <span style={s.infoValue}>{servicio.return_time}</span>
            </div>
          )}
          <div style={s.infoRow}>
            <span style={s.infoLabel}>👥 Pasajeros</span>
            <span style={s.infoValue}>{servicio.passengers} personas</span>
          </div>
          <div style={{ ...s.infoRow, borderBottom: 'none' }}>
            <span style={s.infoLabel}>🎭 Tu rol</span>
            <span style={s.infoValue}>{ROL_LABELS[assignment.rol_en_servicio] || assignment.rol_en_servicio}</span>
          </div>
        </div>

        {/* VEHÍCULO */}
        {vehiculo && (
          <div style={s.card}>
            <p style={s.sectionTitle}>Vehículo asignado</p>
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

        {/* CLIENTE Y CONTACTO */}
        <div style={s.card}>
          <p style={s.sectionTitle}>Cliente</p>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>👤 Nombre</span>
            <span style={s.infoValue}>{servicio.requester_name}</span>
          </div>
          {servicio.requester_phone && (
            <div style={{ ...s.infoRow, borderBottom: 'none' }}>
              <span style={s.infoLabel}>📞 Teléfono</span>
              <a
                href={`tel:${servicio.requester_phone}`}
                style={{ fontSize: 14, fontWeight: 700, color: accentColor, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Phone style={{ width: 14, height: 14 }} />
                {servicio.requester_phone}
              </a>
            </div>
          )}
        </div>

        {/* NOTAS INTERNAS */}
        {servicio.internal_notes && (
          <div style={{ ...s.card, background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p style={{ ...s.sectionTitle, color: '#92400e' }}>📋 Notas del servicio</p>
            <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, margin: 0 }}>
              {servicio.internal_notes}
            </p>
          </div>
        )}

        {/* REGISTRO DE TIEMPOS */}
        {(visitoAt || iniciadoAt || finalizadoAt) && (
          <div style={s.card}>
            <p style={s.sectionTitle}>Registro de tiempos</p>
            {visitoAt && (
              <div style={s.infoRow}>
                <span style={s.infoLabel}>👁 Confirmado visto</span>
                <span style={s.infoValue}>{fmtTime(visitoAt)}</span>
              </div>
            )}
            {iniciadoAt && (
              <div style={s.infoRow}>
                <span style={s.infoLabel}>▶ Servicio iniciado</span>
                <span style={{ ...s.infoValue, color: '#16a34a' }}>{fmtTime(iniciadoAt)}</span>
              </div>
            )}
            {finalizadoAt && (
              <div style={{ ...s.infoRow, borderBottom: 'none' }}>
                <span style={s.infoLabel}>■ Servicio finalizado</span>
                <span style={{ ...s.infoValue, color: '#dc2626' }}>{fmtTime(finalizadoAt)}</span>
              </div>
            )}
          </div>
        )}

        {/* BOTONES DE ACCIÓN */}
        {estado !== 'finalizado' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {estado === 'asignado' && (
              <button style={s.btn('#1e40af', '#eff6ff')} onClick={handleVisto} disabled={loading}>
                <Eye style={{ width: 16, height: 16 }} />
                {loading ? 'Registrando...' : 'Confirmar que he visto el servicio'}
              </button>
            )}
            {(estado === 'visto' || estado === 'asignado') && (
              <button style={s.btn('#166534', '#f0fdf4')} onClick={handleIniciar} disabled={loading}>
                <PlayCircle style={{ width: 16, height: 16 }} />
                {loading ? 'Registrando...' : '▶ Iniciar servicio'}
              </button>
            )}
            {estado === 'iniciado' && (
              <button style={s.btn('#166534', '#f0fdf4')} onClick={handleFinalizar} disabled={loading}>
                <CheckCircle style={{ width: 16, height: 16 }} />
                {loading ? 'Registrando...' : '✅ Finalizar servicio'}
              </button>
            )}
            <button
              style={s.btn('#991b1b', '#fef2f2')}
              onClick={() => setShowIncidencia(!showIncidencia)}
            >
              <AlertTriangle style={{ width: 16, height: 16 }} />
              Reportar incidencia
            </button>
          </div>
        )}

        {estado === 'finalizado' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '20px', textAlign: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 28, margin: '0 0 8px' }}>✅</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#166534', margin: 0 }}>Servicio completado</p>
            <p style={{ fontSize: 13, color: '#16a34a', margin: '4px 0 0' }}>
              Finalizado a las {finalizadoAt ? fmtTime(finalizadoAt) : '—'}
            </p>
          </div>
        )}

        {/* FORMULARIO INCIDENCIA */}
        {showIncidencia && (
          <div style={{ ...s.card, border: '1px solid #fecaca', background: '#fef2f2', marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', margin: '0 0 14px' }}>
              🚨 Reportar incidencia
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Tipo de incidencia</label>
              <select style={s.select} value={tipoIncidencia} onChange={e => setTipoIncidencia(e.target.value)}>
                {TIPOS_INCIDENCIA.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' }}>Comentario</label>
              <textarea
                style={s.textarea}
                placeholder="Describe la incidencia..."
                value={comentarioIncidencia}
                onChange={e => setComentarioIncidencia(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ ...s.btn('#991b1b', '#fef2f2'), flex: 1 }}
                onClick={handleIncidencia}
                disabled={enviandoIncidencia}
              >
                {enviandoIncidencia ? 'Enviando...' : '🚨 Enviar incidencia'}
              </button>
              <button
                style={{ ...s.btn('#6b7280', '#f9fafb'), flex: 1 }}
                onClick={() => setShowIncidencia(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* INCIDENCIAS PREVIAS */}
        {incidenciasState.length > 0 && (
          <div style={s.card}>
            <p style={s.sectionTitle}>Incidencias reportadas</p>
            {incidenciasState.map((inc, i) => (
              <div key={inc.id} style={{ ...s.infoRow, flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderBottom: i < incidenciasState.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', background: '#fef2f2', borderRadius: 6, padding: '2px 8px' }}>
                    {TIPOS_INCIDENCIA.find(t => t.value === inc.tipo)?.label || inc.tipo}
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmtTime(inc.created_at)}</span>
                </div>
                {inc.comentario && (
                  <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>{inc.comentario}</p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}