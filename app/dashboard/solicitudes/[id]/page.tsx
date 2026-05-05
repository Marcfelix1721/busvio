import Link from "next/link"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  ArrowLeft, Bus, Calendar, Clock, FileText,
  Mail, MapPin, Phone, Users, History,
  MessageSquare, TrendingUp,
} from "lucide-react"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
import { QuoteActions } from "@/components/dashboard/QuoteActions"
import { ClienteEstado } from "@/components/dashboard/ClienteEstado"
import { QuoteRequest } from "@/lib/types"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

const statusConfig: Record<QuoteRequest["status"], { label: string; bg: string; text: string; ring: string; dot: string }> = {
  nuevo:       { label: "Nuevo",       bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200",     dot: "bg-sky-500" },
  en_revision: { label: "En revisión", bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-400" },
  enviado:     { label: "Enviado",     bg: "bg-violet-50",  text: "text-violet-700",  ring: "ring-violet-200",  dot: "bg-violet-500" },
  aceptado:    { label: "Aceptado",   bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  rechazado:   { label: "Rechazado",  bg: "bg-rose-50",    text: "text-rose-600",    ring: "ring-rose-200",    dot: "bg-rose-400" },
  cancelado:   { label: "Cancelado",  bg: "bg-zinc-50",    text: "text-zinc-500",    ring: "ring-zinc-200",    dot: "bg-zinc-400" },
}

const historialStatusConfig: Record<QuoteRequest["status"], { label: string; class: string }> = {
  nuevo:       { label: "Nuevo",       class: "bg-sky-50 text-sky-700" },
  en_revision: { label: "En revisión", class: "bg-amber-50 text-amber-700" },
  enviado:     { label: "Enviado",     class: "bg-violet-50 text-violet-700" },
  aceptado:    { label: "Aceptado",   class: "bg-emerald-50 text-emerald-700" },
  rechazado:   { label: "Rechazado",  class: "bg-rose-50 text-rose-600" },
  cancelado:   { label: "Cancelado",  class: "bg-zinc-50 text-zinc-500" },
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

async function geocode(address: string, apiKey: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&limit=1&apiKey=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()
    if (data.features?.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates
      return { lat, lon }
    }
    return null
  } catch {
    return null
  }
}

function buildMapUrl(origin: { lat: number; lon: number }, destination: { lat: number; lon: number }, apiKey: string): string {
  const markers = [
    `lonlat:${origin.lon},${origin.lat};type:material;color:%23111827;size:medium;icon:dot;icontype:awesome;whitecircle:no`,
    `lonlat:${destination.lon},${destination.lat};type:material;color:%23ef4444;size:medium;icon:flag;icontype:awesome;whitecircle:no`,
  ].join("|")

  return `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=900&height=400&marker=${markers}&apiKey=${apiKey}`
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

  // Geocodificar para el mapa
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_KEY ?? ""
  const [originCoords, destCoords] = await Promise.all([
    geocode(quote.origin, apiKey),
    geocode(quote.destination, apiKey),
  ])
  const mapUrl = originCoords && destCoords ? buildMapUrl(originCoords, destCoords, apiKey) : null

  const serviceType = extractCommentField(quote.comments, "Tipo de servicio") ?? "—"
  const tipoCliente = extractCommentField(quote.comments, "Tipo de cliente") ?? "—"
  const endTime = extractCommentField(quote.comments, "Hora de regreso/finalizacion") ?? "No especificada"
  const dias = diasHasta(quote.trip_date)
  const esUrgente = dias >= 0 && dias <= 7 && !["aceptado","cancelado","rechazado"].includes(quote.status)
  const sCfg = statusConfig[quote.status]

  return (
    <div className="min-h-screen bg-[#f5f5f4]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* TOPBAR */}
      <div className="bg-[#111827] px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
            <ArrowLeft className="size-3.5" /> Solicitudes
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/70 text-sm font-medium truncate max-w-[200px]">{quote.requester_name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-xs hidden md:block">#{quote.id.slice(0,8).toUpperCase()}</span>
          <LogoutButton />
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-6 py-6">

        {/* HEADER */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ${sCfg.bg} ${sCfg.text} ${sCfg.ring}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`}></span>
                {sCfg.label}
              </span>
              {esUrgente && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                  ⚡ Viaje en {dias} día{dias!==1?"s":""}
                </span>
              )}
              {historial.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                  <TrendingUp className="size-3"/> Cliente recurrente
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[#111827] tracking-tight">{quote.requester_name}</h1>
            <p className="text-sm text-[#9ca3af] mt-1">
              Solicitud recibida el {fmt(quote.created_at)}
              {quote.final_price && <span className="ml-3 font-semibold text-[#374151]">· {quote.final_price.toLocaleString("es-ES")} € final</span>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">

          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-4">

            {/* DATOS DEL SOLICITANTE */}
            <Section title="Datos del solicitante">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InfoTile icon={<Mail className="size-3.5 text-[#6b7280]"/>} label="Email" value={quote.requester_email} />
                <InfoTile icon={<Phone className="size-3.5 text-[#6b7280]"/>} label="Teléfono" value={quote.requester_phone ?? "—"} />
                <InfoTile icon={<Users className="size-3.5 text-[#6b7280]"/>} label="Tipo de cliente" value={tipoCliente} />
              </div>
            </Section>

            {/* DETALLES DEL VIAJE */}
            <Section title="Detalles del viaje">

              {/* MAPA */}
              {mapUrl && (
                <div className="rounded-xl overflow-hidden border border-[#e5e7eb] mb-4" style={{height:"220px"}}>
                  <img
                    src={mapUrl}
                    alt={`Ruta de ${quote.origin} a ${quote.destination}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Ruta visual */}
              <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4 mb-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#111827]"></div>
                    <div className="w-px h-8 bg-[#d1d5db]"></div>
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-rose-500"></div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-0.5">Origen</p>
                      <p className="text-sm font-semibold text-[#111827]">{quote.origin}</p>
                    </div>
                    {quote.stops && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-0.5">Paradas intermedias</p>
                        <p className="text-sm text-[#374151]">{quote.stops}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-0.5">Destino</p>
                      <p className="text-sm font-semibold text-[#111827]">{quote.destination}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <InfoTile icon={<Calendar className="size-3.5 text-[#6b7280]"/>} label="Fecha viaje" value={fmt(quote.trip_date)} />
                <InfoTile icon={<Users className="size-3.5 text-[#6b7280]"/>} label="Pasajeros" value={String(quote.passengers)} />
                <InfoTile icon={<Bus className="size-3.5 text-[#6b7280]"/>} label="Vehículo" value={quote.vehicle_type} />
                <InfoTile icon={<FileText className="size-3.5 text-[#6b7280]"/>} label="Tipo servicio" value={serviceType} />
                <InfoTile icon={<Clock className="size-3.5 text-[#6b7280]"/>} label="Hora salida" value={quote.departure_time} />
                <InfoTile icon={<Clock className="size-3.5 text-[#6b7280]"/>} label="Hora regreso" value={endTime} />
                {quote.estimated_km && (
                  <InfoTile icon={<MapPin className="size-3.5 text-[#6b7280]"/>} label="Distancia" value={`${quote.estimated_km} km`} />
                )}
                {quote.estimated_price && (
                  <InfoTile icon={<FileText className="size-3.5 text-[#6b7280]"/>} label="Precio sugerido" value={`${quote.estimated_price} €`} />
                )}
              </div>
            </Section>

            {/* COMENTARIOS */}
            {quote.comments && (
              <Section title="Comentarios del cliente" icon={<MessageSquare className="size-3.5 text-[#6b7280]"/>}>
                <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4">
                  <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-line">{quote.comments}</p>
                </div>
              </Section>
            )}

            {/* RELACIÓN COMERCIAL */}
            <ClienteEstado
              companyId={quote.company_id}
              email={quote.requester_email}
              nombre={quote.requester_name}
              telefono={quote.requester_phone ?? ""}
              estadoInicial={estadoRelacion}
            />

            {/* HISTORIAL */}
            <Section title="Historial del cliente" icon={<History className="size-3.5 text-[#6b7280]"/>}
              badge={historial.length === 0 ? "Primera solicitud" : `${historial.length} anterior${historial.length>1?"es":""}`}>
              {historial.length === 0 ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                  <p className="text-sm font-semibold text-blue-700">⭐ Cliente nuevo</p>
                  <p className="text-xs text-blue-400 mt-1">Es la primera vez que contacta con tu empresa</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historial.map(item => {
                    const hCfg = historialStatusConfig[item.status]
                    return (
                      <Link key={item.id} href={`/dashboard/solicitudes/${item.id}`}
                        className="flex items-center gap-4 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-3.5 hover:bg-white hover:border-[#d1d5db] transition-all group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#111827] truncate">
                            {item.origin.split(",")[0]} → {item.destination.split(",")[0]}
                          </p>
                          <p className="text-xs text-[#9ca3af] mt-0.5">
                            Viaje: {fmtShort(item.trip_date)} · Recibida: {fmtShort(item.created_at)}
                            {(item.final_price ?? item.estimated_price) && ` · ${(item.final_price ?? item.estimated_price)?.toLocaleString("es-ES")} €`}
                          </p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${hCfg.class}`}>
                          {hCfg.label}
                        </span>
                        <ArrowLeft className="size-3.5 text-[#9ca3af] rotate-180 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </Link>
                    )
                  })}
                </div>
              )}
            </Section>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="lg:sticky lg:top-20 space-y-4">
            <QuoteActions quote={quote} company={company} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, badge, children }: {
  title: string; icon?: ReactNode; badge?: string; children: ReactNode
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f3f4f6]">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-[12px] font-semibold text-[#6b7280] uppercase tracking-wider">{title}</p>
        </div>
        {badge && <span className="text-[11px] text-[#9ca3af] font-medium">{badge}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-[13px] font-semibold text-[#111827] leading-snug">{value}</p>
    </div>
  )
}