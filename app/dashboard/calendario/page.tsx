import { redirect } from "next/navigation"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
import { CalendarioClient } from "@/components/dashboard/CalendarioClient"
import Link from "next/link"
import {
  BusFront, Inbox, Users, BarChart3, Settings, Calendar, ClipboardList
} from "lucide-react"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: userData } = await supabase
    .from("users").select("company_id").eq("id", user.id).maybeSingle()
  if (!userData?.company_id) redirect("/dashboard")

  const { data: servicios } = await supabase
    .from("quote_requests")
    .select("id, trip_date, origin, destination, passengers, vehicle_type, requester_name, final_price, estimated_price, vehicle_id")
    .eq("company_id", userData.company_id)
    .eq("status", "aceptado")
    .order("trip_date", { ascending: true })

  // Obtener asignaciones con staff
  const servicioIds = (servicios ?? []).map(s => s.id)
  let assignments: any[] = []
  if (servicioIds.length > 0) {
    const { data } = await supabase
      .from("service_assignments")
      .select("quote_request_id, rol_en_servicio, staff(nombre, rol)")
      .in("quote_request_id", servicioIds)
    assignments = data ?? []
  }

  // Obtener vehículos
  const { data: vehiculos } = await supabase
    .from("vehicles")
    .select("id, matricula, marca_modelo")
    .eq("company_id", userData.company_id)

  const vehiculosMap = Object.fromEntries((vehiculos ?? []).map(v => [v.id, v]))

  const serviciosConDatos = (servicios ?? []).map(s => ({
    ...s,
    assignments: assignments.filter(a => a.quote_request_id === s.id),
    vehicle: s.vehicle_id ? vehiculosMap[s.vehicle_id] ?? null : null,
  }))

  return (
    <div className="flex h-screen bg-[#f5f5f4] overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-[220px] flex-col bg-[#111827] flex-shrink-0">
        <div className="px-5 pt-6 pb-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <FlotaFlyLogo size={40} />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight"><FlotaFlyWordmark flotaColor="#fff" /></span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest px-2 pb-1">Principal</p>
          <SideLink href="/dashboard" icon={<Inbox className="size-3.5" />} label="Solicitudes" />
          <SideLink href="/dashboard/servicios" icon={<ClipboardList className="size-3.5" />} label="Servicios" />
          <SideLink href="/dashboard/clientes" icon={<Users className="size-3.5" />} label="Clientes" />
          <SideLink href="/dashboard/analytics" icon={<BarChart3 className="size-3.5" />} label="Analytics" />
          <SideLink href="/dashboard/calendario" icon={<Calendar className="size-3.5" />} label="Calendario" active />
          <div className="pt-4 pb-1 px-2">
            <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest">Config</p>
          </div>
          <SideLink href="/dashboard/ajustes" icon={<Settings className="size-3.5" />} label="Ajustes" />
          <Link href="/dashboard/conductores" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: 'rgba(255,255,255,0.45)' }}>
            <BusFront style={{ width: 14, height: 14 }} /> Conductores
          </Link>
        </nav>
        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          <p className="text-[11px] text-white/30 truncate px-2">{user.email}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          <div style={{ marginBottom: "1.5rem" }}>
            <h1 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1.375rem", fontWeight: 600, color: "#111827", letterSpacing: "-0.01em", margin: 0 }}>
              Calendario de servicios
            </h1>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#6b7280", marginTop: "4px" }}>
              Servicios confirmados con vehículo y personal asignado
            </p>
          </div>
          <CalendarioClient servicios={serviciosConDatos} />
        </div>
      </main>
    </div>
  )
}

function SideLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
      active ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
    }`}>
      {icon} {label}
    </Link>
  )
}