"use client"

import { useState } from "react"
import { Plus, X, AlertTriangle, User } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { conflictIcon, type Conflict } from "@/lib/conflicts"

type StaffMember = { id: string; nombre: string; rol: string; estado: string; email: string | null }

type Assignment = {
  id: string; staff_id: string; rol_en_servicio: string
  staff: { nombre: string; rol: string }
}

type QuoteInfo = {
  requester_name: string; origin: string; destination: string
  trip_date: string; departure_time: string; vehiculo: string | null
}

const rolServicioConfig: Record<string, { label: string; color: string; bg: string }> = {
  conductor_principal: { label: "Conductor principal", color: "#1e40af", bg: "#eff6ff" },
  conductor_relevo:    { label: "Conductor relevo",    color: "#0369a1", bg: "#f0f9ff" },
  guia:                { label: "Guía",                color: "#0f766e", bg: "#f0fdf9" },
  monitor:             { label: "Monitor",             color: "#6d28d9", bg: "#f5f3ff" },
}

const CONDUCTOR_ROLES = ["conductor_principal", "conductor_relevo"]

export function ServiceAssignments({ quoteId, tripDate, initialAssignments, staff, conflictByStaff, companyId, quoteInfo }: {
  quoteId: string
  tripDate: string
  initialAssignments: Assignment[]
  staff: StaffMember[]
  conflictByStaff: Record<string, Conflict>
  companyId: string
  quoteInfo: QuoteInfo
}) {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [selectedRol, setSelectedRol] = useState("conductor_principal")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmConflict, setConfirmConflict] = useState<Conflict | null>(null)

  const assignedStaffIds = assignments.map(a => a.staff_id)
  const availableStaff = staff.filter(s => !assignedStaffIds.includes(s.id))

  const notificarConductor = async (member: StaffMember) => {
    if (!member.email || !CONDUCTOR_ROLES.includes(selectedRol)) return
    try {
      await fetch("/api/notificar-conductor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId, conductor_email: member.email, conductor_nombre: member.nombre,
          requester_name: quoteInfo.requester_name, origin: quoteInfo.origin, destination: quoteInfo.destination,
          trip_date: quoteInfo.trip_date, departure_time: quoteInfo.departure_time, vehiculo: quoteInfo.vehiculo,
        }),
      })
    } catch (e) { console.error("No se pudo notificar al conductor", e) }
  }

  const doAssign = async () => {
    setConfirmConflict(null)
    setSaving(true); setMessage("")
    const member = staff.find(s => s.id === selectedStaffId)!
    const { data, error } = await supabase
      .from("service_assignments")
      .insert({ quote_request_id: quoteId, staff_id: selectedStaffId, rol_en_servicio: selectedRol })
      .select("id, staff_id, rol_en_servicio, staff(nombre, rol)")
      .single()
    if (error) { setMessage("❌ " + error.message); setSaving(false); return }
    setAssignments(prev => [...prev, data as any])
    setSelectedStaffId("")
    setSaving(false)
    notificarConductor(member)
  }

  const handleAssign = () => {
    if (!selectedStaffId) { setMessage("Selecciona una persona"); return }
    setMessage("")
    const c = conflictByStaff[selectedStaffId] ?? { level: "ok", text: "Disponible" }
    if (c.level === "block") { setMessage("❌ No se puede asignar: " + c.text); return }
    if (c.level === "warn") { setConfirmConflict(c); return }
    doAssign()
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    await supabase.from("service_assignments").delete().eq("id", id)
    setAssignments(prev => prev.filter(a => a.id !== id))
    setRemovingId(null)
  }

  const selectStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', system-ui, sans-serif", height: "34px", borderRadius: "8px",
    border: "1px solid #e5e7eb", background: "#fafafa", padding: "0 8px", fontSize: "0.8rem",
    color: "#111827", outline: "none", cursor: "pointer",
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ASIGNACIONES ACTUALES */}
      {assignments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "1rem" }}>
          {assignments.map(a => {
            const rCfg = rolServicioConfig[a.rol_en_servicio] ?? rolServicioConfig.conductor_principal
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "10px", background: rCfg.bg, border: `1px solid ${rCfg.color}20`, borderRadius: "10px", padding: "8px 12px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User style={{ width: "14px", height: "14px", color: rCfg.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#111827", margin: 0 }}>{a.staff.nombre}</p>
                  <p style={{ fontSize: "0.7rem", color: rCfg.color, margin: 0, fontWeight: 500 }}>{rCfg.label}</p>
                </div>
                <button onClick={() => handleRemove(a.id)} disabled={removingId === a.id} style={{ width: "26px", height: "26px", borderRadius: "6px", border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9ca3af" }}>
                  <X style={{ width: "13px", height: "13px" }} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* AÑADIR ASIGNACIÓN */}
      {availableStaff.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
              <option value="">Seleccionar persona...</option>
              {availableStaff.map(s => {
                const c = conflictByStaff[s.id] ?? { level: "ok", text: "Disponible" }
                return <option key={s.id} value={s.id}>{s.nombre} — {conflictIcon(c.level)} {c.text}</option>
              })}
            </select>
            <select value={selectedRol} onChange={e => setSelectedRol(e.target.value)} style={{ ...selectStyle, width: "160px" }}>
              <option value="conductor_principal">Conductor principal</option>
              <option value="conductor_relevo">Conductor relevo</option>
              <option value="guia">Guía</option>
              <option value="monitor">Monitor</option>
            </select>
          </div>
          {selectedStaffId && (() => {
            const c = conflictByStaff[selectedStaffId] ?? { level: "ok", text: "Disponible" }
            if (c.level === "ok") return null
            const isBlock = c.level === "block"
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 7, background: isBlock ? "#fef2f2" : "#fffbeb", border: `1px solid ${isBlock ? "#fecaca" : "#fde68a"}`, borderRadius: 8, padding: "7px 11px" }}>
                <AlertTriangle style={{ width: 14, height: 14, color: isBlock ? "#ef4444" : "#fbbf24", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: isBlock ? "#dc2626" : "#92400e" }}>{conflictIcon(c.level)} {c.text}</span>
              </div>
            )
          })()}
          <button onClick={handleAssign} disabled={saving} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "34px", borderRadius: "8px", background: "#111827", color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            <Plus style={{ width: "13px", height: "13px" }} />
            {saving ? "Asignando..." : "Asignar"}
          </button>
        </div>
      ) : (
        assignments.length === 0 && (
          <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>No hay personal disponible. Añádelo en Conductores o en Ajustes → Personal.</p>
        )
      )}

      {message && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginTop: "8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 12px" }}>
          <p style={{ fontSize: "0.75rem", color: "#dc2626", margin: 0 }}>{message.replace("❌ ", "")}</p>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN (avisos) */}
      {confirmConflict && (
        <div onClick={() => setConfirmConflict(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle style={{ width: 19, height: 19, color: "#fbbf24" }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Hay un conflicto</h3>
            </div>
            <p style={{ fontSize: 14, color: "#374151", margin: "0 0 20px", lineHeight: 1.5 }}>
              {confirmConflict.text}. ¿Quieres continuar con la asignación de todos modos?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmConflict(null)} style={{ height: 38, padding: "0 16px", borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Cancelar</button>
              <button onClick={doAssign} style={{ height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: "#fbbf24", color: "#78350f", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Continuar igualmente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
