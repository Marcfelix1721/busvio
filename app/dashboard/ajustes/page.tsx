import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { SettingsForm } from "@/components/dashboard/SettingsForm"
import CostVariablesManager from "@/components/dashboard/CostVariablesManager"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
import Link from "next/link"
import type { ReactNode } from "react"
import {
  BusFront, Settings, Users, Bus,
  BarChart3, Inbox, Calendar, ChevronRight, ArrowUpRight
} from "lucide-react"

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
    <div style={{ display: "flex", height: "100vh", background: "#f5f5f4", fontFamily: "'DM Sans', system-ui, sans-serif", overflow: "hidden" }}>

      {/* SIDEBAR — idéntico al dashboard */}
      <aside style={{ width: 228, background: "#111827", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BusFront style={{ width: 16, height: 16, color: "#fff" }} />
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0, letterSpacing: "-0.01em" }}>Busvio</p>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, margin: 0 }}>Panel de gestión</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 6 }}>Principal</p>
          <SideLink href="/dashboard" icon={<Inbox style={{ width: 14, height: 14 }} />} label="Solicitudes" />
          <SideLink href="/dashboard/clientes" icon={<Users style={{ width: 14, height: 14 }} />} label="Clientes" />
          <SideLink href="/dashboard/analytics" icon={<BarChart3 style={{ width: 14, height: 14 }} />} label="Analytics" />
          <SideLink href="/dashboard/calendario" icon={<Calendar style={{ width: 14, height: 14 }} />} label="Calendario" />
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 6 }}>Config</p>
          <SideLink href="/dashboard/ajustes" icon={<Settings style={{ width: 14, height: 14 }} />} label="Ajustes" active />
          <SideLink href="/dashboard/conductores" icon={<BusFront style={{ width: 14, height: 14 }} />} label="Conductores" />
        </nav>

        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
                {user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 36px 64px" }}>

          {/* HEADER */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>
                  Ajustes
                </h1>
                <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
                  {company?.name ?? "Tu empresa"} · Configuración general
                </p>
              </div>
            </div>
          </div>

          {/* ACCESOS RÁPIDOS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            <QuickLink
              href="/dashboard/vehiculos"
              icon={<Bus style={{ width: 18, height: 18, color: "#fff" }} />}
              color="#111827"
              label="Flota de vehículos"
              sub={totalVehiculos === 0 ? "Sin vehículos registrados" : `${totalVehiculos} vehículo${totalVehiculos !== 1 ? "s" : ""} registrado${totalVehiculos !== 1 ? "s" : ""}`}
            />
            <QuickLink
              href="/dashboard/staff"
              icon={<Users style={{ width: 18, height: 18, color: "#fff" }} />}
              color="#0f766e"
              label="Personal"
              sub={totalStaff === 0 ? "Sin personal registrado" : `${totalStaff} persona${totalStaff !== 1 ? "s" : ""} registrada${totalStaff !== 1 ? "s" : ""}`}
            />
          </div>

          {/* VARIABLES DE COSTE */}
          <Section label="Motor de costes" desc="Variables, condiciones y grupos de exclusión por empresa">
            <CostVariablesManager companyId={userData.company_id} />
          </Section>

          {/* AJUSTES */}
          <SettingsForm
            settings={settings}
            companyId={userData.company_id}
            company={company}
            pricingSettings={pricingSettings}
          />

        </div>
      </main>
    </div>
  )
}

function SideLink({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8,
      fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "all 0.15s",
      background: active ? "rgba(255,255,255,0.1)" : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.45)",
    }}>
      {icon} {label}
    </Link>
  )
}

function QuickLink({ href, icon, color, label, sub }: { href: string; icon: ReactNode; color: string; label: string; sub: string }) {
  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
      padding: "16px 20px", textDecoration: "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{label}</p>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{sub}</p>
        </div>
      </div>
      <ArrowUpRight style={{ width: 15, height: 15, color: "#d1d5db" }} />
    </Link>
  )
}

function Section({ label, desc, children }: { label: string; desc: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{label}</p>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{desc}</p>
      </div>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24 }}>
        {children}
      </div>
    </div>
  )
}