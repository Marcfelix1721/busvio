import Link from "next/link"
import { redirect } from "next/navigation"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Mail, Phone, Users, UserRoundCheck, Euro, CircleHelp } from "lucide-react"
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

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const companyId = await getCompanyIdServer(supabase, session.user.id)
  if (!companyId) redirect("/dashboard")

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

  return (
    <div style={{ maxWidth: SPACE.pageMax, margin: "0 auto", padding: "32px 32px 64px" }}>

      {/* HEADER */}
      <div style={{ marginBottom: SPACE.section }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: COLORS.navy, margin: 0, letterSpacing: "-0.025em" }}>Clientes</h1>
        <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>{totalClientes} cliente{totalClientes !== 1 ? "s" : ""} registrado{totalClientes !== 1 ? "s" : ""}</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(218px, 1fr))", gap: SPACE.gap, marginBottom: SPACE.section }}>
        <StatCard label="Total clientes" value={totalClientes} icon={Users} tone="default" />
        <StatCard label="Activos / Recurrentes" value={clientesActivos} icon={UserRoundCheck} tone="positive" />
        <StatCard label="Facturado total" value={`${totalFacturado.toLocaleString("es-ES")} €`} icon={Euro} tone="positive" />
        <StatCard label="Sin clasificar" value={sinClasificar} icon={CircleHelp} tone="warning" />
      </div>

      {/* TABLA */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, margin: 0 }}>Todos los clientes</p>
          <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "2px 0 0" }}>Ordenados por última actividad</p>
        </div>

        {clientes.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: COLORS.navySoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Users style={{ width: 23, height: 23, color: COLORS.navy }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, margin: 0 }}>Sin clientes todavía</p>
            <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "4px auto 0", maxWidth: 280, lineHeight: 1.5 }}>
              Aparecerán automáticamente aquí cuando recibas solicitudes de presupuesto.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
              <thead>
                <tr style={{ background: COLORS.surfaceAlt, borderBottom: `1px solid ${COLORS.border}` }}>
                  {["Cliente", "Contacto", "Estado", "Solicitudes", "Facturado", "Última actividad", ""].map((h, i) => (
                    <th key={i} style={{ padding: "11px 20px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: COLORS.textFaint, textTransform: "uppercase" as const, letterSpacing: "0.06em", whiteSpace: "nowrap" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => {
                  const rel = c.estado ? ESTADOS[c.estado] : null
                  const tasa = c.total > 0 ? Math.round((c.aceptadas / c.total) * 100) : 0
                  return (
                    <tr key={c.email} className="hover:bg-[#fafbfc]" style={{ borderBottom: `1px solid ${COLORS.border}` }}>

                      {/* Cliente */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.navySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 600, color: COLORS.navy }}>{c.nombre.charAt(0).toUpperCase()}</span>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, margin: 0 }}>{c.nombre}</p>
                            {c.empresa_nombre && <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "1px 0 0" }}>{c.empresa_nombre}</p>}
                            {c.etiquetas?.length > 0 && (
                              <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" as const }}>
                                {c.etiquetas.map(tag => (
                                  <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: COLORS.navySoft, color: COLORS.textMuted, borderRadius: 4, padding: "1px 6px" }}>{tag}</span>
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
                            <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.textMuted, margin: 0 }}>
                              <Phone style={{ width: 11, height: 11 }} /> {c.telefono}
                            </p>
                          )}
                          <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.textFaint, margin: 0 }}>
                            <Mail style={{ width: 11, height: 11 }} /> {c.email}
                          </p>
                        </div>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: "14px 20px" }}>
                        {rel ? (
                          <span style={{ fontSize: 11, fontWeight: 700, background: rel.bg, color: rel.color, borderRadius: 6, padding: "3px 10px", display: "inline-block", whiteSpace: "nowrap" as const }}>
                            {rel.label}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: COLORS.textFaint, fontStyle: "italic" }}>Sin clasificar</span>
                        )}
                      </td>

                      {/* Solicitudes */}
                      <td style={{ padding: "14px 20px" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, margin: 0 }}>{c.total}</p>
                        <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "1px 0 0" }}>{tasa}% aceptadas</p>
                      </td>

                      {/* Facturado */}
                      <td style={{ padding: "14px 20px" }}>
                        <p style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: COLORS.text, margin: 0 }}>
                          {c.facturado > 0 ? `${c.facturado.toLocaleString("es-ES")} €` : "—"}
                        </p>
                        {c.aceptadas > 0 && <p style={{ fontSize: 11, color: COLORS.textFaint, margin: "1px 0 0" }}>{c.aceptadas} servicio{c.aceptadas !== 1 ? "s" : ""}</p>}
                      </td>

                      {/* Última actividad */}
                      <td style={{ padding: "14px 20px" }}>
                        <p style={{ fontSize: 12, color: COLORS.textFaint, margin: 0, whiteSpace: "nowrap" as const }}>{fmt(c.ultima)}</p>
                      </td>

                      {/* Acción */}
                      <td style={{ padding: "14px 20px" }}>
                        <Link href={`/dashboard/clientes/${encodeURIComponent(c.email)}`}
                          className="hover:bg-[#dfe3e8]"
                          style={{ fontSize: 12, fontWeight: 600, color: COLORS.navy, textDecoration: "none", background: COLORS.navySoft, borderRadius: RADIUS.sm, padding: "6px 12px", whiteSpace: "nowrap" as const }}>
                          Ver ficha →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
