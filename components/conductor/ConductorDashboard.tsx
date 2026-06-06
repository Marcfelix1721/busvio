'use client'

import { useState } from 'react'
import { FlotaFlyLogo } from '@/components/FlotaFlyLogo'
import { createBrowserClient } from '@supabase/ssr'
import { LogOut, ChevronRight, MapPin, Clock, Users, Bus, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  vehicle_id: string | null
  rol: string
  assignment_id: string
  estado_conductor: string
}

type Props = {
  conductor: { id: string; nombre: string; rol: string } | null
  company: { name: string; logo_url: string | null; color_primario: string | null } | null
  servicios: Servicio[]
  logs: any[]
  staffId: string
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  asignado:   { label: 'Asignado',   color: '#1e40af', bg: '#eff6ff', dot: '#3b82f6' },
  visto:      { label: 'Visto',      color: '#6b7280', bg: '#f9fafb', dot: '#9ca3af' },
  iniciado:   { label: 'En curso',   color: '#b45309', bg: '#fffbeb', dot: '#f59e0b' },
  finalizado: { label: 'Finalizado', color: '#166534', bg: '#f0fdf4', dot: '#22c55e' },
  incidencia: { label: 'Incidencia', color: '#991b1b', bg: '#fef2f2', dot: '#ef4444' },
}

function isToday(d: string) {
  return new Date(d).toDateString() === new Date().toDateString()
}
function isFuture(d: string) {
  const date = new Date(d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date > today && !isToday(d)
}
function isPast(d: string) {
  return !isToday(d) && !isFuture(d)
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
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
  const accentColor = company?.color_primario || '#1e3a5f'
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const serviciosHoy = servicios.filter(s => isToday(s.trip_date))
  const serviciosProximos = servicios.filter(s => isFuture(s.trip_date))
  const serviciosPasados = servicios.filter(s => isPast(s.trip_date))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/conductor/login')
  }

  const s = {
    page: { minHeight: '100vh', background: '#f5f5f4', fontFamily: "'DM Sans', system-ui, sans-serif" },
    header: { background: '#111827', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 10 },
    main: { maxWidth: 640, margin: '0 auto', padding: '24px 16px 80px' },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 10, marginTop: 24 },
  }

  function ServicioCard({ servicio }: { servicio: Servicio }) {
    const estadoCfg = ESTADO_CONFIG[servicio.estado_conductor] || ESTADO_CONFIG.asignado
    const dias = diasHasta(servicio.trip_date)
    const urgente = dias >= 0 && dias <= 1 && isToday(servicio.trip_date)

    return (
      <Link href={`/conductor/servicios/${servicio.id}`} style={{ textDecoration: 'none' }}>
        <div style={{
          background: '#fff',
          border: urgente ? `2px solid ${accentColor}` : '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 18,
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
        }}>
          {/* Hora */}
          <div style={{ textAlign: 'center', minWidth: 48, flexShrink: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: accentColor, margin: 0, lineHeight: 1 }}>
              {servicio.departure_time}
            </p>
            <p style={{ fontSize: 10, color: '#9ca3af', margin: '2px 0 0' }}>
              {fmtShort(servicio.trip_date)}
            </p>
          </div>

          {/* Separador */}
          <div style={{ width: 1, height: 40, background: '#e5e7eb', flexShrink: 0 }} />

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {servicio.origin.split(',')[0]}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>→</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {servicio.destination.split(',')[0]}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Users style={{ width: 11, height: 11 }} /> {servicio.passengers} pax
              </span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                {ROL_LABELS[servicio.rol] || servicio.rol}
              </span>
            </div>
          </div>

          {/* Estado + arrow */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: estadoCfg.bg, color: estadoCfg.color, borderRadius: 20, padding: '3px 8px', whiteSpace: 'nowrap' as const }}>
              <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: estadoCfg.dot, marginRight: 4, verticalAlign: 'middle' }} />
              {estadoCfg.label}
            </span>
            <ChevronRight style={{ width: 14, height: 14, color: '#9ca3af' }} />
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div style={s.page}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FlotaFlyLogo size={26} />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>{company?.name || 'FlotaFly'}</p>
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
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            Hola{conductor?.nombre ? `, ${conductor.nombre.split(' ')[0]}` : ''} 👋
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, textTransform: 'capitalize' as const }}>{today}</p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 4 }}>
          {[
            { label: 'Hoy', value: serviciosHoy.length, color: accentColor, bg: '#eff6ff' },
            { label: 'Próximos', value: serviciosProximos.length, color: '#6b7280', bg: '#f9fafb' },
            { label: 'Realizados', value: serviciosPasados.length, color: '#16a34a', bg: '#f0fdf4' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 12px', textAlign: 'center' as const }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>{item.value}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0', fontWeight: 500 }}>{item.label}</p>
            </div>
          ))}
        </div>

        {/* SERVICIOS DE HOY */}
        {serviciosHoy.length > 0 && (
          <>
            <p style={s.sectionTitle}>🚌 Servicios de hoy</p>
            {serviciosHoy.map(s => <ServicioCard key={s.id} servicio={s} />)}
          </>
        )}

        {serviciosHoy.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '32px 20px', textAlign: 'center' as const, marginTop: 16 }}>
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
            <p style={s.sectionTitle}>✅ Realizados</p>
            {serviciosPasados.map(s => <ServicioCard key={s.id} servicio={s} />)}
          </>
        )}

        {servicios.length === 0 && (
          <div style={{ textAlign: 'center' as const, padding: '40px 20px', color: '#9ca3af' }}>
            <p style={{ fontSize: 40, margin: '0 0 12px' }}>🚌</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>No tienes servicios asignados</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Tu empresa te asignará servicios próximamente</p>
          </div>
        )}

      </div>
    </div>
  )
}