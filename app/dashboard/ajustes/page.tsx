import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { SettingsForm } from "@/components/dashboard/SettingsForm"
import CostVariablesManager from "@/components/dashboard/CostVariablesManager"
import Link from "next/link"
import { ArrowLeft, Bus, Users, Settings } from "lucide-react"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export default async function AjustesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: userData } = await supabase.from("users").select("company_id").eq("id", user.id).maybeSingle()
  if (!userData?.company_id) redirect("/dashboard")

  const [{ data: settings }, { data: company }, { data: pricingSettings }, { data: vehiculosData }, { data: staffData }] = await Promise.all([
    supabase.from("company_settings").select("*").eq("company_id", userData.company_id).maybeSingle(),
    supabase.from("companies").select("*").eq("id", userData.company_id).maybeSingle(),
    supabase.from("pricing_settings").select("garage_address, parking_address").eq("company_id", userData.company_id).maybeSingle(),
    supabase.from("vehicles").select("id").eq("company_id", userData.company_id),
    supabase.from("staff").select("id").eq("company_id", userData.company_id),
  ])

  const totalVehiculos = vehiculosData?.length ?? 0
  const totalStaff = staffData?.length ?? 0

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f4", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* TOPBAR */}
      <div style={{ background: "#111827", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bus style={{ width: 14, height: 14, color: "#fff" }} />
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Busvio</span>
        </div>
        <Link href="/dashboard" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Volver al panel
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, background: "#111827", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Settings style={{ width: 17, height: 17, color: "#fff" }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.02em", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Ajustes</h1>
          </div>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Configura tu empresa, tarifas y motor de costes
          </p>
        </div>

        {/* ACCESOS RÁPIDOS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          {[
            { href: "/dashboard/vehiculos", icon: Bus, color: "#111827", label: "Flota de vehículos", sub: totalVehiculos === 0 ? "Sin vehículos" : `${totalVehiculos} vehículo${totalVehiculos !== 1 ? "s" : ""}` },
            { href: "/dashboard/staff", icon: Users, color: "#0f766e", label: "Personal", sub: totalStaff === 0 ? "Sin personal" : `${totalStaff} persona${totalStaff !== 1 ? "s" : ""}` },
          ].map(({ href, icon: Icon, color, label, sub }) => (
            <Link key={href} href={href} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "16px 20px", textDecoration: "none", transition: "border-color 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon style={{ width: 19, height: 19, color: "#fff" }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{sub}</p>
                </div>
              </div>
              <ArrowLeft style={{ width: 15, height: 15, color: "#d1d5db", transform: "rotate(180deg)" }} />
            </Link>
          ))}
        </div>

        {/* VARIABLES DE COSTE */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "24px", marginBottom: 28 }}>
          <CostVariablesManager companyId={userData.company_id} />
        </div>

        {/* AJUSTES EMPRESA + OPERACIONES + MARGEN */}
        <SettingsForm
          settings={settings}
          companyId={userData.company_id}
          company={company}
          pricingSettings={pricingSettings}
        />

      </div>
    </div>
  )
}