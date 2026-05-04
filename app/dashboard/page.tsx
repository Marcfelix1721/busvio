import Link from "next/link"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  BusFront,
  Clock3,
  Eye,
  FileText,
  Search,
  Settings,
  Star,
  CircleCheck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
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
  nuevo: "bg-blue-100 text-blue-700",
  en_revision: "bg-yellow-100 text-yellow-700",
  enviado: "bg-purple-100 text-purple-700",
  aceptado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
  cancelado: "bg-slate-100 text-slate-700",
}

const statusOptions: Array<{ value: QuoteRequest["status"] | "todas"; label: string }> = [
  { value: "todas", label: "Todas" },
  { value: "nuevo", label: "Nuevo" },
  { value: "en_revision", label: "En revisión" },
  { value: "enviado", label: "Enviado" },
  { value: "aceptado", label: "Aceptado" },
  { value: "rechazado", label: "Rechazado" },
  { value: "cancelado", label: "Cancelado" },
]

function formatDate(dateValue: string) {
  const date = new Date(dateValue)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function extractServiceType(comments?: string) {
  if (!comments) return "-"
  const line = comments
    .split("\n")
    .find((item) => item.toLowerCase().startsWith("tipo de servicio:"))
  return line ? line.replace(/^tipo de servicio:\s*/i, "") : "-"
}

function getRequestServiceType(request: QuoteRequest) {
  const serviceType = (request as unknown as { service_type?: string }).service_type
  if (serviceType) return serviceType
  return extractServiceType(request.comments)
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ estado?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data } = await supabase
    .from("quote_requests")
    .select("*")
    .order("created_at", { ascending: false })

  const requests = (data ?? []) as QuoteRequest[]
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const selectedStatus = (resolvedSearchParams?.estado ?? "todas") as QuoteRequest["status"] | "todas"
  const rawSearchQuery = (resolvedSearchParams?.q ?? "").trim()
  const searchQuery = rawSearchQuery.toLowerCase()

  const statusFilteredRequests =
    selectedStatus === "todas"
      ? requests
      : requests.filter((request) => request.status === selectedStatus)

  const filteredRequests = searchQuery
    ? statusFilteredRequests.filter((request) =>
        request.requester_name.toLowerCase().includes(searchQuery)
      )
    : statusFilteredRequests

  const metrics = {
    total: requests.length,
    nuevo: requests.filter((request) => request.status === "nuevo").length,
    en_revision: requests.filter((request) => request.status === "en_revision").length,
    aceptado: requests.filter((request) => request.status === "aceptado").length,
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa]">
      <div className="w-full">
        <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <header className="w-full bg-[#1e3a5f] px-6 py-3 shadow-sm">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <BusFront className="size-4" />
                <p className="text-sm font-semibold tracking-wide">Busvio</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="hidden text-xs text-slate-200 md:block">
                  {session.user.email ?? "Sin usuario"}
                </p>
                <Link
                  href="/dashboard/ajustes"
                  className="flex items-center gap-1 text-xs text-slate-200 hover:text-white transition-colors"
                >
                  <Settings className="size-3.5" />
                  Ajustes
                </Link>
                <LogoutButton />
              </div>
            </div>
          </header>

          <div className="w-full px-6 py-6">
            <section className="mb-6">
              <h1 className="text-[1.75rem] font-semibold text-[#1e3a5f]">
                Solicitudes de presupuesto
              </h1>
              <p className="mt-1 text-[0.9rem] text-[#6b7280]">
                Gestiona y responde a las solicitudes entrantes.
              </p>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total solicitudes"
                value={metrics.total}
                borderColor="border-l-blue-700"
                icon={<FileText className="size-4 text-slate-400" />}
              />
              <MetricCard
                label="Nuevas"
                value={metrics.nuevo}
                borderColor="border-l-blue-400"
                icon={<Star className="size-4 text-blue-400" />}
              />
              <MetricCard
                label="En revisión"
                value={metrics.en_revision}
                borderColor="border-l-yellow-500"
                icon={<Clock3 className="size-4 text-yellow-500" />}
              />
              <MetricCard
                label="Aceptadas"
                value={metrics.aceptado}
                borderColor="border-l-green-600"
                icon={<CircleCheck className="size-4 text-green-500" />}
              />
            </section>

            <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {statusOptions.map((statusOption) => {
                    const isActive = selectedStatus === statusOption.value
                    const params = new URLSearchParams()
                    if (statusOption.value !== "todas") params.set("estado", statusOption.value)
                    if (rawSearchQuery) params.set("q", rawSearchQuery)
                    const href = params.toString() ? `/dashboard?${params.toString()}` : "/dashboard"
                    return (
                      <Link
                        key={statusOption.value}
                        href={href}
                        className={
                          isActive
                            ? "rounded-full bg-[#1e3a5f] px-4 py-1.5 text-xs font-semibold text-white"
                            : "rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        }
                      >
                        {statusOption.label}
                      </Link>
                    )
                  })}
                </div>

                <form method="GET" className="w-full max-w-sm">
                  <input type="hidden" name="estado" value={selectedStatus} />
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <Search className="size-4 text-slate-400" />
                    <input
                      type="text"
                      name="q"
                      defaultValue={rawSearchQuery}
                      placeholder="Buscar por nombre..."
                      className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </form>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold tracking-wide uppercase">Solicitante</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-wide uppercase">Tipo servicio</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-wide uppercase">Origen → Destino</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-wide uppercase">Fecha viaje</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-wide uppercase">Pasajeros</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-wide uppercase">Estado</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-wide uppercase">Recibida</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-wide uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 ? (
                      <tr className="border-t border-slate-200">
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                          No hay solicitudes todavía
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((request, index) => (
                        <tr
                          key={request.id}
                          className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/60"} border-t border-slate-100 hover:bg-slate-100/70`}
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{request.requester_name}</p>
                            <p className="text-xs text-slate-500">{request.requester_email}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{getRequestServiceType(request)}</td>
                          <td className="px-4 py-3 text-slate-700">{request.origin} → {request.destination}</td>
                          <td className="px-4 py-3 text-slate-700">{formatDate(request.trip_date)}</td>
                          <td className="px-4 py-3 text-slate-700">{request.passengers}</td>
                          <td className="px-4 py-3">
                            <Badge className={`${statusClasses[request.status]} px-2.5 py-1 text-xs font-semibold`}>
                              {request.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{formatDate(request.created_at)}</td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/dashboard/solicitudes/${request.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              <Eye className="size-3.5" />
                              Ver
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

function MetricCard({
  label,
  value,
  borderColor,
  icon,
}: {
  label: string
  value: number
  borderColor: string
  icon: ReactNode
}) {
  return (
    <article className={`rounded-xl border border-slate-200 border-l-4 ${borderColor} bg-white p-6 shadow-[0_4px_12px_rgba(15,23,42,0.06)]`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-[3rem] leading-none font-bold text-[#1e3a5f]">{value}</p>
    </article>
  )
}