"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import {
  ClipboardList, CalendarClock, PlayCircle, CheckCircle2, Bus, User, MapPin, Clock,
  AlertTriangle, ChevronRight, X, Search,
} from "lucide-react"
import { conductorConflict, vehiculoConflict, conflictIcon, type Conflict } from "@/lib/conflicts"

const FONT = "'DM Sans', system-ui, sans-serif"
const CONDUCTOR_ROLES = ["conductor_principal", "conductor_relevo"]

type Servicio = {
  id: string; requester_name: string; origin: string; destination: string
  trip_date: string | null; departure_time: string | null; estimated_km: number | null; passengers: number | null
  vehicleId: string | null; vehiculoNombre: string | null
  conductorId: string | null; conductorNombre: string | null
  estado: "sin_asignar" | "asignado" | "en_curso" | "finalizado"
}
type Conductor = { id: string; nombre: string; estado: string; email: string | null }
type Vehicle = { id: string; matricula: string; marca_modelo: string; plazas: number }

const estadoCfg: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  sin_asignar: { label: "Sin asignar", bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af" },
  asignado:    { label: "Asignado",    bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  en_curso:    { label: "En curso",    bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" },
  finalizado:  { label: "Finalizado",  bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #eef0f3", borderRadius: 16, boxShadow: "0 1px 2px rgba(16,24,40,0.05)" }
const inputStyle: React.CSSProperties = { fontFamily: FONT, height: 40, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", padding: "0 12px", fontSize: 13.5, color: "#111827", outline: "none", boxSizing: "border-box", cursor: "pointer" }

function fmtFecha(d: string | null) {
  return d ? new Date(d).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" }) : "—"
}

export function ServiciosOperativos({ servicios: initial, conductores, vehicles, busyDatesByStaff, expiredDocByStaff, vehicleBusyByDate, companyId }: {
  servicios: Servicio[]
  conductores: Conductor[]
  vehicles: Vehicle[]
  busyDatesByStaff: Record<string, string[]>
  expiredDocByStaff: Record<string, string>
  vehicleBusyByDate: Record<string, string[]>
  companyId: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [servicios, setServicios] = useState<Servicio[]>(initial)
  const [fEstado, setFEstado] = useState("todos")
  const [fRango, setFRango] = useState("todos")
  const [fConductor, setFConductor] = useState("todos")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [search, setSearch] = useState("")

  const [modalId, setModalId] = useState<string | null>(null)

  const todayStr = new Date().toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const now = new Date()
  const inMonth = (d: string | null) => { if (!d) return false; const x = new Date(d); return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth() }

  const kpis = useMemo(() => ({
    sinAsignar: servicios.filter(s => s.estado === "sin_asignar").length,
    estaSemana: servicios.filter(s => s.trip_date && s.trip_date.slice(0, 10) >= todayStr && s.trip_date.slice(0, 10) <= in7).length,
    enCurso: servicios.filter(s => s.estado === "en_curso").length,
    finalizadosMes: servicios.filter(s => s.estado === "finalizado" && inMonth(s.trip_date)).length,
  }), [servicios]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return servicios.filter(s => {
      if (fEstado !== "todos") {
        if (fEstado === "asignados" && s.estado !== "asignado") return false
        if (fEstado === "finalizados" && s.estado !== "finalizado") return false
        if (["sin_asignar", "en_curso"].includes(fEstado) && s.estado !== fEstado) return false
      }
      if (fConductor !== "todos" && s.conductorId !== fConductor) return false
      const day = s.trip_date?.slice(0, 10) ?? ""
      if (fRango === "semana" && !(day >= todayStr && day <= in7)) return false
      if (fRango === "mes" && !inMonth(s.trip_date)) return false
      if (fRango === "personalizado") {
        if (desde && day < desde) return false
        if (hasta && day > hasta) return false
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (![s.requester_name, s.origin, s.destination].some(v => (v ?? "").toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [servicios, fEstado, fConductor, fRango, desde, hasta, search]) // eslint-disable-line react-hooks/exhaustive-deps

  const kpiCards = [
    { label: "Sin asignar", value: kpis.sinAsignar, icon: ClipboardList, color: "#dc2626", light: "#fef2f2" },
    { label: "Esta semana", value: kpis.estaSemana, icon: CalendarClock, color: "#1d4ed8", light: "#eff6ff" },
    { label: "En curso ahora", value: kpis.enCurso, icon: PlayCircle, color: "#b45309", light: "#fffbeb" },
    { label: "Finalizados este mes", value: kpis.finalizadosMes, icon: CheckCircle2, color: "#15803d", light: "#f0fdf4" },
  ]

  const modalServicio = servicios.find(s => s.id === modalId) || null

  const onAssigned = (servicioId: string, patch: Partial<Servicio>) => {
    setServicios(prev => prev.map(s => {
      if (s.id !== servicioId) return s
      const next = { ...s, ...patch }
      next.estado = next.conductorId && next.vehicleId ? "asignado" : "sin_asignar"
      return next
    }))
    setModalId(null)
    router.refresh()
  }

  return (
    <div style={{ fontFamily: FONT }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 22 }}>
        {kpiCards.map((k, i) => (
          <div key={i} style={{ ...card, padding: "18px 20px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: k.light, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <k.icon style={{ width: 17, height: 17, color: k.color }} />
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1 }}>{k.value}</p>
            <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "6px 0 0", fontWeight: 500 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <Search style={{ width: 15, height: 15, color: "#9ca3af", position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 34, width: 200, cursor: "text" }} />
        </div>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} style={inputStyle}>
          <option value="todos">Todos los estados</option>
          <option value="sin_asignar">Sin asignar</option>
          <option value="asignados">Asignados</option>
          <option value="en_curso">En curso</option>
          <option value="finalizados">Finalizados</option>
        </select>
        <select value={fRango} onChange={e => setFRango(e.target.value)} style={inputStyle}>
          <option value="todos">Todas las fechas</option>
          <option value="semana">Próximos 7 días</option>
          <option value="mes">Este mes</option>
          <option value="personalizado">Personalizado</option>
        </select>
        {fRango === "personalizado" && (
          <>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ ...inputStyle, cursor: "text" }} />
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ ...inputStyle, cursor: "text" }} />
          </>
        )}
        <select value={fConductor} onChange={e => setFConductor(e.target.value)} style={inputStyle}>
          <option value="todos">Todos los conductores</option>
          {conductores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={{ ...card, padding: "56px 24px", textAlign: "center" }}>
          <ClipboardList style={{ width: 26, height: 26, color: "#d1d5db", margin: "0 auto 12px", display: "block" }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 4px" }}>No hay servicios</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Los presupuestos aceptados aparecerán aquí para planificarlos</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(s => {
            const ec = estadoCfg[s.estado]
            return (
              <div key={s.id} style={{ ...card, padding: 18, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{s.requester_name}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: ec.bg, color: ec.text }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: ec.dot }} /> {ec.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin style={{ width: 13, height: 13, color: "#9ca3af" }} />
                    {(s.origin?.split(",")[0] ?? "—")} → {(s.destination?.split(",")[0] ?? "—")}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12.5, color: "#6b7280", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Clock style={{ width: 13, height: 13, color: "#9ca3af" }} /> {fmtFecha(s.trip_date)}{s.departure_time ? ` · ${s.departure_time}` : ""}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <AssignBadge icon={Bus} ok={!!s.vehiculoNombre} okText={s.vehiculoNombre ?? ""} koText="Sin vehículo" />
                  <AssignBadge icon={User} ok={!!s.conductorNombre} okText={s.conductorNombre ?? ""} koText="Sin conductor" />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {s.estado === "sin_asignar" && (
                    <button onClick={() => setModalId(s.id)} style={{ display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px", borderRadius: 9, border: "none", background: "#1e3a5f", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                      Asignar ahora
                    </button>
                  )}
                  <Link href={`/dashboard/solicitudes/${s.id}`} style={{ display: "flex", alignItems: "center", gap: 5, height: 38, padding: "0 14px", borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    Ver detalle <ChevronRight style={{ width: 14, height: 14 }} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalServicio && (
        <AsignacionModal
          servicio={modalServicio}
          conductores={conductores}
          vehicles={vehicles}
          busyDatesByStaff={busyDatesByStaff}
          expiredDocByStaff={expiredDocByStaff}
          vehicleBusyByDate={vehicleBusyByDate}
          companyId={companyId}
          onClose={() => setModalId(null)}
          onAssigned={onAssigned}
        />
      )}
    </div>
  )
}

function AssignBadge({ icon: Icon, ok, okText, koText }: { icon: any; ok: boolean; okText: string; koText: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, background: ok ? "#f9fafb" : "#fef2f2", border: `1px solid ${ok ? "#eef0f3" : "#fecaca"}`, color: ok ? "#374151" : "#dc2626" }}>
      {ok ? <Icon style={{ width: 14, height: 14, color: "#6b7280" }} /> : <AlertTriangle style={{ width: 14, height: 14 }} />}
      {ok ? okText : koText}
    </span>
  )
}

function AsignacionModal({ servicio, conductores, vehicles, busyDatesByStaff, expiredDocByStaff, vehicleBusyByDate, companyId, onClose, onAssigned }: {
  servicio: Servicio
  conductores: Conductor[]
  vehicles: Vehicle[]
  busyDatesByStaff: Record<string, string[]>
  expiredDocByStaff: Record<string, string>
  vehicleBusyByDate: Record<string, string[]>
  companyId: string
  onClose: () => void
  onAssigned: (id: string, patch: Partial<Servicio>) => void
}) {
  const supabase = createClient()
  const day = servicio.trip_date?.slice(0, 10) ?? ""
  const [conductorId, setConductorId] = useState("")
  const [rol, setRol] = useState("conductor_principal")
  const [vehicleId, setVehicleId] = useState(servicio.vehicleId ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [confirm, setConfirm] = useState<Conflict | null>(null)

  const conductorConflictFor = (c: Conductor): Conflict => conductorConflict({
    estado: c.estado,
    busyOnDate: (busyDatesByStaff[c.id] ?? []).includes(day),
    expiredDocLabel: expiredDocByStaff[c.id] ?? null,
  })
  const vehicleBusy = (vId: string) => (vehicleBusyByDate[day] ?? []).includes(vId)

  const doAssign = async () => {
    setConfirm(null); setSaving(true); setError("")
    const veh = vehicleId ? vehicles.find(v => v.id === vehicleId) : null
    // 1. Vehículo
    if (vehicleId && vehicleId !== servicio.vehicleId) {
      const { error: vErr } = await supabase.from("quote_requests").update({ vehicle_id: vehicleId }).eq("id", servicio.id)
      if (vErr) { setError(vErr.message); setSaving(false); return }
    }
    // 2. Conductor
    let conductorNombre = servicio.conductorNombre
    let newConductorId = servicio.conductorId
    if (conductorId) {
      const { error: aErr } = await supabase.from("service_assignments").insert({ quote_request_id: servicio.id, staff_id: conductorId, rol_en_servicio: rol })
      if (aErr) { setError(aErr.message); setSaving(false); return }
      const c = conductores.find(x => x.id === conductorId)!
      conductorNombre = c.nombre
      newConductorId = conductorId
      // 3. Email al conductor
      if (c.email && CONDUCTOR_ROLES.includes(rol)) {
        fetch("/api/notificar-conductor", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: companyId, conductor_email: c.email, conductor_nombre: c.nombre,
            requester_name: servicio.requester_name, origin: servicio.origin, destination: servicio.destination,
            trip_date: servicio.trip_date, departure_time: servicio.departure_time,
            vehiculo: veh ? `${veh.marca_modelo} (${veh.matricula})` : servicio.vehiculoNombre,
          }),
        }).catch(() => {})
      }
    }
    setSaving(false)
    onAssigned(servicio.id, {
      vehicleId: vehicleId || servicio.vehicleId,
      vehiculoNombre: veh ? `${veh.marca_modelo} (${veh.matricula})` : servicio.vehiculoNombre,
      conductorId: newConductorId, conductorNombre,
    })
  }

  const handleAssign = () => {
    if (!conductorId && !vehicleId) { setError("Selecciona un conductor o un vehículo"); return }
    setError("")
    if (conductorId) {
      const c = conductorConflictFor(conductores.find(x => x.id === conductorId)!)
      if (c.level === "block") { setError("❌ No se puede asignar este conductor: " + c.text); return }
      if (c.level === "warn") { setConfirm(c); return }
    }
    doAssign()
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 500, padding: 24, fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>Asignar servicio</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}><X style={{ width: 20, height: 20 }} /></button>
        </div>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 18px" }}>
          {servicio.requester_name} · {(servicio.origin?.split(",")[0] ?? "")} → {(servicio.destination?.split(",")[0] ?? "")} · {fmtFecha(servicio.trip_date)}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>Conductor</label>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={conductorId} onChange={e => setConductorId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                <option value="">Seleccionar conductor...</option>
                {conductores.map(c => {
                  const cf = conductorConflictFor(c)
                  return <option key={c.id} value={c.id}>{c.nombre} — {conflictIcon(cf.level)} {cf.text}</option>
                })}
              </select>
              <select value={rol} onChange={e => setRol(e.target.value)} style={{ ...inputStyle, width: 150 }}>
                <option value="conductor_principal">Principal</option>
                <option value="conductor_relevo">Relevo</option>
                <option value="guia">Guía</option>
                <option value="monitor">Monitor</option>
              </select>
            </div>
            {conductorId && (() => {
              const cf = conductorConflictFor(conductores.find(x => x.id === conductorId)!)
              if (cf.level === "ok") return null
              const isBlock = cf.level === "block"
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, background: isBlock ? "#fef2f2" : "#fffbeb", border: `1px solid ${isBlock ? "#fecaca" : "#fde68a"}`, borderRadius: 8, padding: "7px 11px" }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: isBlock ? "#ef4444" : "#fbbf24", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: isBlock ? "#dc2626" : "#92400e" }}>{conflictIcon(cf.level)} {cf.text}</span>
                </div>
              )
            })()}
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>Vehículo</label>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
              <option value="">Sin asignar</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.marca_modelo} ({v.matricula}){vehicleBusy(v.id) ? "  ⚠️ ocupado ese día" : ""}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p style={{ fontSize: 13, color: "#dc2626", margin: "14px 0 0" }}>{error.replace("❌ ", "")}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <button onClick={onClose} style={{ height: 40, padding: "0 16px", borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: FONT }}>Cancelar</button>
          <button onClick={handleAssign} disabled={saving} style={{ height: 40, padding: "0 18px", borderRadius: 9, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: FONT }}>
            {saving ? "Asignando..." : "Asignar"}
          </button>
        </div>

        {confirm && (
          <div onClick={() => setConfirm(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <AlertTriangle style={{ width: 20, height: 20, color: "#fbbf24" }} />
                <h4 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Hay un conflicto</h4>
              </div>
              <p style={{ fontSize: 13.5, color: "#374151", margin: "0 0 18px", lineHeight: 1.5 }}>{confirm.text}. ¿Continuar de todos modos?</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setConfirm(null)} style={{ height: 38, padding: "0 16px", borderRadius: 9, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: FONT }}>Cancelar</button>
                <button onClick={doAssign} style={{ height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: "#fbbf24", color: "#78350f", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Continuar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
