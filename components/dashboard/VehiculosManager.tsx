"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, X, Check, Bus, Wrench, CircleCheck, AlertCircle, Info } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { COLORS, RADIUS, SHADOW, SPACE, FONT_DISPLAY, FONT_BODY } from "@/lib/dashboard-ui"
import { StatCard } from "@/components/dashboard/StatCard"

type Vehicle = {
  id: string
  company_id: string
  matricula: string
  marca_modelo: string
  anio: number | null
  plazas: number
  tipo: "minibus" | "autobus" | "autocar"
  estado: "activo" | "reparacion" | "baja"
  consumo: number | null
  precio_combustible: number | null
  amortizacion_km: number | null
  mantenimiento_km: number | null
  seguro_dia: number | null
  created_at: string
}

const tipoLabel: Record<string, string> = {
  minibus: "Minibus",
  autobus: "Autobús",
  autocar: "Autocar",
}

const estadoConfig: Record<string, { label: string; bg: string; text: string }> = {
  activo:     { label: "Activo",        bg: COLORS.tealSoft,    text: COLORS.teal },
  reparacion: { label: "En reparación", bg: COLORS.warningSoft, text: COLORS.warning },
  baja:       { label: "De baja",       bg: COLORS.dangerSoft,  text: COLORS.danger },
}

const tipoIconColor: Record<string, string> = {
  minibus: COLORS.navy,
  autobus: COLORS.teal,
  autocar: COLORS.warning,
}

const tipoIconBg: Record<string, string> = {
  minibus: COLORS.navySoft,
  autobus: COLORS.tealSoft,
  autocar: COLORS.warningSoft,
}

const emptyForm = {
  matricula: "", marca_modelo: "", anio: "", plazas: "", tipo: "autocar", estado: "activo",
  consumo: "", amortizacion_km: "", mantenimiento_km: "", seguro_dia: "",
}

export function VehiculosManager({ companyId, initialVehiculos }: {
  companyId: string; initialVehiculos: Vehicle[]
}) {
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
    setForm({
      matricula: v.matricula, marca_modelo: v.marca_modelo,
      anio: v.anio?.toString() ?? "", plazas: v.plazas.toString(),
      tipo: v.tipo, estado: v.estado,
      consumo: v.consumo?.toString() ?? "",
      amortizacion_km: v.amortizacion_km?.toString() ?? "",
      mantenimiento_km: v.mantenimiento_km?.toString() ?? "",
      seguro_dia: v.seguro_dia?.toString() ?? "",
    })
    setEditingId(v.id); setShowForm(true); setMessage("")
  }
  const closeForm = () => { setShowForm(false); setEditingId(null) }

  const parseNum = (v: string) => v.trim() === "" ? null : parseFloat(v)

  const handleSave = async () => {
    if (!form.matricula || !form.marca_modelo || !form.plazas) {
      setMessage("Matrícula, modelo y plazas son obligatorios"); return
    }
    setSaving(true); setMessage("")
    const payload = {
      company_id: companyId,
      matricula: form.matricula.toUpperCase().trim(),
      marca_modelo: form.marca_modelo.trim(),
      anio: form.anio ? parseInt(form.anio) : null,
      plazas: parseInt(form.plazas),
      tipo: form.tipo as Vehicle["tipo"],
      estado: form.estado as Vehicle["estado"],
      consumo: parseNum(form.consumo),
      amortizacion_km: parseNum(form.amortizacion_km),
      mantenimiento_km: parseNum(form.mantenimiento_km),
      seguro_dia: parseNum(form.seguro_dia),
    }
    if (editingId) {
      const { data, error } = await supabase.from("vehicles").update(payload).eq("id", editingId).select().single()
      if (error) { setMessage(error.message); setSaving(false); return }
      setVehiculos(prev => prev.map(v => v.id === editingId ? data : v))
    } else {
      const { data, error } = await supabase.from("vehicles").insert(payload).select().single()
      if (error) { setMessage(error.message); setSaving(false); return }
      setVehiculos(prev => [data, ...prev])
    }
    setSaving(false); closeForm()
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
  const sectionLabel: React.CSSProperties = {
    fontFamily: FONT_BODY,
    fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase" as const, color: COLORS.textFaint,
    margin: "1rem 0 0.75rem", display: "block",
  }

  const activos = vehiculos.filter(v => v.estado === "activo").length
  const enReparacion = vehiculos.filter(v => v.estado === "reparacion").length

  return (
    <div style={{ fontFamily: FONT_BODY }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(218px, 1fr))", gap: SPACE.gap, marginBottom: SPACE.section }}>
        <StatCard label="Total vehículos" value={vehiculos.length} icon={Bus} tone="default" />
        <StatCard label="Activos" value={activos} icon={CircleCheck} tone="positive" />
        <StatCard label="En reparación" value={enReparacion} icon={Wrench} tone="warning" />
      </div>

      {/* CABECERA */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "1rem", fontWeight: 600, color: COLORS.navy, margin: 0 }}>
            Flota de vehículos
          </h2>
          <p style={{ fontFamily: FONT_BODY, fontSize: "0.8125rem", color: COLORS.textMuted, marginTop: "3px" }}>
            {vehiculos.length} vehículo{vehiculos.length !== 1 ? "s" : ""} registrado{vehiculos.length !== 1 ? "s" : ""}
          </p>
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
          <Plus style={{ width: "14px", height: "14px" }} /> Añadir vehículo
        </button>
      </div>

      {/* FORMULARIO */}
      {showForm && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: SHADOW.card }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: "0.9375rem", fontWeight: 600, color: COLORS.navy, margin: 0 }}>
              {editingId ? "Editar vehículo" : "Nuevo vehículo"}
            </h3>
            <button onClick={closeForm} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textFaint }}>
              <X style={{ width: "18px", height: "18px" }} />
            </button>
          </div>

          {/* DATOS BÁSICOS */}
          <span style={sectionLabel}>Datos del vehículo</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.5rem" }}>
            <div>
              <label style={labelStyle}>Matrícula *</label>
              <input value={form.matricula} onChange={e => handleField("matricula", e.target.value)} placeholder="1234 ABC" style={inputStyle} {...focusHandlers} />
            </div>
            <div>
              <label style={labelStyle}>Marca / Modelo *</label>
              <input value={form.marca_modelo} onChange={e => handleField("marca_modelo", e.target.value)} placeholder="Mercedes Tourismo" style={inputStyle} {...focusHandlers} />
            </div>
            <div>
              <label style={labelStyle}>Año</label>
              <input type="number" value={form.anio} onChange={e => handleField("anio", e.target.value)} placeholder="2019" style={inputStyle} {...focusHandlers} />
            </div>
            <div>
              <label style={labelStyle}>Plazas *</label>
              <input type="number" value={form.plazas} onChange={e => handleField("plazas", e.target.value)} placeholder="55" style={inputStyle} {...focusHandlers} />
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

          {/* COSTES PROPIOS */}
          <span style={sectionLabel}>Costes operativos del vehículo</span>
          <div style={{ background: COLORS.warningSoft, border: `1px solid ${COLORS.warningSoft}`, borderRadius: RADIUS.md, padding: "11px 14px", marginBottom: "1rem", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Info style={{ width: 15, height: 15, color: COLORS.warning, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: COLORS.warning, margin: 0, lineHeight: 1.6, fontFamily: FONT_BODY }}>
              El <strong>precio del combustible</strong> se configura globalmente en Ajustes y se aplica a todos los vehículos.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Consumo <span style={{ color: COLORS.textFaint, fontWeight: 400 }}>· L/100km</span></label>
              <input type="number" step="0.1" value={form.consumo} onChange={e => handleField("consumo", e.target.value)} placeholder="Ej: 28" style={inputStyle} {...focusHandlers} />
            </div>
            <div>
              <label style={labelStyle}>Amortización <span style={{ color: COLORS.textFaint, fontWeight: 400 }}>· €/km</span></label>
              <input type="number" step="0.01" value={form.amortizacion_km} onChange={e => handleField("amortizacion_km", e.target.value)} placeholder="Ej: 0.15" style={inputStyle} {...focusHandlers} />
            </div>
            <div>
              <label style={labelStyle}>Mantenimiento <span style={{ color: COLORS.textFaint, fontWeight: 400 }}>· €/km</span></label>
              <input type="number" step="0.01" value={form.mantenimiento_km} onChange={e => handleField("mantenimiento_km", e.target.value)} placeholder="Ej: 0.08" style={inputStyle} {...focusHandlers} />
            </div>
            <div>
              <label style={labelStyle}>Seguro <span style={{ color: COLORS.textFaint, fontWeight: 400 }}>· €/día</span></label>
              <input type="number" step="0.01" value={form.seguro_dia} onChange={e => handleField("seguro_dia", e.target.value)} placeholder="Ej: 35" style={inputStyle} {...focusHandlers} />
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
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Añadir vehículo"}
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      {vehiculos.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, padding: "3rem", textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: RADIUS.md, background: COLORS.navySoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <Bus style={{ width: "22px", height: "22px", color: COLORS.navy }} />
          </div>
          <p style={{ fontFamily: FONT_BODY, fontSize: "0.9375rem", fontWeight: 600, color: COLORS.text, margin: "0 0 4px" }}>Sin vehículos registrados</p>
          <p style={{ fontFamily: FONT_BODY, fontSize: "0.8125rem", color: COLORS.textFaint }}>Añade tu primer vehículo para empezar a asignarlo a solicitudes</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {vehiculos.map(v => {
            const eCfg = estadoConfig[v.estado]
            const color = tipoIconColor[v.tipo]
            const iconBg = tipoIconBg[v.tipo]
            const tieneCostePropios = v.consumo || v.amortizacion_km || v.mantenimiento_km || v.seguro_dia
            return (
              <div key={v.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: RADIUS.md, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bus style={{ width: "20px", height: "20px", color }} strokeWidth={2} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: "0.9375rem", fontWeight: 700, color: COLORS.navy, letterSpacing: "0.02em" }}>{v.matricula}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: "0.8125rem", color: COLORS.text, fontWeight: 500 }}>{v.marca_modelo}</span>
                    {v.anio && <span style={{ fontFamily: FONT_BODY, fontSize: "0.75rem", color: COLORS.textFaint }}>{v.anio}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: "0.75rem", color: COLORS.textMuted }}>{tipoLabel[v.tipo]}</span>
                    <span style={{ color: COLORS.borderStrong, fontSize: "0.75rem" }}>·</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: "0.75rem", color: COLORS.textMuted }}>{v.plazas} plazas</span>
                    {tieneCostePropios ? (
                      <span style={{ fontFamily: FONT_BODY, fontSize: "0.7rem", fontWeight: 600, padding: "1px 7px", borderRadius: RADIUS.pill, background: COLORS.tealSoft, color: COLORS.teal }}>
                        Costes propios
                      </span>
                    ) : (
                      <span style={{ fontFamily: FONT_BODY, fontSize: "0.7rem", padding: "1px 7px", borderRadius: RADIUS.pill, background: COLORS.navySoft, color: COLORS.textFaint }}>
                        Costes globales
                      </span>
                    )}
                  </div>
                </div>

                <select
                  value={v.estado}
                  onChange={e => handleEstado(v.id, e.target.value as Vehicle["estado"])}
                  style={{ fontFamily: FONT_BODY, fontSize: "0.75rem", fontWeight: 600, padding: "4px 10px", borderRadius: RADIUS.pill, border: "none", cursor: "pointer", outline: "none", background: eCfg.bg, color: eCfg.text }}
                >
                  <option value="activo">Activo</option>
                  <option value="reparacion">En reparación</option>
                  <option value="baja">De baja</option>
                </select>

                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => openEdit(v)} style={{ width: "32px", height: "32px", borderRadius: RADIUS.sm, border: `1px solid ${COLORS.border}`, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: COLORS.textMuted }}>
                    <Pencil style={{ width: "13px", height: "13px" }} />
                  </button>
                  <button onClick={() => handleDelete(v.id)} disabled={deletingId === v.id} style={{ width: "32px", height: "32px", borderRadius: RADIUS.sm, border: `1px solid ${COLORS.dangerSoft}`, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: COLORS.danger }}>
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