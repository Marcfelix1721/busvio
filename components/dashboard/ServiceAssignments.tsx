"use client"

import { useState } from "react"
import { Plus, X, AlertTriangle, User } from "lucide-react"
import { createClient } from "@/lib/supabase"

type StaffMember = {
  id: string; nombre: string; rol: string; estado: string
}

type Assignment = {
  id: string; staff_id: string; rol_en_servicio: string
  staff: { nombre: string; rol: string }
}

const rolServicioConfig: Record<string, { label: string; color: string; bg: string }> = {
  conductor_principal: { label: "Conductor principal", color: "#1e40af", bg: "#eff6ff" },
  conductor_relevo:    { label: "Conductor relevo",    color: "#0369a1", bg: "#f0f9ff" },
  guia:                { label: "Guía",                color: "#0f766e", bg: "#f0fdf9" },
  monitor:             { label: "Monitor",             color: "#6d28d9", bg: "#f5f3ff" },
}

export function ServiceAssignments({ quoteId, tripDate, initialAssignments, staff }: {
  quoteId: string
  tripDate: string
  initialAssignments: Assignment[]
  staff: StaffMember[]
}) {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [selectedStaffId, setSelectedStaffId] = useState("")
  const [selectedRol, setSelectedRol] = useState("conductor_principal")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [removingId, setRemovingId] = useState<string | null>(null)

  const assignedStaffIds = assignments.map(a => a.staff_id)

  const availableStaff = staff.filter(s =>
    s.estado === "activo" && !assignedStaffIds.includes(s.id)
  )

  const handleAssign = async () => {
    if (!selectedStaffId) { setMessage("Selecciona una persona"); return }
    setSaving(true); setMessage("")

    // Comprobar conflicto: ¿ya tiene servicio ese día?
    const { data: conflict } = await supabase
      .from("service_assignments")
      .select("id, quote_request_id, quote_requests(trip_date, requester_name, origin, destination)")
      .eq("staff_id", selectedStaffId)
      .neq("quote_request_id", quoteId)

    const conflicto = (conflict ?? []).find((c: any) => {
      const fecha = c.quote_requests?.trip_date
      return fecha && fecha.slice(0, 10) === tripDate.slice(0, 10)
    }) as any

    if (conflicto) {
      const nombre = conflicto.quote_requests?.requester_name ?? "otro servicio"
      const ruta = conflicto.quote_requests ? `${conflicto.quote_requests.origin} → ${conflicto.quote_requests.destination}` : ""
      setMessage(`⚠️ Ya asignado ese día: ${nombre} · ${ruta}`)
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from("service_assignments")
      .insert({ quote_request_id: quoteId, staff_id: selectedStaffId, rol_en_servicio: selectedRol })
      .select("id, staff_id, rol_en_servicio, staff(nombre, rol)")
      .single()

    if (error) { setMessage("❌ " + error.message); setSaving(false); return }
    setAssignments(prev => [...prev, data as any])
    setSelectedStaffId("")
    setSaving(false)
    setMessage("")
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    await supabase.from("service_assignments").delete().eq("id", id)
    setAssignments(prev => prev.filter(a => a.id !== id))
    setRemovingId(null)
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ASIGNACIONES ACTUALES */}
      {assignments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "1rem" }}>
          {assignments.map(a => {
            const rCfg = rolServicioConfig[a.rol_en_servicio]
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "10px", background: rCfg.bg, border: `1px solid ${rCfg.color}20`, borderRadius: "10px", padding: "8px 12px" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User style={{ width: "14px", height: "14px", color: rCfg.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", fontWeight: 600, color: "#111827", margin: 0 }}>{a.staff.nombre}</p>
                  <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.7rem", color: rCfg.color, margin: 0, fontWeight: 500 }}>{rCfg.label}</p>
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
            <select
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif", flex: 1, height: "34px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fafafa", padding: "0 8px", fontSize: "0.8rem", color: "#111827", outline: "none", cursor: "pointer" }}
            >
              <option value="">Seleccionar persona...</option>
              {availableStaff.map(s => (
                <option key={s.id} value={s.id}>{s.nombre} ({s.rol})</option>
              ))}
            </select>
            <select
              value={selectedRol}
              onChange={e => setSelectedRol(e.target.value)}
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif", width: "160px", height: "34px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fafafa", padding: "0 8px", fontSize: "0.8rem", color: "#111827", outline: "none", cursor: "pointer" }}
            >
              <option value="conductor_principal">Conductor principal</option>
              <option value="conductor_relevo">Conductor relevo</option>
              <option value="guia">Guía</option>
              <option value="monitor">Monitor</option>
            </select>
          </div>
          <button onClick={handleAssign} disabled={saving} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "34px", borderRadius: "8px", background: "#111827", color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            <Plus style={{ width: "13px", height: "13px" }} />
            {saving ? "Asignando..." : "Asignar"}
          </button>
        </div>
      ) : (
        assignments.length === 0 && (
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8rem", color: "#9ca3af" }}>
            No hay personal activo disponible. Añádelo en Ajustes → Personal.
          </p>
        )
      )}

      {message && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginTop: "8px", background: message.startsWith("⚠️") ? "#fffbeb" : "#fef2f2", border: `1px solid ${message.startsWith("⚠️") ? "#fcd34d" : "#fecaca"}`, borderRadius: "8px", padding: "8px 12px" }}>
          {message.startsWith("⚠️") && <AlertTriangle style={{ width: "14px", height: "14px", color: "#b45309", flexShrink: 0, marginTop: "1px" }} />}
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: message.startsWith("⚠️") ? "#92400e" : "#dc2626", margin: 0 }}>
            {message.replace("⚠️ ", "")}
          </p>
        </div>
      )}
    </div>
  )
}