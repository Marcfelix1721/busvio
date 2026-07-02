import Link from "next/link"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  ArrowLeft, Bus, Calendar, Clock, FileText,
  Mail, MapPin, Phone, Users, History,
  MessageSquare, TrendingUp, Zap, Star,
} from "lucide-react"
import QuoteActions from "@/components/dashboard/QuoteActions"
import { ClienteEstado } from "@/components/dashboard/ClienteEstado"
import { MapaRuta } from "@/components/dashboard/MapaRuta"
import { ServiceAssignments } from "@/components/dashboard/ServiceAssignments"
import { QuoteRequest } from "@/lib/types"
import { conductorConflict, DOCS_CRITICOS, type Conflict } from "@/lib/conflicts"
import { COLORS, RADIUS, SHADOW, FONT_DISPLAY, FONT_BODY } from "@/lib/dashboard-ui"

export const revalidate = 0

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

const statusConfig: Record<QuoteRequest["status"], { label: string; color: string; bg: string }> = {
  nuevo:       { label: "Nuevo",       color: COLORS.textMuted, bg: "#eef1f4" },
  en_revision: { label: "En revisión", color: COLORS.warning,   bg: COLORS.warningSoft },
  enviado:     { label: "Enviado",     color: COLORS.navy,      bg: COLORS.navySoft },
  aceptado:    { label: "Aceptado",    color: COLORS.teal,      bg: COLORS.tealSoft },
  rechazado:   { label: "Rechazado",   color: COLORS.danger,    bg: COLORS.dangerSoft },
  cancelado:   { label: "Cancelado",   color: COLORS.textFaint, bg: COLORS.surfaceAlt },
}

const historialStatusConfig: Record<QuoteRequest["status"], { label: string; color: string; bg: string }> = {
  nuevo:       { label: "Nuevo",       color: COLORS.textMuted, bg: "#eef1f4" },
  en_revision: { label: "En revisión", color: COLORS.warning,   bg: COLORS.warningSoft },
  enviado:     { label: "Enviado",     color: COLORS.navy,      bg: COLORS.navySoft },
  aceptado:    { label: "Aceptado",    color: COLORS.teal,      bg: COLORS.tealSoft },
  rechazado:   { label: "Rechazado",   color: COLORS.danger,    bg: COLORS.dangerSoft },
  cancelado:   { label: "Cancelado",   color: COLORS.textFaint, bg: COLORS.surfaceAlt },
}

function extractCommentField(comments: string | undefined, key: string) {
  if (!comments) return null
  const line = comments.split("\n").find(l => l.toLowerCase().startsWith(`${key.toLowerCase()}:`))
  return line ? line.replace(new RegExp(`^${key}:\\s*`, "i"), "").trim() : null
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
}

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

function diasHasta(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

export default async function QuoteRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("quote_requests").select("*").eq("id", id).maybeSingle()
  const quote = data as QuoteRequest | null
  if (!quote) redirect("/dashboard")

  const { data: company } = await supabase.from("companies").select("*").eq("id", quote.company_id).maybeSingle()

  const { data: historialData } = await supabase
    .from("quote_requests").select("*")
    .eq("company_id", quote.company_id)
    .eq("requester_email", quote.requester_email)
    .neq("id", quote.id)
    .order("created_at", { ascending: false })
  const historial = (historialData ?? []) as QuoteRequest[]

  const { data: clienteData } = await supabase
    .from("clientes").select("estado_relacion")
    .eq("company_id", quote.company_id)
    .eq("email", quote.requester_email)
    .maybeSingle()
  const estadoRelacion = clienteData?.estado_relacion ?? null

  const { data: vehiculosData } = await supabase
    .from("vehicles")
    .select("id, matricula, marca_modelo, plazas, tipo, estado")
    .eq("company_id", quote.company_id)
    .order("plazas", { ascending: true })
  const vehicles = vehiculosData ?? []

  const { data: staffData } = await supabase
    .from("staff")
    .select("id, nombre, rol, estado, email")
    .eq("company_id", quote.company_id)
    .order("rol").order("nombre")

  const { data: assignmentsData } = await supabase
    .from("service_assignments")
    .select("id, staff_id, rol_en_servicio, staff(nombre, rol)")
    .eq("quote_request_id", quote.id)

  // ---- Detección de conflictos (conductores y vehículos) para esta fecha ----
  const tripDay = quote.trip_date?.slice(0, 10)
  const staffIds = (staffData ?? []).map(s => s.id)
  const todayStr = new Date().toISOString().slice(0, 10)

  // Conductores ya ocupados ese día (en otros servicios)
  const busyStaffIds = new Set<string>()
  if (staffIds.length > 0) {
    const { data: otherAsg } = await supabase
      .from("service_assignments")
      .select("staff_id, quote_request_id, quote_requests(trip_date)")
      .in("staff_id", staffIds)
      .neq("quote_request_id", quote.id)
    for (const a of (otherAsg ?? []) as any[]) {
      if (a.quote_requests?.trip_date?.slice(0, 10) === tripDay) busyStaffIds.add(a.staff_id)
    }
  }

  // Documentos críticos vencidos por conductor
  const expiredDocByStaff: Record<string, string> = {}
  const { data: expiredDocs } = await supabase
    .from("staff_documentos")
    .select("staff_id, tipo, fecha_vencimiento")
    .eq("company_id", quote.company_id)
    .in("tipo", DOCS_CRITICOS)
    .lt("fecha_vencimiento", todayStr)
  for (const d of expiredDocs ?? []) if (!expiredDocByStaff[d.staff_id]) expiredDocByStaff[d.staff_id] = d.tipo

  const conflictByStaff: Record<string, Conflict> = {}
  for (const s of staffData ?? []) {
    conflictByStaff[s.id] = conductorConflict({
      estado: s.estado,
      busyOnDate: busyStaffIds.has(s.id),
      expiredDocLabel: expiredDocByStaff[s.id] ?? null,
    })
  }

  // Vehículos ya asignados ese día (en otros servicios)
  const busyVehicleIds: string[] = []
  const { data: sameDayQuotes } = await supabase
    .from("quote_requests")
    .select("id, vehicle_id, trip_date")
    .eq("company_id", quote.company_id)
    .neq("id", quote.id)
  for (const q of sameDayQuotes ?? []) {
    if (q.vehicle_id && q.trip_date?.slice(0, 10) === tripDay) busyVehicleIds.push(q.vehicle_id)
  }

  const vehiculoAsignado = vehicles.find(v => v.id === quote.vehicle_id)
  const vehiculoNombre = vehiculoAsignado ? `${vehiculoAsignado.marca_modelo} (${vehiculoAsignado.matricula})` : null

  const serviceType = extractCommentField(quote.comments, "Tipo de servicio") ?? "—"
  const tipoCliente = extractCommentField(quote.comments, "Tipo de cliente") ?? "—"
  const endTime = quote.return_time ?? "No especificada"
  const stopsArr: string[] = (() => { try { return JSON.parse(quote.stops || "[]") } catch { return [] } })()
  const dias = diasHasta(quote.trip_date)
  const esUrgente = dias >= 0 && dias <= 7 && !["aceptado","cancelado","rechazado"].includes(quote.status)
  const sCfg = statusConfig[quote.status]

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 32px 64px" }}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: RADIUS.pill, background: sCfg.bg, color: sCfg.color }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: sCfg.color }}></span>
                {sCfg.label}
              </span>
              {esUrgente && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, background: COLORS.warningSoft, color: COLORS.warning, padding: "4px 10px", borderRadius: RADIUS.pill }}>
                  <Zap style={{ width: 12, height: 12 }} /> Viaje en {dias} día{dias !== 1 ? "s" : ""}
                </span>
              )}
              {historial.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, background: COLORS.navySoft, color: COLORS.navy, padding: "4px 10px", borderRadius: RADIUS.pill }}>
                  <TrendingUp style={{ width: 12, height: 12 }} /> Cliente recurrente
                </span>
              )}
            </div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: COLORS.navy, letterSpacing: "-0.02em", margin: 0 }}>{quote.requester_name}</h1>
            <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
              Solicitud recibida el {fmt(quote.created_at)}
              {quote.final_price && <span style={{ marginLeft: 12, fontWeight: 600, color: COLORS.text }}>· {quote.final_price.toLocaleString("es-ES")} € final</span>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
          <div className="space-y-4">
            <Section title="Datos del solicitante">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InfoTile icon={<Mail style={{ width: 14, height: 14, color: COLORS.textMuted }} />} label="Email" value={quote.requester_email} />
                <InfoTile icon={<Phone style={{ width: 14, height: 14, color: COLORS.textMuted }} />} label="Teléfono" value={quote.requester_phone ?? "—"} />
                <InfoTile icon={<Users style={{ width: 14, height: 14, color: COLORS.textMuted }} />} label="Tipo de cliente" value={tipoCliente} />
              </div>
            </Section>

            <Section title="Detalles del viaje">
              <MapaRuta origin={quote.origin} destination={quote.destination} stops={stopsArr} />
              <div style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: 16, marginBottom: 16 }}>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.navy }}></div>
                    <div style={{ width: 1, height: 32, background: COLORS.borderStrong }}></div>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${COLORS.teal}` }}></div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Origen</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{quote.origin}</p>
                    </div>
                    {stopsArr.length > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 600, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Paradas intermedias</p>
                        <p style={{ fontSize: 14, color: COLORS.textMuted }}>{stopsArr.join("  →  ")}</p>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Destino</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{quote.destination}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <InfoTile icon={<Calendar style={{ width: 14, height: 14, color: COLORS.textMuted }} />} label="Fecha viaje" value={fmt(quote.trip_date)} />
                <InfoTile icon={<Users style={{ width: 14, height: 14, color: COLORS.textMuted }} />} label="Pasajeros" value={String(quote.passengers)} />
                <InfoTile icon={<Bus style={{ width: 14, height: 14, color: COLORS.textMuted }} />} label="Vehículo" value={vehiculoNombre ?? "Sin asignar"} />
                <InfoTile icon={<FileText style={{ width: 14, height: 14, color: COLORS.textMuted }} />} label="Tipo servicio" value={serviceType} />
                <InfoTile icon={<Clock style={{ width: 14, height: 14, color: COLORS.textMuted }} />} label="Hora salida" value={quote.departure_time} />
                <InfoTile icon={<Clock style={{ width: 14, height: 14, color: COLORS.textMuted }} />} label="Hora regreso" value={endTime} />
                {quote.estimated_km && (
                  <InfoTile icon={<MapPin style={{ width: 14, height: 14, color: COLORS.textMuted }} />} label="Distancia" value={`${quote.estimated_km} km`} />
                )}
                {quote.estimated_price && (
                  <InfoTile icon={<FileText style={{ width: 14, height: 14, color: COLORS.textMuted }} />} label="Precio sugerido" value={`${quote.estimated_price} €`} />
                )}
              </div>
            </Section>

            <Section title="Personal asignado" icon={<Users style={{ width: 14, height: 14, color: COLORS.textMuted }} />}>
              <ServiceAssignments
                quoteId={quote.id}
                tripDate={quote.trip_date}
                initialAssignments={(assignmentsData ?? []) as any}
                staff={(staffData ?? []) as any}
                conflictByStaff={conflictByStaff}
                companyId={quote.company_id}
                quoteInfo={{
                  requester_name: quote.requester_name,
                  origin: quote.origin,
                  destination: quote.destination,
                  trip_date: quote.trip_date,
                  departure_time: quote.departure_time,
                  vehiculo: vehiculoNombre,
                }}
              />
            </Section>

            {quote.comments && (
              <Section title="Comentarios del cliente" icon={<MessageSquare style={{ width: 14, height: 14, color: COLORS.textMuted }} />}>
                <div style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: 16 }}>
                  <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6, whiteSpace: "pre-line" }}>{quote.comments}</p>
                </div>
              </Section>
            )}

            <ClienteEstado
              companyId={quote.company_id}
              email={quote.requester_email}
              nombre={quote.requester_name}
              telefono={quote.requester_phone ?? ""}
              estadoInicial={estadoRelacion}
            />

            <Section
              title="Historial del cliente"
              icon={<History style={{ width: 14, height: 14, color: COLORS.textMuted }} />}
              badge={historial.length === 0 ? "Primera solicitud" : `${historial.length} anterior${historial.length > 1 ? "es" : ""}`}
            >
              {historial.length === 0 ? (
                <div style={{ background: COLORS.navySoft, border: `1px solid ${COLORS.navy}1a`, borderRadius: RADIUS.md, padding: 16, textAlign: "center" }}>
                  <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 14, fontWeight: 600, color: COLORS.navy, margin: 0 }}>
                    <Star style={{ width: 15, height: 15 }} /> Cliente nuevo
                  </p>
                  <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>Es la primera vez que contacta con tu empresa</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historial.map(item => {
                    const hCfg = historialStatusConfig[item.status]
                    return (
                      <Link key={item.id} href={`/dashboard/solicitudes/${item.id}`}
                        className="flex items-center gap-4 group hover:bg-white"
                        style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: "14px", transition: "all 0.15s" }}>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.origin.split(",")[0]} → {item.destination.split(",")[0]}
                          </p>
                          <p style={{ fontSize: 12, color: COLORS.textFaint, marginTop: 2 }}>
                            Viaje: {fmtShort(item.trip_date)} · Recibida: {fmtShort(item.created_at)}
                            {(item.final_price ?? item.estimated_price) && ` · ${(item.final_price ?? item.estimated_price)?.toLocaleString("es-ES")} €`}
                          </p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: RADIUS.pill, flexShrink: 0, background: hCfg.bg, color: hCfg.color }}>
                          {hCfg.label}
                        </span>
                        <ArrowLeft className="rotate-180 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ width: 14, height: 14, color: COLORS.textFaint }} />
                      </Link>
                    )
                  })}
                </div>
              )}
            </Section>
          </div>

          <div className="lg:sticky lg:top-20 space-y-4">
            <QuoteActions
              quote={quote}
              companyId={quote.company_id}
              vehicles={vehicles}
              busyVehicleIds={busyVehicleIds}
              companyName={company?.name ?? null}
            />
          </div>
        </div>
    </div>
  )
}

function Section({ title, icon, badge, children }: {
  title: string; icon?: ReactNode; badge?: string; children: ReactNode
}) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, overflow: "hidden", fontFamily: FONT_BODY }}>
      <div className="flex items-center justify-between" style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center gap-2">
          {icon}
          <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{title}</p>
        </div>
        {badge && <span style={{ fontSize: 11, color: COLORS.textFaint, fontWeight: 500 }}>{badge}</span>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: 14 }}>
      <div className="flex items-center gap-1.5" style={{ marginBottom: 6 }}>
        {icon}
        <p style={{ fontSize: 10, fontWeight: 600, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.4 }}>{value}</p>
    </div>
  )
}