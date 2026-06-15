"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, MapPin, Bus } from "lucide-react"
import { COLORS, RADIUS, SHADOW, FONT_DISPLAY, FONT_BODY } from "@/lib/dashboard-ui"

type Servicio = {
  id: string
  trip_date: string
  origin: string
  destination: string
  passengers: number
  requester_name: string
  final_price: number | null
  estimated_price: number | null
  vehicle: { matricula: string; marca_modelo: string } | null
  assignments: Array<{ rol_en_servicio: string; staff: { nombre: string; rol: string } }>
}

const rolColor: Record<string, string> = {
  conductor_principal: COLORS.navy,
  conductor_relevo: COLORS.teal,
  guia: COLORS.warning,
  monitor: COLORS.danger,
}

const rolLabel: Record<string, string> = {
  conductor_principal: "C. Principal",
  conductor_relevo: "C. Relevo",
  guia: "Guía",
  monitor: "Monitor",
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const DIAS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]

export function CalendarioClient({ servicios }: { servicios: Servicio[] }) {
  const hoy = new Date()
  const [año, setAño] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const prevMes = () => { if (mes === 0) { setMes(11); setAño(y => y - 1) } else setMes(m => m - 1) }
  const nextMes = () => { if (mes === 11) { setMes(0); setAño(y => y + 1) } else setMes(m => m + 1) }

  // Construir días del mes
  const primerDia = new Date(año, mes, 1)
  const ultimoDia = new Date(año, mes + 1, 0)
  const diasEnMes = ultimoDia.getDate()
  const inicioSemana = (primerDia.getDay() + 6) % 7 // Lunes = 0

  const celdas: (number | null)[] = [
    ...Array(inicioSemana).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]
  while (celdas.length % 7 !== 0) celdas.push(null)

  const serviciosPorDia = (dia: number) => {
    const fecha = `${año}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
    return servicios.filter(s => s.trip_date.slice(0, 10) === fecha)
  }

  const serviciosDelDia = selectedDate
    ? servicios.filter(s => s.trip_date.slice(0, 10) === selectedDate)
    : []

  const esHoy = (dia: number) => {
    return dia === hoy.getDate() && mes === hoy.getMonth() && año === hoy.getFullYear()
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.5rem", alignItems: "start" }}>

      {/* CALENDARIO */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: `1px solid ${COLORS.border}` }}>
          <button onClick={prevMes} style={{ width: "32px", height: "32px", borderRadius: RADIUS.sm, border: `1px solid ${COLORS.border}`, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronLeft style={{ width: "16px", height: "16px", color: COLORS.textMuted }} />
          </button>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: "1rem", fontWeight: 600, color: COLORS.navy, margin: 0 }}>
            {MESES[mes]} {año}
          </h2>
          <button onClick={nextMes} style={{ width: "32px", height: "32px", borderRadius: RADIUS.sm, border: `1px solid ${COLORS.border}`, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronRight style={{ width: "16px", height: "16px", color: COLORS.textMuted }} />
          </button>
        </div>

        {/* Días semana */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${COLORS.border}` }}>
          {DIAS.map(d => (
            <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontFamily: FONT_BODY, fontSize: "0.7rem", fontWeight: 600, color: COLORS.textFaint, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {celdas.map((dia, i) => {
            if (!dia) return <div key={i} style={{ minHeight: "80px", borderBottom: `1px solid ${COLORS.border}`, borderRight: i % 7 !== 6 ? `1px solid ${COLORS.border}` : "none" }} />
            const svs = serviciosPorDia(dia)
            const fecha = `${año}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
            const isSelected = selectedDate === fecha
            const isToday = esHoy(dia)
            return (
              <div
                key={i}
                onClick={() => setSelectedDate(isSelected ? null : fecha)}
                style={{
                  minHeight: "80px", padding: "6px", cursor: "pointer",
                  borderBottom: `1px solid ${COLORS.border}`,
                  borderRight: i % 7 !== 6 ? `1px solid ${COLORS.border}` : "none",
                  background: isSelected ? COLORS.tealSoft : svs.length > 0 ? COLORS.surfaceAlt : COLORS.surface,
                  transition: "background 0.1s",
                }}
              >
                <div style={{
                  width: "26px", height: "26px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px",
                  background: isToday ? COLORS.navy : "transparent",
                  fontFamily: FONT_DISPLAY, fontSize: "0.8125rem", fontWeight: isToday ? 700 : 500,
                  color: isToday ? COLORS.onDark : COLORS.text,
                }}>
                  {dia}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {svs.slice(0, 2).map(s => (
                    <div key={s.id} style={{ background: COLORS.navy, borderRadius: "4px", padding: "2px 5px" }}>
                      <p style={{ fontFamily: FONT_BODY, fontSize: "0.6rem", fontWeight: 600, color: COLORS.onDark, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.origin.split(",")[0]} → {s.destination.split(",")[0]}
                      </p>
                    </div>
                  ))}
                  {svs.length > 2 && (
                    <p style={{ fontFamily: FONT_BODY, fontSize: "0.6rem", color: COLORS.textFaint, margin: 0, paddingLeft: "2px" }}>+{svs.length - 2} más</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PANEL LATERAL */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Resumen del mes */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, boxShadow: SHADOW.card, padding: "1rem 1.25rem" }}>
          <p style={{ fontFamily: FONT_BODY, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.textFaint, marginBottom: "0.75rem" }}>
            Este mes
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              { label: "Servicios", value: servicios.filter(s => s.trip_date.slice(0, 7) === `${año}-${String(mes + 1).padStart(2, "0")}`).length, color: COLORS.navy },
              { label: "Facturado", value: servicios.filter(s => s.trip_date.slice(0, 7) === `${año}-${String(mes + 1).padStart(2, "0")}`).reduce((sum, s) => sum + (s.final_price ?? s.estimated_price ?? 0), 0).toLocaleString("es-ES") + " €", color: COLORS.teal },
            ].map(item => (
              <div key={item.label} style={{ background: COLORS.surfaceAlt, borderRadius: RADIUS.sm, padding: "10px 12px" }}>
                <p style={{ fontFamily: FONT_DISPLAY, fontSize: "1.125rem", fontWeight: 700, color: item.color, margin: 0 }}>{item.value}</p>
                <p style={{ fontFamily: FONT_BODY, fontSize: "0.7rem", color: COLORS.textFaint, margin: "2px 0 0" }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Servicios del día seleccionado */}
        {selectedDate ? (
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, boxShadow: SHADOW.card, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
              <p style={{ fontFamily: FONT_BODY, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.textFaint, margin: 0 }}>
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            {serviciosDelDia.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center" }}>
                <p style={{ fontFamily: FONT_BODY, fontSize: "0.8125rem", color: COLORS.textFaint }}>Sin servicios este día</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {serviciosDelDia.map((s, i) => (
                  <Link key={s.id} href={`/dashboard/solicitudes/${s.id}`} style={{ textDecoration: "none", display: "block", padding: "12px 16px", borderBottom: i < serviciosDelDia.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: RADIUS.sm, background: COLORS.navySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <MapPin style={{ width: "14px", height: "14px", color: COLORS.navy }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: FONT_BODY, fontSize: "0.8125rem", fontWeight: 600, color: COLORS.text, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.origin.split(",")[0]} → {s.destination.split(",")[0]}
                        </p>
                        <p style={{ fontFamily: FONT_BODY, fontSize: "0.75rem", color: COLORS.textMuted, margin: "0 0 6px" }}>
                          {s.requester_name} · {s.passengers} pax
                        </p>

                        {/* Vehículo */}
                        {s.vehicle && (
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                            <Bus style={{ width: "11px", height: "11px", color: COLORS.textMuted }} />
                            <span style={{ fontFamily: FONT_BODY, fontSize: "0.7rem", color: COLORS.textMuted }}>
                              {s.vehicle.matricula} · {s.vehicle.marca_modelo}
                            </span>
                          </div>
                        )}

                        {/* Personal */}
                        {s.assignments.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                            {s.assignments.map((a, j) => (
                              <span key={j} style={{ fontFamily: FONT_BODY, fontSize: "0.65rem", fontWeight: 600, padding: "2px 6px", borderRadius: RADIUS.pill, background: rolColor[a.rol_en_servicio] + "15", color: rolColor[a.rol_en_servicio] }}>
                                {rolLabel[a.rol_en_servicio]}: {a.staff.nombre.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        )}

                        {(s.final_price ?? s.estimated_price) && (
                          <p style={{ fontFamily: FONT_DISPLAY, fontSize: "0.75rem", fontWeight: 700, color: COLORS.teal, margin: "6px 0 0" }}>
                            {(s.final_price ?? s.estimated_price)?.toLocaleString("es-ES")} €
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, boxShadow: SHADOW.card, padding: "1.5rem", textAlign: "center" }}>
            <p style={{ fontFamily: FONT_BODY, fontSize: "0.8125rem", color: COLORS.textFaint }}>Selecciona un día para ver los servicios</p>
          </div>
        )}
      </div>
    </div>
  )
}