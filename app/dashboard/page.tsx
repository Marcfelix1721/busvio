import Link from "next/link"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  BusFront, Clock3, FileText, Search, Settings,
  CircleCheck, Users, Euro, ChevronRight, AlertTriangle,
  BarChart3, ArrowUpRight, Inbox, Calendar,
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

const statusConfig: Record<QuoteRequest["status"], { label: string; bg: string; text: string; ring: string; bar: string }> = {
  nuevo:       { label: "Nuevo",       bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200",     bar: "bg-sky-500" },
  en_revision: { label: "En revisión", bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   bar: "bg-amber-400" },
  enviado:     { label: "Enviado",     bg: "bg-violet-50",  text: "text-violet-700",  ring: "ring-violet-200",  bar: "bg-violet-500" },
  aceptado:    { label: "Aceptado",    bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", bar: "bg-emerald-500" },
  rechazado:   { label: "Rechazado",   bg: "bg-rose-50",    text: "text-rose-600",    ring: "ring-rose-200",    bar: "bg-rose-400" },
  cancelado:   { label: "Cancelado",   bg: "bg-zinc-50",    text: "text-zinc-500",    ring: "ring-zinc-200",    bar: "bg-zinc-300" },
}

const relacionConfig: Record<string, { label: string; dot: string }> = {
  potencial:  { label: "Potencial",  dot: "bg-amber-400" },
  activo:     { label: "Activo",     dot: "bg-emerald-500" },
  recurrente: { label: "Recurrente", dot: "bg-blue-500" },
  inactivo:   { label: "Inactivo",   dot: "bg-zinc-400" },
  perdido:    { label: "Perdido",    dot: "bg-rose-500" },
}

const statusOptions: Array<{ value: QuoteRequest["status"] | "todas"; label: string }> = [
  { value: "todas",       label: "Todas" },
  { value: "nuevo",       label: "Nuevo" },
  { value: "en_revision", label: "En revisión" },
  { value: "enviado",     label: "Enviado" },
  { value: "aceptado",    label: "Aceptado" },
  { value: "rechazado",   label: "Rechazado" },
  { value: "cancelado",   label: "Cancelado" },
]

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}
function diasHasta(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}
function extractServiceType(comments?: string) {
  if (!comments) return null
  const line = comments.split("\n").find(l => l.toLowerCase().startsWith("tipo de servicio:"))
  return line ? line.replace(/^tipo de servicio:\s*/i, "").trim() : null
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ estado?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: userData } = await supabase.from("users").select("company_id").eq("id", session.user.id).single()
  const companyId = userData?.company_id

  const { data: companyData } = await supabase.from("companies").select("name").eq("id", companyId).single()

  const { data: rawData } = await supabase
    .from("quote_requests").select("*").eq("company_id", companyId).order("created_at", { ascending: false })
  const requests = (rawData ?? []) as QuoteRequest[]

  const { data: clientesData } = await supabase.from("clientes").select("email, estado_relacion").eq("company_id", companyId)
  const relacionMap = new Map((clientesData ?? []).map(c => [c.email, c.estado_relacion]))

  const sp = searchParams ? await searchParams : undefined
  const selectedStatus = (sp?.estado ?? "todas") as QuoteRequest["status"] | "todas"
  const rawQ = (sp?.q ?? "").trim()
  const q = rawQ.toLowerCase()

  const filtered = requests
    .filter(r => selectedStatus === "todas" || r.status === selectedStatus)
    .filter(r => !q || [r.requester_name, r.requester_email, r.origin, r.destination].some(f => f?.toLowerCase().includes(q)))

  const facturado = requests.filter(r => r.status === "aceptado").reduce((s, r) => s + (r.final_price ?? r.estimated_price ?? 0), 0)
  const pendiente = requests.filter(r => r.status === "enviado").reduce((s, r) => s + (r.final_price ?? r.estimated_price ?? 0), 0)
  const clientes = new Set(requests.map(r => r.requester_email)).size
  const aceptadas = requests.filter(r => r.status === "aceptado").length
  const tasa = requests.length > 0 ? Math.round((aceptadas / requests.length) * 100) : 0

  const urgentes = requests.filter(r => {
    const d = diasHasta(r.trip_date)
    return d >= 0 && d <= 7 && !["aceptado","cancelado","rechazado"].includes(r.status)
  })

  const companyName = companyData?.name ?? "Dashboard"
  const today = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="flex h-screen bg-[#f5f5f4] overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-[220px] flex-col bg-[#111827] flex-shrink-0">
        <div className="px-5 pt-6 pb-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center flex-shrink-0">
              <BusFront className="size-3.5 text-white" />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">Busvio</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest px-2 pb-1">Principal</p>
          <SideLink href="/dashboard" icon={<Inbox className="size-3.5" />} label="Solicitudes" active />
          <SideLink href="/dashboard/clientes" icon={<Users className="size-3.5" />} label="Clientes" />
          <SideLink href="/dashboard/analytics" icon={<BarChart3 className="size-3.5" />} label="Analytics" />
          <SideLink href="/dashboard/calendario" icon={<Calendar className="size-3.5" />} label="Calendario" />
          <div className="pt-4 pb-1 px-2">
            <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest">Config</p>
          </div>
          <SideLink href="/dashboard/ajustes" icon={<Settings className="size-3.5" />} label="Ajustes" />
        </nav>
        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          <p className="text-[11px] text-white/30 truncate px-2">{session.user.email}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

          {/* HEADER */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-semibold text-[#111827] tracking-tight">{companyName}</h1>
              <p className="text-[13px] text-[#9ca3af] capitalize mt-0.5">{today}</p>
            </div>
            {urgentes.length > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">
                <AlertTriangle className="size-3" />
                {urgentes.length} viaje{urgentes.length > 1 ? "s" : ""} urgente{urgentes.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* ALERTA URGENTES */}
          {urgentes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="size-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {urgentes.length} solicitud{urgentes.length > 1 ? "es" : ""} con viaje en menos de 7 días pendientes
                </p>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {urgentes.map(r => (
                    <Link key={r.id} href={`/dashboard/solicitudes/${r.id}`}
                      className="text-xs text-amber-700 font-medium underline underline-offset-2 hover:text-amber-900">
                      {r.requester_name} — {fmtShort(r.trip_date)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KPI label="Total solicitudes" value={requests.length}
              sub={`${requests.filter(r => r.status === "nuevo").length} nuevas · ${requests.filter(r => r.status === "en_revision").length} en revisión`}
              icon={<FileText className="size-4 text-blue-600" />} iconBg="bg-blue-50" accent="border-l-blue-500" />
            <KPI label="Tasa de cierre" value={`${tasa}%`}
              sub={`${aceptadas} aceptadas de ${requests.length}`}
              icon={<CircleCheck className="size-4 text-emerald-600" />} iconBg="bg-emerald-50" accent="border-l-emerald-500" up={tasa > 0} />
            <KPI label="Facturado" value={`${facturado.toLocaleString("es-ES")} €`}
              sub={`${clientes} clientes únicos`}
              icon={<Euro className="size-4 text-violet-600" />} iconBg="bg-violet-50" accent="border-l-violet-500" />
            <KPI label="Pendiente de cobro" value={`${pendiente.toLocaleString("es-ES")} €`}
              sub={`${requests.filter(r => r.status === "enviado").length} presupuestos enviados`}
              icon={<Clock3 className="size-4 text-amber-600" />} iconBg="bg-amber-50" accent="border-l-amber-500" />
          </div>

          {/* TABLA */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-3.5 border-b border-[#f3f4f6]">
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#111827]">Solicitudes</p>
                <p className="text-xs text-[#9ca3af]">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>
              </div>
              <form method="GET">
                <input type="hidden" name="estado" value={selectedStatus} />
                <div className="flex items-center gap-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-3 py-2 w-60">
                  <Search className="size-3.5 text-[#9ca3af] flex-shrink-0" />
                  <input type="text" name="q" defaultValue={rawQ} placeholder="Buscar cliente, ciudad..."
                    className="w-full bg-transparent text-xs text-[#374151] outline-none placeholder:text-[#9ca3af]" />
                </div>
              </form>
            </div>

            <div className="flex flex-wrap gap-1.5 px-5 py-2.5 border-b border-[#f3f4f6]">
              {statusOptions.map(opt => {
                const isActive = selectedStatus === opt.value
                const params = new URLSearchParams()
                if (opt.value !== "todas") params.set("estado", opt.value)
                if (rawQ) params.set("q", rawQ)
                const href = params.toString() ? `/dashboard?${params.toString()}` : "/dashboard"
                const count = opt.value === "todas" ? requests.length : requests.filter(r => r.status === opt.value).length
                return (
                  <Link key={opt.value} href={href}
                    className={`text-[12px] font-medium px-3 py-1 rounded-md transition-all ${
                      isActive ? "bg-[#111827] text-white" : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                    }`}>
                    {opt.label}
                    <span className={`ml-1.5 text-[10px] ${isActive ? "text-white/50" : "text-[#9ca3af]"}`}>{count}</span>
                  </Link>
                )
              })}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f3f4f6]">
                  {["Cliente","Ruta","Relación","Fecha viaje","Precio","Estado","Recibida",""].map((h, i) => (
                    <th key={i} className={`px-5 py-2.5 text-left text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider ${
                      i === 2 ? "hidden lg:table-cell" : i === 3 || i === 4 || i === 6 ? "hidden md:table-cell" : ""
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-[#f3f4f6] rounded-full flex items-center justify-center">
                        <Inbox className="size-5 text-[#d1d5db]" />
                      </div>
                      <p className="text-sm text-[#9ca3af] font-medium">Sin resultados</p>
                      <p className="text-xs text-[#d1d5db]">Prueba con otro filtro o búsqueda</p>
                    </div>
                  </td></tr>
                ) : filtered.map(r => {
                  const dias = diasHasta(r.trip_date)
                  const urgente = dias >= 0 && dias <= 7 && !["aceptado","cancelado","rechazado"].includes(r.status)
                  const rel = relacionMap.get(r.requester_email)
                  const relCfg = rel ? relacionConfig[rel] : null
                  const sCfg = statusConfig[r.status]
                  const precio = r.final_price ?? r.estimated_price
                  return (
                    <tr key={r.id} className={`border-b border-[#f9fafb] hover:bg-[#fafafa] transition-colors group ${urgente ? "bg-amber-50/40" : ""}`}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[#111827] text-[13px] flex items-center gap-1.5">
                          {r.requester_name}
                          {urgente && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">⚡ {dias}d</span>}
                        </p>
                        <p className="text-xs text-[#9ca3af] mt-0.5">{r.requester_email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[13px] text-[#374151] font-medium truncate max-w-[160px]">{r.origin}</p>
                        <p className="text-xs text-[#9ca3af] mt-0.5 truncate max-w-[160px]">→ {r.destination}</p>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {relCfg ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#374151]">
                            <span className={`w-1.5 h-1.5 rounded-full ${relCfg.dot}`}></span>
                            {relCfg.label}
                          </span>
                        ) : <span className="text-xs text-[#d1d5db]">—</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <p className={`text-[13px] font-medium ${urgente ? "text-amber-600" : "text-[#374151]"}`}>{fmtShort(r.trip_date)}</p>
                        {urgente && <p className="text-[11px] text-amber-500">en {dias} día{dias !== 1 ? "s" : ""}</p>}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        {precio ? (
                          <p className="text-[13px] font-semibold text-[#111827]">{precio.toLocaleString("es-ES")} €</p>
                        ) : <p className="text-xs text-[#d1d5db]">—</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ${sCfg.bg} ${sCfg.text} ${sCfg.ring}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sCfg.bar}`}></span>
                          {sCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <p className="text-xs text-[#9ca3af]">{fmt(r.created_at)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/dashboard/solicitudes/${r.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#111827] opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600">
                          Abrir <ChevronRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

function SideLink({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
      active ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
    }`}>
      {icon} {label}
    </Link>
  )
}

function KPI({ label, value, sub, icon, iconBg, accent, up }: {
  label: string; value: string | number; sub: string; icon: ReactNode; iconBg: string; accent: string; up?: boolean
}) {
  return (
    <div className={`bg-white border border-[#e5e7eb] border-l-4 ${accent} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>{icon}</div>
        {up && <ArrowUpRight className="size-3.5 text-emerald-500" />}
      </div>
      <p className="text-[22px] font-bold text-[#111827] leading-none mb-1">{value}</p>
      <p className="text-[12px] font-medium text-[#6b7280]">{label}</p>
      <p className="text-[11px] text-[#9ca3af] mt-0.5">{sub}</p>
    </div>
  )
}