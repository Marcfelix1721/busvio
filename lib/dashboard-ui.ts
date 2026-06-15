/**
 * Sistema visual del dashboard de FlotaFly — tokens centralizados.
 *
 * La zona privada usa estilos inline (convención del proyecto), así que estos
 * tokens se importan y se componen en los `style={{}}`. Un único sitio para
 * color, radio, sombra, espaciado y tipografía → coherencia entre páginas.
 *
 * Tipografía: titulares y NÚMEROS grandes en Space Grotesk (var --font-display),
 * cuerpo en Inter (var --font-body) — igual que la landing.
 *
 * Color con intención (no arcoíris): navy de marca como base, teal para
 * acción/positivo, un tono cálido para atención/pendiente, neutros para el resto.
 */

export const FONT_DISPLAY = "var(--font-display), 'Space Grotesk', ui-sans-serif, system-ui, sans-serif"
export const FONT_BODY = "var(--font-body), 'Inter', ui-sans-serif, system-ui, sans-serif"

export const COLORS = {
  // Marca
  navy: "#1e3a5f",        // primario: titulares, números héroe, acentos
  navyDeep: "#15293f",    // superficies oscuras (sidebar)
  navySoft: "#eef2f7",    // tinte navy para fondos de icono neutros
  teal: "#0891b2",        // acción / positivo
  tealDeep: "#0e7490",    // hover de acción
  tealSoft: "#e3f3f8",    // tinte teal

  // Semánticos (restringidos, con intención)
  positive: "#0891b2",    // = teal: cierres, facturado, OK
  positiveSoft: "#e3f3f8",
  warning: "#b45309",     // cálido: atención / pendiente / urgente
  warningSoft: "#fdf3e7",
  danger: "#dc2626",      // rechazos / errores
  dangerSoft: "#fdecec",

  // Superficies y neutros
  bg: "#f5f6f8",          // fondo de la app
  surface: "#ffffff",     // tarjetas
  surfaceAlt: "#fafbfc",  // filas alternas / hover sutil
  border: "#e7eaef",      // hairline
  borderStrong: "#d8dde4",

  // Texto
  text: "#16243a",        // principal (near-navy, no negro puro)
  textMuted: "#647284",   // secundario
  textFaint: "#97a1b0",   // terciario / metadatos
  onDark: "#ffffff",
  onDarkMuted: "rgba(255,255,255,0.62)",
  tealOnDark: "#22d3ee",  // teal brillante para acentos legibles sobre navy
} as const

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const

export const SHADOW = {
  // Sombras suaves y frías (tinte navy), no grises genéricas.
  sm: "0 1px 2px rgba(22,40,72,0.05)",
  card: "0 1px 2px rgba(22,40,72,0.04), 0 4px 12px -6px rgba(22,40,72,0.10)",
  lifted: "0 16px 36px -16px rgba(22,40,72,0.22)",
} as const

export const SPACE = {
  page: 32,        // padding horizontal de página
  pageMax: 1240,   // ancho máximo del contenido
  gap: 16,         // gap base entre tarjetas
  section: 28,     // separación entre secciones
} as const

/** Tonos semánticos para StatCard / chips. number siempre va en navy (héroe). */
export type Tone = "default" | "positive" | "warning" | "danger"

export const TONE: Record<Tone, { fg: string; bg: string }> = {
  default: { fg: COLORS.navy, bg: COLORS.navySoft },
  positive: { fg: COLORS.teal, bg: COLORS.tealSoft },
  warning: { fg: COLORS.warning, bg: COLORS.warningSoft },
  danger: { fg: COLORS.danger, bg: COLORS.dangerSoft },
}
