"use client"

import { FormEvent, useRef, useState } from "react"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import { createClient } from "@/lib/supabase"
import { ADMIN_EMAIL } from "@/lib/admin"

const FONT = "'DM Sans', system-ui, sans-serif"
const TEAL = "#0891b2"

const BULLETS = [
  "Presupuestos automáticos en segundos",
  "Gestión completa de flota y conductores",
  "Análisis de ingresos y rentabilidad",
]

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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setLoading(false); setErrorMessage("Email o contraseña incorrectos"); return }

    if (data.user?.id) {
      // Bloquear acceso si la empresa está desactivada (no aplica al superadmin
      // ni a cuentas sin fila en companies).
      const { data: comp } = await supabase.from("companies").select("active").eq("id", data.user.id).maybeSingle()
      if (comp && comp.active === false && data.user.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut()
        setLoading(false)
        setErrorMessage("Tu cuenta está desactivada. Contacta con soporte para más información.")
        return
      }
      // Registrar el último acceso de la empresa (el user.id ES el company_id).
      await supabase.from("companies").update({ last_login: new Date().toISOString() }).eq("id", data.user.id)
    }
    setLoading(false)
    await new Promise((resolve) => setTimeout(resolve, 500))
    window.location.replace("/dashboard")
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: FONT,
    height: "48px", width: "100%",
    borderRadius: "11px", border: "1px solid #e5e7eb",
    background: "#fafafa", padding: "0 16px",
    fontSize: "0.9375rem", color: "#111827", outline: "none",
    boxSizing: "border-box", transition: "all 0.15s",
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.12)"
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none"
  }

  return (
    <main className="min-h-screen flex" style={{ fontFamily: FONT }}>

      {/* ===================== COLUMNA IZQUIERDA (desktop) ===================== */}
      <section
        className="hidden lg:flex lg:w-3/5 flex-col justify-between"
        style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", padding: 64 }}
      >
        {/* Decoración: blobs teal difuminados para dar profundidad */}
        <div aria-hidden style={{ position: "absolute", top: -120, right: -100, width: 420, height: 420, borderRadius: "50%", background: "rgba(8,145,178,0.10)", filter: "blur(80px)", pointerEvents: "none" }} />
        <div aria-hidden style={{ position: "absolute", bottom: -140, left: -120, width: 380, height: 380, borderRadius: "50%", background: "rgba(8,145,178,0.08)", filter: "blur(80px)", pointerEvents: "none" }} />

        {/* Logo arriba */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
          <FlotaFlyLogo size={38} style={{ filter: "brightness(0) invert(1)" }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>FlotaFly</span>
        </div>

        {/* Contenido central */}
        <div style={{ position: "relative", maxWidth: 600 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 20px" }}>
            Plataforma para empresas de autocares
          </p>
          <h1 style={{ fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.025em", margin: 0 }}>
            Gestiona presupuestos y solicitudes desde un solo lugar
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: "24px 0 40px", maxWidth: 520 }}>
            Automatiza tus presupuestos, gestiona tu flota y crece tu negocio con la plataforma más potente del sector.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            {BULLETS.map(b => (
              <li key={b} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <CheckCircle2 style={{ width: 22, height: 22, color: TEAL, flexShrink: 0 }} />
                <span style={{ fontSize: 16, color: "rgba(255,255,255,0.92)" }}>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Frase abajo con indicador de actividad en vivo */}
        <p style={{ position: "relative", display: "flex", alignItems: "center", gap: 11, fontSize: 15, color: "rgba(255,255,255,0.6)", margin: 0 }}>
          <span className="animate-pulse" aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 4px rgba(34,197,94,0.18)", flexShrink: 0 }} />
          Empresas de toda España ya confían en FlotaFly
        </p>
      </section>

      {/* ===================== COLUMNA DERECHA (formulario) ===================== */}
      <section className="w-full lg:w-2/5 flex items-center justify-center bg-white px-6 py-10 sm:px-10">
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Logo solo en móvil */}
          <div className="lg:hidden" style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FlotaFlyLogo size={48} />
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
                <FlotaFlyWordmark />
              </span>
            </div>
          </div>

          {/* Encabezado */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 28, fontWeight: 600, color: "#111827", letterSpacing: "-0.02em", margin: 0 }}>
              Bienvenido de nuevo
            </h2>
            <p style={{ fontSize: 15, color: "#6b7280", margin: "12px 0 0" }}>
              Accede a tu panel de gestión
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                Correo electrónico
              </label>
              <input ref={emailRef} id="email" type="email" required placeholder="correo@empresa.com"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                Contraseña
              </label>
              <input ref={passwordRef} id="password" type="password" required placeholder="••••••••"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            {errorMessage && (
              <div style={{ borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", padding: "11px 14px" }}>
                <p style={{ fontSize: 13.5, color: "#dc2626", margin: 0 }}>{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                fontFamily: FONT, marginTop: 4,
                height: 48, width: "100%",
                borderRadius: 11, border: "none",
                background: loading ? "#6b7280" : "#111827",
                color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#1e3a5f" }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#111827" }}
            >
              {loading ? "Entrando..." : <>Iniciar sesión <ArrowRight style={{ width: 16, height: 16 }} /></>}
            </button>
          </form>

          {/* Soporte */}
          <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", marginTop: 28 }}>
            ¿Problemas para acceder?{" "}
            <a href="mailto:hola@flotafly.com" style={{ color: "#1e3a5f", fontWeight: 600, textDecoration: "none" }}>
              Contacta con soporte
            </a>
          </p>

        </div>
      </section>
    </main>
  )
}
