import { redirect } from "next/navigation"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { CalendarioClient } from "@/components/dashboard/CalendarioClient"

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

  const companyId = await getCompanyIdServer(supabase, user.id)
  if (!companyId) redirect("/dashboard")

  const { data: servicios } = await supabase
    .from("quote_requests")
    .select("id, trip_date, origin, destination, passengers, vehicle_type, requester_name, final_price, estimated_price, vehicle_id")
    .eq("company_id", companyId)
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
    .eq("company_id", companyId)

  const vehiculosMap = Object.fromEntries((vehiculos ?? []).map(v => [v.id, v]))

  const serviciosConDatos = (servicios ?? []).map(s => ({
    ...s,
    assignments: assignments.filter(a => a.quote_request_id === s.id),
    vehicle: s.vehicle_id ? vehiculosMap[s.vehicle_id] ?? null : null,
  }))

  return (
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
  )
}