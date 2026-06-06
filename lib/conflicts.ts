// Detección de conflictos al asignar conductores y vehículos a un servicio.

export type ConflictLevel = "ok" | "warn" | "block"
export type Conflict = { level: ConflictLevel; text: string }

export function conflictIcon(level: ConflictLevel): string {
  return level === "block" ? "❌" : level === "warn" ? "⚠️" : "✅"
}

/**
 * Calcula el conflicto de un conductor para una fecha de servicio.
 * - bloqueante (❌): de vacaciones o de baja
 * - aviso (⚠️): ya asignado ese día, o carnet/CAP vencido, o en descanso
 * - ok (✅): disponible
 */
export function conductorConflict(opts: {
  estado: string
  busyOnDate: boolean
  expiredDocLabel: string | null
}): Conflict {
  const { estado, busyOnDate, expiredDocLabel } = opts
  if (estado === "vacaciones") return { level: "block", text: "De vacaciones" }
  if (estado === "baja") return { level: "block", text: "De baja" }
  if (busyOnDate) return { level: "warn", text: "Ya asignado a otro servicio ese día" }
  if (expiredDocLabel) return { level: "warn", text: `${expiredDocLabel} vencido` }
  if (estado === "descanso") return { level: "warn", text: "En descanso" }
  return { level: "ok", text: "Disponible" }
}

export function vehiculoConflict(busyOnDate: boolean): Conflict {
  return busyOnDate
    ? { level: "warn", text: "Ya asignado a otro servicio ese día" }
    : { level: "ok", text: "Disponible" }
}

// Documentos críticos que bloquean/avisan si están vencidos
export const DOCS_CRITICOS = ["Carnet de conducir", "CAP"]

export function sameDay(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  return a.slice(0, 10) === b.slice(0, 10)
}
