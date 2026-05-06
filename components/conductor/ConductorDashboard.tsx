'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { BusFront, MapPin, Clock, Users, LogOut, CheckCircle, PlayCircle, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Servicio = {
  id: string
  origin: string
  destination: string
  trip_date: string
  departure_time: string
  return_date: string | null
  return_time: string | null
  passengers: number
  comments: string | null
  rol: string
}

type Log = {
  id: string
  quote_request_id: string
  staff_id: string
  inicio: string | null
  fin: string | null
}

type Props = {
  conductor: { id: string; nombre: string; rol: string } | null
  company: { name: string; logo_url: string | null; color_primario: string | null } | null
  servicios: Servicio[]
  logs: Log[]
  staffId: string
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
function isToday(d: string) {
  return new Date(d).toDateString() === new Date().toDateString()
}
function isFuture(d: string) {
  return new Date(d) > new Date()
}
function diasHasta(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

const ROL_LABELS: Record<string, string> = {
  conductor_principal: 'Conductor principal',
  conductor_relevo: 'Conductor relevo',
  guia: 'Guía',
  monitor: 'Monitor',
}

export default function ConductorDashboard({ conductor, company, servicios, logs, staffId }: Props) {
  const router = useRouter()
  const [logsState, setLogsState] = useState<Log[]>(logs)
  const [loading, setLoading] = useState<string | null>(null)
  const accentColor = company?.color_primario || '#1e3a5f'

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const serviciosHoy = servicios.filter(s => isToday(s.trip_date))
  const serviciosProximos = servicios.filter(s => isFuture(s.trip_date) && !isToday(s.trip_date))
  const serviciosPasados = servicios.filter(s => !isFuture(s.trip_date) && !isToday(s.trip_date))

  function getLog(quoteId: string) {
    return logsState.find(l => l.quote_request_id === quoteId)
  }

  async function handleInicio(quoteId: string) {
    setLoading(quoteId + '_inicio')
    const { data, error } = await supabase
      .from('service_logs')
      .upsert({
        quote_request_id: quoteId,
        staff_id: staffId,
        inicio: new Date().toISOString(),
      }, { onConflict: 'quote_request_id,staff_id' })
      .select()
      .single()

    if (!error && data) {
      setLogsState(prev => {
        const exists = prev.find(l => l.quote_request_id === quoteId)
        if (exists) return prev.map(l => l.quote_request_id === quoteId ? data : l)
        return [...prev, data]
      })
    }
    setLoading(null)
  }

  async function handleFin(quoteId: string) {
    setLoading(quoteId + '_fin')
    const log = getLog(quoteId)
    if (!log) return

    const { data, error } = await supabase
      .from('service_logs')
      .update({ fin: new Date().toISOString() })
      .eq('id', log.id)
      .select()
      .single()

    if (!error && data) {
      setLogsState(prev => prev.map(l => l.id === log.id ? data : l))
    }
    setLoading(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/conductor/login')
  }

  const s = {
    page: { minHeight: '100vh', background: '#f5f5f4', fontFamily: "'DM Sans', system-ui, sans-serif" },
    header: { background: '#111827', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    main: { maxWidth: 640, margin: '0 auto', padding: '24px 16px 48px' },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12, marginTop: 28 },
    card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, marginBottom: 12 },
    btnPrimary: (color: string) => ({
      flex: 1, height: 44, background: color, color: '#fff', border: 'none',
      borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
      fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex',
      alignItems: 'center', justifyContent: 'center', gap: 6,
    }),
    btnSecondary: {
      flex: 1, height: 44, background: '#f3f4f6', color: '#374151', border: 'none',
      borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
      fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex',
      alignItems: 'center', justifyContent: 'center', gap: 6,
    } as React.CSSProperties,
    btnDanger: {
      flex: 1, height: 44, background: '#fef2f2', color: '#dc2626', border: 'none',
      borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
      fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex',
      alignItems: 'center', justifyContent: 'center', gap: 6,
    } as React.CSSProperties,
  }

  function ServicioCard({ servicio, destacado }: { servicio: Servicio; destacado?: boolean }) {
    const log = getLog(servicio.id)
    const iniciado = !!log?.inicio
    const finalizado = !!log?.fin
    const dias = diasHasta(servicio.trip_date)

    let estadoLabel = ''
    let estadoColor = ''
    let estadoBg = ''

    if (finalizado) {
      estadoLabel = '✅ Completado'
      estadoColor = '#166534'
      estadoBg = '#f0fdf4'
    } else if (iniciado) {
      estadoLabel = '🟢 En curso'
      estadoColor = '#b45309'
      estadoBg = '#fffbeb'
    } else if (isToday(servicio.trip_date)) {
      estadoLabel = '⏳ Pendiente hoy'
      estadoColor = '#1e40af'
      estadoBg = '#eff6ff'
    } else {
      estadoLabel = `📅 En ${dias} día${dias !== 1 ? 's' : ''}`
      estadoColor = '#6b7280'
      estadoBg = '#f9fafb'
    }

    return (
      <div style={{
        ...s.card,
        border: destacado && !finalizado ? `2px solid ${accentColor}` : '1px solid #e5e7eb',
        position: 'relative',
      }}>
        {/* Estado badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, background: estadoBg, color: estadoColor, borderRadius: 6, padding: '3px 8px' }}>
            {estadoLabel}
          </span>
          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
            {ROL_LABELS[servicio.rol] || servicio.rol}
          </span>
        </div>

        {/* Ruta */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#111827', flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{servicio.origin.split(',')[0]}</span>
          </div>
          <div style={{ width: 1, height: 16, background: '#d1d5db', marginLeft: 3.5, marginBottom: 6 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{servicio.destination.split(',')[0]}</span>
          </div>
        </div>

        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Fecha</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{fmtShort(servicio.trip_date)}</p>
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Salida</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{servicio.departure_time}</p>
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Pasajeros</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{servicio.passengers} pax</p>
          </div>
          {servicio.return_time && (
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>Regreso</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{servicio.return_time}</p>
            </div>
          )}
        </div>

        {/* Fichaje info */}
        {iniciado && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', gap: 16 }}>
            <div>
              <p style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, margin: '0 0 2px' }}>INICIO</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#166534', margin: 0 }}>{fmtTime(log!.inicio!)}</p>
            </div>
            {finalizado && (
              <div>
                <p style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, margin: '0 0 2px' }}>FIN</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#166534', margin: 0 }}>{fmtTime(log!.fin!)}</p>
              </div>
            )}
          </div>
        )}

        {/* Botones fichaje */}
        {!finalizado && isToday(servicio.trip_date) && (
          <div style={{ display: 'flex', gap: 8 }}>
            {!iniciado ? (
              <button
                style={s.btnPrimary(accentColor)}
                onClick={() => handleInicio(servicio.id)}
                disabled={loading === servicio.id + '_inicio'}
              >
                <PlayCircle style={{ width: 16, height: 16 }} />
                {loading === servicio.id + '_inicio' ? 'Registrando...' : 'Iniciar servicio'}
              </button>
            ) : (
              <button
                style={s.btnDanger}
                onClick={() => handleFin(servicio.id)}
                disabled={loading === servicio.id + '_fin'}
              >
                <CheckCircle style={{ width: 16, height: 16 }} />
                {loading === servicio.id + '_fin' ? 'Registrando...' : 'Finalizar servicio'}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={s.page}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BusFront style={{ width: 15, height: 15, color: '#fff' }} />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>{company?.name || 'Busvio'}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0 }}>Portal conductor</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          <LogOut style={{ width: 13, height: 13 }} /> Salir
        </button>
      </div>

      <div style={s.main}>
        {/* SALUDO */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            Hola{conductor?.nombre ? `, ${conductor.nombre.split(' ')[0]}` : ''} 👋
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, textTransform: 'capitalize' }}>{today}</p>
        </div>

        {/* RESUMEN */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
          {[
            { label: 'Hoy', value: serviciosHoy.length, icon: <Clock style={{ width: 14, height: 14 }} />, color: accentColor },
            { label: 'Próximos', value: serviciosProximos.length, icon: <Calendar style={{ width: 14, height: 14 }} />, color: '#6b7280' },
            { label: 'Realizados', value: serviciosPasados.length, icon: <CheckCircle style={{ width: 14, height: 14 }} />, color: '#16a34a' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: item.color }}>{item.icon}</div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>{item.value}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 }}>{item.label}</p>
            </div>
          ))}
        </div>

        {/* SERVICIOS DE HOY */}
        {serviciosHoy.length > 0 && (
          <>
            <p style={s.sectionTitle}>🚌 Servicios de hoy</p>
            {serviciosHoy.map(s => <ServicioCard key={s.id} servicio={s} destacado />)}
          </>
        )}

        {serviciosHoy.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px 20px', textAlign: 'center', marginTop: 16 }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>☀️</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Sin servicios hoy</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Disfruta del día libre</p>
          </div>
        )}

        {/* PRÓXIMOS */}
        {serviciosProximos.length > 0 && (
          <>
            <p style={s.sectionTitle}>📅 Próximos servicios</p>
            {serviciosProximos.map(s => <ServicioCard key={s.id} servicio={s} />)}
          </>
        )}

        {/* PASADOS */}
        {serviciosPasados.length > 0 && (
          <>
            <p style={s.sectionTitle}>✅ Servicios realizados</p>
            {serviciosPasados.map(s => <ServicioCard key={s.id} servicio={s} />)}
          </>
        )}

        {servicios.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <p style={{ fontSize: 13 }}>No tienes servicios asignados aún</p>
          </div>
        )}
      </div>
    </div>
  )
}