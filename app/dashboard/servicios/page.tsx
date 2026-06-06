import { redirect } from "next/navigation"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
import { ServiciosOperativos } from "@/components/dashboard/ServiciosOperativos"
import Link from "next/link"
import { BusFront, Users, BarChart3, Calendar, Inbox, Settings, ClipboardList } from "lucide-react"
import { DOCS_CRITICOS } from "@/lib/conflicts"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export const revalidate = 0

const CONDUCTOR_ROLES = ["conductor_principal", "conductor_relevo"]

export default async function ServiciosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: userData } = await supabase.from("users").select("company_id").eq("id", user.id).single()
  if (!userData?.company_id) redirect("/dashboard")
  const companyId = userData.company_id
  const todayStr = new Date().toISOString().slice(0, 10)

  const { data: quotesData } = await supabase
    .from("quote_requests")
    .select("id, requester_name, origin, destination, trip_date, departure_time, vehicle_id, estimated_km, passengers")
    .eq("company_id", companyId)
    .eq("status", "aceptado")
    .order("trip_date", { ascending: true })
  const quotes = quotesData ?? []
  const quoteIds = quotes.map(q => q.id)

  const { data: vehiclesData } = await supabase
    .from("vehicles").select("id, matricula, marca_modelo, plazas").eq("company_id", companyId).order("plazas")
  const vehicles = vehiclesData ?? []
  const vehicleById = Object.fromEntries(vehicles.map(v => [v.id, v]))

  const { data: conductoresData } = await supabase
    .from("staff").select("id, nombre, estado, email").eq("company_id", companyId).eq("rol", "conductor").order("nombre")
  const conductores = conductoresData ?? []
  const conductorIds = conductores.map(c => c.id)

  // Asignaciones de los servicios aceptados (para las tarjetas)
  let asgByQuote: Record<string, any[]> = {}
  if (quoteIds.length > 0) {
    const { data: asg } = await supabase
      .from("service_assignments")
      .select("quote_request_id, staff_id, rol_en_servicio, iniciado_at, finalizado_at, staff(nombre)")
      .in("quote_request_id", quoteIds)
    for (const a of (asg ?? []) as any[]) {
      (asgByQuote[a.quote_request_id] ||= []).push(a)
    }
  }

  // Fechas ocupadas por conductor (para conflictos en el modal)
  const busyDatesByStaff: Record<string, string[]> = {}
  if (conductorIds.length > 0) {
    const { data: condAsg } = await supabase
      .from("service_assignments")
      .select("staff_id, quote_requests(trip_date)")
      .in("staff_id", conductorIds)
    for (const a of (condAsg ?? []) as any[]) {
      const d = a.quote_requests?.trip_date?.slice(0, 10)
      if (d) (busyDatesByStaff[a.staff_id] ||= []).push(d)
    }
  }

  // Documentos críticos vencidos por conductor
  const expiredDocByStaff: Record<string, string> = {}
  const { data: expiredDocs } = await supabase
    .from("staff_documentos").select("staff_id, tipo").eq("company_id", companyId)
    .in("tipo", DOCS_CRITICOS).lt("fecha_vencimiento", todayStr)
  for (const d of expiredDocs ?? []) if (!expiredDocByStaff[d.staff_id]) expiredDocByStaff[d.staff_id] = d.tipo

  // Vehículos ocupados por fecha
  const vehicleBusyByDate: Record<string, string[]> = {}
  for (const q of quotes) {
    const d = q.trip_date?.slice(0, 10)
    if (q.vehicle_id && d) (vehicleBusyByDate[d] ||= []).push(q.vehicle_id)
  }

  // Construir tarjetas de servicio con estado calculado
  const servicios = quotes.map(q => {
    const asg = asgByQuote[q.id] ?? []
    const conductorAsg = asg.find(a => CONDUCTOR_ROLES.includes(a.rol_en_servicio)) ?? asg[0]
    const hasConductor = !!conductorAsg
    const hasVehicle = !!q.vehicle_id
    const anyFinalizado = asg.some(a => a.finalizado_at)
    const anyIniciado = asg.some(a => a.iniciado_at)
    const isToday = q.trip_date?.slice(0, 10) === todayStr
    let estado: "sin_asignar" | "asignado" | "en_curso" | "finalizado" = "sin_asignar"
    if (anyFinalizado) estado = "finalizado"
    else if (isToday && anyIniciado) estado = "en_curso"
    else if (hasConductor && hasVehicle) estado = "asignado"
    const veh = q.vehicle_id ? vehicleById[q.vehicle_id] : null
    return {
      id: q.id, requester_name: q.requester_name, origin: q.origin, destination: q.destination,
      trip_date: q.trip_date, departure_time: q.departure_time, estimated_km: q.estimated_km, passengers: q.passengers,
      vehicleId: q.vehicle_id ?? null,
      vehiculoNombre: veh ? `${veh.marca_modelo} (${veh.matricula})` : null,
      conductorId: conductorAsg?.staff_id ?? null,
      conductorNombre: conductorAsg?.staff?.nombre ?? null,
      estado,
    }
  })

  const sidebarLinks = [
    { href: "/dashboard", icon: <Inbox style={{ width: 14, height: 14 }} />, label: "Solicitudes" },
    { href: "/dashboard/servicios", icon: <ClipboardList style={{ width: 14, height: 14 }} />, label: "Servicios", active: true },
    { href: "/dashboard/clientes", icon: <Users style={{ width: 14, height: 14 }} />, label: "Clientes" },
    { href: "/dashboard/analytics", icon: <BarChart3 style={{ width: 14, height: 14 }} />, label: "Analytics" },
    { href: "/dashboard/calendario", icon: <Calendar style={{ width: 14, height: 14 }} />, label: "Calendario" },
  ]

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f9fafb", fontFamily: "'DM Sans', system-ui, sans-serif", overflow: "hidden" }}>
      <aside style={{ width: 228, background: "#111827", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 48, height: 48, background: "#fff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FlotaFlyLogo size={40} />
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}><FlotaFlyWordmark flotaColor="#fff" /></p>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, margin: 0 }}>Panel de gestión</p>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 6 }}>Principal</p>
          {sidebarLinks.map(item => (
            <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none", background: item.active ? "rgba(255,255,255,0.1)" : "transparent", color: item.active ? "#fff" : "rgba(255,255,255,0.45)" }}>
              {item.icon} {item.label}
            </Link>
          ))}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 6 }}>Config</p>
          <Link href="/dashboard/ajustes" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none", color: "rgba(255,255,255,0.45)" }}>
            <Settings style={{ width: 14, height: 14 }} /> Ajustes
          </Link>
          <Link href="/dashboard/conductores" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none", color: "rgba(255,255,255,0.45)" }}>
            <BusFront style={{ width: 14, height: 14 }} /> Conductores
          </Link>
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <LogoutButton />
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 36px 56px" }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 25, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.025em" }}>Servicios</h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginTop: 5 }}>Planifica y asigna los servicios aceptados</p>
          </div>
          <ServiciosOperativos
            servicios={servicios}
            conductores={conductores}
            vehicles={vehicles}
            busyDatesByStaff={busyDatesByStaff}
            expiredDocByStaff={expiredDocByStaff}
            vehicleBusyByDate={vehicleBusyByDate}
            companyId={companyId}
          />
        </div>
      </main>
    </div>
  )
}
