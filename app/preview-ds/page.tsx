// PREVIEW TEMPORAL del sistema visual v2 (FASE 1). Pública para capturarla. SE BORRA.
import {
  DS, FONT_SERIF, FONT_BODY, MATTE_NAVY, matteNavySurface, DS_HAIRLINE,
  dsPageTitle, dsTealBar, dsSerifNumber, dsSmallLabel, dsSectionLabel, dsBody,
} from "@/lib/dashboard-ui"

const tealOnNavy = "#2bb8d4"

function NavItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 8, background: active ? "rgba(255,255,255,0.08)" : "transparent", boxShadow: active ? `inset 2px 0 0 ${tealOnNavy}` : "none" }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: active ? tealOnNavy : "rgba(255,255,255,0.35)" }} />
      <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: active ? DS.onNavy : DS.onNavyMuted, fontWeight: active ? 600 : 500 }}>{label}</span>
    </div>
  )
}

function Kpi({ value, label, teal = false }: { value: string; label: string; teal?: boolean }) {
  return (
    <div style={{ flex: 1, padding: "0 28px" }}>
      <div style={{ ...dsSerifNumber, fontSize: 34, color: teal ? DS.teal : DS.navy }}>{value}</div>
      <div style={{ ...dsSmallLabel, marginTop: 8 }}>{label}</div>
    </div>
  )
}

export default function PreviewDS() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: DS.bg, fontFamily: FONT_BODY }}>

      {/* SIDEBAR — navy MATE */}
      <aside style={{ width: 256, flexShrink: 0, ...matteNavySurface, padding: 18, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "8px 10px 22px" }}>
          <p style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
            <span style={{ color: DS.onNavy }}>Flota</span><span style={{ color: tealOnNavy }}>Fly</span>
          </p>
          <p style={{ ...dsSmallLabel, color: DS.onNavyFaint, marginTop: 2 }}>Panel de gestión</p>
        </div>
        <p style={{ ...dsSectionLabel, color: DS.onNavyFaint, padding: "0 12px", margin: "8px 0 8px" }}>Operaciones</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavItem label="Solicitudes" active />
          <NavItem label="Servicios" />
          <NavItem label="Clientes" />
        </div>
        <p style={{ ...dsSectionLabel, color: DS.onNavyFaint, padding: "0 12px", margin: "22px 0 8px" }}>Recursos</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavItem label="Conductores" />
          <NavItem label="Vehículos" />
        </div>
        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <span style={{ ...dsSmallLabel, color: DS.onNavyMuted }}>demo@autobuses.es</span>
        </div>
      </aside>

      {/* CONTENIDO — claro y luminoso */}
      <main style={{ flex: 1, padding: "40px 48px" }}>
        {/* Título + barrita teal */}
        <h1 style={dsPageTitle}>Solicitudes</h1>
        <div style={dsTealBar} />

        {/* KPIs en fila, separados por LÍNEAS verticales (sin cajas) */}
        <div style={{ display: "flex", marginTop: 40, paddingBottom: 8 }}>
          <div style={{ flex: 1, padding: "0 28px 0 0" }}>
            <div style={{ ...dsSerifNumber, fontSize: 34 }}>42</div>
            <div style={{ ...dsSmallLabel, marginTop: 8 }}>Solicitudes</div>
          </div>
          <div style={{ borderLeft: DS_HAIRLINE }}><Kpi value="68%" label="Tasa de cierre" /></div>
          <div style={{ borderLeft: DS_HAIRLINE }}><Kpi value="84.250 €" label="Facturado" teal /></div>
          <div style={{ borderLeft: DS_HAIRLINE }}><Kpi value="11.900 €" label="Pendiente de cobro" /></div>
        </div>

        <div style={{ borderTop: DS_HAIRLINE, margin: "32px 0" }} />

        {/* Fila de solicitante: iniciales + nombre serif + datos con etiquetas pequeñas + fecha */}
        <p style={{ ...dsSectionLabel, marginBottom: 18 }}>Última solicitud</p>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: DS.surface, border: DS_HAIRLINE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, color: DS.navy }}>ML</span>
          </div>
          <div style={{ minWidth: 180 }}>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, color: DS.navy }}>María López</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: DS.teal }} />
              <span style={{ ...dsBody, fontSize: 13, color: DS.teal, fontWeight: 600 }}>Nueva</span>
            </div>
          </div>
          <div style={{ paddingLeft: 24, borderLeft: DS_HAIRLINE }}>
            <div style={dsSmallLabel}>Email</div>
            <div style={{ ...dsBody, color: DS.navy, marginTop: 3 }}>maria@sanroque.es</div>
          </div>
          <div style={{ paddingLeft: 24, borderLeft: DS_HAIRLINE }}>
            <div style={dsSmallLabel}>Teléfono</div>
            <div style={{ ...dsBody, color: DS.navy, marginTop: 3 }}>611 222 333</div>
          </div>
          <div style={{ paddingLeft: 24, borderLeft: DS_HAIRLINE, textAlign: "center" }}>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 600, color: DS.navy, lineHeight: 1 }}>29</div>
            <div style={{ ...dsSmallLabel, marginTop: 4 }}>jun · lunes</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={dsSmallLabel}>Total</div>
            <div style={{ ...dsSerifNumber, fontSize: 26, color: DS.teal, marginTop: 2 }}>1.480 €</div>
          </div>
        </div>

        <div style={{ borderTop: DS_HAIRLINE, margin: "32px 0" }} />

        {/* Muestra del navy mate en botón + barra de total */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button style={{ ...matteNavySurface, color: DS.onNavy, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, border: "none", borderRadius: 10, padding: "12px 22px", cursor: "pointer" }}>
            Enviar presupuesto
          </button>
          <div style={{ ...matteNavySurface, flex: 1, borderRadius: 12, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: DS.onNavyMuted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total presupuesto</span>
            <span style={{ fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 600, color: DS.onNavy }}>1.480,00 €</span>
          </div>
        </div>

        <p style={{ ...dsSmallLabel, marginTop: 48, textAlign: "center" }}>FlotaFly · sistema visual v2 (preview)</p>
      </main>
    </div>
  )
}
