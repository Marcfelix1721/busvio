import { redirect } from "next/navigation"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
import { VehiculosManager } from "@/components/dashboard/VehiculosManager"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export default async function VehiculosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const companyId = await getCompanyIdServer(supabase, user.id)
  if (!companyId) redirect("/dashboard")

  const { data: vehiculos } = await supabase
    .from("vehicles").select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f4", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: "#111827", padding: "0 1.5rem", height: "56px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, background: "#fff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FlotaFlyLogo size={28} />
          </div>
          <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600, color: "#fff", fontSize: "0.9375rem" }}><FlotaFlyWordmark flotaColor="#fff" /></span>
        </div>
        <LogoutButton />
      </div>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/dashboard/ajustes" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#6b7280", display: "inline-flex", alignItems: "center", gap: "5px", marginBottom: "1.75rem", textDecoration: "none" }}>
          <ArrowLeft style={{ width: "14px", height: "14px" }} /> Volver a Ajustes
        </Link>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1.375rem", fontWeight: 600, color: "#111827", letterSpacing: "-0.01em", margin: 0 }}>
            Flota de vehículos
          </h1>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#6b7280", marginTop: "4px" }}>
            Gestiona tus vehículos y su estado de disponibilidad
          </p>
        </div>
        <VehiculosManager companyId={companyId} initialVehiculos={vehiculos ?? []} />
      </div>
    </div>
  )
}