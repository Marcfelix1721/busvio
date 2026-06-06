import Link from "next/link"
import { FlotaFlyLogo } from "@/components/FlotaFlyLogo"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  BusFront, FileText, Settings, Users,
  BarChart3, Inbox,
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

const statusConfig: Record<QuoteRequest["status"], { label: string; bar: string }> = {
  nuevo:       { label: "Nuevo",       bar: "bg-sky-500" },
  en_revision: { label: "En revisión", bar: "bg-amber-400" },
  enviado:     { label: "Enviado",     bar: "bg-violet-500" },
  aceptado:    { label: "Aceptado",   bar: "bg-emerald-500" },
  rechazado:   { label: "Rechazado",  bar: "bg-rose-400" },
  cancelado:   { label: "Cancelado",  bar: "bg-zinc-300" },
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: userData } = await supabase.from("users").select("company_id").eq("id", session.user.id).single()
  const companyId = userData?.company_id

  const { data: rawData } = await supabase
    .from("quote_requests").select("*").eq("company_id", companyId).order("created_at", { ascending: false })
  const requests = (rawData ?? []) as QuoteRequest[]

  // Últimos 6 meses
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i))
    return {
      key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
      label: d.toLocaleDateString("es-ES", { month: "long" }),
      count: 0,
      facturado: 0,
    }
  })
  requests.forEach(r => {
    const m = meses.find(m => m.key === r.created_at.slice(0,7))
    if (m) {
      m.count++
      if (r.status === "aceptado") m.facturado += r.final_price ?? r.estimated_price ?? 0
    }
  })
  const maxCount = Math.max(...meses.map(m => m.count), 1)
  const maxFacturado = Math.max(...meses.map(m => m.facturado), 1)

  const aceptadas = requests.filter(r => r.status === "aceptado").length
  const tasa = requests.length > 0 ? Math.round((aceptadas / requests.length) * 100) : 0

  // Top rutas
  const rutaMap = new Map<string, number>()
  requests.forEach(r => {
    const key = `${r.origin.split(",")[0]} → ${r.destination.split(",")[0]}`
    rutaMap.set(key, (rutaMap.get(key) ?? 0) + 1)
  })
  const topRutas = Array.from(rutaMap.entries()).sort((a,b) => b[1]-a[1]).slice(0,5)

  return (
    <div className="flex h-screen bg-[#f5f5f4] overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-[220px] flex-col bg-[#111827] flex-shrink-0">
        <div className="px-5 pt-6 pb-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center flex-shrink-0">
              <FlotaFlyLogo size={20} />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">FlotaFly</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest px-2 pb-1">Principal</p>
          <SideLink href="/dashboard" icon={<Inbox className="size-3.5"/>} label="Solicitudes" />
          <SideLink href="/dashboard/clientes" icon={<Users className="size-3.5"/>} label="Clientes" />
          <SideLink href="/dashboard/analytics" icon={<BarChart3 className="size-3.5"/>} label="Analytics" active />
          <div className="pt-4 pb-1 px-2">
            <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest">Config</p>
          </div>
          <SideLink href="/dashboard/ajustes" icon={<Settings className="size-3.5"/>} label="Ajustes" />
          <Link href="/dashboard/conductores" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: 'rgba(255,255,255,0.45)' }}>
            <BusFront style={{ width: 14, height: 14 }} /> Conductores
          </Link>
        </nav>
        <div className="px-3 py-4 border-t border-white/5 space-y-2">
          <p className="text-[11px] text-white/30 truncate px-2">{session.user.email}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

          <div>
            <h1 className="text-[22px] font-semibold text-[#111827] tracking-tight">Analytics</h1>
            <p className="text-[13px] text-[#9ca3af] mt-0.5">Rendimiento histórico de tu negocio</p>
          </div>

          {/* GRÁFICA SOLICITUDES */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
            <p className="text-sm font-semibold text-[#111827] mb-1">Solicitudes por mes</p>
            <p className="text-xs text-[#9ca3af] mb-6">Últimos 6 meses</p>
            <div className="flex items-end gap-4 h-40">
              {meses.map(mes => (
                <div key={mes.key} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[12px] font-semibold text-[#6b7280]">{mes.count > 0 ? mes.count : ""}</span>
                  <div className="w-full rounded-sm bg-[#f3f4f6] relative" style={{height:"100px"}}>
                    <div className="absolute bottom-0 w-full bg-[#111827] rounded-sm transition-all duration-700"
                      style={{height:`${Math.max((mes.count/maxCount)*100, mes.count>0?6:0)}%`}} />
                  </div>
                  <span className="text-[11px] text-[#9ca3af] capitalize text-center">{mes.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GRÁFICA FACTURADO */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
            <p className="text-sm font-semibold text-[#111827] mb-1">Facturado por mes</p>
            <p className="text-xs text-[#9ca3af] mb-6">Solo servicios aceptados · últimos 6 meses</p>
            <div className="flex items-end gap-4 h-40">
              {meses.map(mes => (
                <div key={mes.key} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[12px] font-semibold text-[#6b7280]">
                    {mes.facturado > 0 ? `${mes.facturado.toLocaleString("es-ES")}€` : ""}
                  </span>
                  <div className="w-full rounded-sm bg-[#f3f4f6] relative" style={{height:"100px"}}>
                    <div className="absolute bottom-0 w-full bg-emerald-500 rounded-sm transition-all duration-700"
                      style={{height:`${Math.max((mes.facturado/maxFacturado)*100, mes.facturado>0?6:0)}%`}} />
                  </div>
                  <span className="text-[11px] text-[#9ca3af] capitalize text-center">{mes.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* PIPELINE */}
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
              <p className="text-sm font-semibold text-[#111827] mb-1">Pipeline de estados</p>
              <p className="text-xs text-[#9ca3af] mb-5">Distribución actual de solicitudes</p>
              <div className="space-y-4">
                {Object.entries(statusConfig).map(([key, cfg]) => {
                  const count = requests.filter(r => r.status === key).length
                  const pct = requests.length > 0 ? (count / requests.length) * 100 : 0
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-[13px] text-[#374151]">{cfg.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-[#9ca3af]">{Math.round(pct)}%</span>
                          <span className="text-[13px] font-semibold text-[#111827] w-4 text-right">{count}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                        <div className={`h-full ${cfg.bar} rounded-full transition-all duration-500`} style={{width:`${pct}%`}} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-[#f3f4f6] flex justify-between">
                <span className="text-xs text-[#9ca3af]">Tasa de cierre</span>
                <span className="text-sm font-bold text-emerald-600">{tasa}%</span>
              </div>
            </div>

            {/* TOP RUTAS */}
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
              <p className="text-sm font-semibold text-[#111827] mb-1">Rutas más solicitadas</p>
              <p className="text-xs text-[#9ca3af] mb-5">Top 5 trayectos</p>
              {topRutas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <FileText className="size-6 text-[#e5e7eb]" />
                  <p className="text-xs text-[#9ca3af]">Sin datos suficientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topRutas.map(([ruta, count], i) => {
                    const pct = (count / (topRutas[0][1])) * 100
                    return (
                      <div key={ruta}>
                        <div className="flex justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#9ca3af] w-4">{i+1}</span>
                            <span className="text-[13px] text-[#374151] truncate max-w-[200px]">{ruta}</span>
                          </div>
                          <span className="text-[13px] font-semibold text-[#111827]">{count}</span>
                        </div>
                        <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden ml-6">
                          <div className="h-full bg-[#111827] rounded-full" style={{width:`${pct}%`}} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
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