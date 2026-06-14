import { redirect, notFound } from "next/navigation"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ConductorFicha } from "@/components/dashboard/ConductorFicha"
import type { Staff, StaffDocumento } from "@/lib/staff"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export const revalidate = 0

export type ServicioRealizado = {
  id: string
  trip_date: string | null
  origin: string | null
  destination: string | null
  requester_name: string | null
  status: string | null
  duracionMin: number | null
}

export default async function ConductorFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const companyId = await getCompanyIdServer(supabase, user.id)
  if (!companyId) redirect("/dashboard")

  const { data: staffRow } = await supabase
    .from("staff").select("*").eq("id", id).eq("company_id", companyId).maybeSingle()
  if (!staffRow) notFound()
  const staff = staffRow as Staff

  const { data: docsData } = await supabase
    .from("staff_documentos").select("*").eq("staff_id", id).order("created_at", { ascending: false })
  const documentos = (docsData ?? []) as StaffDocumento[]

  // Servicios realizados (asignaciones + presupuesto asociado)
  const { data: asigData } = await supabase
    .from("service_assignments")
    .select("quote_request_id, iniciado_at, finalizado_at")
    .eq("staff_id", id)
  const asigs = asigData ?? []
  const quoteIds = [...new Set(asigs.map(a => a.quote_request_id))]

  const servicios: ServicioRealizado[] = []
  let horasTotales = 0, kmTotales = 0
  if (quoteIds.length > 0) {
    const { data: quotes } = await supabase
      .from("quote_requests")
      .select("id, trip_date, origin, destination, requester_name, status, estimated_km")
      .in("id", quoteIds)
    const qById = Object.fromEntries((quotes ?? []).map(q => [q.id, q]))
    for (const a of asigs) {
      const q = qById[a.quote_request_id]
      if (!q) continue
      let duracionMin: number | null = null
      if (a.iniciado_at && a.finalizado_at) {
        const m = Math.round((new Date(a.finalizado_at).getTime() - new Date(a.iniciado_at).getTime()) / 60000)
        if (m > 0) { duracionMin = m; horasTotales += m / 60 }
      }
      if (q.estimated_km) kmTotales += q.estimated_km
      servicios.push({
        id: q.id, trip_date: q.trip_date, origin: q.origin, destination: q.destination,
        requester_name: q.requester_name, status: q.status, duracionMin,
      })
    }
    servicios.sort((a, b) => new Date(b.trip_date ?? 0).getTime() - new Date(a.trip_date ?? 0).getTime())
  }

  const kpis = {
    serviciosTotales: servicios.length,
    horasTotales: Math.round(horasTotales * 10) / 10,
    kmTotales: Math.round(kmTotales),
  }

  return (
    <ConductorFicha
      staff={staff}
      documentos={documentos}
      servicios={servicios}
      kpis={kpis}
      companyId={companyId}
    />
  )
}
