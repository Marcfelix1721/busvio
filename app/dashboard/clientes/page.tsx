import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  BusFront, Settings, Users, BarChart3,
  Inbox, Calendar, Mail, Phone, TrendingUp,
} from "lucide-react"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
import type { ReactNode } from "react"

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

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: userData } = await supabase.from("users").select("company_id").eq("id", session.user.id).single()
  const companyId = userData?.company_id

  const { data: rawRequests } = await supabase
    .from("quote_requests")
    .select("requester_name, requester_email, requester_phone, created_at, status, final_price, estimated_price")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  const { data: clientesData } = await supabase
    .from("clientes").select("*").eq("company_id", companyId)

  const clienteMap = new Map((clientesData ?? []).map(c => [c.email, c]))

  type ClienteRow = {
    id: string | null
    nombre: string; email: string; telefono: string
    total: number; aceptadas: number; facturado: number
    ultima: string; estado: string | null
    etiquetas: string[]
    tipo_cliente: string | null
    empresa_nombre: string | null
  }

  const map = new Map<string, ClienteRow>()
  ;(rawRequests ?? []).forEach(r => {
    if (!r.requester_email) return
    if (!map.has(r.requester_email)) {
      const c = clienteMap.get(r.requester_email)
      map.set(r.requester_email, {
        id: c?.id ?? null,
        nombre: c?.nombre || r.requester_name,
        email: r.requester_email,
        telefono: c?.telefono || r.requester_phone || "",
        total: 0, aceptadas: 0, facturado: 0,
        ultima: r.created_at,
        estado: c?.estado_relacion ?? null,
        etiquetas: c?.etiquetas ?? [],
        tipo_cliente: c?.tipo_cliente ?? null,
        empresa_nombre: c?.empresa_nombre ?? null,
      })
    }
    const row = map.get(r.requester_email)!
    row.total++
    if (r.status === "aceptado") {
      row.aceptadas++
      row.facturado += r.final_price ?? r.estimated_price ?? 0
    }
    if (r.created_at > row.ultima) row.ultima = r.created_at
  })

  const clientes = Array.from(map.values()).sort((a, b) => b.ultima.localeCompare(a.ultima))

  const totalClientes = clientes.length
  const clientesActivos = clientes.filter(c => c.estado === "activo" || c.estado === "recurrente").length
  const totalFacturado = clientes.reduce((s, c) => s + c.facturado, 0)
  const sinClasificar = clientes.filter(c => !c.estado).length

  const s = { fontFamily: "'DM Sans', system-ui, sans-serif" }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f5f5f4", ...s, overflow: "hidden" }}>

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
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 64px" }}>

          {/* HEADER */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>Clientes</h1>
            <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>{totalClientes} cliente{totalClientes !== 1 ? "s" : ""} registrados</p>
          </div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total clientes", value: totalClientes, color: "#2563eb", bg: "#eff6ff", Icon: Users },
              { label: "Activos / Recurrentes", value: clientesActivos, color: "#16a34a", bg: "#f0fdf4", Icon: TrendingUp },
              { label: "Facturado total", value: `${totalFacturado.toLocaleString("es-ES")} €`, color: "#7c3aed", bg: "#f5f3ff", Icon: BarChart3 },
              { label: "Sin clasificar", value: sinClasificar, color: "#d97706", bg: "#fef3c7", Icon: Settings },
            ].map(({ label, value, color, bg, Icon }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 38, height: 38, background: bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon style={{ width: 18, height: 18, color }} />
                </div>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "4px 0 0" }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* TABLA */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Todos los clientes</p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>Ordenados por última actividad</p>
              </div>
            </div>

            {clientes.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 32, margin: "0 0 8px" }}>👥</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: 0 }}>Sin clientes todavía</p>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0" }}>Aparecerán cuando recibas solicitudes</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                    {["Cliente", "Contacto", "Estado", "Solicitudes", "Facturado", "Última actividad", ""].map((h, i) => (
                      <th key={i} style={{ padding: "10px 20px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => {
                    const rel = c.estado ? ESTADOS[c.estado] : null
                    const tasa = c.total > 0 ? Math.round((c.aceptadas / c.total) * 100) : 0
                    return (
                      <tr key={c.email} style={{ borderBottom: "1px solid #f9fafb" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>

                        {/* Cliente */}
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#6b7280" }}>{c.nombre.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{c.nombre}</p>
                              {c.empresa_nombre && <p style={{ fontSize: 11, color: "#9ca3af", margin: "1px 0 0" }}>{c.empresa_nombre}</p>}
                              {c.etiquetas?.length > 0 && (
                                <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" as const }}>
                                  {c.etiquetas.map(tag => (
                                    <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: "#f3f4f6", color: "#6b7280", borderRadius: 4, padding: "1px 6px" }}>{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contacto */}
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", flexDirection: "column" as const, gap: 3 }}>
                            {c.telefono && (
                              <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280", margin: 0 }}>
                                <Phone style={{ width: 11, height: 11 }} /> {c.telefono}
                              </p>
                            )}
                            <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9ca3af", margin: 0 }}>
                              <Mail style={{ width: 11, height: 11 }} /> {c.email}
                            </p>
                          </div>
                        </td>

                        {/* Estado */}
                        <td style={{ padding: "14px 20px" }}>
                          {rel ? (
                            <span style={{ fontSize: 11, fontWeight: 700, background: rel.bg, color: rel.color, borderRadius: 6, padding: "3px 10px", display: "inline-block" }}>
                              {rel.label}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: "#d1d5db", fontStyle: "italic" }}>Sin clasificar</span>
                          )}
                        </td>

                        {/* Solicitudes */}
                        <td style={{ padding: "14px 20px" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{c.total}</p>
                          <p style={{ fontSize: 11, color: "#9ca3af", margin: "1px 0 0" }}>{tasa}% aceptadas</p>
                        </td>

                        {/* Facturado */}
                        <td style={{ padding: "14px 20px" }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>
                            {c.facturado > 0 ? `${c.facturado.toLocaleString("es-ES")} €` : "—"}
                          </p>
                          {c.aceptadas > 0 && <p style={{ fontSize: 11, color: "#9ca3af", margin: "1px 0 0" }}>{c.aceptadas} servicio{c.aceptadas !== 1 ? "s" : ""}</p>}
                        </td>

                        {/* Última actividad */}
                        <td style={{ padding: "14px 20px" }}>
                          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{fmt(c.ultima)}</p>
                        </td>

                        {/* Acción */}
                        <td style={{ padding: "14px 20px" }}>
                          <Link href={`/dashboard/clientes/${encodeURIComponent(c.email)}`}
                            style={{ fontSize: 12, fontWeight: 600, color: "#111827", textDecoration: "none", background: "#f3f4f6", borderRadius: 7, padding: "6px 12px", whiteSpace: "nowrap" as const }}>
                            Ver ficha →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
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