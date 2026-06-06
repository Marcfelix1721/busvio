import Link from "next/link"
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  BusFront, Clock3, FileText, Settings,
  CircleCheck, Users, Euro, ChevronRight, AlertTriangle,
  BarChart3, ArrowUpRight, Inbox, Calendar, TrendingUp, ClipboardList,
} from "lucide-react"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
import { QuoteRequest } from "@/lib/types"
import { DashboardClient } from "@/components/dashboard/DashboardClient"
import { ImpersonationBanner } from "@/components/dashboard/ImpersonationBanner"
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard"
import { ADMIN_EMAIL } from "@/lib/admin"

export const revalidate = 0

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

function diasHasta(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  // Verificar si el admin está impersonando
  const adminEmail = ADMIN_EMAIL
  let companyId = session.user.id // Por defecto, el user.id ES el company_id

  if (session.user.email === adminEmail) {
    // Es el admin, verificar si está impersonando
    const { data: impersonation } = await supabase
      .from("admin_sessions")
      .select("impersonated_company_id")
      .eq("admin_user_id", session.user.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (impersonation?.impersonated_company_id) {
      companyId = impersonation.impersonated_company_id
    } else {
      // Admin sin impersonación activa, redirigir a /admin
      redirect("/admin")
    }
  }

  // Si es conductor, redirigir a su portal
  if (session.user.user_metadata?.role === "conductor") {
    redirect("/conductor")
  }

  const { data: companyData } = await supabase
    .from("companies")
    .select("name, slug, onboarding_completado, active")
    .eq("id", companyId)
    .single()

  // Empresa desactivada: expulsar al panel (salvo que sea el admin impersonando)
  if (companyData && companyData.active === false && session.user.email !== adminEmail) {
    redirect("/login")
  }

  // Si la empresa aún no completó el onboarding, mostrar el wizard guiado
  // en lugar del dashboard normal.
  if (companyData && !companyData.onboarding_completado) {
    const [{ data: pricing }, { data: settings }] = await Promise.all([
      supabase.from("pricing_settings").select("garage_address, price_per_km").eq("company_id", companyId).maybeSingle(),
      supabase.from("company_settings").select("margen_beneficio, iva, precio_minimo_servicio").eq("company_id", companyId).maybeSingle(),
    ])
    return (
      <OnboardingWizard
        companyId={companyId}
        companyName={companyData.name ?? "tu empresa"}
        slug={companyData.slug ?? ""}
        initialGarage={pricing?.garage_address ?? ""}
        initialPricing={{ price_per_km: pricing?.price_per_km }}
        initialSettings={{
          margen_beneficio: settings?.margen_beneficio,
          iva: settings?.iva,
          precio_minimo_servicio: settings?.precio_minimo_servicio,
        }}
      />
    )
  }

  const { data: rawData } = await supabase
    .from("quote_requests").select("*").eq("company_id", companyId).order("created_at", { ascending: false })
  const requests = (rawData ?? []) as QuoteRequest[]

  const { data: clientesData } = await supabase.from("clientes").select("email, estado_relacion").eq("company_id", companyId)
  const relacionMap = Object.fromEntries((clientesData ?? []).map(c => [c.email, c.estado_relacion]))

  const facturado = requests.filter(r => r.status === "aceptado").reduce((s, r) => s + (r.final_price ?? r.estimated_price ?? 0), 0)
  const pendiente = requests.filter(r => r.status === "enviado").reduce((s, r) => s + (r.final_price ?? r.estimated_price ?? 0), 0)
  const clientes = new Set(requests.map(r => r.requester_email)).size
  const aceptadas = requests.filter(r => r.status === "aceptado").length
  const tasa = requests.length > 0 ? Math.round((aceptadas / requests.length) * 100) : 0

  const urgentes = requests.filter(r => {
    const d = diasHasta(r.trip_date)
    return d >= 0 && d <= 7 && !["aceptado", "cancelado", "rechazado"].includes(r.status)
  })

  const companyName = companyData?.name ?? "Dashboard"
  const today = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })

  // Verificar si está impersonando para mostrar el banner
  const isImpersonating = session.user.email === adminEmail && companyId !== session.user.id

  const kpis = [
    {
      label: "Total solicitudes",
      value: requests.length,
      sub: `${requests.filter(r => r.status === "nuevo").length} nuevas · ${requests.filter(r => r.status === "en_revision").length} en revisión`,
      color: "#2563eb",
      lightColor: "#eff6ff",
      icon: "file",
    },
    {
      label: "Tasa de cierre",
      value: `${tasa}%`,
      sub: `${aceptadas} aceptadas de ${requests.length}`,
      color: "#16a34a",
      lightColor: "#f0fdf4",
      icon: "check",
      up: tasa > 0,
    },
    {
      label: "Facturado",
      value: `${facturado.toLocaleString("es-ES")} €`,
      sub: `${clientes} clientes únicos`,
      color: "#7c3aed",
      lightColor: "#f5f3ff",
      icon: "euro",
    },
    {
      label: "Pendiente de cobro",
      value: `${pendiente.toLocaleString("es-ES")} €`,
      sub: `${requests.filter(r => r.status === "enviado").length} presupuestos enviados`,
      color: "#d97706",
      lightColor: "#fffbeb",
      icon: "clock",
    },
  ]

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f5f5f4", fontFamily: "'DM Sans', system-ui, sans-serif", overflow: "hidden" }}>

      {/* SIDEBAR */}
      <DashboardSidebar email={session.user.email} />

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        {/* IMPERSONATION BANNER */}
        {isImpersonating && (
          <div style={{
            background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            padding: "12px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <span style={{ fontSize: 16 }}>👑</span>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>
                  Modo Superadmin: Impersonando {companyName}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", margin: 0 }}>
                  Estás viendo el dashboard como si fueras esta empresa
                </p>
              </div>
            </div>
            <ImpersonationBanner />
          </div>
        )}

        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 32px 48px" }}>

          {/* HEADER */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>{companyName}</h1>
              <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4, textTransform: "capitalize" }}>{today}</p>
            </div>
            {urgentes.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 20, padding: "6px 14px" }}>
                <AlertTriangle style={{ width: 13, height: 13, color: "#d97706" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>
                  {urgentes.length} viaje{urgentes.length > 1 ? "s" : ""} urgente{urgentes.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {/* ALERTA URGENTES */}
          {urgentes.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
              <AlertTriangle style={{ width: 16, height: 16, color: "#f59e0b", marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#92400e", margin: 0 }}>
                  {urgentes.length} solicitud{urgentes.length > 1 ? "es" : ""} con viaje en menos de 7 días pendientes de gestionar
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                  {urgentes.map(r => (
                    <Link key={r.id} href={`/dashboard/solicitudes/${r.id}`}
                      style={{ fontSize: 12, color: "#b45309", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>
                      {r.requester_name} · {new Date(r.trip_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
            {kpis.map((kpi, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: kpi.color, borderRadius: "16px 0 0 16px" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, background: kpi.lightColor, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {i === 0 && <FileText style={{ width: 16, height: 16, color: kpi.color }} />}
                    {i === 1 && <CircleCheck style={{ width: 16, height: 16, color: kpi.color }} />}
                    {i === 2 && <Euro style={{ width: 16, height: 16, color: kpi.color }} />}
                    {i === 3 && <Clock3 style={{ width: 16, height: 16, color: kpi.color }} />}
                  </div>
                  {kpi.up && <TrendingUp style={{ width: 14, height: 14, color: "#16a34a" }} />}
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>{kpi.value}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "6px 0 2px" }}>{kpi.label}</p>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{kpi.sub}</p>
              </div>
            ))}
          </div>

          <DashboardClient requests={requests} relacionMap={relacionMap} />

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