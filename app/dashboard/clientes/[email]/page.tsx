import { redirect, notFound } from "next/navigation"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import type { ReactNode } from "react"
import {
  BusFront, Settings, Users, BarChart3,
  Inbox, Calendar, ArrowLeft, Mail, Phone,
  FileText, CheckCircle, XCircle, Clock, ClipboardList,
} from "lucide-react"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
import { ClienteActions } from "@/components/dashboard/ClienteActions"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

const ESTADOS: Record<string, { label: string; color: string; bg: string }> = {
  potencial:  { label: "Potencial",  color: "#d97706", bg: "#fef3c7" },
  activo:     { label: "Activo",     color: "#16a34a", bg: "#f0fdf4" },
  recurrente: { label: "Recurrente", color: "#2563eb", bg: "#eff6ff" },
  inactivo:   { label: "Inactivo",   color: "#6b7280", bg: "#f3f4f6" },
  perdido:    { label: "Perdido",    color: "#dc2626", bg: "#fef2f2" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nuevo:       { label: "Nuevo",       color: "#6b7280", bg: "#f3f4f6" },
  en_revision: { label: "En revisión", color: "#d97706", bg: "#fef3c7" },
  enviado:     { label: "Enviado",     color: "#2563eb", bg: "#eff6ff" },
  aceptado:    { label: "Aceptado",    color: "#16a34a", bg: "#f0fdf4" },
  rechazado:   { label: "Rechazado",   color: "#dc2626", bg: "#fef2f2" },
  cancelado:   { label: "Cancelado",   color: "#9ca3af", bg: "#f9fafb" },
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function ClienteFichaPage({ params }: { params: Promise<{ email: string }> }) {
  // Next App Router ya decodifica los params de ruta; usar email directo (un
  // decodeURIComponent extra petaba con URIError si el email tenía '%').
  const { email } = await params
  if (!email) notFound()

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
    <div style={{ display: "flex", height: "100vh", background: "#f5f5f4", fontFamily: "'DM Sans', system-ui, sans-serif", overflow: "hidden" }}>

      {/* SIDEBAR */}
      <DashboardSidebar email={session.user.email} />

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 32px 64px" }}>

          {/* BACK */}
          <Link href="/dashboard/clientes" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280", textDecoration: "none", marginBottom: 24 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Volver a clientes
          </Link>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "flex-start" }}>

            {/* COLUMNA IZQUIERDA */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* CABECERA CLIENTE */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: "#6b7280" }}>{nombre.charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
                      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.01em" }}>{nombre}</h1>
                      {rel && (
                        <span style={{ fontSize: 11, fontWeight: 700, background: rel.bg, color: rel.color, borderRadius: 6, padding: "2px 10px" }}>{rel.label}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" as const }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#6b7280" }}>
                        <Mail style={{ width: 13, height: 13 }} /> {email}
                      </span>
                      {telefono && (
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#6b7280" }}>
                          <Phone style={{ width: 13, height: 13 }} /> {telefono}
                        </span>
                      )}
                    </div>
                    {etiquetas.length > 0 && (
                      <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" as const }}>
                        {etiquetas.map(tag => (
                          <span key={tag} style={{ fontSize: 11, fontWeight: 600, background: "#f3f4f6", color: "#6b7280", borderRadius: 4, padding: "2px 8px" }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* KPIs del cliente */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {[
                    { label: "Solicitudes", value: total, Icon: FileText, color: "#2563eb", bg: "#eff6ff" },
                    { label: "Aceptadas", value: aceptadas, Icon: CheckCircle, color: "#16a34a", bg: "#f0fdf4" },
                    { label: "Pendientes", value: pendientes, Icon: Clock, color: "#d97706", bg: "#fef3c7" },
                    { label: "Tasa cierre", value: `${tasa}%`, Icon: BarChart3, color: "#7c3aed", bg: "#f5f3ff" },
                  ].map(({ label, value, Icon, color, bg }) => (
                    <div key={label} style={{ background: bg, borderRadius: 10, padding: "12px 14px" }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1 }}>{value}</p>
                      <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0" }}>{label}</p>
                    </div>
                  ))}
                </div>

                {facturado > 0 && (
                  <div style={{ marginTop: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#166534", fontWeight: 500 }}>Total facturado</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#16a34a" }}>{facturado.toLocaleString("es-ES")} €</span>
                  </div>
                )}
              </div>

              {/* HISTORIAL DE SOLICITUDES */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Historial de solicitudes</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{total} solicitud{total !== 1 ? "es" : ""} en total</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const }}>
                  {solicitudes.map((s, i) => {
                    const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.nuevo
                    return (
                      <Link key={s.id} href={`/dashboard/solicitudes/${s.id}`}
                        style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderBottom: i < solicitudes.length - 1 ? "1px solid #f9fafb" : "none", textDecoration: "none", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                              {s.origin} → {s.destination}
                            </p>
                          </div>
                          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                            {fmt(s.trip_date)} · {s.passengers} pasajero{s.passengers !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                          {(s.final_price || s.estimated_price) && (
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                              {(s.final_price ?? s.estimated_price).toLocaleString("es-ES")} €
                            </span>
                          )}
                          <span style={{ fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" as const }}>{st.label}</span>
                          <span style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" as const }}>{fmt(s.created_at)}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA — ACCIONES */}
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
      </main>
    </div>
  )
}

function SideLink({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: "none", background: active ? "rgba(255,255,255,0.1)" : "transparent", color: active ? "#fff" : "rgba(255,255,255,0.45)" }}>
      {icon} {label}
    </Link>
  )
}