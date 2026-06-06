import { redirect } from 'next/navigation'
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { LogoutButton } from '@/components/dashboard/LogoutButton'
import { ConductoresList } from '@/components/dashboard/ConductoresList'
import Link from 'next/link'
import { BusFront, Users, BarChart3, Calendar, Inbox, Settings } from 'lucide-react'
import type { Staff, ConductorStats } from '@/lib/staff'

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export const revalidate = 0

function inMonth(dateStr: string, ref: Date) {
  const d = new Date(dateStr)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export default async function ConductoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) redirect('/dashboard')

  const companyId = userData.company_id

  const { data: staffData } = await supabase
    .from('staff')
    .select('*')
    .eq('company_id', companyId)
    .eq('rol', 'conductor')
    .order('nombre')
  const conductores = (staffData ?? []) as Staff[]
  const ids = conductores.map(c => c.id)

  // Asignaciones de servicio de estos conductores + presupuestos asociados
  let assignments: { staff_id: string; quote_request_id: string; iniciado_at: string | null; finalizado_at: string | null }[] = []
  const quotesById: Record<string, { trip_date: string | null; estimated_km: number | null }> = {}
  if (ids.length > 0) {
    const { data: asigData } = await supabase
      .from('service_assignments')
      .select('staff_id, quote_request_id, iniciado_at, finalizado_at')
      .in('staff_id', ids)
    assignments = asigData ?? []
    const quoteIds = [...new Set(assignments.map(a => a.quote_request_id))]
    if (quoteIds.length > 0) {
      const { data: quotes } = await supabase
        .from('quote_requests')
        .select('id, trip_date, estimated_km')
        .in('id', quoteIds)
      for (const q of quotes ?? []) quotesById[q.id] = { trip_date: q.trip_date, estimated_km: q.estimated_km }
    }
  }

  // Documentos (para la alerta de "documento por vencer")
  const { data: docsData } = await supabase
    .from('staff_documentos')
    .select('staff_id, fecha_vencimiento')
    .eq('company_id', companyId)
  const expiring = new Set<string>()
  for (const d of docsData ?? []) {
    if (!d.fecha_vencimiento) continue
    const days = Math.ceil((new Date(d.fecha_vencimiento).getTime() - Date.now()) / 86400000)
    if (days <= 30) expiring.add(d.staff_id)
  }

  // KPIs por conductor
  const now = new Date()
  const stats: Record<string, ConductorStats> = {}
  for (const c of conductores) {
    const asigs = assignments.filter(a => a.staff_id === c.id)
    let serviciosMes = 0, horasMes = 0, horasTotales = 0, kmTotales = 0
    let ultimo: string | null = null
    for (const a of asigs) {
      const q = quotesById[a.quote_request_id]
      const trip = q?.trip_date ?? null
      if (a.iniciado_at && a.finalizado_at) {
        const h = (new Date(a.finalizado_at).getTime() - new Date(a.iniciado_at).getTime()) / 3600000
        if (h > 0) { horasTotales += h; if (trip && inMonth(trip, now)) horasMes += h }
      }
      if (q?.estimated_km) kmTotales += q.estimated_km
      if (trip) {
        if (inMonth(trip, now)) serviciosMes++
        if (!ultimo || new Date(trip) > new Date(ultimo)) ultimo = trip
      }
    }
    stats[c.id] = {
      serviciosMes,
      horasMes: Math.round(horasMes * 10) / 10,
      serviciosTotales: asigs.length,
      horasTotales: Math.round(horasTotales * 10) / 10,
      kmTotales: Math.round(kmTotales),
      ultimoServicio: ultimo,
    }
  }

  const sidebarLinks = [
    { href: '/dashboard', icon: <Inbox style={{ width: 14, height: 14 }} />, label: 'Solicitudes' },
    { href: '/dashboard/clientes', icon: <Users style={{ width: 14, height: 14 }} />, label: 'Clientes' },
    { href: '/dashboard/analytics', icon: <BarChart3 style={{ width: 14, height: 14 }} />, label: 'Analytics' },
    { href: '/dashboard/calendario', icon: <Calendar style={{ width: 14, height: 14 }} />, label: 'Calendario' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f9fafb', fontFamily: "'DM Sans', system-ui, sans-serif", overflow: 'hidden' }}>
      {/* SIDEBAR */}
      <aside style={{ width: 228, background: '#111827', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 48, height: 48, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FlotaFlyLogo size={40} />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}><FlotaFlyWordmark flotaColor="#fff" /></p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0 }}>Panel de gestión</p>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 6 }}>Principal</p>
          {sidebarLinks.map(item => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: 'rgba(255,255,255,0.45)' }}>
              {item.icon} {item.label}
            </Link>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 6 }}>Config</p>
          <Link href="/dashboard/ajustes" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: 'rgba(255,255,255,0.45)' }}>
            <Settings style={{ width: 14, height: 14 }} /> Ajustes
          </Link>
          <Link href="/dashboard/conductores" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
            <BusFront style={{ width: 14, height: 14 }} /> Conductores
          </Link>
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 36px 56px' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 25, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>Conductores</h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 5 }}>Gestiona tu equipo de conductores, su documentación y servicios</p>
          </div>
          <ConductoresList
            initialConductores={conductores}
            stats={stats}
            expiringIds={[...expiring]}
            companyId={companyId}
          />
        </div>
      </main>
    </div>
  )
}
