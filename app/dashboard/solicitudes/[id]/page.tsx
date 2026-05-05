import Link from "next/link"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  ArrowLeft,
  Bus,
  Calendar,
  Clock,
  FileText,
  Mail,
  MapPin,
  Phone,
  Users,
  History,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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

const statusClasses: Record<QuoteRequest["status"], string> = {
  nuevo: "bg-blue-50 text-blue-700 border-blue-200",
  en_revision: "bg-amber-50 text-amber-700 border-amber-200",
  enviado: "bg-purple-50 text-purple-700 border-purple-200",
  aceptado: "bg-green-50 text-green-700 border-green-200",
  rechazado: "bg-red-50 text-red-700 border-red-200",
  cancelado: "bg-gray-50 text-gray-600 border-gray-200",
}

const statusLabels: Record<QuoteRequest["status"], string> = {
  nuevo: "Nuevo",
  en_revision: "En revisión",
  enviado: "Enviado",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
}

function extractCommentField(comments: string | undefined, key: string) {
  if (!comments) return null
  const line = comments
    .split("\n")
    .find((item) => item.toLowerCase().startsWith(`${key.toLowerCase()}:`))
  return line ? line.replace(new RegExp(`^${key}:\\s*`, "i"), "").trim() : null
}

function formatDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString("es-ES")
}

export default async function QuoteRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  const quote = data as QuoteRequest | null
  if (!quote) redirect("/dashboard")

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", quote.company_id)
    .maybeSingle()

  const { data: historialData } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("company_id", quote.company_id)
    .eq("requester_email", quote.requester_email)
    .neq("id", quote.id)
    .order("created_at", { ascending: false })

  const historial = (historialData ?? []) as QuoteRequest[]

  // Estado de relación comercial del cliente
  const { data: clienteData } = await supabase
    .from("clientes")
    .select("estado_relacion")
    .eq("company_id", quote.company_id)
    .eq("email", quote.requester_email)
    .maybeSingle()

  const estadoRelacion = clienteData?.estado_relacion ?? null

  const serviceType = extractCommentField(quote.comments, "Tipo de servicio") ?? "-"
  const endTime =
    extractCommentField(quote.comments, "Hora de regreso/finalizacion") ??
    "No especificada"

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-[#1e3a5f] px-6 py-4 flex justify-between items-center">
        <div className="text-white font-semibold">🚌 {company?.name ?? "Busvio"}</div>
        <LogoutButton />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/dashboard" className="text-sm text-gray-500 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver al panel
        </Link>

        <div className="mt-4 mb-8 flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-500">{quote.id}</p>
            <h1 className="text-2xl font-bold text-gray-900">{quote.requester_name}</h1>
            <p className="text-sm text-gray-500 mt-1">Recibida el {formatDate(quote.created_at)}</p>
          </div>
          <Badge className={`${statusClasses[quote.status]} border px-3 py-1 text-sm font-semibold`}>
            {statusLabels[quote.status]}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Datos del solicitante
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
                  <Mail className="h-4 w-4 text-[#1e3a5f] mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="text-sm font-medium mt-1">{quote.requester_email}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
                  <Phone className="h-4 w-4 text-[#1e3a5f] mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</p>
                    <p className="text-sm font-medium mt-1">{quote.requester_phone}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Detalles del viaje
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <DetailCell icon={<MapPin className="h-4 w-4 text-[#1e3a5f] mt-0.5" />} label="Origen" value={quote.origin} />
                <DetailCell icon={<MapPin className="h-4 w-4 text-[#1e3a5f] mt-0.5" />} label="Destino" value={quote.destination} />
                <DetailCell icon={<Calendar className="h-4 w-4 text-[#1e3a5f] mt-0.5" />} label="Fecha viaje" value={formatDate(quote.trip_date)} />
                <DetailCell icon={<Users className="h-4 w-4 text-[#1e3a5f] mt-0.5" />} label="Pasajeros" value={String(quote.passengers)} />
                <DetailCell icon={<Bus className="h-4 w-4 text-[#1e3a5f] mt-0.5" />} label="Tipo vehículo" value={quote.vehicle_type} />
                <DetailCell icon={<FileText className="h-4 w-4 text-[#1e3a5f] mt-0.5" />} label="Tipo servicio" value={serviceType} />
                <DetailCell icon={<Clock className="h-4 w-4 text-[#1e3a5f] mt-0.5" />} label="Hora salida" value={quote.departure_time} />
                <DetailCell icon={<Clock className="h-4 w-4 text-[#1e3a5f] mt-0.5" />} label="Hora regreso" value={endTime} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Comentarios del cliente
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                {quote.comments || "Sin comentarios"}
              </div>
            </div>

            {/* RELACIÓN COMERCIAL */}
            <ClienteEstado
              companyId={quote.company_id}
              email={quote.requester_email}
              nombre={quote.requester_name}
              telefono={quote.requester_phone ?? ''}
              estadoInicial={estadoRelacion}
            />

            {/* HISTORIAL DEL CLIENTE */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-4 w-4 text-[#1e3a5f]" />
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Historial del cliente
                </h2>
                <span className="ml-auto text-xs text-gray-400">
                  {historial.length === 0
                    ? "Primera solicitud"
                    : `${historial.length} solicitud${historial.length > 1 ? "es" : ""} anterior${historial.length > 1 ? "es" : ""}`}
                </span>
              </div>

              {historial.length === 0 ? (
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-blue-600 font-medium">⭐ Cliente nuevo</p>
                  <p className="text-xs text-blue-400 mt-1">Es la primera vez que contacta</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historial.map((item) => (
                    <Link
                      key={item.id}
                      href={`/dashboard/solicitudes/${item.id}`}
                      className="flex items-center gap-4 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {item.origin} → {item.destination}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Viaje: {formatDate(item.trip_date)} · Recibida: {formatDate(item.created_at)}
                        </p>
                      </div>
                      <Badge className={`${statusClasses[item.status]} border px-2 py-0.5 text-xs font-semibold flex-shrink-0`}>
                        {statusLabels[item.status]}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-8 space-y-6">
            <QuoteActions quote={quote} company={company} />
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
      {icon}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium mt-1">{value}</p>
      </div>
    </div>
  )
}