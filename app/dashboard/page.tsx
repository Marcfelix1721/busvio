import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { FileText, CircleCheck, Euro, Clock3, AlertTriangle, Crown } from "lucide-react"
import { QuoteRequest } from "@/lib/types"
import { DashboardClient } from "@/components/dashboard/DashboardClient"
import { ImpersonationBanner } from "@/components/dashboard/ImpersonationBanner"
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard"
import { ADMIN_EMAIL } from "@/lib/admin"
import { StatCard } from "@/components/dashboard/StatCard"
import { COLORS, RADIUS, SPACE, FONT_DISPLAY } from "@/lib/dashboard-ui"

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
  const enviados = requests.filter(r => r.status === "enviado").length

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
      icon: FileText,
      tone: "default" as const,
    },
    {
      label: "Tasa de cierre",
      value: `${tasa}%`,
      sub: `${aceptadas} aceptada${aceptadas === 1 ? "" : "s"} de ${requests.length}`,
      icon: CircleCheck,
      tone: "positive" as const,
    },
    {
      label: "Facturado",
      value: `${facturado.toLocaleString("es-ES")} €`,
      sub: `${clientes} cliente${clientes === 1 ? "" : "s"} único${clientes === 1 ? "" : "s"}`,
      icon: Euro,
      tone: "positive" as const,
    },
    {
      label: "Pendiente de cobro",
      value: `${pendiente.toLocaleString("es-ES")} €`,
      sub: `${enviados} presupuesto${enviados === 1 ? "" : "s"} enviado${enviados === 1 ? "" : "s"}`,
      icon: Clock3,
      tone: "warning" as const,
    },
  ]

  return (
    <>
      {/* BANNER DE IMPERSONACIÓN (superadmin) */}
      {isImpersonating && (
        <div style={{ background: COLORS.navy, padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: RADIUS.sm, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Crown style={{ width: 16, height: 16, color: COLORS.tealOnDark }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Modo Superadmin · Impersonando {companyName}</p>
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", margin: 0 }}>Estás viendo el panel como esta empresa</p>
            </div>
          </div>
          <ImpersonationBanner />
        </div>
      )}

      <div style={{ maxWidth: SPACE.pageMax, margin: "0 auto", padding: "32px 32px 48px" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: SPACE.section }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: COLORS.navy, margin: 0, letterSpacing: "-0.025em" }}>{companyName}</h1>
            <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4, textTransform: "capitalize" }}>{today}</p>
          </div>
          {urgentes.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.warningSoft, border: `1px solid ${COLORS.warning}22`, borderRadius: RADIUS.pill, padding: "6px 14px", flexShrink: 0 }}>
              <AlertTriangle style={{ width: 13, height: 13, color: COLORS.warning }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.warning }}>
                {urgentes.length} viaje{urgentes.length > 1 ? "s" : ""} urgente{urgentes.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* ALERTA URGENTES */}
        {urgentes.length > 0 && (
          <div style={{ background: COLORS.warningSoft, border: `1px solid ${COLORS.warning}22`, borderRadius: RADIUS.md, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
            <AlertTriangle style={{ width: 16, height: 16, color: COLORS.warning, marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.warning, margin: 0 }}>
                {urgentes.length} solicitud{urgentes.length > 1 ? "es" : ""} con viaje en menos de 7 días pendientes de gestionar
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                {urgentes.map(r => (
                  <Link key={r.id} href={`/dashboard/solicitudes/${r.id}`}
                    style={{ fontSize: 12, color: COLORS.warning, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>
                    {r.requester_name} · {new Date(r.trip_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(218px, 1fr))", gap: SPACE.gap, marginBottom: SPACE.section }}>
          {kpis.map((kpi, i) => (
            <StatCard key={i} label={kpi.label} value={kpi.value} sub={kpi.sub} icon={kpi.icon} tone={kpi.tone} />
          ))}
        </div>

        <DashboardClient requests={requests} relacionMap={relacionMap} />

      </div>
    </>
  )
}
