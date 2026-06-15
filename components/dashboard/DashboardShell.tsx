"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { DashboardSidebar } from "./DashboardSidebar"
import { FlotaFlyLogo } from "@/components/FlotaFlyLogo"
import { COLORS, FONT_BODY, FONT_DISPLAY } from "@/lib/dashboard-ui"

/**
 * Shell responsive del dashboard. En escritorio el sidebar es fijo (256px); en
 * móvil (<900px) se convierte en un drawer que se abre con la hamburguesa de la
 * top-bar (las clases .dash-* viven en globals.css). Se cierra al navegar o al
 * tocar el overlay.
 */
export function DashboardShell({ email, children }: { email?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: COLORS.bg, fontFamily: FONT_BODY, color: COLORS.text }}>
      <div className={`dash-sidebar${open ? " is-open" : ""}`} style={{ flexShrink: 0 }}>
        <DashboardSidebar email={email} />
      </div>

      {open && <div className="dash-overlay" onClick={() => setOpen(false)} aria-hidden />}

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh" }}>
        {/* TOP-BAR (solo móvil) */}
        <div className="dash-topbar">
          <button onClick={() => setOpen(o => !o)} aria-label={open ? "Cerrar menú" : "Abrir menú"}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 9, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", cursor: "pointer", flexShrink: 0 }}>
            {open ? <X style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FlotaFlyLogo size={26} style={{ filter: "brightness(0) invert(1)" }} />
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
              <span style={{ color: "#fff" }}>Flota</span><span style={{ color: COLORS.tealOnDark }}>Fly</span>
            </span>
          </div>
        </div>

        <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>{children}</main>
      </div>
    </div>
  )
}
