import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ConductorDashboard from '@/components/conductor/ConductorDashboard'

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export const revalidate = 0

export default async function ConductorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/conductor/login')
  if (user.user_metadata?.role !== 'conductor') redirect('/conductor/login')

  const staffId = user.user_metadata?.staff_id
  const companyId = user.user_metadata?.company_id

  // Datos del conductor
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, nombre, rol, estado')
    .eq('id', staffId)
    .single()

  // Datos de la empresa
  const { data: companyData } = await supabase
    .from('companies')
    .select('name, logo_url, color_primario')
    .eq('id', companyId)
    .single()

  // Servicios asignados al conductor
  const { data: assignmentsData } = await supabase
    .from('service_assignments')
    .select(`
      id,
      rol_en_servicio,
      estado_conductor,
      visto_at,
      iniciado_at,
      finalizado_at,
      quote_requests (
        id,
        origin,
        destination,
        trip_date,
        departure_time,
        return_date,
        return_time,
        passengers,
        status,
        comments,
        vehicle_id
      )
    `)
    .eq('staff_id', staffId)
    .order('created_at', { ascending: false })

  // Filtrar solo servicios aceptados
  const servicios = (assignmentsData ?? [])
    .filter((a: any) => a.quote_requests?.status === 'aceptado')
    .map((a: any) => ({
      assignment_id: a.id,
      rol: a.rol_en_servicio,
      estado_conductor: a.estado_conductor || 'asignado',
      ...a.quote_requests,
    }))

  // Fichajes existentes
  const quoteIds = servicios.map((s: any) => s.id)
  let logs: any[] = []
  if (quoteIds.length > 0) {
    const { data: logsData } = await supabase
      .from('service_logs')
      .select('*')
      .eq('staff_id', staffId)
      .in('quote_request_id', quoteIds)
    logs = logsData ?? []
  }

  return (
    <ConductorDashboard
      conductor={staffData}
      company={companyData}
      servicios={servicios}
      logs={logs}
      staffId={staffId}
    />
  )
}