import type { CSSProperties } from "react"

const NAVY = "#1e3a5f"
const TEAL = "#0891b2"

/**
 * Logo de FlotaFly dibujado como SVG inline (sin PNG, fondo 100% transparente).
 * Volante azul marino con el cubo central en teal y las iniciales "FF".
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
      {/* Aro del volante */}
      <circle cx="50" cy="50" r="40" stroke={NAVY} strokeWidth="7" fill="none" />
      {/* Radios */}
      <g stroke={NAVY} strokeWidth="7" strokeLinecap="round">
        <line x1="50" y1="67" x2="50" y2="87" />
        <line x1="35.3" y1="41.5" x2="18" y2="31.5" />
        <line x1="64.7" y1="41.5" x2="82" y2="31.5" />
      </g>
      {/* Cubo central */}
      <circle cx="50" cy="50" r="18" fill={TEAL} />
      {/* Iniciales */}
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'DM Sans', system-ui, sans-serif"
        fontWeight="700"
        fontSize="20"
        letterSpacing="-1.5"
        fill={NAVY}
      >
        FF
      </text>
    </svg>
  )
}
