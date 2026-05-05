import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  BusFront,
  FileText,
  Settings,
  Users,
  ChevronRight,
  Mail,
  Phone,
} from "lucide-react"
import { LogoutButton } from "@/components/dashboard/LogoutButton"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

const relacionConfig: Record<string, { label: string; class: string }> = {
  potencial: { label: "🟡 Potencial", class: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" },
  activo: { label: "🟢 Activo", class: "bg-green-50 text-green-700 ring-1 ring-green-200" },
  recurrente: { label: "🔵 Recurrente", class: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  inactivo: { label: "⚫ Inactivo", class: "bg-gray-50 text-gray-600 ring-1 ring-gray-200" },
  perdido: { label: "🔴 Perdido", class: "bg-red-50 text-red-600 ring-1 ring-red-200" },
}

function formatDate(dateValue: string) {
  return new Date(dateValue).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric"
  })
}

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", session.user.id)
    .single()

  const companyId = userData?.company_id

  // Traer todas las solicitudes agrupadas por email
  const { data: requestsData } = await supabase
    .from("quote_requests")
    .select("requester_name, requester_email, requester_phone, created_at, status, final_price, estimated_price")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  const requests = requestsData ?? []

  // Traer relaciones comerciales
  const { data: clientesData } = await supabase
    .from("clientes")
    .select("email, estado_relacion, notas")
    .eq("company_id", companyId)

  const relacionMap = new Map(
    (clientesData ?? []).map((c) => [c.email, c])
  )

  // Agrupar por email
  const clientesMap = new Map<string, {
    nombre: string
    email: string
    telefono: string
    totalSolicitudes: number
    aceptadas: number
    totalFacturado: number
    ultimaActividad: string
    estado: string | null
  }>()

  requests.forEach((r) => {
    if (!clientesMap.has(r.requester_email)) {
      clientesMap.set(r.requester_email, {
        nombre: r.requester_name,
        email: r.requester_email,
        telefono: r.requester_phone ?? "",
        totalSolicitudes: 0,
        aceptadas: 0,
        totalFacturado: 0,
        ultimaActividad: r.created_at,
        estado: relacionMap.get(r.requester_email)?.estado_relacion ?? null,
      })
    }
    const c = clientesMap.get(r.requester_email)!
    c.totalSolicitudes++
    if (r.status === "aceptado") {
      c.aceptadas++
      c.totalFacturado += r.final_price ?? r.estimated_price ?? 0
    }
    if (r.created_at > c.ultimaActividad) c.ultimaActividad = r.created_at
  })

  const clientes = Array.from(clientesMap.values())
    .sort((a, b) => b.ultimaActividad.localeCompare(a.ultimaActividad))

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
            <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">
              <FileText className="size-4" /> Solicitudes
            </Link>
            <Link href="/dashboard/clientes" className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/10 text-white text-sm font-medium">
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
          <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">

            <div>
              <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
              <p className="text-sm text-slate-400 mt-0.5">{clientes.length} cliente{clientes.length !== 1 ? "s" : ""} en total</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Contacto</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Relación</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Solicitudes</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Facturado</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Última actividad</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {clientes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="size-8 text-slate-200" />
                          <p className="text-sm font-medium text-slate-400">No hay clientes todavía</p>
                          <p className="text-xs text-slate-300">Aparecerán aquí cuando recibas solicitudes</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    clientes.map((cliente) => {
                      const rel = cliente.estado ? relacionConfig[cliente.estado] : null
                      return (
                        <tr key={cliente.email} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">{cliente.nombre}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{cliente.email}</p>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                              {cliente.telefono && (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                  <Phone className="size-3" /> {cliente.telefono}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Mail className="size-3" /> {cliente.email}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {rel ? (
                              <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${rel.class}`}>
                                {rel.label}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">Sin clasificar</span>
                            )}
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <p className="text-sm font-semibold text-slate-800">{cliente.totalSolicitudes}</p>
                            <p className="text-xs text-slate-400">{cliente.aceptadas} aceptadas</p>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <p className="text-sm font-semibold text-slate-800">
                              {cliente.totalFacturado > 0 ? `${cliente.totalFacturado.toLocaleString("es-ES")} €` : "—"}
                            </p>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <p className="text-xs text-slate-400">{formatDate(cliente.ultimaActividad)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <Link
                              href={`/dashboard?q=${encodeURIComponent(cliente.email)}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#1e3a5f] hover:text-[#1e3a5f]/70 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Ver solicitudes <ChevronRight className="size-3" />
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
        </main>
      </div>
    </div>
  )
}