import { redirect } from "next/navigation"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { FileText, BarChart3, CircleCheck, TrendingUp } from "lucide-react"
import { QuoteRequest } from "@/lib/types"
import { StatCard } from "@/components/dashboard/StatCard"
import { COLORS, RADIUS, SHADOW, SPACE, FONT_DISPLAY, FONT_BODY } from "@/lib/dashboard-ui"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

const statusConfig: Record<QuoteRequest["status"], { label: string; bar: string }> = {
  nuevo:       { label: "Nuevo",       bar: COLORS.teal },
  en_revision: { label: "En revisión", bar: COLORS.warning },
  enviado:     { label: "Enviado",     bar: COLORS.navy },
  aceptado:    { label: "Aceptado",   bar: COLORS.teal },
  rechazado:   { label: "Rechazado",  bar: COLORS.danger },
  cancelado:   { label: "Cancelado",  bar: COLORS.borderStrong },
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const companyId = await getCompanyIdServer(supabase, session.user.id)
  if (!companyId) redirect("/dashboard")

  const { data: rawData } = await supabase
    .from("quote_requests").select("*").eq("company_id", companyId).order("created_at", { ascending: false })
  const requests = (rawData ?? []) as QuoteRequest[]

  // Últimos 6 meses
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    return {
      key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
      label: d.toLocaleDateString("es-ES", { month: "long" }),
      count: 0,
      facturado: 0,
    }
  })
  requests.forEach(r => {
    const m = meses.find(m => m.key === r.created_at.slice(0,7))
    if (m) {
      m.count++
      if (r.status === "aceptado") m.facturado += r.final_price ?? r.estimated_price ?? 0
    }
  })
  const maxCount = Math.max(...meses.map(m => m.count), 1)
  const maxFacturado = Math.max(...meses.map(m => m.facturado), 1)

  const aceptadas = requests.filter(r => r.status === "aceptado").length
  const tasa = requests.length > 0 ? Math.round((aceptadas / requests.length) * 100) : 0
  const facturadoTotal = requests
    .filter(r => r.status === "aceptado")
    .reduce((s, r) => s + (r.final_price ?? r.estimated_price ?? 0), 0)

  // Top rutas
  const rutaMap = new Map<string, number>()
  requests.forEach(r => {
    if (!r.origin || !r.destination) return // solicitudes sin ruta no cuentan
    const key = `${r.origin.split(",")[0]} → ${r.destination.split(",")[0]}`
    rutaMap.set(key, (rutaMap.get(key) ?? 0) + 1)
  })
  const topRutas = Array.from(rutaMap.entries()).sort((a,b) => b[1]-a[1]).slice(0,5)

  const cardStyle = {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.lg,
    boxShadow: SHADOW.card,
    padding: 24,
  } as const

  return (
    <div style={{ maxWidth: SPACE.pageMax, margin: "0 auto", padding: "32px 32px 64px" }}>

      {/* HEADER */}
      <div style={{ marginBottom: SPACE.section }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: COLORS.navy, margin: 0, letterSpacing: "-0.025em" }}>Analytics</h1>
        <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>Rendimiento histórico de tu negocio</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(218px, 1fr))", gap: SPACE.gap, marginBottom: SPACE.section }}>
        <StatCard label="Total solicitudes" value={requests.length} icon={FileText} tone="default" />
        <StatCard label="Aceptadas" value={aceptadas} icon={CircleCheck} tone="positive" />
        <StatCard label="Tasa de cierre" value={`${tasa}%`} icon={TrendingUp} tone="positive" />
        <StatCard label="Facturado" value={`${facturadoTotal.toLocaleString("es-ES")} €`} icon={BarChart3} tone="positive" />
      </div>

      {/* GRÁFICA SOLICITUDES */}
      <div style={{ ...cardStyle, marginBottom: SPACE.gap }}>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: COLORS.text, margin: 0 }}>Solicitudes por mes</p>
        <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "2px 0 24px" }}>Últimos 6 meses</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 160 }}>
          {meses.map(mes => (
            <div key={mes.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 600, color: COLORS.navy }}>{mes.count > 0 ? mes.count : ""}</span>
              <div style={{ width: "100%", borderRadius: RADIUS.sm, background: COLORS.surfaceAlt, position: "relative", height: 100 }}>
                <div style={{ position: "absolute", bottom: 0, width: "100%", background: COLORS.navy, borderRadius: RADIUS.sm, transition: "all 0.7s", height: `${Math.max((mes.count/maxCount)*100, mes.count>0?6:0)}%` }} />
              </div>
              <span style={{ fontSize: 11, color: COLORS.textFaint, textTransform: "capitalize", textAlign: "center" }}>{mes.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* GRÁFICA FACTURADO */}
      <div style={{ ...cardStyle, marginBottom: SPACE.gap }}>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: COLORS.text, margin: 0 }}>Facturado por mes</p>
        <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "2px 0 24px" }}>Solo servicios aceptados · últimos 6 meses</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 160 }}>
          {meses.map(mes => (
            <div key={mes.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 600, color: COLORS.teal }}>
                {mes.facturado > 0 ? `${mes.facturado.toLocaleString("es-ES")}€` : ""}
              </span>
              <div style={{ width: "100%", borderRadius: RADIUS.sm, background: COLORS.surfaceAlt, position: "relative", height: 100 }}>
                <div style={{ position: "absolute", bottom: 0, width: "100%", background: COLORS.teal, borderRadius: RADIUS.sm, transition: "all 0.7s", height: `${Math.max((mes.facturado/maxFacturado)*100, mes.facturado>0?6:0)}%` }} />
              </div>
              <span style={{ fontSize: 11, color: COLORS.textFaint, textTransform: "capitalize", textAlign: "center" }}>{mes.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: SPACE.gap }}>
        {/* PIPELINE */}
        <div style={cardStyle}>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: COLORS.text, margin: 0 }}>Pipeline de estados</p>
          <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "2px 0 20px" }}>Distribución actual de solicitudes</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(statusConfig).map(([key, cfg]) => {
              const count = requests.filter(r => r.status === key).length
              const pct = requests.length > 0 ? (count / requests.length) * 100 : 0
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: COLORS.textMuted }}>{cfg.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: COLORS.textFaint }}>{Math.round(pct)}%</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, width: 16, textAlign: "right" }}>{count}</span>
                    </div>
                  </div>
                  <div style={{ height: 8, background: COLORS.surfaceAlt, borderRadius: RADIUS.pill, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: cfg.bar, borderRadius: RADIUS.pill, transition: "all 0.5s", width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: COLORS.textFaint }}>Tasa de cierre</span>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 600, color: COLORS.teal }}>{tasa}%</span>
          </div>
        </div>

        {/* TOP RUTAS */}
        <div style={cardStyle}>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: COLORS.text, margin: 0 }}>Rutas más solicitadas</p>
          <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "2px 0 20px" }}>Top 5 trayectos</p>
          {topRutas.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 128, gap: 8 }}>
              <FileText style={{ width: 24, height: 24, color: COLORS.border }} />
              <p style={{ fontSize: 12, color: COLORS.textFaint, margin: 0 }}>Sin datos suficientes</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topRutas.map(([ruta, count], i) => {
                const pct = (count / (topRutas[0][1])) * 100
                return (
                  <div key={ruta}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 10, fontWeight: 700, color: COLORS.textFaint, width: 16 }}>{i+1}</span>
                        <span style={{ fontSize: 13, color: COLORS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{ruta}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: COLORS.surfaceAlt, borderRadius: RADIUS.pill, overflow: "hidden", marginLeft: 24 }}>
                      <div style={{ height: "100%", background: COLORS.navy, borderRadius: RADIUS.pill, width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
