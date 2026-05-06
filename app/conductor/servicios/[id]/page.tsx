import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ServicioDetalle from '@/components/conductor/ServicioDetalle'

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export const revalidate = 0

export default async function ServicioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/conductor/login')
  if (user.user_metadata?.role !== 'conductor') redirect('/conductor/login')

  const staffId = user.user_metadata?.staff_id

  // Obtener la asignación
  const { data: assignment } = await supabase
    .from('service_assignments')
    .select('id, rol_en_servicio, estado_conductor, visto_at, iniciado_at, finalizado_at')
    .eq('quote_request_id', id)
    .eq('staff_id', staffId)
    .single()

  if (!assignment) redirect('/conductor')

  // Obtener el servicio completo
  const { data: servicio } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (!servicio) redirect('/conductor')

  // Obtener vehículo si hay asignado
  let vehiculo = null
  if (servicio.vehicle_id) {
    const { data: v } = await supabase
      .from('vehicles')
      .select('id, matricula, marca_modelo, plazas, tipo')
      .eq('id', servicio.vehicle_id)
      .single()
    vehiculo = v
  }

  // Obtener incidencias
  const { data: incidencias } = await supabase
    .from('service_incidents')
    .select('*')
    .eq('service_assignment_id', assignment.id)
    .order('created_at', { ascending: false })

  // Obtener datos de la empresa
  const { data: company } = await supabase
    .from('companies')
    .select('name, logo_url, color_primario, phone')
    .eq('id', servicio.company_id)
    .single()

  return (
    <ServicioDetalle
      servicio={servicio}
      assignment={assignment}
      vehiculo={vehiculo}
      incidencias={incidencias ?? []}
      company={company}
      staffId={staffId}
    />
  )
}