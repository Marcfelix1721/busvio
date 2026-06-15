import { redirect } from 'next/navigation'
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ConductoresList } from '@/components/dashboard/ConductoresList'
import type { Staff, ConductorStats } from '@/lib/staff'
import { COLORS, SPACE, FONT_DISPLAY } from '@/lib/dashboard-ui'

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

  const companyId = await getCompanyIdServer(supabase, user.id)
  if (!companyId) redirect('/dashboard')

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

  return (
    <div style={{ maxWidth: SPACE.pageMax, margin: '0 auto', padding: '32px 32px 64px' }}>
      <div style={{ marginBottom: SPACE.section }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: COLORS.navy, margin: 0, letterSpacing: '-0.025em' }}>Conductores</h1>
        <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>Gestiona tu equipo de conductores, su documentación y servicios</p>
      </div>
      <ConductoresList
        initialConductores={conductores}
        stats={stats}
        expiringIds={[...expiring]}
        companyId={companyId}
      />
    </div>
  )
}
