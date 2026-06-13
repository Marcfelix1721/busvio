"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import { createClient } from "@/lib/supabase"
import { ADMIN_EMAIL } from "@/lib/admin"

/* ============================ Sistema de marca ============================ */
const NAVY = "#1e3a5f"
const INK = "#0f1b2d"
const MUTED = "#54616f"

export default function LoginPage() {
  const supabase = createClient()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLElement>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Activa las animaciones de entrada tras hidratar (contenido visible sin JS).
  useEffect(() => {
    rootRef.current?.classList.add("js-ready")
  }, [])

  // —— Lógica de autenticación: SIN CAMBIOS ——
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

  const inputClass =
    "h-12 w-full rounded-xl border bg-[#fafbfc] px-3.5 text-[0.95rem] text-[#0f1b2d] outline-none transition focus:border-[#0891b2] focus:bg-white focus:ring-4 focus:ring-[#0891b2]/15"

  return (
    <main
      ref={rootRef}
      className="lp font-body relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-6"
      style={{ background: "#fafafa", color: INK }}
    >
      {/* Toque de marca muy sutil detrás (sin contenido de venta) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(30,58,95,0.05) 1px, transparent 0)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(ellipse 60% 52% at 50% 40%, #000 28%, transparent 74%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 52% at 50% 40%, #000 28%, transparent 74%)",
          }}
        />
        <div
          className="absolute left-1/2 top-[-12%] h-[440px] w-[720px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(30,58,95,0.10), transparent 70%)", filter: "blur(36px)" }}
        />
        <div
          className="absolute left-1/2 top-[2%] h-[280px] w-[280px] -translate-x-1/2 rounded-full"
          style={{ background: "rgba(8,145,178,0.07)", filter: "blur(90px)" }}
        />
      </div>

      {/* Columna centrada: logo + tarjeta + soporte */}
      <div className="relative w-full max-w-[400px]">

        {/* Logo arriba */}
        <div className="ff-rise mb-7 flex items-center justify-center gap-2.5" style={{ animationDelay: "0ms" }}>
          <FlotaFlyLogo size={38} />
          <span className="font-display text-2xl font-bold" style={{ letterSpacing: "-0.01em" }}>
            <FlotaFlyWordmark />
          </span>
        </div>

        {/* Tarjeta del formulario */}
        <div
          className="ff-rise rounded-3xl border bg-white p-7 sm:p-9"
          style={{
            animationDelay: "80ms",
            borderColor: "#e7eaee",
            boxShadow: "0 30px 70px -34px rgba(15,27,45,0.35), 0 2px 6px -2px rgba(15,27,45,0.06)",
          }}
        >
          <div className="mb-7">
            <h1 className="font-display text-[1.7rem] font-bold tracking-tight" style={{ color: INK }}>
              Bienvenido de nuevo
            </h1>
            <p className="mt-2 text-[0.95rem]" style={{ color: MUTED }}>
              Accede a tu panel de gestión
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[0.8rem] font-semibold" style={{ color: "#374151" }}>
                Correo electrónico
              </label>
              <input ref={emailRef} id="email" type="email" required autoComplete="email"
                placeholder="correo@empresa.com" className={inputClass} style={{ borderColor: "#e2e6ea" }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[0.8rem] font-semibold" style={{ color: "#374151" }}>
                Contraseña
              </label>
              <div className="relative">
                <input ref={passwordRef} id="password" type={showPassword ? "text" : "password"} required
                  autoComplete="current-password" placeholder="••••••••"
                  className={`${inputClass} pr-12`} style={{ borderColor: "#e2e6ea" }} />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#9aa5b1] transition hover:bg-[#f3f5f7] hover:text-[#0f1b2d]"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border px-3.5 py-3" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                <p className="text-[0.85rem]" style={{ color: "#dc2626", margin: 0 }}>{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="ff-btn mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[0.95rem] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              style={{ background: loading ? "#475569" : NAVY, boxShadow: loading ? "none" : "0 14px 30px -12px rgba(30,58,95,0.75)" }}
            >
              {loading ? "Entrando..." : <>Iniciar sesión <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </div>

        {/* Soporte */}
        <p className="ff-rise mt-6 text-center text-[0.85rem]" style={{ animationDelay: "160ms", color: "#9aa5b1" }}>
          ¿Problemas para acceder?{" "}
          <a href="mailto:hola@flotafly.com" className="ff-underline font-semibold" style={{ color: NAVY }}>
            Contacta con soporte
          </a>
        </p>
      </div>
    </main>
  )
}
