"use client"

import { useEffect } from "react"

/**
 * Error boundary del dashboard. Captura cualquier error de renderizado en
 * /dashboard/* y muestra un estado controlado (no la pantalla blanca genérica
 * de Next). Registra el error real en consola para no ocultar fallos en
 * silencio, y ofrece reintentar vía reset().
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // No silenciar: dejar traza del error real (incluye digest del server).
    console.error("[dashboard] error capturado por el boundary:", error)
  }, [error])

  const NAVY = "#1e3a5f"
  const TEAL = "#0891b2"

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f4",
        padding: "1.5rem",
        fontFamily: "var(--font-body), system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: "16px",
          boxShadow: "0 20px 50px -28px rgba(15,23,42,0.35)",
          padding: "2.5rem 2.25rem",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "#e6f4f8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke={TEAL}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display), var(--font-body), system-ui, sans-serif",
            fontSize: "1.375rem",
            fontWeight: 700,
            color: NAVY,
            letterSpacing: "-0.02em",
            margin: "0 0 0.5rem",
          }}
        >
          Algo ha fallado
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#6b7280",
            lineHeight: 1.6,
            margin: "0 0 1.75rem",
          }}
        >
          No hemos podido cargar esta página. Inténtalo de nuevo; si el problema
          persiste, contacta con soporte.
        </p>

        <button
          onClick={() => reset()}
          style={{
            height: "44px",
            padding: "0 1.5rem",
            background: NAVY,
            color: "#fff",
            border: "none",
            borderRadius: "11px",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-body), system-ui, sans-serif",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = TEAL
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = NAVY
          }}
        >
          Reintentar
        </button>

        {error.digest ? (
          <p
            style={{
              fontSize: "0.6875rem",
              color: "#9ca3af",
              margin: "1.25rem 0 0",
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            }}
          >
            Ref: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  )
}
