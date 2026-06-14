"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import {
  Building2, Plus, TrendingUp, Users, FileText, LayoutDashboard,
  BarChart3, Settings, Send, ArrowUpRight, ArrowDownRight, Search,
  MoreVertical, ExternalLink, Eye, Pencil, Ban, LogOut, Power, X,
} from "lucide-react"
import Link from "next/link"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts"

type Company = {
  id: string
  name: string
  slug: string
  email: string
  created_at: string
  phone?: string
  cif?: string
  address?: string
  last_login?: string | null
  active?: boolean | null
}

type Quote = {
  id: string
  company_id: string
  status: "nuevo" | "en_revision" | "enviado" | "aceptado" | "rechazado" | "cancelado"
  created_at: string
  updated_at: string
  requester_name: string | null
  origin: string | null
  destination: string | null
  final_price: number | null
  estimated_price: number | null
}

const SENT_STATUSES = ["enviado", "aceptado", "rechazado"]

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  nuevo:       { label: "Nuevo",       bg: "#eff6ff", text: "#2563eb" },
  en_revision: { label: "En revisión", bg: "#fffbeb", text: "#b45309" },
  enviado:     { label: "Enviado",     bg: "#ecfeff", text: "#0e7490" },
  aceptado:    { label: "Aceptado",    bg: "#f0fdf4", text: "#15803d" },
  rechazado:   { label: "Rechazado",   bg: "#fef2f2", text: "#dc2626" },
  cancelado:   { label: "Cancelado",   bg: "#f3f4f6", text: "#6b7280" },
}

// ---------- helpers ----------

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function monthsAgo(base: Date, n: number) { return new Date(base.getFullYear(), base.getMonth() - n, 1) }

function inSameMonth(dateStr: string, ref: Date) {
  const d = new Date(dateStr)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null
  return Math.round(((curr - prev) / prev) * 100)
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "ahora mismo"
  if (min < 60) return `hace ${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `hace ${d}d`
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Buenos días"
  if (h < 20) return "Buenas tardes"
  return "Buenas noches"
}

// "Autocares García Hermanos S.L." -> "autocares-garcia-hermanos-sl"
function slugify(str: string): string {
  return str
    .normalize("NFD").replace(/\p{Diacritic}/gu, "") // quita acentos (á→a, é→e, ñ→n)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")  // elimina caracteres especiales (puntos, etc.)
    .trim()
    .replace(/[\s_]+/g, "-")        // espacios → guion medio
    .replace(/-+/g, "-")            // colapsa guiones duplicados
    .replace(/^-+|-+$/g, "")        // quita guiones al inicio/final
}

// Devuelve un slug que no colisione con los existentes (añade -2, -3, ...)
function uniqueSlug(base: string, taken: Set<string>): string {
  if (!base) return base
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

const NAV = [
  { key: "dashboard",   label: "Dashboard",            icon: LayoutDashboard },
  { key: "empresas",    label: "Empresas",             icon: Building2 },
  { key: "solicitudes", label: "Solicitudes globales", icon: FileText },
  { key: "metricas",    label: "Métricas",             icon: BarChart3 },
  { key: "config",      label: "Configuración",        icon: Settings },
] as const

type ViewKey = (typeof NAV)[number]["key"]

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eef0f3",
  borderRadius: 16,
  boxShadow: "0 1px 2px rgba(16,24,40,0.05)",
}

export default function AdminPanel() {
  const supabase = createClient()
  const [companies, setCompanies] = useState<Company[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [adminEmail, setAdminEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewKey>("dashboard")
  const [search, setSearch] = useState("")
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [slugManual, setSlugManual] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    slug: "",
    phone: "",
    cif: "",
    address: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.email) setAdminEmail(session.user.email)

    // Cargar empresas
    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, name, slug, email, created_at, phone, cif, address, last_login, active")
      .order("created_at", { ascending: false })

    if (companiesData) setCompanies(companiesData)

    // Cargar solicitudes globales (KPIs, gráfico y actividad) vía service role:
    // el RLS de quote_requests acota la lectura a la empresa dueña / conductores,
    // así que el admin las lee a través de /api/admin/quotes-overview.
    const quotesRes = await fetch("/api/admin/quotes-overview", {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    if (quotesRes.ok) {
      const { quotes } = await quotesRes.json()
      setQuotes((quotes ?? []) as Quote[])
    }

    setLoading(false)
  }

  // ---------- métricas derivadas ----------
  const metrics = useMemo(() => {
    const now = new Date()
    const thisMonth = startOfMonth(now)
    const lastMonth = monthsAgo(now, 1)

    const companiesThis = companies.filter(c => inSameMonth(c.created_at, thisMonth)).length
    const companiesLast = companies.filter(c => inSameMonth(c.created_at, lastMonth)).length

    const activeThisSet = new Set<string>()
    const activeLastSet = new Set<string>()
    for (const q of quotes) {
      const ref = q.updated_at || q.created_at
      if (inSameMonth(ref, thisMonth)) activeThisSet.add(q.company_id)
      if (inSameMonth(ref, lastMonth)) activeLastSet.add(q.company_id)
    }

    const quotesThis = quotes.filter(q => inSameMonth(q.created_at, thisMonth)).length
    const quotesLast = quotes.filter(q => inSameMonth(q.created_at, lastMonth)).length

    const sent = quotes.filter(q => SENT_STATUSES.includes(q.status))
    const sentThis = sent.filter(q => inSameMonth(q.updated_at || q.created_at, thisMonth)).length
    const sentLast = sent.filter(q => inSameMonth(q.updated_at || q.created_at, lastMonth)).length

    return {
      totalCompanies: companies.length,
      companiesTrend: pctChange(companiesThis, companiesLast),
      activeThisMonth: activeThisSet.size,
      activeTrend: pctChange(activeThisSet.size, activeLastSet.size),
      totalQuotes: quotes.length,
      quotesTrend: pctChange(quotesThis, quotesLast),
      sent: sent.length,
      sentTrend: pctChange(sentThis, sentLast),
      activeThisSet,
    }
  }, [companies, quotes])

  // ---------- gráfico: empresas registradas por mes (6 meses) ----------
  const growthData = useMemo(() => {
    const now = new Date()
    const data: { month: string; empresas: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const ref = monthsAgo(now, i)
      const count = companies.filter(c => inSameMonth(c.created_at, ref)).length
      data.push({
        month: ref.toLocaleDateString("es-ES", { month: "short" }).replace(".", ""),
        empresas: count,
      })
    }
    return data
  }, [companies])

  // ---------- datos por empresa ----------
  const companyInfo = useMemo(() => {
    const now = new Date()
    const thisMonth = startOfMonth(now)
    const map: Record<string, { thisMonth: number; active: boolean }> = {}
    for (const c of companies) map[c.id] = { thisMonth: 0, active: false }
    for (const q of quotes) {
      const info = map[q.company_id]
      if (!info) continue
      const ref = q.updated_at || q.created_at
      if (inSameMonth(q.created_at, thisMonth)) info.thisMonth++
      if (inSameMonth(ref, thisMonth)) info.active = true
    }
    return map
  }, [companies, quotes])

  const companyName = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of companies) m[c.id] = c.name
    return m
  }, [companies])

  // ---------- actividad reciente ----------
  const activity = useMemo(() => {
    const verb = (q: Quote) => {
      const name = companyName[q.company_id] || "Una empresa"
      const price = q.final_price ?? q.estimated_price
      switch (q.status) {
        case "nuevo": return `${name} recibió una nueva solicitud`
        case "en_revision": return `${name} está revisando una solicitud`
        case "enviado": return `${name} envió un presupuesto${price ? ` de ${price.toLocaleString("es-ES")}€` : ""}`
        case "aceptado": return `${name} cerró un presupuesto${price ? ` de ${price.toLocaleString("es-ES")}€` : ""}`
        case "rechazado": return `${name} tuvo un presupuesto rechazado`
        case "cancelado": return `${name} canceló una solicitud`
        default: return `${name} actualizó una solicitud`
      }
    }
    return [...quotes]
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 8)
      .map(q => ({ id: q.id, text: verb(q), status: q.status, ts: q.updated_at || q.created_at }))
  }, [quotes, companyName])

  const filteredCompanies = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return companies
    return companies.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.slug.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s)
    )
  }, [companies, search])

  // ---------- lógica original (sin tocar) ----------
  async function handleCreateCompany() {
    if (!formData.name || !formData.email || !formData.password || !formData.slug) {
      alert("Rellena al menos: nombre, email, contraseña y slug")
      return
    }
    setCreating(true)
    try {
      // Generar un slug único: parte del slug actual (o del nombre) y verifica
      // colisiones en la BD, añadiendo -2, -3, ... si ya existe.
      const { data: existingSlugs } = await supabase.from("companies").select("slug")
      const taken = new Set((existingSlugs ?? []).map(c => c.slug))
      const finalSlug = uniqueSlug(slugify(formData.slug || formData.name), taken)

      const { data: { session } } = await supabase.auth.getSession()
      // ===== TEMP DIAGNÓSTICO (eliminar tras diagnosticar el 403) =====
      console.log("[DIAG admin] sesión?", !!session,
        "| tokenLen:", session?.access_token?.length ?? 0,
        "| email sesión:", session?.user?.email ?? null)
      // ===== FIN TEMP DIAGNÓSTICO =====
      const response = await fetch("/api/admin/crear-empresa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ ...formData, slug: finalSlug }),
      })
      const result = await response.json()
      if (!response.ok) {
        alert("Error al crear empresa: " + (result.error || "Error desconocido"))
        setCreating(false)
        return
      }
      alert("Empresa creada correctamente")
      setShowCreateForm(false)
      setSlugManual(false)
      setFormData({ name: "", email: "", password: "", slug: "", phone: "", cif: "", address: "" })
      loadData()
    } catch (err) {
      console.error(err)
      alert("Error al crear empresa")
    }
    setCreating(false)
  }

  async function impersonateCompany(companyId: string) {
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      })
      const result = await response.json()
      if (!response.ok) {
        alert("Error al acceder: " + (result.error || "Error desconocido"))
        return
      }
      window.location.href = "/dashboard"
    } catch (err) {
      console.error(err)
      alert("Error al acceder como empresa")
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Cargando panel de administración...</p>
      </div>
    )
  }

  const today = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  const kpis = [
    { label: "Total empresas", value: metrics.totalCompanies, trend: metrics.companiesTrend, icon: Building2, color: "#1e3a5f", light: "#eef2f7" },
    { label: "Empresas activas este mes", value: metrics.activeThisMonth, trend: metrics.activeTrend, icon: Users, color: "#0891b2", light: "#ecfeff" },
    { label: "Total solicitudes", value: metrics.totalQuotes, trend: metrics.quotesTrend, icon: FileText, color: "#7c3aed", light: "#f5f3ff" },
    { label: "Presupuestos enviados", value: metrics.sent, trend: metrics.sentTrend, icon: Send, color: "#d97706", light: "#fffbeb" },
  ]

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ===================== SIDEBAR ===================== */}
      <aside style={{ width: 240, flexShrink: 0, background: "#0f172a", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "22px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 42, height: 42, background: "#fff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FlotaFlyLogo size={34} />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0, letterSpacing: "-0.01em" }}>
              <FlotaFlyWordmark flotaColor="#fff" />
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, margin: "1px 0 0" }}>Panel Superadmin</p>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map(item => {
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => { setView(item.key); setOpenMenu(null) }}
                style={{
                  display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 9,
                  border: "none", cursor: "pointer", width: "100%", textAlign: "left",
                  fontSize: 13.5, fontWeight: 500, fontFamily: "inherit",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.5)",
                  transition: "all 0.15s",
                }}
              >
                <item.icon style={{ width: 17, height: 17 }} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{adminEmail?.[0]?.toUpperCase() || "A"}</span>
            </div>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminEmail}</p>
          </div>
          <Link href="/dashboard" style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7, height: 36, borderRadius: 8,
            background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", fontSize: 12.5, fontWeight: 600,
            textDecoration: "none", marginBottom: 8,
          }}>
            <ExternalLink style={{ width: 13, height: 13 }} /> Volver a Dashboard
          </Link>
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7, height: 36, width: "100%", borderRadius: 8,
            background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)",
            fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            <LogOut style={{ width: 13, height: 13 }} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ===================== MAIN ===================== */}
      <main style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 36px 56px" }}>

          {/* HEADER GREETING */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 25, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.025em" }}>
              {greeting()}, Marc 👋
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "5px 0 0" }}>
              Resumen general de <FlotaFlyWordmark /> · <span style={{ textTransform: "capitalize" }}>{today}</span>
            </p>
          </div>

          {/* ===== DASHBOARD VIEW ===== */}
          {view === "dashboard" && (
            <>
              <KpiRow kpis={kpis} />
              <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 20, marginBottom: 22 }}>
                <GrowthChart data={growthData} />
                <RecentActivity items={activity} />
              </div>
              <CompaniesTable
                companies={filteredCompanies}
                companyInfo={companyInfo}
                search={search} setSearch={setSearch}
                openMenu={openMenu} setOpenMenu={setOpenMenu}
                onImpersonate={impersonateCompany}
                showCreate={showCreateForm} setShowCreate={setShowCreateForm}
                formData={formData} setFormData={setFormData}
                creating={creating} onCreate={handleCreateCompany}
                slugManual={slugManual} setSlugManual={setSlugManual}
                reload={loadData}
              />
            </>
          )}

          {/* ===== EMPRESAS VIEW ===== */}
          {view === "empresas" && (
            <CompaniesTable
              companies={filteredCompanies}
              companyInfo={companyInfo}
              search={search} setSearch={setSearch}
              openMenu={openMenu} setOpenMenu={setOpenMenu}
              onImpersonate={impersonateCompany}
              showCreate={showCreateForm} setShowCreate={setShowCreateForm}
              formData={formData} setFormData={setFormData}
              creating={creating} onCreate={handleCreateCompany}
              slugManual={slugManual} setSlugManual={setSlugManual}
              reload={loadData}
            />
          )}

          {/* ===== SOLICITUDES GLOBALES VIEW ===== */}
          {view === "solicitudes" && (
            <GlobalQuotes quotes={quotes} companyName={companyName} />
          )}

          {/* ===== MÉTRICAS VIEW ===== */}
          {view === "metricas" && (
            <>
              <KpiRow kpis={kpis} />
              <GrowthChart data={growthData} />
            </>
          )}

          {/* ===== CONFIG VIEW ===== */}
          {view === "config" && (
            <div style={{ ...CARD, padding: "40px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Settings style={{ width: 22, height: 22, color: "#9ca3af" }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 4px" }}>Configuración</p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Ajustes globales de la plataforma · próximamente</p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

// ===================== SUB-COMPONENTES =====================

function KpiRow({ kpis }: { kpis: { label: string; value: number; trend: number | null; icon: any; color: string; light: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 22 }}>
      {kpis.map((k, i) => {
        const up = k.trend != null && k.trend >= 0
        return (
          <div key={i} style={{ ...CARD, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: k.light, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <k.icon style={{ width: 18, height: 18, color: k.color }} />
              </div>
            </div>
            <p style={{ fontSize: 30, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>{k.value}</p>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "#6b7280", margin: "8px 0 8px" }}>{k.label}</p>
            {k.trend == null ? (
              <span style={{ fontSize: 11.5, color: "#9ca3af" }}>Sin datos del mes anterior</span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: up ? "#15803d" : "#dc2626" }}>
                {up ? <ArrowUpRight style={{ width: 13, height: 13 }} /> : <ArrowDownRight style={{ width: 13, height: 13 }} />}
                {Math.abs(k.trend)}% <span style={{ color: "#9ca3af", fontWeight: 500 }}>vs mes anterior</span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function GrowthChart({ data }: { data: { month: string; empresas: number }[] }) {
  return (
    <div style={{ ...CARD, padding: "22px 24px" }}>
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Crecimiento de empresas</p>
        <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "2px 0 0" }}>Empresas registradas · últimos 6 meses</p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 16, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickMargin={10} style={{ textTransform: "capitalize" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
            contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12, fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
            labelStyle={{ color: "#6b7280", textTransform: "capitalize" }}
            formatter={(value) => [String(value), "Empresas"]}
          />
          <Line type="monotone" dataKey="empresas" stroke="#0891b2" strokeWidth={2.5} dot={{ r: 4, fill: "#0891b2", strokeWidth: 0 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function RecentActivity({ items }: { items: { id: string; text: string; status: string; ts: string }[] }) {
  return (
    <div style={{ ...CARD, padding: "22px 24px", display: "flex", flexDirection: "column" }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Actividad reciente</p>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Sin actividad todavía</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map(it => {
            const cfg = statusConfig[it.status] || statusConfig.nuevo
            return (
              <div key={it.id} style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.text, marginTop: 6, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.45 }}>{it.text}</p>
                  <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "2px 0 0" }}>{relativeTime(it.ts)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CompaniesTable(props: {
  companies: Company[]
  companyInfo: Record<string, { thisMonth: number; active: boolean }>
  search: string; setSearch: (v: string) => void
  openMenu: string | null; setOpenMenu: (v: string | null) => void
  onImpersonate: (id: string) => void
  showCreate: boolean; setShowCreate: (v: boolean) => void
  formData: { name: string; email: string; password: string; slug: string; phone: string; cif: string; address: string }
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; email: string; password: string; slug: string; phone: string; cif: string; address: string }>>
  creating: boolean; onCreate: () => void
  slugManual: boolean; setSlugManual: (v: boolean) => void
  reload: () => void
}) {
  const { companies, companyInfo, search, setSearch, openMenu, setOpenMenu, onImpersonate, showCreate, setShowCreate, formData, setFormData, creating, onCreate, slugManual, setSlugManual, reload } = props
  const supabase = createClient()

  const th: React.CSSProperties = { padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }
  const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, color: "#374151", verticalAlign: "middle" }
  const inputStyle: React.CSSProperties = { height: 38, border: "1px solid #e5e7eb", borderRadius: 8, padding: "0 12px", fontSize: 13, fontFamily: "'DM Sans', system-ui, sans-serif", outline: "none" }

  // Editar empresa
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", cif: "", address: "" })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const openEdit = (c: Company) => {
    setEditCompany(c)
    setEditForm({ name: c.name, email: c.email, phone: c.phone ?? "", cif: c.cif ?? "", address: c.address ?? "" })
    setEditError(""); setOpenMenu(null)
  }
  const saveEdit = async () => {
    if (!editCompany) return
    if (!editForm.name.trim() || !editForm.email.trim()) { setEditError("Nombre y email son obligatorios"); return }
    setEditSaving(true); setEditError("")
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/editar-empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ companyId: editCompany.id, ...editForm }),
    })
    const data = await res.json()
    setEditSaving(false)
    if (!res.ok) { setEditError(data.error || "Error al guardar"); return }
    setEditCompany(null)
    reload()
  }

  // Desactivar / Reactivar
  const [confirmToggle, setConfirmToggle] = useState<{ company: Company; action: "desactivar" | "reactivar" } | null>(null)
  const [toggleBusy, setToggleBusy] = useState(false)
  const doToggle = async () => {
    if (!confirmToggle) return
    setToggleBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/editar-empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ companyId: confirmToggle.company.id, active: confirmToggle.action === "reactivar" }),
    })
    setToggleBusy(false)
    if (!res.ok) { alert("No se pudo actualizar la empresa"); return }
    setConfirmToggle(null)
    reload()
  }

  return (
    <>
    <div style={CARD}>
      {/* cabecera + búsqueda */}
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Empresas registradas</h2>
          <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "2px 0 0" }}>{companies.length} empresa{companies.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <Search style={{ width: 15, height: 15, color: "#9ca3af", position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input
              placeholder="Buscar empresa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 34, width: 220, background: "#f9fafb" }}
            />
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#111827", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif", whiteSpace: "nowrap" }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Crear empresa
          </button>
        </div>
      </div>

      {/* formulario crear empresa (lógica original intacta) */}
      {showCreate && (
        <div style={{ padding: "24px", background: "#f9fafb", borderBottom: "1px solid #f1f3f5" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Nueva empresa</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
            <input placeholder="Nombre de la empresa *" value={formData.name} onChange={e => { const name = e.target.value; setFormData(p => ({ ...p, name, slug: slugManual ? p.slug : slugify(name) })) }} style={inputStyle} />
            <input placeholder="Email *" type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
            <input placeholder="Contraseña *" type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} style={inputStyle} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  placeholder="slug-automatico"
                  value={formData.slug}
                  readOnly={!slugManual}
                  onChange={e => setFormData(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  style={{ ...inputStyle, flex: 1, background: slugManual ? "#fff" : "#f3f4f6", color: slugManual ? "#111827" : "#6b7280", cursor: slugManual ? "text" : "default" }}
                />
                <button
                  type="button"
                  onClick={() => setSlugManual(!slugManual)}
                  title={slugManual ? "Volver a automático" : "Editar manualmente"}
                  style={{ width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #e5e7eb", background: slugManual ? "#1e3a5f" : "#fff", color: slugManual ? "#fff" : "#6b7280", cursor: "pointer" }}
                >
                  <Pencil style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: "#9ca3af", margin: 0 }}>URL pública: flotafly.com/{formData.slug || "—"}</p>
            </div>
            <input placeholder="Teléfono" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} style={inputStyle} />
            <input placeholder="CIF" value={formData.cif} onChange={e => setFormData(p => ({ ...p, cif: e.target.value }))} style={inputStyle} />
            <input placeholder="Dirección" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} style={{ ...inputStyle, gridColumn: "1 / -1" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCreate} disabled={creating} style={{ padding: "9px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.6 : 1, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {creating ? "Creando..." : "Crear empresa"}
            </button>
            <button onClick={() => setShowCreate(false)} style={{ padding: "9px 16px", background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* tabla */}
      <div style={{ overflow: "visible" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafbfc", borderBottom: "1px solid #f1f3f5" }}>
              <th style={th}>Empresa</th>
              <th style={th}>Estado</th>
              <th style={{ ...th, textAlign: "center" }}>Solicitudes este mes</th>
              <th style={th}>Último acceso</th>
              <th style={{ ...th, textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => {
              const info = companyInfo[c.id] || { thisMonth: 0, active: false }
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #f4f5f7" }}>
                  <td style={td}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{c.name}</p>
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "1px 0 0" }}>flotafly.com/{c.slug}</p>
                  </td>
                  <td style={td}>
                    {c.active === false ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#f3f4f6", color: "#6b7280" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9ca3af" }} /> Desactivada
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: info.active ? "#f0fdf4" : "#f3f4f6", color: info.active ? "#15803d" : "#6b7280" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: info.active ? "#22c55e" : "#9ca3af" }} />
                        {info.active ? "Activa" : "Inactiva"}
                      </span>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "center", fontWeight: 600, color: info.thisMonth > 0 ? "#111827" : "#9ca3af" }}>{info.thisMonth}</td>
                  <td style={{ ...td, color: c.last_login ? "#6b7280" : "#9ca3af" }}>{c.last_login ? relativeTime(c.last_login) : "Nunca"}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, position: "relative" }}>
                      <button
                        onClick={() => onImpersonate(c.id)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif" }}
                      >
                        <ExternalLink style={{ width: 12, height: 12 }} /> Acceder
                      </button>
                      <button
                        onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                        style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, cursor: "pointer", color: "#6b7280" }}
                      >
                        <MoreVertical style={{ width: 15, height: 15 }} />
                      </button>
                      {openMenu === c.id && (
                        <>
                          <div onClick={() => setOpenMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
                          <div style={{ position: "absolute", right: 0, top: 36, zIndex: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(16,24,40,0.12)", padding: 6, minWidth: 168, textAlign: "left" }}>
                            <a href={`/${c.slug}`} target="_blank" rel="noreferrer" onClick={() => setOpenMenu(null)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7, fontSize: 13, color: "#374151", textDecoration: "none" }}>
                              <Eye style={{ width: 14, height: 14, color: "#6b7280" }} /> Ver detalle
                            </a>
                            <button onClick={() => openEdit(c)} style={menuBtn}>
                              <Pencil style={{ width: 14, height: 14, color: "#6b7280" }} /> Editar
                            </button>
                            {c.active === false ? (
                              <button onClick={() => { setOpenMenu(null); setConfirmToggle({ company: c, action: "reactivar" }) }} style={{ ...menuBtn, color: "#15803d" }}>
                                <Power style={{ width: 14, height: 14, color: "#15803d" }} /> Reactivar
                              </button>
                            ) : (
                              <button onClick={() => { setOpenMenu(null); setConfirmToggle({ company: c, action: "desactivar" }) }} style={{ ...menuBtn, color: "#dc2626" }}>
                                <Ban style={{ width: 14, height: 14, color: "#dc2626" }} /> Desactivar
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {companies.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>{search ? "Ninguna empresa coincide con la búsqueda" : "No hay empresas registradas todavía"}</p>
        </div>
      )}
    </div>

    {/* MODAL EDITAR EMPRESA */}
    {editCompany && (
      <div onClick={() => setEditCompany(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 480, padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>Editar empresa</h3>
            <button onClick={() => setEditCompany(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X style={{ width: 20, height: 20 }} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={editLabel}>Nombre de la empresa</label>
              <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div>
              <label style={editLabel}>Email de contacto</label>
              <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div>
              <label style={editLabel}>Teléfono</label>
              <input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div>
              <label style={editLabel}>CIF</label>
              <input value={editForm.cif} onChange={e => setEditForm(p => ({ ...p, cif: e.target.value }))} style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div>
              <label style={editLabel}>Dirección</label>
              <input value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} style={{ ...inputStyle, width: "100%" }} />
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "12px 0 0" }}>La URL pública (flotafly.com/{editCompany.slug}) no se puede cambiar.</p>
          {editError && <p style={{ fontSize: 13, color: "#dc2626", margin: "10px 0 0" }}>{editError}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => setEditCompany(null)} style={{ height: 40, padding: "0 16px", borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Cancelar</button>
            <button onClick={saveEdit} disabled={editSaving} style={{ height: 40, padding: "0 18px", borderRadius: 9, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: editSaving ? "not-allowed" : "pointer", opacity: editSaving ? 0.7 : 1, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {editSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL CONFIRMAR DESACTIVAR/REACTIVAR */}
    {confirmToggle && (
      <div onClick={() => setConfirmToggle(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: confirmToggle.action === "desactivar" ? "#fef2f2" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {confirmToggle.action === "desactivar"
                ? <Ban style={{ width: 20, height: 20, color: "#dc2626" }} />
                : <Power style={{ width: 20, height: 20, color: "#15803d" }} />}
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>
              {confirmToggle.action === "desactivar" ? "Desactivar empresa" : "Reactivar empresa"}
            </h3>
          </div>
          <p style={{ fontSize: 14, color: "#374151", margin: "0 0 20px", lineHeight: 1.55 }}>
            {confirmToggle.action === "desactivar"
              ? <>¿Seguro que quieres desactivar <strong>{confirmToggle.company.name}</strong>? No podrán acceder al panel ni recibirán nuevas solicitudes hasta que la reactives.</>
              : <>¿Reactivar <strong>{confirmToggle.company.name}</strong>? Volverá a tener acceso al panel y a recibir solicitudes.</>}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setConfirmToggle(null)} style={{ height: 38, padding: "0 16px", borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Cancelar</button>
            <button onClick={doToggle} disabled={toggleBusy} style={{ height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: confirmToggle.action === "desactivar" ? "#dc2626" : "#15803d", color: "#fff", fontSize: 13, fontWeight: 700, cursor: toggleBusy ? "not-allowed" : "pointer", opacity: toggleBusy ? 0.7 : 1, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {toggleBusy ? "Procesando..." : confirmToggle.action === "desactivar" ? "Desactivar" : "Reactivar"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

const editLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 500, color: "#6b7280", display: "block", marginBottom: 6 }

const menuBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7, fontSize: 13, color: "#374151",
  background: "transparent", border: "none", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
}

function GlobalQuotes({ quotes, companyName }: { quotes: Quote[]; companyName: Record<string, string> }) {
  const th: React.CSSProperties = { padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }
  const td: React.CSSProperties = { padding: "14px 20px", fontSize: 13, color: "#374151", verticalAlign: "middle" }
  const rows = [...quotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div style={CARD}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f3f5" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Solicitudes globales</h2>
        <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "2px 0 0" }}>{quotes.length} solicitud{quotes.length !== 1 ? "es" : ""} en toda la plataforma</p>
      </div>
      <div style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafbfc", borderBottom: "1px solid #f1f3f5" }}>
              <th style={th}>Empresa</th>
              <th style={th}>Solicitante</th>
              <th style={th}>Ruta</th>
              <th style={th}>Estado</th>
              <th style={{ ...th, textAlign: "right" }}>Importe</th>
              <th style={{ ...th, textAlign: "right" }}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(q => {
              const cfg = statusConfig[q.status] || statusConfig.nuevo
              const price = q.final_price ?? q.estimated_price
              return (
                <tr key={q.id} style={{ borderBottom: "1px solid #f4f5f7" }}>
                  <td style={{ ...td, fontWeight: 600, color: "#111827" }}>{companyName[q.company_id] || "—"}</td>
                  <td style={td}>{q.requester_name || "—"}</td>
                  <td style={{ ...td, color: "#6b7280" }}>{q.origin && q.destination ? `${q.origin} → ${q.destination}` : "—"}</td>
                  <td style={td}>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "#111827" }}>{price ? `${price.toLocaleString("es-ES")} €` : "—"}</td>
                  <td style={{ ...td, textAlign: "right", color: "#6b7280" }}>{new Date(q.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {quotes.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>No hay solicitudes todavía</p>
        </div>
      )}
    </div>
  )
}
