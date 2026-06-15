import type { LucideIcon } from "lucide-react"
import { COLORS, RADIUS, SHADOW, FONT_DISPLAY, FONT_BODY, TONE, type Tone } from "@/lib/dashboard-ui"

/**
 * Tarjeta de KPI única del dashboard. Reutilizada en Solicitudes, Servicios,
 * Clientes y la ficha de cliente. El número es el héroe (Space Grotesk, navy);
 * la etiqueta va debajo y el icono es discreto. El `tone` solo tiñe el icono
 * (acción/positivo = teal, atención = cálido), nunca el número → coherencia.
 *
 * `compact` reduce el aire vertical (para filas densas como la ficha).
 */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  compact = false,
}: {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  tone?: Tone
  compact?: boolean
}) {
  const t = TONE[tone]
  const tile = compact ? 30 : 34
  return (
    <div
      style={{
        position: "relative",
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOW.card,
        padding: compact ? "15px 16px 13px" : "20px 20px 18px",
        minWidth: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: compact ? 14 : 18,
          right: compact ? 14 : 18,
          width: tile,
          height: tile,
          borderRadius: RADIUS.sm,
          background: t.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon style={{ width: compact ? 15 : 16, height: compact ? 15 : 16, color: t.fg }} strokeWidth={2} />
      </span>

      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: compact ? 26 : 32,
          fontWeight: 600,
          color: COLORS.navy,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          marginBottom: compact ? 6 : 9,
          paddingRight: compact ? 36 : 42,
        }}
      >
        {value}
      </div>

      <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>
        {label}
      </div>

      {sub ? (
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: COLORS.textFaint, lineHeight: 1.45 }}>{sub}</div>
      ) : null}
    </div>
  )
}
