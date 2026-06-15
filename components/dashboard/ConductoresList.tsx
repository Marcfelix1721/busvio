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
import { COLORS, RADIUS, SHADOW, FONT_DISPLAY, FONT_BODY } from "@/lib/dashboard-ui"

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
  const [addHover, setAddHover] = useState(false)
  const [saveHover, setSaveHover] = useState(false)
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
    fontFamily: FONT_BODY, height: 42, width: "100%", borderRadius: RADIUS.md, border: `1px solid ${COLORS.border}`,
    background: COLORS.surfaceAlt, padding: "0 14px", fontSize: 14, color: COLORS.text, outline: "none", boxSizing: "border-box",
  }

  return (
    <div style={{ fontFamily: FONT_BODY }}>
      {/* Barra superior */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search style={{ width: 16, height: 16, color: COLORS.textFaint, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input type="text" name="conductores-busqueda" autoComplete="off" data-1p-ignore data-lpignore="true" placeholder="Buscar conductor..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, width: 240, paddingLeft: 36, background: COLORS.surface }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["todos", ...ESTADOS].map(e => {
              const active = filterEstado === e
              const label = e === "todos" ? "Todos" : estadoInfo(e).label
              return (
                <button key={e} onClick={() => setFilterEstado(e)} style={{
                  fontFamily: FONT_BODY, height: 34, padding: "0 14px", borderRadius: RADIUS.sm, border: `1px solid ${COLORS.border}`,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: active ? COLORS.navy : COLORS.surface, color: active ? "#fff" : COLORS.textMuted,
                }}>{label}</button>
              )
            })}
          </div>
        </div>
        <button onClick={() => { setShowAdd(true); setError("") }}
          onMouseEnter={() => setAddHover(true)} onMouseLeave={() => setAddHover(false)}
          style={{
          display: "flex", alignItems: "center", gap: 7, height: 42, padding: "0 18px", borderRadius: RADIUS.md, border: "none",
          background: addHover ? COLORS.teal : COLORS.navy, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY, whiteSpace: "nowrap", transition: "background 0.15s",
        }}>
          <Plus style={{ width: 16, height: 16 }} /> Añadir conductor
        </button>
      </div>

      {/* Grid de cards */}
      {filtered.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, padding: "56px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: COLORS.navySoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Users style={{ width: 23, height: 23, color: COLORS.navy }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, margin: "0 0 4px" }}>
            {conductores.length === 0 ? "Sin conductores todavía" : "Ningún conductor coincide"}
          </p>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
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
                  background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, padding: 20,
                  boxShadow: isHover ? SHADOW.lifted : SHADOW.card,
                  transform: isHover ? "translateY(-2px)" : "none", transition: "all 0.18s ease",
                }}>
                {/* cabecera */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                  <Avatar staff={c} size={52} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: COLORS.navy, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nombre}</p>
                    {c.email && <p style={{ fontSize: 12.5, color: COLORS.textMuted, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</p>}
                    {c.telefono && <p style={{ fontSize: 12.5, color: COLORS.textFaint, margin: "1px 0 0" }}>{c.telefono}</p>}
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: est.bg, color: est.text, whiteSpace: "nowrap", flexShrink: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: est.dot }} /> {est.label}
                  </span>
                </div>

                {tieneAlerta && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.dangerSoft, border: `1px solid ${COLORS.danger}`, borderRadius: RADIUS.sm, padding: "7px 11px", marginBottom: 14 }}>
                    <AlertTriangle style={{ width: 14, height: 14, color: COLORS.danger, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.danger }}>Documento por vencer</span>
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
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: RADIUS.sm,
                    background: COLORS.navy, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none",
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
          <div onClick={e => e.stopPropagation()} style={{ background: COLORS.surface, borderRadius: RADIUS.lg, boxShadow: SHADOW.lifted, width: "100%", maxWidth: 460, padding: 24, fontFamily: FONT_BODY }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: COLORS.navy, margin: 0 }}>Añadir conductor</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint }}><X style={{ width: 20, height: 20 }} /></button>
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
            {error && <p style={{ fontSize: 13, color: COLORS.danger, margin: "12px 0 0" }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowAdd(false)} style={{ height: 40, padding: "0 16px", borderRadius: RADIUS.sm, border: `1px solid ${COLORS.border}`, background: COLORS.surface, fontSize: 13, fontWeight: 600, color: COLORS.text, cursor: "pointer", fontFamily: FONT_BODY }}>Cancelar</button>
              <button onClick={handleAdd} disabled={saving}
                onMouseEnter={() => setSaveHover(true)} onMouseLeave={() => setSaveHover(false)}
                style={{ height: 40, padding: "0 18px", borderRadius: RADIUS.sm, border: "none", background: saving ? COLORS.navy : (saveHover ? COLORS.teal : COLORS.navy), color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: FONT_BODY, transition: "background 0.15s" }}>
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
    return <img src={staff.photo_url} alt={staff.nombre} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `1px solid ${COLORS.border}` }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: avatarColor(staff.nombre), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: size * 0.36 }}>{iniciales(staff.nombre)}</span>
    </div>
  )
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: "10px 8px", textAlign: "center" }}>
      <p style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, color: COLORS.navy, margin: 0, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
      <p style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: COLORS.textFaint, margin: "3px 0 0", fontWeight: 500 }}>{label}</p>
    </div>
  )
}

function IconBtn({ href, title, children }: { href?: string; title: string; children: React.ReactNode }) {
  const style: React.CSSProperties = {
    width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: RADIUS.sm, border: `1px solid ${COLORS.border}`, background: COLORS.surface,
    color: href ? COLORS.navy : COLORS.textFaint, cursor: href ? "pointer" : "not-allowed", textDecoration: "none",
  }
  if (!href) return <span title={title} style={style}>{children}</span>
  return <a href={href} title={title} style={style}>{children}</a>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, color: COLORS.text }}>{label}</label>
      {children}
    </div>
  )
}
