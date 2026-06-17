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

import type { CSSProperties } from "react"

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

// =============================================================================
// SISTEMA VISUAL v2 — "banca privada / factura premium".
// Claro y luminoso · LÍNEAS, no cajas · serif (Fraunces) para títulos/números ·
// sans (Inter) para cuerpo · navy MATE (degradado + grano) para superficies navy.
// ADITIVO: las pantallas migran por fases; no cambia lo que ya consume COLORS/FONT_DISPLAY.
// =============================================================================

// Fuentes v2
export const FONT_SERIF = "var(--font-serif), 'Fraunces', Georgia, 'Times New Roman', serif"
// (el cuerpo sigue en FONT_BODY = Inter)

// Paleta v2 — colores de marca exactos de la guía
export const DS = {
  navy: "#1e3a5f",          // títulos, números, texto importante, sidebar, botones
  navyDeep: "#182f4d",      // fin del degradado mate
  teal: "#0891b2",          // acento PUNTUAL: barrita, estado nuevo, total, links
  label: "#9aa7b5",         // etiquetas pequeñas (Email, Teléfono…)
  textGray: "#6b7a8d",      // texto gris secundario
  line: "#eceff2",          // líneas/bordes finos (la base de la composición)
  bg: "#f7f9fb",            // fondo luminoso de la app
  surface: "#fcfcfd",       // superficie clara (casi blanco)
  white: "#ffffff",
  onNavy: "#ffffff",
  onNavyMuted: "rgba(255,255,255,0.60)",
  onNavyFaint: "rgba(255,255,255,0.40)",
} as const

// Navy MATE reutilizable: degradado sutil + grano aterciopelado (sin brillos).
export const MATTE_NAVY = "linear-gradient(157deg, #1e3a5f 0%, #1b3354 52%, #182f4d 100%)"
const MATTE_NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
/** Superficie navy mate (sidebar, botones principales, barra de total). */
export const matteNavySurface: CSSProperties = {
  backgroundColor: DS.navyDeep,
  backgroundImage: `${MATTE_NOISE}, ${MATTE_NAVY}`,
  backgroundBlendMode: "soft-light, normal",
}

// Hairline: la línea fina que separa todo (horizontal o vertical).
export const DS_HAIRLINE = `1px solid ${DS.line}`

// --- Estilos base reutilizables (componer en style={{ ...dsX }}) ---
/** Título de página (serif). Acompáñalo SIEMPRE de la barrita teal (dsTealBar). */
export const dsPageTitle: CSSProperties = { fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 600, color: DS.navy, letterSpacing: "-0.01em", lineHeight: 1.1, margin: 0 }
/** Barrita teal corta bajo el título (firma). */
export const dsTealBar: CSSProperties = { width: 48, height: 3, background: DS.teal, borderRadius: 2, marginTop: 12 }
/** Número/importe en serif (KPIs, totales). Fija el fontSize en cada uso. */
export const dsSerifNumber: CSSProperties = { fontFamily: FONT_SERIF, fontWeight: 600, color: DS.navy, letterSpacing: "-0.01em", lineHeight: 1 }
/** Etiqueta pequeña discreta (Email, Teléfono, Fecha…) — sin mayúsculas. */
export const dsSmallLabel: CSSProperties = { fontFamily: FONT_BODY, fontSize: 11, fontWeight: 500, color: DS.label }
/** Etiqueta de SECCIÓN (OPERACIONES, RECURSOS) — mayúsculas pequeñas con tracking. */
export const dsSectionLabel: CSSProperties = { fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, color: DS.label, textTransform: "uppercase", letterSpacing: "0.1em" }
/** Texto de cuerpo/dato normal. */
export const dsBody: CSSProperties = { fontFamily: FONT_BODY, fontSize: 14, color: DS.textGray }
/** Dato importante en sans (cuando no es número grande). */
export const dsStrong: CSSProperties = { fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: DS.navy }
