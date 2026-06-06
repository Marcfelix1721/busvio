import { redirect, notFound } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import type { ReactNode } from "react"
import {
  BusFront, Settings, Users, BarChart3,
  Inbox, Calendar, ArrowLeft, Mail, Phone,
  FileText, CheckCircle, XCircle, Clock,
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
  const { email: emailParam } = await params
  const email = decodeURIComponent(emailParam)

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: userData } = await supabase.from("users").select("company_id").eq("id", session.user.id).single()
  const companyId = userData?.company_id

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
      <aside style={{ width: 228, background: "#111827", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "#fff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="/logo-flotafly.png" alt="FlotaFly" style={{ width: 24, height: 24, objectFit: "contain" }} />
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>FlotaFly</p>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, margin: 0 }}>Panel de gestión</p>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 6 }}>Principal</p>
          <SideLink href="/dashboard" icon={<Inbox style={{ width: 14, height: 14 }} />} label="Solicitudes" />
          <SideLink href="/dashboard/clientes" icon={<Users style={{ width: 14, height: 14 }} />} label="Clientes" active />
          <SideLink href="/dashboard/analytics" icon={<BarChart3 style={{ width: 14, height: 14 }} />} label="Analytics" />
          <SideLink href="/dashboard/calendario" icon={<Calendar style={{ width: 14, height: 14 }} />} label="Calendario" />
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 6 }}>Config</p>
          <SideLink href="/dashboard/ajustes" icon={<Settings style={{ width: 14, height: 14 }} />} label="Ajustes" />
          <SideLink href="/dashboard/conductores" icon={<BusFront style={{ width: 14, height: 14 }} />} label="Conductores" />
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{session.user.email?.[0]?.toUpperCase()}</span>
            </div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

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