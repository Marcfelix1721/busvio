import type { CSSProperties } from "react"

const TEAL = "#0891b2"

/**
 * Logo de FlotaFly (volante azul marino) servido desde /logo-flotafly.svg.
 *
 * Sobre fondos oscuros, envolver en un contenedor blanco
 * (background:#fff, borderRadius:8, padding:4). Sobre fondos claros, usar directo.
 */
export function FlotaFlyLogo({ size = 24, style }: { size?: number; style?: CSSProperties }) {
  return (
    <img
      src="/logo-flotafly.svg"
      alt="FlotaFly"
      width={size}
      height={size}
      style={{ objectFit: "contain", ...style }}
    />
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
