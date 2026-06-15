import { redirect } from "next/navigation"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ServiciosOperativos } from "@/components/dashboard/ServiciosOperativos"
import { ClipboardList, CircleDashed, CalendarCheck, CircleCheck } from "lucide-react"
import { DOCS_CRITICOS } from "@/lib/conflicts"
import { StatCard } from "@/components/dashboard/StatCard"
import { COLORS, SPACE, FONT_DISPLAY } from "@/lib/dashboard-ui"

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
  const companyId = await getCompanyIdServer(supabase, user.id)
  if (!companyId) redirect("/dashboard")
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

  const resumen = {
    total: servicios.length,
    sinAsignar: servicios.filter(s => s.estado === "sin_asignar").length,
    asignados: servicios.filter(s => s.estado === "asignado" || s.estado === "en_curso").length,
    finalizados: servicios.filter(s => s.estado === "finalizado").length,
  }

  return (
    <div style={{ maxWidth: SPACE.pageMax, margin: "0 auto", padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: SPACE.section }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: COLORS.navy, margin: 0, letterSpacing: "-0.025em" }}>Servicios</h1>
        <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>Planifica y asigna los servicios aceptados</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(218px, 1fr))", gap: SPACE.gap, marginBottom: SPACE.section }}>
        <StatCard label="Servicios aceptados" value={resumen.total} icon={ClipboardList} tone="default" />
        <StatCard label="Sin asignar" value={resumen.sinAsignar} sub="Requieren conductor o vehículo" icon={CircleDashed} tone="warning" />
        <StatCard label="Asignados" value={resumen.asignados} sub="Listos o en curso" icon={CalendarCheck} tone="default" />
        <StatCard label="Finalizados" value={resumen.finalizados} icon={CircleCheck} tone="positive" />
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
  )
}
