"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, X, Check, Bus } from "lucide-react"
import { createClient } from "@/lib/supabase"

type Vehicle = {
  id: string
  company_id: string
  matricula: string
  marca_modelo: string
  anio: number | null
  plazas: number
  tipo: "minibus" | "autobus" | "autocar"
  estado: "activo" | "reparacion" | "baja"
  created_at: string
}

const tipoLabel: Record<string, string> = {
  minibus: "Minibus",
  autobus: "Autobús",
  autocar: "Autocar",
}

const estadoConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  activo:    { label: "Activo",        bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
  reparacion:{ label: "En reparación", bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" },
  baja:      { label: "De baja",       bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
}

const tipoIconColor: Record<string, string> = {
  minibus: "#1e40af",
  autobus: "#0f766e",
  autocar: "#6d28d9",
}

const emptyForm = { matricula: "", marca_modelo: "", anio: "", plazas: "", tipo: "autocar", estado: "activo" }

export function VehiculosManager({ companyId, initialVehiculos }: { companyId: string; initialVehiculos: Vehicle[] }) {
  const supabase = createClient()
  const [vehiculos, setVehiculos] = useState<Vehicle[]>(initialVehiculos)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")

  const handleField = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const openNew = () => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(true); setMessage("") }
  const openEdit = (v: Vehicle) => {
    setForm({ matricula: v.matricula, marca_modelo: v.marca_modelo, anio: v.anio?.toString() ?? "", plazas: v.plazas.toString(), tipo: v.tipo, estado: v.estado })
    setEditingId(v.id); setShowForm(true); setMessage("")
  }
  const closeForm = () => { setShowForm(false); setEditingId(null) }

  const handleSave = async () => {
    if (!form.matricula || !form.marca_modelo || !form.plazas) { setMessage("Matrícula, modelo y plazas son obligatorios"); return }
    setSaving(true)
    setMessage("")
    const payload = {
      company_id: companyId,
      matricula: form.matricula.toUpperCase().trim(),
      marca_modelo: form.marca_modelo.trim(),
      anio: form.anio ? parseInt(form.anio) : null,
      plazas: parseInt(form.plazas),
      tipo: form.tipo as Vehicle["tipo"],
      estado: form.estado as Vehicle["estado"],
    }
    if (editingId) {
      const { data, error } = await supabase.from("vehicles").update(payload).eq("id", editingId).select().single()
      if (error) { setMessage("❌ " + error.message); setSaving(false); return }
      setVehiculos(prev => prev.map(v => v.id === editingId ? data : v))
    } else {
      const { data, error } = await supabase.from("vehicles").insert(payload).select().single()
      if (error) { setMessage("❌ " + error.message); setSaving(false); return }
      setVehiculos(prev => [data, ...prev])
    }
    setSaving(false)
    closeForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este vehículo?")) return
    setDeletingId(id)
    await supabase.from("vehicles").delete().eq("id", id)
    setVehiculos(prev => prev.filter(v => v.id !== id))
    setDeletingId(null)
  }

  const handleEstado = async (id: string, estado: Vehicle["estado"]) => {
    await supabase.from("vehicles").update({ estado }).eq("id", id)
    setVehiculos(prev => prev.map(v => v.id === id ? { ...v, estado } : v))
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    height: "36px", width: "100%", borderRadius: "8px",
    border: "1px solid #e5e7eb", background: "#fafafa",
    padding: "0 10px", fontSize: "0.8125rem", color: "#111827", outline: "none",
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: "0.75rem", fontWeight: 500, color: "#6b7280", marginBottom: "5px", display: "block",
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* CABECERA */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1rem", fontWeight: 600, color: "#111827", margin: 0 }}>
            Flota de vehículos
          </h2>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#6b7280", marginTop: "3px" }}>
            {vehiculos.length} vehículo{vehiculos.length !== 1 ? "s" : ""} registrado{vehiculos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={openNew} style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          display: "flex", alignItems: "center", gap: "6px",
          height: "36px", padding: "0 14px", borderRadius: "9px",
          background: "#111827", color: "#fff", border: "none",
          fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
        }}>
          <Plus style={{ width: "14px", height: "14px" }} /> Añadir vehículo
        </button>
      </div>

      {/* FORMULARIO */}
      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h3 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "#111827", margin: 0 }}>
              {editingId ? "Editar vehículo" : "Nuevo vehículo"}
            </h3>
            <button onClick={closeForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
              <X style={{ width: "18px", height: "18px" }} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>Matrícula *</label>
              <input value={form.matricula} onChange={e => handleField("matricula", e.target.value)} placeholder="1234 ABC" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Marca / Modelo *</label>
              <input value={form.marca_modelo} onChange={e => handleField("marca_modelo", e.target.value)} placeholder="Mercedes Tourismo" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Año</label>
              <input type="number" value={form.anio} onChange={e => handleField("anio", e.target.value)} placeholder="2019" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Plazas *</label>
              <input type="number" value={form.plazas} onChange={e => handleField("plazas", e.target.value)} placeholder="55" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={form.tipo} onChange={e => handleField("tipo", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="minibus">Minibus</option>
                <option value="autobus">Autobús</option>
                <option value="autocar">Autocar</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select value={form.estado} onChange={e => handleField("estado", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="activo">Activo</option>
                <option value="reparacion">En reparación</option>
                <option value="baja">De baja</option>
              </select>
            </div>
          </div>
          {message && <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8rem", color: "#dc2626", marginBottom: "0.75rem" }}>{message}</p>}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={closeForm} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", height: "36px", padding: "0 14px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "0.8125rem", fontWeight: 500, color: "#374151", cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 14px", borderRadius: "8px", background: "#111827", color: "#fff", border: "none", fontSize: "0.8125rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              <Check style={{ width: "14px", height: "14px" }} />
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Añadir vehículo"}
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      {vehiculos.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "3rem", textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <Bus style={{ width: "22px", height: "22px", color: "#9ca3af" }} />
          </div>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>Sin vehículos registrados</p>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#9ca3af" }}>Añade tu primer vehículo para empezar a asignarlo a solicitudes</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {vehiculos.map(v => {
            const eCfg = estadoConfig[v.estado]
            const color = tipoIconColor[v.tipo]
            return (
              <div key={v.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                {/* Icono tipo */}
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bus style={{ width: "20px", height: "20px", color }} />
                </div>

                {/* Info principal */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 700, color: "#111827", letterSpacing: "0.02em" }}>{v.matricula}</span>
                    <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#374151", fontWeight: 500 }}>{v.marca_modelo}</span>
                    {v.anio && <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#9ca3af" }}>{v.anio}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#6b7280" }}>{tipoLabel[v.tipo]}</span>
                    <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#9ca3af" }}>·</span>
                    <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#6b7280" }}>{v.plazas} plazas</span>
                  </div>
                </div>

                {/* Estado selector */}
                <select
                  value={v.estado}
                  onChange={e => handleEstado(v.id, e.target.value as Vehicle["estado"])}
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    fontSize: "0.75rem", fontWeight: 600,
                    padding: "4px 10px", borderRadius: "999px",
                    border: "none", cursor: "pointer", outline: "none",
                    background: eCfg.bg, color: eCfg.text,
                  }}
                >
                  <option value="activo">Activo</option>
                  <option value="reparacion">En reparación</option>
                  <option value="baja">De baja</option>
                </select>

                {/* Acciones */}
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => openEdit(v)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b7280" }}>
                    <Pencil style={{ width: "13px", height: "13px" }} />
                  </button>
                  <button onClick={() => handleDelete(v.id)} disabled={deletingId === v.id} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #fee2e2", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#ef4444" }}>
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