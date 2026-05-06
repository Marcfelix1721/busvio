import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  BusFront, FileText, Settings, Users,
  ChevronRight, Mail, Phone, BarChart3,
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

const relacionConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  potencial:  { label: "Potencial",  dot: "bg-amber-400",   bg: "bg-amber-50",   text: "text-amber-700" },
  activo:     { label: "Activo",     dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  recurrente: { label: "Recurrente", dot: "bg-blue-500",    bg: "bg-blue-50",    text: "text-blue-700" },
  inactivo:   { label: "Inactivo",   dot: "bg-zinc-400",    bg: "bg-zinc-50",    text: "text-zinc-600" },
  perdido:    { label: "Perdido",    dot: "bg-rose-500",    bg: "bg-rose-50",    text: "text-rose-600" },
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
    .select("requester_name, requester_email, requester_phone, created_at, status, final_price, estimated_price, trip_date")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  const { data: clientesData } = await supabase
    .from("clientes").select("email, estado_relacion").eq("company_id", companyId)

  const relacionMap = new Map((clientesData ?? []).map(c => [c.email, c.estado_relacion]))

  type ClienteRow = {
    nombre: string; email: string; telefono: string
    total: number; aceptadas: number; facturado: number
    ultima: string; estado: string | null
  }

  const map = new Map<string, ClienteRow>()
  ;(rawRequests ?? []).forEach(r => {
    if (!map.has(r.requester_email)) {
      map.set(r.requester_email, {
        nombre: r.requester_name, email: r.requester_email, telefono: r.requester_phone ?? "",
        total: 0, aceptadas: 0, facturado: 0, ultima: r.created_at,
        estado: relacionMap.get(r.requester_email) ?? null,
      })
    }
    const c = map.get(r.requester_email)!
    c.total++
    if (r.status === "aceptado") { c.aceptadas++; c.facturado += r.final_price ?? r.estimated_price ?? 0 }
    if (r.created_at > c.ultima) c.ultima = r.created_at
  })

  const clientes = Array.from(map.values()).sort((a, b) => b.ultima.localeCompare(a.ultima))

  const totalClientes = clientes.length
  const clientesActivos = clientes.filter(c => c.estado === "activo" || c.estado === "recurrente").length
  const totalFacturado = clientes.reduce((s, c) => s + c.facturado, 0)
  const sinClasificar = clientes.filter(c => !c.estado).length

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
          <SideLink href="/dashboard" icon={<BarChart3 className="size-3.5"/>} label="Dashboard" />
          <SideLink href="/dashboard/clientes" icon={<Users className="size-3.5"/>} label="Clientes" active />
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

          {/* HEADER */}
          <div>
            <h1 className="text-[22px] font-semibold text-[#111827] tracking-tight">Clientes</h1>
            <p className="text-[13px] text-[#9ca3af] mt-0.5">{totalClientes} cliente{totalClientes !== 1 ? "s" : ""} registrados</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <MiniKPI label="Total clientes" value={totalClientes} icon={<Users className="size-4 text-blue-600"/>} bg="bg-blue-50" />
            <MiniKPI label="Activos / Recurrentes" value={clientesActivos} icon={<ChevronRight className="size-4 text-emerald-600"/>} bg="bg-emerald-50" />
            <MiniKPI label="Facturado total" value={`${totalFacturado.toLocaleString("es-ES")} €`} icon={<FileText className="size-4 text-violet-600"/>} bg="bg-violet-50" />
            <MiniKPI label="Sin clasificar" value={sinClasificar} icon={<Settings className="size-4 text-amber-600"/>} bg="bg-amber-50" />
          </div>

          {/* TABLA */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#f3f4f6]">
              <p className="text-sm font-semibold text-[#111827]">Todos los clientes</p>
              <p className="text-xs text-[#9ca3af] mt-0.5">Ordenados por última actividad</p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f3f4f6] bg-[#fafafa]">
                  {["Cliente","Contacto","Relación","Solicitudes","Facturado","Última actividad",""].map((h,i) => (
                    <th key={i} className={`px-5 py-2.5 text-left text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider ${
                      i===1?"hidden md:table-cell":i===3||i===4||i===5?"hidden lg:table-cell":""
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-[#f3f4f6] rounded-full flex items-center justify-center">
                        <Users className="size-5 text-[#d1d5db]" />
                      </div>
                      <p className="text-sm text-[#9ca3af] font-medium">Sin clientes todavía</p>
                      <p className="text-xs text-[#d1d5db]">Aparecerán cuando recibas solicitudes</p>
                    </div>
                  </td></tr>
                ) : clientes.map(c => {
                  const rel = c.estado ? relacionConfig[c.estado] : null
                  const tasaC = c.total > 0 ? Math.round((c.aceptadas / c.total) * 100) : 0
                  return (
                    <tr key={c.email} className="border-b border-[#f9fafb] hover:bg-[#fafafa] transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#f3f4f6] rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-[#6b7280]">{c.nombre.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-[#111827] text-[13px]">{c.nombre}</p>
                            <p className="text-xs text-[#9ca3af]">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="space-y-0.5">
                          {c.telefono && (
                            <p className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                              <Phone className="size-3 text-[#9ca3af]"/> {c.telefono}
                            </p>
                          )}
                          <p className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
                            <Mail className="size-3"/> {c.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {rel ? (
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${rel.bg} ${rel.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${rel.dot}`}></span>
                            {rel.label}
                          </span>
                        ) : (
                          <span className="text-xs text-[#d1d5db] italic">Sin clasificar</span>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-[13px] font-semibold text-[#111827]">{c.total}</p>
                        <p className="text-xs text-[#9ca3af]">{tasaC}% aceptadas</p>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-[13px] font-semibold text-[#111827]">
                          {c.facturado > 0 ? `${c.facturado.toLocaleString("es-ES")} €` : "—"}
                        </p>
                        {c.aceptadas > 0 && <p className="text-xs text-[#9ca3af]">{c.aceptadas} servicio{c.aceptadas!==1?"s":""}</p>}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-xs text-[#9ca3af]">{fmt(c.ultima)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/dashboard?q=${encodeURIComponent(c.email)}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#111827] opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-600">
                          Ver <ChevronRight className="size-3"/>
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

function MiniKPI({ label, value, icon, bg }: { label: string; value: string | number; icon: ReactNode; bg: string }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div>
        <p className="text-lg font-bold text-[#111827] leading-none">{value}</p>
        <p className="text-[11px] text-[#9ca3af] mt-0.5">{label}</p>
      </div>
    </div>
  )
}