"use client"

import { useRouter } from "next/navigation"

export function ImpersonationBanner() {
  const router = useRouter()

  async function stopImpersonation() {
    try {
      const response = await fetch("/api/admin/stop-impersonation", {
        method: "POST",
      })

      if (response.ok) {
        router.push("/admin")
        router.refresh()
      } else {
        alert("Error al salir de la impersonación")
      }
    } catch (err) {
      console.error(err)
      alert("Error al salir de la impersonación")
    }
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={() => router.push("/admin")}
        style={{
          padding: "6px 14px",
          background: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 8,
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.25)"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.2)"
        }}
      >
        ← Volver a Admin
      </button>
      <button
        onClick={stopImpersonation}
        style={{
          padding: "6px 14px",
          background: "#fff",
          border: "none",
          borderRadius: 8,
          color: "#7c3aed",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "#f3f4f6"
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "#fff"
        }}
      >
        Salir de impersonación
      </button>
    </div>
  )
}
