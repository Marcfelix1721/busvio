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
  CircleCheck,
  TrendingUp,
  Users,
  Euro,
  ChevronRight,
  AlertTriangle,
  UserX,
} from "lucide-react"
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

const statusConfig: Record<QuoteRequest["status"], { label: string; class: string; dot: string }> = {
  nuevo: { label: "Nuevo", class: "bg-blue-50 text-blue-700 ring-1 ring-blue-200", dot: "bg-blue-500" },
  en_revision: { label: "En revisión", class: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", dot: "bg-amber-500" },
  enviado: { label: "Enviado", class: "bg-violet-50 text-violet-700 ring-1 ring-violet-200", dot: "bg-violet-500" },
  aceptado: { label: "Aceptado", class: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  rechazado: { label: "Rechazado", class: "bg-red-50 text-red-600 ring-1 ring-red-200", dot: "bg-red-500" },
  cancelado: { label: "Cancelado", class: "bg-slate-50 text-slate-600 ring-1 ring-slate-200", dot: "bg-slate-400" },
}

const relacionConfig: Record<string, { label: string; class: string }> = {
  potencial: { label: "🟡 Potencial", class: "bg-yellow-50 text-yellow-700" },
  activo: { label: "🟢 Activo", class: "bg-green-50 text-green-700" },
  recurrente: { label: "🔵 Recurrente", class: "bg-blue-50 text-blue-700" },
  inactivo: { label: "⚫ Inactivo", class: "bg-gray-50 text-gray-600" },
  perdido: { label: "🔴 Perdido", class: "bg-red-50 text-red-600" },
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
  return new Date(dateValue).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric"
  })
}

function formatDateShort(dateValue: string) {
  return new Date(dateValue).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short"
  })
}

function extractServiceType(comments?: string) {
  if (!comments) return null
  const line = comments.split("\n").find((item) => item.toLowerCase().startsWith("tipo de servicio:"))
  return line ? line.replace(/^tipo de servicio:\s*/i, "").trim() : null
}

function getRequestServiceType(request: QuoteRequest) {
  const serviceType = (request as unknown as { service_type?: string }).service_type
  if (serviceType) return serviceType
  return extractServiceType(request.comments) ?? "-"
}

function diasHastaViaje(tripDate: string) {
  const hoy = new Date()
  const viaje = new Date(tripDate)
  const diff = Math.ceil((viaje.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ estado?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", session.user.id)
    .single()

  const companyId = userData?.company_id

  const { data: companyData } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single()

  const { data } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  const requests = (data ?? []) as QuoteRequest[]

  // Cargar relaciones comerciales
  const { data: clientesData } = await supabase
    .from("clientes")
    .select("email, estado_relacion")
    .eq("company_id", companyId)

  const relacionMap = new Map(
    (clientesData ?? []).map((c) => [c.email, c.estado_relacion])
  )

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const selectedStatus = (resolvedSearchParams?.estado ?? "todas") as QuoteRequest["status"] | "todas"
  const rawSearchQuery = (resolvedSearchParams?.q ?? "").trim()
  const searchQuery = rawSearchQuery.toLowerCase()

  const statusFilteredRequests =
    selectedStatus === "todas"
      ? requests
      : requests.filter((r) => r.status === selectedStatus)

  const filteredRequests = searchQuery
    ? statusFilteredRequests.filter((r) =>
        r.requester_name.toLowerCase().includes(searchQuery) ||
        r.requester_email.toLowerCase().includes(searchQuery) ||
        r.origin.toLowerCase().includes(searchQuery) ||
        r.destination.toLowerCase().includes(searchQuery)
      )
    : statusFilteredRequests

  // Métricas
  const totalFacturado = requests
    .filter((r) => r.status === "aceptado")
    .reduce((sum, r) => sum + (r.final_price ?? r.estimated_price ?? 0), 0)

  const importePendiente = requests
    .filter((r) => r.status === "enviado")
    .reduce((sum, r) => sum + (r.final_price ?? r.estimated_price ?? 0), 0)

  const clientesUnicos = new Set(requests.map((r) => r.requester_email)).size

  const metrics = {
    total: requests.length,
    nuevo: requests.filter((r) => r.status === "nuevo").length,
    en_revision: requests.filter((r) => r.status === "en_revision").length,
    aceptado: requests.filter((r) => r.status === "aceptado").length,
    enviado: requests.filter((r) => r.status === "enviado").length,
    totalFacturado,
    importePendiente,
    clientesUnicos,
  }

  const tasaExito = metrics.total > 0
    ? Math.round((metrics.aceptado / metrics.total) * 100)
    : 0

  // Solicitudes urgentes (viaje en menos de 7 días, no aceptadas ni canceladas)
  const urgentes = requests.filter((r) => {
    const dias = diasHastaViaje(r.trip_date)
    return dias >= 0 && dias <= 7 && !["aceptado", "cancelado", "rechazado"].includes(r.status)
  })

  // Solicitudes por mes (últimos 6 meses)
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("es-ES", { month: "short" }),
      count: 0,
    }
  })
  requests.forEach((r) => {
    const key = r.created_at.slice(0, 7)
    const mes = meses.find((m) => m.key === key)
    if (mes) mes.count++
  })
  const maxCount = Math.max(...meses.map((m) => m.count), 1)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex h-screen overflow-hidden">

        {/* SIDEBAR */}
        <aside className="hidden md:flex w-56 flex-col bg-[#1e3a5f] text-white flex-shrink-0">
          <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <BusFront className="size-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">Busvio</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest px-2 mb-2">Principal</p>
            <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/10 text-white text-sm font-medium">
              <FileText className="size-4" /> Solicitudes
            </Link>
            <Link href="/dashboard/clientes" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">
              <Users className="size-4" /> Clientes
            </Link>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest px-2 mb-2 mt-4">Configuración</p>
            <Link href="/dashboard/ajustes" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">
              <Settings className="size-4" /> Ajustes
            </Link>
          </nav>
          <div className="px-3 py-4 border-t border-white/10">
            <p className="text-xs text-white/50 truncate px-2 mb-2">{session.user.email}</p>
            <LogoutButton />
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto">
          <header className="md:hidden bg-[#1e3a5f] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <BusFront className="size-4" />
              <span className="font-bold text-sm">Busvio</span>
            </div>
            <LogoutButton />
          </header>

          <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">

            {/* HEADER */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{companyData?.name ?? "Dashboard"}</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            {/* ALERTAS URGENTES */}
            {urgentes.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="size-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    {urgentes.length} solicitud{urgentes.length > 1 ? "es" : ""} con viaje en menos de 7 días sin gestionar
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {urgentes.map((r) => (
                      <Link
                        key={r.id}
                        href={`/dashboard/solicitudes/${r.id}`}
                        className="text-xs text-amber-700 underline hover:text-amber-900"
                      >
                        {r.requester_name} ({formatDateShort(r.trip_date)})
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MÉTRICAS */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                label="Total solicitudes"
                value={metrics.total}
                sub={`${metrics.nuevo} nuevas · ${metrics.en_revision} en revisión`}
                icon={<FileText className="size-5 text-blue-600" />}
                iconBg="bg-blue-50"
                badge={null}
              />
              <MetricCard
                label="Tasa de éxito"
                value={`${tasaExito}%`}
                sub={`${metrics.aceptado} aceptadas de ${metrics.total}`}
                icon={<CircleCheck className="size-5 text-emerald-600" />}
                iconBg="bg-emerald-50"
                badge={tasaExito > 0 ? { label: `↑ ${tasaExito}%`, class: "bg-emerald-50 text-emerald-600" } : null}
              />
              <MetricCard
                label="Facturado (aceptadas)"
                value={`${totalFacturado.toLocaleString("es-ES")} €`}
                sub={`${clientesUnicos} clientes únicos`}
                icon={<Euro className="size-5 text-violet-600" />}
                iconBg="bg-violet-50"
                badge={null}
              />
              <MetricCard
                label="Pendiente de cobro"
                value={`${importePendiente.toLocaleString("es-ES")} €`}
                sub={`${metrics.enviado} presupuestos enviados`}
                icon={<Clock3 className="size-5 text-amber-600" />}
                iconBg="bg-amber-50"
                badge={importePendiente > 0 ? { label: "Pendiente", class: "bg-amber-50 text-amber-600" } : null}
              />
            </div>

            {/* GRÁFICA + RESUMEN */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Gráfica de barras */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Solicitudes por mes</h3>
                <p className="text-xs text-slate-400 mb-5">Últimos 6 meses</p>
                <div className="flex items-end gap-3 h-32">
                  {meses.map((mes) => (
                    <div key={mes.key} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-600">{mes.count > 0 ? mes.count : ""}</span>
                      <div className="w-full rounded-t-md bg-[#1e3a5f]/10 relative overflow-hidden" style={{ height: "80px" }}>
                        <div
                          className="absolute bottom-0 w-full bg-[#1e3a5f] rounded-t-md transition-all"
                          style={{ height: `${(mes.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize">{mes.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen de estados */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Estado del pipeline</h3>
                <p className="text-xs text-slate-400 mb-4">Distribución actual</p>
                <div className="space-y-3">
                  {statusOptions.filter(s => s.value !== "todas").map((s) => {
                    const count = requests.filter(r => r.status === s.value).length
                    const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0
                    const cfg = statusConfig[s.value as QuoteRequest["status"]]
                    return (
                      <div key={s.value}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-600">{cfg.label}</span>
                          <span className="text-xs font-semibold text-slate-800">{count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${cfg.dot} rounded-full`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* TABLA */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-slate-800">Solicitudes de presupuesto</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{filteredRequests.length} resultado{filteredRequests.length !== 1 ? "s" : ""}</p>
                </div>
                <form method="GET" className="flex items-center gap-2">
                  <input type="hidden" name="estado" value={selectedStatus} />
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 w-56">
                    <Search className="size-3.5 text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      name="q"
                      defaultValue={rawSearchQuery}
                      placeholder="Buscar cliente, ruta..."
                      className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </form>
              </div>

              <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2">
                {statusOptions.map((opt) => {
                  const isActive = selectedStatus === opt.value
                  const params = new URLSearchParams()
                  if (opt.value !== "todas") params.set("estado", opt.value)
                  if (rawSearchQuery) params.set("q", rawSearchQuery)
                  const href = params.toString() ? `/dashboard?${params.toString()}` : "/dashboard"
                  return (
                    <Link
                      key={opt.value}
                      href={href}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                        isActive ? "bg-[#1e3a5f] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {opt.label}
                      {opt.value !== "todas" && (
                        <span className={`ml-1.5 text-[10px] font-bold ${isActive ? "text-white/70" : "text-slate-400"}`}>
                          {requests.filter(r => r.status === opt.value).length}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ruta</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Relación</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Fecha viaje</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Precio</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Recibida</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="size-8 text-slate-200" />
                            <p className="text-sm font-medium text-slate-400">No hay solicitudes</p>
                            <p className="text-xs text-slate-300">Las nuevas solicitudes aparecerán aquí</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((request) => {
                        const dias = diasHastaViaje(request.trip_date)
                        const esUrgente = dias >= 0 && dias <= 7 && !["aceptado", "cancelado", "rechazado"].includes(request.status)
                        const relacion = relacionMap.get(request.requester_email)
                        const relacionCfg = relacion ? relacionConfig[relacion] : null
                        return (
                          <tr key={request.id} className={`hover:bg-slate-50/80 transition-colors group ${esUrgente ? "bg-amber-50/30" : ""}`}>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                                {request.requester_name}
                                {esUrgente && <span className="text-amber-500 text-xs">⚡</span>}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">{request.requester_email}</p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm text-slate-700 font-medium truncate max-w-[180px]">{request.origin}</p>
                              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">→ {request.destination}</p>
                            </td>
                            <td className="px-5 py-4 hidden lg:table-cell">
                              {relacionCfg ? (
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${relacionCfg.class}`}>
                                  {relacionCfg.label}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              <p className={`text-sm font-medium ${esUrgente ? "text-amber-600" : "text-slate-700"}`}>
                                {formatDateShort(request.trip_date)}
                              </p>
                              {esUrgente && <p className="text-xs text-amber-500">en {dias} día{dias !== 1 ? "s" : ""}</p>}
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell">
                              {request.final_price || request.estimated_price ? (
                                <p className="text-sm font-semibold text-slate-800">
                                  {(request.final_price ?? request.estimated_price)?.toLocaleString("es-ES")} €
                                </p>
                              ) : (
                                <p className="text-xs text-slate-300">Sin precio</p>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig[request.status].class}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[request.status].dot}`}></span>
                                {statusConfig[request.status].label}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden lg:table-cell">
                              <p className="text-xs text-slate-400">{formatDate(request.created_at)}</p>
                            </td>
                            <td className="px-5 py-4">
                              <Link
                                href={`/dashboard/solicitudes/${request.id}`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#1e3a5f] hover:text-[#1e3a5f]/70 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Ver <ChevronRight className="size-3" />
                              </Link>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function MetricCard({
  label, value, sub, icon, iconBg, badge,
}: {
  label: string
  value: number | string
  sub: string
  icon: ReactNode
  iconBg: string
  badge: { label: string; class: string } | null
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
        {badge && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.class}`}>
            {badge.label}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-0.5">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-xs text-slate-300 mt-1">{sub}</p>
    </div>
  )
}