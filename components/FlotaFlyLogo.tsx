import type { CSSProperties } from "react"

const NAVY = "#1e3a5f"
const TEAL = "#0891b2"

/**
 * Logo de FlotaFly dibujado como SVG inline (sin PNG, fondo 100% transparente).
 * Volante de autocar: aro exterior grueso azul marino, tres radios (dos
 * laterales y uno inferior, con hueco libre arriba) y cubo central teal con "FF".
 *
 * Sobre fondos oscuros, envolver en un contenedor blanco
 * (background:#fff, borderRadius:8, padding:4). Sobre fondos claros, usar directo.
 */
export function FlotaFlyLogo({ size = 24, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FlotaFly"
      style={{ background: "transparent", display: "block", flexShrink: 0, ...style }}
    >
      {/* Aro exterior grueso */}
      <circle cx="50" cy="50" r="39" stroke={NAVY} strokeWidth="9" fill="none" />
      {/* Radios: dos laterales y uno inferior, con hueco libre arriba */}
      <g stroke={NAVY} strokeWidth="9" strokeLinecap="round">
        <line x1="33" y1="50" x2="15" y2="50" />
        <line x1="67" y1="50" x2="85" y2="50" />
        <line x1="50" y1="67" x2="50" y2="85" />
      </g>
      {/* Cubo central teal (sin relleno entre aro y centro, solo los radios) */}
      <circle cx="50" cy="50" r="19" fill={TEAL} />
      {/* Iniciales FF en blanco */}
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'DM Sans', system-ui, sans-serif"
        fontWeight="700"
        fontSize="20"
        letterSpacing="-1.5"
        fill="#fff"
      >
        FF
      </text>
    </svg>
  )
}

/**
 * Nombre de la marca en bicolor: "Flota" en azul marino (#111827 por defecto)
 * y "Fly" en teal. Hereda tamaño, peso y fuente del elemento contenedor.
 * Sobre fondos oscuros, pasar flotaColor="#fff" para que "Flota" sea legible.
 */
export function FlotaFlyWordmark({ flotaColor = "#111827", flyColor = TEAL }: { flotaColor?: string; flyColor?: string }) {
  return (
    <>
      <span style={{ color: flotaColor }}>Flota</span>
      <span style={{ color: flyColor }}>Fly</span>
    </>
  )
}
