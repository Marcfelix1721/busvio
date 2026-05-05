import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
import { SettingsForm } from "@/components/dashboard/SettingsForm"
import CostVariablesManager from "@/components/dashboard/CostVariablesManager"
import Link from "next/link"
import { ArrowLeft, Bus, ChevronRight, Users } from "lucide-react"

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

  const { data: userData } = await supabase
    .from("users").select("company_id").eq("id", user.id).maybeSingle()
  if (!userData?.company_id) redirect("/dashboard")

  const { data: settings } = await supabase
    .from("company_settings").select("*")
    .eq("company_id", userData.company_id).maybeSingle()

  const { data: company } = await supabase
    .from("companies").select("*")
    .eq("id", userData.company_id).maybeSingle()

  const { data: pricingSettings } = await supabase
    .from("pricing_settings")
    .select("garage_address, parking_address")
    .eq("company_id", userData.company_id).maybeSingle()

  const { data: vehiculosData } = await supabase
    .from("vehicles").select("id")
    .eq("company_id", userData.company_id)
  const totalVehiculos = vehiculosData?.length ?? 0

  const { data: staffData } = await supabase
    .from("staff").select("id")
    .eq("company_id", userData.company_id)
  const totalStaff = staffData?.length ?? 0

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f4", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: "#111827", padding: "0 1.5rem", height: "56px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600, color: "#fff", fontSize: "0.9375rem" }}>🚌 Busvio</span>
        <LogoutButton />
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/dashboard" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#6b7280", display: "inline-flex", alignItems: "center", gap: "5px", marginBottom: "1.75rem", textDecoration: "none" }}>
          <ArrowLeft style={{ width: "14px", height: "14px" }} /> Volver al panel
        </Link>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1.375rem", fontWeight: 600, color: "#111827", letterSpacing: "-0.01em", margin: 0 }}>
            Ajustes de la empresa
          </h1>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#6b7280", marginTop: "4px" }}>
            Configura los datos, tarifas y parámetros de cálculo
          </p>
        </div>

        {/* ACCESOS RÁPIDOS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1.5rem" }}>

          <Link href="/dashboard/vehiculos" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1rem 1.25rem", textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Bus style={{ width: "20px", height: "20px", color: "#fff" }} />
              </div>
              <div>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "#111827", margin: 0 }}>
                  Flota de vehículos
                </p>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8rem", color: "#6b7280", margin: "2px 0 0" }}>
                  {totalVehiculos === 0
                    ? "Sin vehículos registrados"
                    : `${totalVehiculos} vehículo${totalVehiculos !== 1 ? "s" : ""} registrado${totalVehiculos !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <ChevronRight style={{ width: "16px", height: "16px", color: "#9ca3af", flexShrink: 0 }} />
          </Link>

          <Link href="/dashboard/staff" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1rem 1.25rem", textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Users style={{ width: "20px", height: "20px", color: "#fff" }} />
              </div>
              <div>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "#111827", margin: 0 }}>
                  Personal
                </p>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8rem", color: "#6b7280", margin: "2px 0 0" }}>
                  {totalStaff === 0
                    ? "Sin personal registrado"
                    : `${totalStaff} persona${totalStaff !== 1 ? "s" : ""} registrada${totalStaff !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <ChevronRight style={{ width: "16px", height: "16px", color: "#9ca3af", flexShrink: 0 }} />
          </Link>

        </div>

        {/* VARIABLES DE COSTE */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <CostVariablesManager companyId={userData.company_id} />
        </div>

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