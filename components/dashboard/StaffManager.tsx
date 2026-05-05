"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, X, Check, User, Users } from "lucide-react"
import { createClient } from "@/lib/supabase"

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

const rolConfig: Record<string, { label: string; color: string; bg: string }> = {
  conductor: { label: "Conductor",  color: "#1e40af", bg: "#eff6ff" },
  guia:      { label: "Guía",       color: "#0f766e", bg: "#f0fdf9" },
  monitor:   { label: "Monitor",    color: "#6d28d9", bg: "#f5f3ff" },
}

const estadoConfig: Record<string, { label: string; bg: string; text: string }> = {
  activo:     { label: "Activo",      bg: "#f0fdf4", text: "#15803d" },
  baja:       { label: "De baja",     bg: "#fef2f2", text: "#dc2626" },
  vacaciones: { label: "Vacaciones",  bg: "#fffbeb", text: "#b45309" },
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
      if (error) { setMessage("❌ " + error.message); setSaving(false); return }
      setStaff(prev => prev.map(s => s.id === editingId ? data : s))
    } else {
      const { data, error } = await supabase.from("staff").insert(payload).select().single()
      if (error) { setMessage("❌ " + error.message); setSaving(false); return }
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
    fontFamily: "'DM Sans', system-ui, sans-serif",
    height: "36px", width: "100%", borderRadius: "8px",
    border: "1px solid #e5e7eb", background: "#fafafa",
    padding: "0 10px", fontSize: "0.8125rem", color: "#111827", outline: "none",
  }
  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" },
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", marginBottom: "5px", display: "block",
  }

  const filtered = filterRol === "todos" ? staff : staff.filter(s => s.rol === filterRol)
  const conductores = staff.filter(s => s.rol === "conductor").length
  const guias = staff.filter(s => s.rol === "guia").length
  const monitores = staff.filter(s => s.rol === "monitor").length

  const kpis = [
    { titulo: "Conductores", count: conductores, color: rolConfig.conductor.color },
    { titulo: "Guías",       count: guias,       color: rolConfig.guia.color },
    { titulo: "Monitores",   count: monitores,   color: rolConfig.monitor.color },
  ]

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "1.5rem" }}>
        {kpis.map(item => (
          <div key={item.titulo} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1rem" }}>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1.5rem", fontWeight: 700, color: item.color, margin: 0 }}>{item.count}</p>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#6b7280", margin: "2px 0 0" }}>{item.titulo}</p>
          </div>
        ))}
      </div>

      {/* CABECERA */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {["todos", "conductor", "guia", "monitor"].map(r => (
            <button key={r} onClick={() => setFilterRol(r)} style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              height: "32px", padding: "0 12px", borderRadius: "8px", border: "none",
              fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
              background: filterRol === r ? "#111827" : "#f3f4f6",
              color: filterRol === r ? "#fff" : "#6b7280",
            }}>
              {r === "todos" ? "Todos" : rolConfig[r].label}
            </button>
          ))}
        </div>
        <button onClick={openNew} style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          display: "flex", alignItems: "center", gap: "6px",
          height: "36px", padding: "0 14px", borderRadius: "9px",
          background: "#111827", color: "#fff", border: "none",
          fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
        }}>
          <Plus style={{ width: "14px", height: "14px" }} /> Añadir persona
        </button>
      </div>

      {/* FORMULARIO */}
      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h3 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "#111827", margin: 0 }}>
              {editingId ? "Editar persona" : "Nueva persona"}
            </h3>
            <button onClick={closeForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
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
          {message && <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8rem", color: "#dc2626", margin: "0.75rem 0 0" }}>{message}</p>}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "1.25rem" }}>
            <button onClick={closeForm} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", height: "36px", padding: "0 14px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "0.8125rem", fontWeight: 500, color: "#374151", cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 14px", borderRadius: "8px", background: "#111827", color: "#fff", border: "none", fontSize: "0.8125rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              <Check style={{ width: "14px", height: "14px" }} />
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Añadir"}
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      {filtered.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "3rem", textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <Users style={{ width: "22px", height: "22px", color: "#9ca3af" }} />
          </div>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>Sin personal registrado</p>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#9ca3af" }}>Añade conductores, guías y monitores para asignarlos a servicios</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(s => {
            const rCfg = rolConfig[s.rol]
            const eCfg = estadoConfig[s.estado]
            return (
              <div key={s.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: rCfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User style={{ width: "18px", height: "18px", color: rCfg.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "#111827" }}>{s.nombre}</span>
                    <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: rCfg.bg, color: rCfg.color }}>
                      {rCfg.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                    {s.telefono && <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#6b7280" }}>{s.telefono}</span>}
                    {s.dni && <><span style={{ color: "#d1d5db" }}>·</span><span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#6b7280" }}>DNI: {s.dni}</span></>}
                  </div>
                </div>
                <select
                  value={s.estado}
                  onChange={e => handleEstado(s.id, e.target.value as StaffMember["estado"])}
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 600, padding: "4px 10px", borderRadius: "999px", border: "none", cursor: "pointer", outline: "none", background: eCfg.bg, color: eCfg.text }}
                >
                  <option value="activo">Activo</option>
                  <option value="vacaciones">Vacaciones</option>
                  <option value="baja">De baja</option>
                </select>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => openEdit(s)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280" }}>
                    <Pencil style={{ width: "13px", height: "13px" }} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #fee2e2", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#ef4444" }}>
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