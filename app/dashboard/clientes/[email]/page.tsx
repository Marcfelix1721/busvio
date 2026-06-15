import { redirect, notFound } from "next/navigation"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, FileText, CircleCheck, Euro, TrendingUp } from "lucide-react"
import { ClienteActions } from "@/components/dashboard/ClienteActions"
import { StatCard } from "@/components/dashboard/StatCard"
import { COLORS, RADIUS, SHADOW, SPACE, FONT_DISPLAY } from "@/lib/dashboard-ui"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

const ESTADOS: Record<string, { label: string; color: string; bg: string }> = {
  potencial:  { label: "Potencial",  color: COLORS.warning,   bg: COLORS.warningSoft },
  activo:     { label: "Activo",     color: COLORS.teal,      bg: COLORS.tealSoft },
  recurrente: { label: "Recurrente", color: COLORS.navy,      bg: COLORS.navySoft },
  inactivo:   { label: "Inactivo",   color: COLORS.textMuted, bg: "#eef1f4" },
  perdido:    { label: "Perdido",    color: COLORS.danger,    bg: COLORS.dangerSoft },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nuevo:       { label: "Nuevo",       color: COLORS.textMuted, bg: "#eef1f4" },
  en_revision: { label: "En revisión", color: COLORS.warning,   bg: COLORS.warningSoft },
  enviado:     { label: "Enviado",     color: COLORS.navy,      bg: COLORS.navySoft },
  aceptado:    { label: "Aceptado",    color: COLORS.teal,      bg: COLORS.tealSoft },
  rechazado:   { label: "Rechazado",   color: COLORS.danger,    bg: COLORS.dangerSoft },
  cancelado:   { label: "Cancelado",   color: COLORS.textFaint, bg: COLORS.surfaceAlt },
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function ClienteFichaPage({ params }: { params: Promise<{ email: string }> }) {
  // El param [email] llega percent-encoded (@ → %40). Decode defensivo: try/catch
  // para no petar con un '%' literal en el email, y robusto tanto si Next 16.2.4
  // decodifica el param como si no lo hace.
  const { email: emailParam } = await params
  if (!emailParam) notFound()
  let email: string
  try {
    email = decodeURIComponent(emailParam)
  } catch {
    email = emailParam
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const companyId = await getCompanyIdServer(supabase, session.user.id)
  if (!companyId) redirect("/dashboard")

  // Solicitudes del cliente
  const { data: solicitudes } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("company_id", companyId)
    .eq("requester_email", email)
    .order("created_at", { ascending: false })

  if (!solicitudes || solicitudes.length === 0) notFound()

  // Datos del cliente en tabla clientes
  const { data: clienteData } = await supabase
    .from("clientes").select("*")
    .eq("company_id", companyId).eq("email", email).maybeSingle()

  const nombre = clienteData?.nombre || solicitudes[0]?.requester_name || email
  const telefono = clienteData?.telefono || solicitudes[0]?.requester_phone || ""
  const estado = clienteData?.estado_relacion || null
  const notas = clienteData?.notas || ""
  const etiquetas: string[] = clienteData?.etiquetas || []

  const total = solicitudes.length
  const aceptadas = solicitudes.filter(s => s.status === "aceptado").length
  const rechazadas = solicitudes.filter(s => s.status === "rechazado").length
  const pendientes = solicitudes.filter(s => !["aceptado", "rechazado", "cancelado"].includes(s.status)).length
  const facturado = solicitudes.filter(s => s.status === "aceptado").reduce((acc, s) => acc + (s.final_price ?? s.estimated_price ?? 0), 0)
  const tasa = total > 0 ? Math.round((aceptadas / total) * 100) : 0

  const rel = estado ? ESTADOS[estado] : null

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 32px 64px" }}>

      {/* BACK */}
      <Link href="/dashboard/clientes" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: COLORS.textMuted, textDecoration: "none", marginBottom: 20 }}>
        <ArrowLeft style={{ width: 14, height: 14 }} /> Volver a clientes
      </Link>

      {/* CABECERA CLIENTE */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, padding: 24, marginBottom: SPACE.gap }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: COLORS.navySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: COLORS.navy }}>{nombre.charAt(0).toUpperCase()}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: COLORS.navy, margin: 0, letterSpacing: "-0.02em" }}>{nombre}</h1>
              {rel && (
                <span style={{ fontSize: 11, fontWeight: 700, background: rel.bg, color: rel.color, borderRadius: 6, padding: "3px 10px" }}>{rel.label}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" as const }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: COLORS.textMuted }}>
                <Mail style={{ width: 13, height: 13 }} /> {email}
              </span>
              {telefono && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: COLORS.textMuted }}>
                  <Phone style={{ width: 13, height: 13 }} /> {telefono}
                </span>
              )}
            </div>
            {etiquetas.length > 0 && (
              <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" as const }}>
                {etiquetas.map(tag => (
                  <span key={tag} style={{ fontSize: 11, fontWeight: 600, background: COLORS.navySoft, color: COLORS.navy, borderRadius: 4, padding: "2px 8px" }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATCARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: SPACE.gap, marginBottom: SPACE.gap }}>
        <StatCard label="Solicitudes" value={total} sub={`${pendientes} pendiente${pendientes === 1 ? "" : "s"}`} icon={FileText} tone="default" />
        <StatCard label="Aceptadas" value={aceptadas} sub={`${rechazadas} rechazada${rechazadas === 1 ? "" : "s"}`} icon={CircleCheck} tone="positive" />
        <StatCard label="Facturado" value={`${facturado.toLocaleString("es-ES")} €`} icon={Euro} tone="positive" />
        <StatCard label="Tasa de cierre" value={`${tasa}%`} icon={TrendingUp} tone="default" />
      </div>

      {/* 2 COLUMNAS: HISTORIAL + ACCIONES */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>

        {/* HISTORIAL */}
        <div style={{ flex: "1 1 440px", minWidth: 0 }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, margin: 0 }}>Historial de solicitudes</p>
              <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "2px 0 0" }}>{total} solicitud{total !== 1 ? "es" : ""} en total</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const }}>
              {solicitudes.map((s, i) => {
                const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.nuevo
                return (
                  <Link key={s.id} href={`/dashboard/solicitudes/${s.id}`}
                    className="hover:bg-[#fafbfc]"
                    style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderBottom: i < solicitudes.length - 1 ? `1px solid ${COLORS.border}` : "none", textDecoration: "none", transition: "background 0.15s" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {s.origin} → {s.destination}
                      </p>
                      <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "3px 0 0" }}>
                        {fmt(s.trip_date)} · {s.passengers} pasajero{s.passengers !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      {(s.final_price || s.estimated_price) && (
                        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                          {(s.final_price ?? s.estimated_price).toLocaleString("es-ES")} €
                        </span>
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" as const }}>{st.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div style={{ flex: "1 1 320px", minWidth: 0, maxWidth: 380 }}>
          <ClienteActions
            email={email}
            companyId={companyId}
            clienteId={clienteData?.id ?? null}
            nombre={nombre}
            telefono={telefono}
            estadoInicial={estado}
            notasIniciales={notas}
            etiquetasIniciales={etiquetas}
          />
        </div>
      </div>
    </div>
  )
}
