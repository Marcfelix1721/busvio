"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import {
  Search, Plus, Phone, Mail, ChevronRight, X, AlertTriangle, Users,
} from "lucide-react"
import {
  Staff, ConductorStats, ESTADOS, estadoInfo, avatarColor, iniciales, fechaRelativa,
} from "@/lib/staff"

const FONT = "'DM Sans', system-ui, sans-serif"

export function ConductoresList({ initialConductores, stats, expiringIds, companyId }: {
  initialConductores: Staff[]
  stats: Record<string, ConductorStats>
  expiringIds: string[]
  companyId: string
}) {
  const supabase = createClient()
  const [conductores, setConductores] = useState<Staff[]>(initialConductores)
  const [search, setSearch] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [hover, setHover] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", estado: "disponible" })

  const expiring = useMemo(() => new Set(expiringIds), [expiringIds])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return conductores.filter(c => {
      if (filterEstado !== "todos") {
        const e = c.estado === "activo" ? "disponible" : c.estado
        if (e !== filterEstado) return false
      }
      if (!s) return true
      return [c.nombre, c.email, c.telefono, c.dni].some(v => (v ?? "").toLowerCase().includes(s))
    })
  }, [conductores, search, filterEstado])

  const handleAdd = async () => {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return }
    setSaving(true); setError("")
    const payload = {
      company_id: companyId,
      nombre: form.nombre.trim(),
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      rol: "conductor",
      estado: form.estado,
    }
    const { data, error } = await supabase.from("staff").insert(payload).select("*").single()
    setSaving(false)
    if (error) { setError(error.message); return }
    setConductores(prev => [data as Staff, ...prev])
    setShowAdd(false)
    setForm({ nombre: "", email: "", telefono: "", estado: "disponible" })
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: FONT, height: 42, width: "100%", borderRadius: 10, border: "1px solid #e5e7eb",
    background: "#fafafa", padding: "0 14px", fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box",
  }

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Barra superior */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search style={{ width: 16, height: 16, color: "#9ca3af", position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input placeholder="Buscar conductor..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, width: 240, paddingLeft: 36, background: "#fff" }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["todos", ...ESTADOS].map(e => {
              const active = filterEstado === e
              const label = e === "todos" ? "Todos" : estadoInfo(e).label
              return (
                <button key={e} onClick={() => setFilterEstado(e)} style={{
                  fontFamily: FONT, height: 34, padding: "0 14px", borderRadius: 8, border: "1px solid #e5e7eb",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: active ? "#1e3a5f" : "#fff", color: active ? "#fff" : "#6b7280",
                }}>{label}</button>
              )
            })}
          </div>
        </div>
        <button onClick={() => { setShowAdd(true); setError("") }} style={{
          display: "flex", alignItems: "center", gap: 7, height: 42, padding: "0 18px", borderRadius: 10, border: "none",
          background: "#111827", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
        }}>
          <Plus style={{ width: 16, height: 16 }} /> Añadir conductor
        </button>
      </div>

      {/* Grid de cards */}
      {filtered.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #eef0f3", borderRadius: 16, padding: "56px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Users style={{ width: 24, height: 24, color: "#9ca3af" }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 4px" }}>
            {conductores.length === 0 ? "Sin conductores todavía" : "Ningún conductor coincide"}
          </p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            {conductores.length === 0 ? "Añade tu primer conductor para empezar" : "Prueba con otra búsqueda o filtro"}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
          {filtered.map(c => {
            const est = estadoInfo(c.estado)
            const st = stats[c.id] ?? { serviciosMes: 0, horasMes: 0, ultimoServicio: null, serviciosTotales: 0, horasTotales: 0, kmTotales: 0 }
            const tieneAlerta = expiring.has(c.id)
            const isHover = hover === c.id
            return (
              <div key={c.id}
                onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(null)}
                style={{
                  background: "#fff", border: "1px solid #eef0f3", borderRadius: 18, padding: 20,
                  boxShadow: isHover ? "0 8px 24px rgba(16,24,40,0.10)" : "0 1px 2px rgba(16,24,40,0.05)",
                  transform: isHover ? "translateY(-2px)" : "none", transition: "all 0.18s ease",
                }}>
                {/* cabecera */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                  <Avatar staff={c} size={52} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nombre}</p>
                    {c.email && <p style={{ fontSize: 12.5, color: "#6b7280", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</p>}
                    {c.telefono && <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "1px 0 0" }}>{c.telefono}</p>}
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: est.bg, color: est.text, whiteSpace: "nowrap", flexShrink: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: est.dot }} /> {est.label}
                  </span>
                </div>

                {tieneAlerta && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "7px 11px", marginBottom: 14 }}>
                    <AlertTriangle style={{ width: 14, height: 14, color: "#dc2626", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>Documento por vencer</span>
                  </div>
                )}

                {/* mini KPIs */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                  <MiniKpi label="Servicios mes" value={String(st.serviciosMes)} />
                  <MiniKpi label="Horas mes" value={`${st.horasMes}h`} />
                  <MiniKpi label="Último" value={fechaRelativa(st.ultimoServicio)} />
                </div>

                {/* acciones */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Link href={`/dashboard/conductores/${c.id}`} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: 9,
                    background: "#1e3a5f", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none",
                  }}>
                    Ver ficha <ChevronRight style={{ width: 14, height: 14 }} />
                  </Link>
                  <IconBtn href={c.telefono ? `tel:${c.telefono}` : undefined} title="Llamar"><Phone style={{ width: 15, height: 15 }} /></IconBtn>
                  <IconBtn href={c.email ? `mailto:${c.email}` : undefined} title="Email"><Mail style={{ width: 15, height: 15 }} /></IconBtn>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal añadir conductor */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 460, padding: 24, fontFamily: FONT }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>Añadir conductor</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X style={{ width: 20, height: 20 }} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Nombre completo *">
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Juan García López" style={inputStyle} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="conductor@email.com" style={inputStyle} />
              </Field>
              <Field label="Teléfono">
                <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+34 600 000 000" style={inputStyle} />
              </Field>
              <Field label="Estado">
                <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                  {ESTADOS.map(e => <option key={e} value={e}>{estadoInfo(e).label}</option>)}
                </select>
              </Field>
            </div>
            {error && <p style={{ fontSize: 13, color: "#dc2626", margin: "12px 0 0" }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowAdd(false)} style={{ height: 40, padding: "0 16px", borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: FONT }}>Cancelar</button>
              <button onClick={handleAdd} disabled={saving} style={{ height: 40, padding: "0 18px", borderRadius: 9, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: FONT }}>
                {saving ? "Guardando..." : "Añadir conductor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Avatar({ staff, size }: { staff: { nombre: string; photo_url: string | null }; size: number }) {
  if (staff.photo_url) {
    return <img src={staff.photo_url} alt={staff.nombre} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #eef0f3" }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: avatarColor(staff.nombre), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.36 }}>{iniciales(staff.nombre)}</span>
    </div>
  )
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
      <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
      <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "3px 0 0", fontWeight: 500 }}>{label}</p>
    </div>
  )
}

function IconBtn({ href, title, children }: { href?: string; title: string; children: React.ReactNode }) {
  const style: React.CSSProperties = {
    width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff",
    color: href ? "#1e3a5f" : "#d1d5db", cursor: href ? "pointer" : "not-allowed", textDecoration: "none",
  }
  if (!href) return <span title={title} style={style}>{children}</span>
  return <a href={href} title={title} style={style}>{children}</a>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{label}</label>
      {children}
    </div>
  )
}
