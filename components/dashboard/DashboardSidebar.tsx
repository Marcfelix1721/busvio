"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { FlotaFlyLogo } from "@/components/FlotaFlyLogo"
import {
  Inbox, ClipboardList, Users, BarChart3, Calendar, Settings, BusFront, LogOut,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const NAV: { group: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    group: "Principal",
    items: [
      { href: "/dashboard", label: "Solicitudes", icon: Inbox },
      { href: "/dashboard/servicios", label: "Servicios", icon: ClipboardList },
      { href: "/dashboard/clientes", label: "Clientes", icon: Users },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/calendario", label: "Calendario", icon: Calendar },
    ],
  },
  {
    group: "Config",
    items: [
      { href: "/dashboard/ajustes", label: "Ajustes", icon: Settings },
      { href: "/dashboard/conductores", label: "Conductores", icon: BusFront },
    ],
  },
]

const FONT = "'DM Sans', system-ui, sans-serif"

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(href + "/")
}

export function DashboardSidebar({ email }: { email?: string }) {
  const pathname = usePathname() || ""
  const supabase = createClient()
  const [logoutHover, setLogoutHover] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <aside style={{ width: 256, flexShrink: 0, background: "#0f172a", display: "flex", flexDirection: "column", height: "100vh", padding: 16, fontFamily: FONT, boxSizing: "border-box" }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 8px 20px" }}>
        <FlotaFlyLogo size={36} style={{ filter: "brightness(0) invert(1)" }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 16, margin: 0, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
            <span style={{ color: "#fff" }}>Flota</span><span style={{ color: "#0891b2" }}>Fly</span>
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: "2px 0 0" }}>Panel de gestión</p>
        </div>
      </div>

      {/* NAV */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {NAV.map(section => (
          <div key={section.group}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", margin: "24px 0 12px" }}>
              {section.group}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {section.items.map(item => (
                <NavItem key={item.href} item={item} active={isActive(pathname, item.href)} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{(email?.[0] ?? "U").toUpperCase()}</span>
          </div>
          <span title={email} style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
            {email || "—"}
          </span>
        </div>
        <button
          onClick={handleLogout}
          onMouseEnter={() => setLogoutHover(true)}
          onMouseLeave={() => setLogoutHover(false)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 38,
            borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
            background: logoutHover ? "rgba(255,255,255,0.05)" : "transparent",
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT, transition: "background 0.15s",
          }}
        >
          <LogOut style={{ width: 14, height: 14 }} /> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

function NavItem({ item, active }: { item: { href: string; label: string; icon: LucideIcon }; active: boolean }) {
  const [hover, setHover] = useState(false)
  const Icon = item.icon
  const bg = active ? "rgba(255,255,255,0.1)" : hover ? "rgba(255,255,255,0.05)" : "transparent"
  const color = active ? "#fff" : "rgba(255,255,255,0.7)"
  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8,
        fontSize: 13.5, fontWeight: active ? 600 : 500, textDecoration: "none",
        background: bg, color, transition: "all 0.15s",
      }}
    >
      <Icon style={{ width: 17, height: 17, flexShrink: 0 }} /> {item.label}
    </Link>
  )
}
