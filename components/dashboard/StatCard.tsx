import type { LucideIcon } from "lucide-react"
import { COLORS, RADIUS, SHADOW, FONT_DISPLAY, FONT_BODY, TONE, type Tone } from "@/lib/dashboard-ui"

/**
 * Tarjeta de KPI única del dashboard. Reutilizada en Solicitudes, Servicios,
 * Clientes y la ficha de cliente. El número es el héroe (Space Grotesk, navy);
 * la etiqueta va debajo y el icono es discreto. El `tone` solo tiñe el icono
 * (acción/positivo = teal, atención = cálido), nunca el número → coherencia.
 */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  tone?: Tone
}) {
  const t = TONE[tone]
  return (
    <div
      style={{
        position: "relative",
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        boxShadow: SHADOW.card,
        padding: "20px 20px 18px",
        minWidth: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 18,
          right: 18,
          width: 34,
          height: 34,
          borderRadius: RADIUS.sm,
          background: t.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon style={{ width: 16, height: 16, color: t.fg }} strokeWidth={2} />
      </span>

      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 32,
          fontWeight: 600,
          color: COLORS.navy,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          marginBottom: 9,
          paddingRight: 42,
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
