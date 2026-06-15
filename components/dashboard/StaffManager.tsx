"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, X, Check, Users, Car, Flag, ShieldCheck, AlertCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { COLORS, RADIUS, SHADOW, SPACE, FONT_DISPLAY, FONT_BODY } from "@/lib/dashboard-ui"
import { StatCard } from "@/components/dashboard/StatCard"

type StaffMember = {
  id: string
  company_id: string
  nombre: string
  telefono: string | null
  dni: string | null
  rol: "conductor" | "guia" | "monitor"
  estado: "activo" | "baja" | "vacaciones"
  created_at: string
}

const rolConfig: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  conductor: { label: "Conductor",  color: COLORS.navy,    bg: COLORS.navySoft,    icon: Car },
  guia:      { label: "Guía",       color: COLORS.teal,    bg: COLORS.tealSoft,    icon: Flag },
  monitor:   { label: "Monitor",    color: COLORS.warning, bg: COLORS.warningSoft, icon: ShieldCheck },
}

const estadoConfig: Record<string, { label: string; bg: string; text: string }> = {
  activo:     { label: "Activo",      bg: COLORS.tealSoft,    text: COLORS.teal },
  baja:       { label: "De baja",     bg: COLORS.dangerSoft,  text: COLORS.danger },
  vacaciones: { label: "Vacaciones",  bg: COLORS.warningSoft, text: COLORS.warning },
}

const emptyForm = { nombre: "", telefono: "", dni: "", rol: "conductor", estado: "activo" }

export function StaffManager({ companyId, initialStaff }: {
  companyId: string; initialStaff: StaffMember[]
}) {
  const supabase = createClient()
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [filterRol, setFilterRol] = useState<string>("todos")

  const handleField = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const openNew = () => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(true); setMessage("") }
  const openEdit = (s: StaffMember) => {
    setForm({ nombre: s.nombre, telefono: s.telefono ?? "", dni: s.dni ?? "", rol: s.rol, estado: s.estado })
    setEditingId(s.id); setShowForm(true); setMessage("")
  }
  const closeForm = () => { setShowForm(false); setEditingId(null) }

  const handleSave = async () => {
    if (!form.nombre.trim()) { setMessage("El nombre es obligatorio"); return }
    setSaving(true); setMessage("")
    const payload = {
      company_id: companyId,
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim() || null,
      dni: form.dni.trim() || null,
      rol: form.rol as StaffMember["rol"],
      estado: form.estado as StaffMember["estado"],
    }
    if (editingId) {
      const { data, error } = await supabase.from("staff").update(payload).eq("id", editingId).select().single()
      if (error) { setMessage(error.message); setSaving(false); return }
      setStaff(prev => prev.map(s => s.id === editingId ? data : s))
    } else {
      const { data, error } = await supabase.from("staff").insert(payload).select().single()
      if (error) { setMessage(error.message); setSaving(false); return }
      setStaff(prev => [data, ...prev])
    }
    setSaving(false); closeForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este miembro del personal?")) return
    setDeletingId(id)
    await supabase.from("staff").delete().eq("id", id)
    setStaff(prev => prev.filter(s => s.id !== id))
    setDeletingId(null)
  }

  const handleEstado = async (id: string, estado: StaffMember["estado"]) => {
    await supabase.from("staff").update({ estado }).eq("id", id)
    setStaff(prev => prev.map(s => s.id === id ? { ...s, estado } : s))
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: FONT_BODY,
    height: "36px", width: "100%", borderRadius: RADIUS.sm,
    border: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt,
    padding: "0 10px", fontSize: "0.8125rem", color: COLORS.text, outline: "none",
  }
  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = COLORS.navy; e.target.style.background = COLORS.surface; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = COLORS.border; e.target.style.background = COLORS.surfaceAlt; e.target.style.boxShadow = "none" },
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: FONT_BODY,
    fontSize: "0.75rem", fontWeight: 500, color: COLORS.textMuted, marginBottom: "5px", display: "block",
  }

  const filtered = filterRol === "todos" ? staff : staff.filter(s => s.rol === filterRol)
  const conductores = staff.filter(s => s.rol === "conductor").length
  const guias = staff.filter(s => s.rol === "guia").length
  const monitores = staff.filter(s => s.rol === "monitor").length

  return (
    <div style={{ fontFamily: FONT_BODY }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(218px, 1fr))", gap: SPACE.gap, marginBottom: SPACE.section }}>
        <StatCard label="Conductores" value={conductores} icon={Car} tone="default" />
        <StatCard label="Guías" value={guias} icon={Flag} tone="positive" />
        <StatCard label="Monitores" value={monitores} icon={ShieldCheck} tone="warning" />
      </div>

      {/* CABECERA */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["todos", "conductor", "guia", "monitor"].map(r => (
            <button key={r} onClick={() => setFilterRol(r)} style={{
              fontFamily: FONT_BODY,
              height: "32px", padding: "0 12px", borderRadius: RADIUS.sm, border: "none",
              fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
              background: filterRol === r ? COLORS.navy : COLORS.navySoft,
              color: filterRol === r ? COLORS.onDark : COLORS.textMuted,
            }}>
              {r === "todos" ? "Todos" : rolConfig[r].label}
            </button>
          ))}
        </div>
        <button onClick={openNew}
          onMouseEnter={e => { e.currentTarget.style.background = COLORS.teal }}
          onMouseLeave={e => { e.currentTarget.style.background = COLORS.navy }}
          style={{
            fontFamily: FONT_BODY,
            display: "flex", alignItems: "center", gap: "6px",
            height: "36px", padding: "0 14px", borderRadius: RADIUS.md,
            background: COLORS.navy, color: COLORS.onDark, border: "none",
            fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", transition: "background 0.15s",
          }}>
          <Plus style={{ width: "14px", height: "14px" }} /> Añadir persona
        </button>
      </div>

      {/* FORMULARIO */}
      {showForm && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: SHADOW.card }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: "0.9375rem", fontWeight: 600, color: COLORS.navy, margin: 0 }}>
              {editingId ? "Editar persona" : "Nueva persona"}
            </h3>
            <button onClick={closeForm} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint }}>
              <X style={{ width: "18px", height: "18px" }} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Nombre completo *</label>
              <input value={form.nombre} onChange={e => handleField("nombre", e.target.value)} placeholder="Juan García López" style={inputStyle} {...focusHandlers} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input value={form.telefono} onChange={e => handleField("telefono", e.target.value)} placeholder="+34 600 000 000" style={inputStyle} {...focusHandlers} />
            </div>
            <div>
              <label style={labelStyle}>DNI</label>
              <input value={form.dni} onChange={e => handleField("dni", e.target.value)} placeholder="12345678A" style={inputStyle} {...focusHandlers} />
            </div>
            <div>
              <label style={labelStyle}>Rol</label>
              <select value={form.rol} onChange={e => handleField("rol", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="conductor">Conductor</option>
                <option value="guia">Guía</option>
                <option value="monitor">Monitor</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select value={form.estado} onChange={e => handleField("estado", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="activo">Activo</option>
                <option value="vacaciones">Vacaciones</option>
                <option value="baja">De baja</option>
              </select>
            </div>
          </div>
          {message && (
            <p style={{ fontFamily: FONT_BODY, fontSize: "0.8rem", color: COLORS.danger, margin: "0.75rem 0 0", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} /> {message}
            </p>
          )}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "1.25rem" }}>
            <button onClick={closeForm} style={{ fontFamily: FONT_BODY, height: "36px", padding: "0 14px", borderRadius: RADIUS.sm, border: `1px solid ${COLORS.border}`, background: COLORS.surface, fontSize: "0.8125rem", fontWeight: 500, color: COLORS.text, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = COLORS.teal }}
              onMouseLeave={e => { e.currentTarget.style.background = COLORS.navy }}
              style={{ fontFamily: FONT_BODY, display: "flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 14px", borderRadius: RADIUS.md, background: COLORS.navy, color: COLORS.onDark, border: "none", fontSize: "0.8125rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", transition: "background 0.15s" }}>
              <Check style={{ width: "14px", height: "14px" }} />
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Añadir"}
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      {filtered.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, padding: "3rem", textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: RADIUS.md, background: COLORS.navySoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <Users style={{ width: "22px", height: "22px", color: COLORS.navy }} />
          </div>
          <p style={{ fontFamily: FONT_BODY, fontSize: "0.9375rem", fontWeight: 600, color: COLORS.text, margin: "0 0 4px" }}>Sin personal registrado</p>
          <p style={{ fontFamily: FONT_BODY, fontSize: "0.8125rem", color: COLORS.textFaint }}>Añade conductores, guías y monitores para asignarlos a servicios</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(s => {
            const rCfg = rolConfig[s.rol]
            const eCfg = estadoConfig[s.estado]
            const RolIcon = rCfg.icon
            return (
              <div key={s.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: RADIUS.md, background: rCfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <RolIcon style={{ width: "18px", height: "18px", color: rCfg.color }} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: "0.9375rem", fontWeight: 600, color: COLORS.text }}>{s.nombre}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: RADIUS.pill, background: rCfg.bg, color: rCfg.color }}>
                      {rCfg.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                    {s.telefono && <span style={{ fontFamily: FONT_BODY, fontSize: "0.75rem", color: COLORS.textMuted }}>{s.telefono}</span>}
                    {s.dni && <><span style={{ color: COLORS.borderStrong }}>·</span><span style={{ fontFamily: FONT_BODY, fontSize: "0.75rem", color: COLORS.textMuted }}>DNI: {s.dni}</span></>}
                  </div>
                </div>
                <select
                  value={s.estado}
                  onChange={e => handleEstado(s.id, e.target.value as StaffMember["estado"])}
                  style={{ fontFamily: FONT_BODY, fontSize: "0.75rem", fontWeight: 600, padding: "4px 10px", borderRadius: RADIUS.pill, border: "none", cursor: "pointer", outline: "none", background: eCfg.bg, color: eCfg.text }}
                >
                  <option value="activo">Activo</option>
                  <option value="vacaciones">Vacaciones</option>
                  <option value="baja">De baja</option>
                </select>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => openEdit(s)} style={{ width: "32px", height: "32px", borderRadius: RADIUS.sm, border: `1px solid ${COLORS.border}`, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: COLORS.textMuted }}>
                    <Pencil style={{ width: "13px", height: "13px" }} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} style={{ width: "32px", height: "32px", borderRadius: RADIUS.sm, border: `1px solid ${COLORS.dangerSoft}`, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: COLORS.danger }}>
                    <Trash2 style={{ width: "13px", height: "13px" }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}