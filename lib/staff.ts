export type Staff = {
  id: string
  company_id: string
  nombre: string
  email: string | null
  telefono: string | null
  dni: string | null
  rol: string
  estado: string
  photo_url: string | null
  fecha_nacimiento: string | null
  direccion: string | null
  contacto_emergencia_nombre: string | null
  contacto_emergencia_telefono: string | null
  fecha_alta: string | null
  tipo_contrato: string | null
  salario: number | null
  horas_max_semanales: number | null
  notas_internas: string | null
  user_id: string | null
  created_at: string
}

export type StaffDocumento = {
  id: string
  staff_id: string
  company_id: string
  tipo: string
  nombre: string | null
  archivo_url: string | null
  fecha_emision: string | null
  fecha_vencimiento: string | null
  notas: string | null
  created_at: string
}

export type ConductorStats = {
  serviciosMes: number
  horasMes: number
  serviciosTotales: number
  horasTotales: number
  kmTotales: number
  ultimoServicio: string | null
}

export const ESTADOS = ["disponible", "en_servicio", "descanso", "vacaciones", "baja"] as const

export const ESTADO_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  disponible:  { label: "Disponible",  bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
  en_servicio: { label: "En servicio", bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
  descanso:    { label: "Descanso",    bg: "#fffbeb", text: "#b45309", dot: "#f59e0b" },
  vacaciones:  { label: "Vacaciones",  bg: "#f5f3ff", text: "#6d28d9", dot: "#8b5cf6" },
  baja:        { label: "Baja",        bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
  // compatibilidad con datos antiguos
  activo:      { label: "Disponible",  bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
}

export function estadoInfo(estado: string | null) {
  return ESTADO_CFG[estado ?? ""] ?? ESTADO_CFG.disponible
}

export const DOC_TIPOS = [
  "Carnet de conducir",
  "CAP",
  "Certificado médico",
  "DNI",
  "Contrato",
  "Otro",
]

export const TIPOS_CONTRATO = ["Indefinido", "Temporal", "Autónomo"]

// Color estable a partir del nombre (para avatares con iniciales)
const AVATAR_COLORS = ["#1e3a5f", "#0891b2", "#7c3aed", "#0f766e", "#b45309", "#be185d"]
export function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export function iniciales(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function docEstado(venc: string | null | undefined): { key: string; label: string; bg: string; text: string } {
  if (!venc) return { key: "sin", label: "Sin caducidad", bg: "#f3f4f6", text: "#6b7280" }
  const days = Math.ceil((new Date(venc).getTime() - Date.now()) / 86400000)
  if (days < 0) return { key: "vencido", label: "Vencido", bg: "#fef2f2", text: "#dc2626" }
  if (days <= 30) return { key: "por_vencer", label: "Por vencer", bg: "#fffbeb", text: "#b45309" }
  return { key: "valido", label: "Válido", bg: "#f0fdf4", text: "#15803d" }
}

export function fechaRelativa(dateStr: string | null): string {
  if (!dateStr) return "—"
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d < 0) return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
  if (d === 0) return "hoy"
  if (d === 1) return "ayer"
  if (d < 30) return `hace ${d}d`
  if (d < 365) return `hace ${Math.floor(d / 30)} mes${Math.floor(d / 30) > 1 ? "es" : ""}`
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

export function antiguedad(fechaAlta: string | null): string {
  if (!fechaAlta) return "—"
  const months = Math.floor((Date.now() - new Date(fechaAlta).getTime()) / (86400000 * 30.4))
  if (months < 1) return "Menos de 1 mes"
  if (months < 12) return `${months} mes${months > 1 ? "es" : ""}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return `${years} año${years > 1 ? "s" : ""}${rem ? ` y ${rem} mes${rem > 1 ? "es" : ""}` : ""}`
}
