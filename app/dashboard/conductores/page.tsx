import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { LogoutButton } from '@/components/dashboard/LogoutButton'
import ConductoresManager from '@/components/dashboard/ConductoresManager'
import Link from 'next/link'
import { ArrowLeft, BusFront, Users, BarChart3, Calendar, Inbox, Settings } from 'lucide-react'

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export const revalidate = 0

export default async function ConductoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!userData?.company_id) redirect('/dashboard')

  const companyId = userData.company_id

  // Conductores de la empresa
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, nombre, rol, estado, email, user_id')
    .eq('company_id', companyId)
    .eq('rol', 'conductor')
    .order('nombre')

  // Servicios aceptados de hoy
  const today = new Date().toISOString().split('T')[0]
  const { data: serviciosHoy } = await supabase
    .from('quote_requests')
    .select('id, origin, destination, departure_time, vehicle_id')
    .eq('company_id', companyId)
    .eq('status', 'aceptado')
    .eq('trip_date', today)

  // Asignaciones de hoy
  const servicioIds = (serviciosHoy ?? []).map(s => s.id)
  let assignments: any[] = []
  let logs: any[] = []

  if (servicioIds.length > 0) {
    const { data: assignData } = await supabase
      .from('service_assignments')
      .select('staff_id, quote_request_id, rol_en_servicio')
      .in('quote_request_id', servicioIds)
    assignments = assignData ?? []

    const { data: logsData } = await supabase
      .from('service_logs')
      .select('*')
      .in('quote_request_id', servicioIds)
    logs = logsData ?? []
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f4', fontFamily: "'DM Sans', system-ui, sans-serif", overflow: 'hidden' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 228, background: '#111827', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BusFront style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>Busvio</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0 }}>Panel de gestión</p>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 6 }}>Principal</p>
          {[
            { href: '/dashboard', icon: <Inbox style={{ width: 14, height: 14 }} />, label: 'Solicitudes' },
            { href: '/dashboard/clientes', icon: <Users style={{ width: 14, height: 14 }} />, label: 'Clientes' },
            { href: '/dashboard/analytics', icon: <BarChart3 style={{ width: 14, height: 14 }} />, label: 'Analytics' },
            { href: '/dashboard/calendario', icon: <Calendar style={{ width: 14, height: 14 }} />, label: 'Calendario' },
          ].map(item => (
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
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 48px' }}>
          <Link href="/dashboard" style={{ fontSize: 13, color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 24, textDecoration: 'none' }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Volver al panel
          </Link>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Conductores
            </h1>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
              Estado en tiempo real y gestión de accesos
            </p>
          </div>

          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', margin: 0 }}>🔗 Link de acceso para conductores</p>
              <p style={{ fontSize: 12, color: '#0284c7', margin: '2px 0 0' }}>busvio.vercel.app/conductor/login</p>
            </div>
            <a href="https://busvio.vercel.app/conductor/login" target="_blank" style={{ background: '#0369a1', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              Abrir →
            </a>
          </div>

          <ConductoresManager
            staff={staffData ?? []}
            serviciosHoy={serviciosHoy ?? []}
            assignments={assignments}
            logs={logs}
            companyId={companyId}
          />
        </div>
      </main>
    </div>
  )
}