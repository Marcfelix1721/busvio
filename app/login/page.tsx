"use client"

import { FormEvent, useRef, useState } from "react"
import { BusFront, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase"

export default function LoginPage() {
  const supabase = createClient()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage("")
    const email = emailRef.current?.value ?? ""
    const password = passwordRef.current?.value ?? ""
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setErrorMessage("Email o contraseña incorrectos"); return }
    await new Promise((resolve) => setTimeout(resolve, 500))
    window.location.replace("/dashboard")
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f5f5f4",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1rem",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "14px",
            background: "#111827", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 1rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}>
            <BusFront style={{ width: "26px", height: "26px", color: "#fff" }} />
          </div>
          <h1 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", margin: 0 }}>
            Busvio
          </h1>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#9ca3af", marginTop: "4px" }}>
            Plataforma de gestión de presupuestos
          </p>
        </div>

        {/* CARD */}
        <div style={{
          background: "#fff",
          borderRadius: "20px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
          padding: "2rem",
        }}>
          <div style={{ marginBottom: "1.75rem" }}>
            <h2 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1.125rem", fontWeight: 600, color: "#111827", margin: 0, letterSpacing: "-0.01em" }}>
              Iniciar sesión
            </h2>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#6b7280", marginTop: "4px" }}>
              Accede a tu panel de gestión
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="email" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 500, color: "#374151" }}>
                Correo electrónico
              </label>
              <input
                ref={emailRef}
                id="email"
                type="email"
                required
                placeholder="correo@empresa.com"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  height: "40px", width: "100%",
                  borderRadius: "9px", border: "1px solid #e5e7eb",
                  background: "#fafafa", padding: "0 12px",
                  fontSize: "0.875rem", color: "#111827", outline: "none",
                  transition: "all 0.15s",
                }}
                onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label htmlFor="password" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 500, color: "#374151" }}>
                Contraseña
              </label>
              <input
                ref={passwordRef}
                id="password"
                type="password"
                required
                placeholder="••••••••"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  height: "40px", width: "100%",
                  borderRadius: "9px", border: "1px solid #e5e7eb",
                  background: "#fafafa", padding: "0 12px",
                  fontSize: "0.875rem", color: "#111827", outline: "none",
                  transition: "all 0.15s",
                }}
                onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" }}
                onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
              />
            </div>

            {errorMessage && (
              <div style={{ borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", padding: "10px 12px" }}>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#dc2626", margin: 0 }}>
                  {errorMessage}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                marginTop: "0.5rem",
                height: "42px", width: "100%",
                borderRadius: "10px", border: "none",
                background: loading ? "#6b7280" : "#111827",
                color: "#fff", fontSize: "0.875rem", fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#1e3a5f" }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#111827" }}
            >
              {loading ? "Entrando..." : <>Iniciar sesión <ArrowRight style={{ width: "15px", height: "15px" }} /></>}
            </button>
          </form>
        </div>

        <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: "center", fontSize: "0.75rem", color: "#9ca3af", marginTop: "1.5rem" }}>
          ¿Problemas para acceder? Contacta con soporte.
        </p>

      </div>
    </main>
  )
}