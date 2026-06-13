"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import {
  ArrowRight, Check, Eye, EyeOff, Lock, MapPin, Fuel, Users, Receipt, BadgeCheck,
} from "lucide-react"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import { createClient } from "@/lib/supabase"
import { ADMIN_EMAIL } from "@/lib/admin"

/* ============================ Sistema de marca (igual que la landing) ===== */
const NAVY = "#1e3a5f"
const NAVY_DEEP = "#0c1c30"
const TEAL = "#0891b2"
const INK = "#0f1b2d"
const MUTED = "#54616f"

const BULLETS = [
  "Presupuestos automáticos en segundos",
  "Gestión completa de flota y conductores",
  "Análisis de ingresos y rentabilidad",
]

/* Desglose — mismas cifras que la landing, para coherencia de producto. */
const COST_ROWS: { label: string; value: string; icon: typeof Fuel; margin?: boolean }[] = [
  { label: "Combustible", value: "372 €", icon: Fuel },
  { label: "Conductor + dietas", value: "410 €", icon: Users },
  { label: "Peajes", value: "96 €", icon: Receipt },
  { label: "Tu margen", value: "250 €", icon: BadgeCheck, margin: true },
]
const TOTAL = "1.128 €"

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
    <main ref={rootRef} className="lp font-body flex min-h-screen overflow-x-hidden" style={{ color: INK }}>

      {/* ===================== PANEL NAVY (escritorio) ===================== */}
      <section
        className="relative hidden overflow-hidden p-12 lg:flex lg:w-3/5 lg:items-center lg:justify-center xl:p-16"
        style={{ background: `linear-gradient(155deg, ${NAVY_DEEP} 0%, #13243c 45%, ${NAVY} 100%)` }}
      >
        {/* Textura: malla de puntos muy tenue */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(ellipse 75% 65% at 35% 45%, #000 35%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 35% 45%, #000 35%, transparent 85%)",
          }}
        />
        {/* Glow teal suave detrás del visual */}
        <div aria-hidden className="pointer-events-none absolute -right-24 top-1/4 h-[460px] w-[460px] rounded-full" style={{ background: "rgba(8,145,178,0.18)", filter: "blur(110px)" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full" style={{ background: "rgba(8,145,178,0.08)", filter: "blur(100px)" }} />

        {/* Logo (fijado arriba a la izquierda) */}
        <div className="ff-rise absolute left-12 top-12 flex items-center gap-3 xl:left-16 xl:top-14" style={{ animationDelay: "0ms" }}>
          <FlotaFlyLogo size={34} style={{ filter: "brightness(0) invert(1)" }} />
          <span className="font-display text-xl font-bold text-white" style={{ letterSpacing: "-0.01em" }}>FlotaFly</span>
        </div>

        {/* Bloque de valor (centrado verticalmente) */}
        <div className="relative w-full max-w-xl">
          <p className="ff-rise text-xs font-bold uppercase tracking-[0.16em]" style={{ animationDelay: "60ms", color: "#5fd3ee" }}>
            Plataforma para empresas de autocares
          </p>
          <h1 className="ff-rise font-display mt-4 text-[2rem] font-bold leading-[1.1] text-white xl:text-[2.4rem]" style={{ animationDelay: "120ms" }}>
            Gestiona presupuestos y solicitudes desde un solo lugar
          </h1>

          {/* Visual del producto: mini-demo del cálculo (mismo lenguaje que la landing) */}
          <div className="ff-rise relative mt-8" style={{ animationDelay: "200ms" }}>
            <LoginCalcCard />
          </div>

          {/* 3 checks integrados bajo el visual */}
          <ul className="ff-rise mt-7 grid gap-2.5" style={{ animationDelay: "300ms" }}>
            {BULLETS.map((b) => (
              <li key={b} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(8,145,178,0.22)" }}>
                  <Check className="h-3 w-3" style={{ color: "#5fd3ee" }} />
                </span>
                <span className="text-[0.95rem]" style={{ color: "rgba(255,255,255,0.88)" }}>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===================== FORMULARIO (derecha) ===================== */}
      <section className="flex w-full items-center justify-center px-5 py-10 sm:px-8 lg:w-2/5" style={{ background: "#fafafa" }}>
        <div className="ff-rise w-full max-w-[420px]" style={{ animationDelay: "80ms" }}>

          {/* Tarjeta que ancla el formulario */}
          <div
            className="rounded-3xl border bg-white p-7 sm:p-9"
            style={{ borderColor: "#e7eaee", boxShadow: "0 30px 70px -34px rgba(15,27,45,0.35), 0 2px 6px -2px rgba(15,27,45,0.06)" }}
          >
            {/* Logo solo en móvil (en escritorio ya está en el panel navy) */}
            <div className="mb-7 flex justify-center lg:hidden">
              <div className="flex items-center gap-2.5">
                <FlotaFlyLogo size={40} />
                <span className="font-display text-xl font-bold" style={{ letterSpacing: "-0.01em" }}>
                  <FlotaFlyWordmark />
                </span>
              </div>
            </div>

            {/* Encabezado */}
            <div className="mb-7">
              <h2 className="font-display text-[1.7rem] font-bold tracking-tight" style={{ color: INK }}>
                Bienvenido de nuevo
              </h2>
              <p className="mt-2 text-[0.95rem]" style={{ color: MUTED }}>
                Accede a tu panel de gestión
              </p>
            </div>

            {/* Formulario */}
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
          <p className="mt-6 text-center text-[0.85rem]" style={{ color: "#9aa5b1" }}>
            ¿Problemas para acceder?{" "}
            <a href="mailto:hola@flotafly.com" className="ff-underline font-semibold" style={{ color: NAVY }}>
              Contacta con soporte
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}

/* ============================ Mini-demo del cálculo ====================== */
function LoginCalcCard() {
  return (
    <div className="relative mx-auto max-w-sm lg:mx-0">
      <div className="overflow-hidden rounded-3xl border bg-white" style={{ borderColor: "#e6e9ec", boxShadow: "0 40px 80px -28px rgba(0,0,0,0.55)" }}>
        {/* chrome */}
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "#eef1f3", background: "#fafbfc" }}>
          <div className="flex items-center gap-2">
            <FlotaFlyLogo size={18} />
            <span className="text-xs font-semibold" style={{ color: INK }}>Cálculo automático</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide" style={{ background: "#eaf6f9", color: TEAL }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="ff-ping absolute inline-flex h-full w-full rounded-full" style={{ background: TEAL }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: TEAL }} />
            </span>
            En vivo
          </span>
        </div>

        <div className="p-4">
          {/* ruta con vuelta al garaje */}
          <div className="relative rounded-2xl border px-3 py-3" style={{ borderColor: "#eef1f3", background: "#f7f9fb" }}>
            <div className="flex items-center justify-between gap-1">
              {[
                { l: "Garaje", icon: true },
                { l: "Madrid" },
                { l: "Barcelona" },
                { l: "Garaje", icon: true, hot: true },
              ].map((s, i, arr) => (
                <div key={i} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: s.hot ? TEAL : s.icon ? NAVY : "#fff", border: s.icon ? "none" : `2px solid ${NAVY}` }}>
                      {s.icon ? <MapPin className="h-3 w-3 text-white" /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: NAVY }} />}
                    </span>
                    <span className="text-[0.6rem] font-semibold" style={{ color: s.hot ? TEAL : INK }}>{s.l}</span>
                  </div>
                  {i < arr.length - 1 && <span className="mx-0.5 h-px flex-1" style={{ background: "#d2dbe2" }} />}
                </div>
              ))}
            </div>
            <span className="ff-route-dot absolute top-[13px] h-2 w-2 rounded-full" style={{ background: TEAL, boxShadow: "0 0 0 4px rgba(8,145,178,0.2)" }} aria-hidden />
            <p className="mt-2.5 text-center text-[0.62rem] font-medium" style={{ color: MUTED }}>
              1.242 km · ida y vuelta al garaje
            </p>
          </div>

          {/* desglose */}
          <div className="mt-3.5 flex flex-col gap-2">
            {COST_ROWS.map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[0.76rem]" style={{ color: MUTED }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: r.margin ? "#eafaf0" : "#eef2f5", color: r.margin ? "#15803d" : NAVY }}>
                    <r.icon className="h-3 w-3" />
                  </span>
                  {r.label}
                </span>
                <span className="font-display text-[0.8rem] font-semibold" style={{ color: r.margin ? "#15803d" : INK }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* total */}
          <div className="mt-3.5 flex items-end justify-between rounded-2xl px-4 py-3" style={{ background: NAVY }}>
            <div>
              <p className="text-[0.6rem] font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>Precio final para el cliente</p>
              <p className="font-display text-2xl font-bold text-white">{TOTAL}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.6rem] font-bold text-white" style={{ background: "rgba(255,255,255,0.16)" }}>
              <Check className="h-3 w-3" /> PDF enviado
            </span>
          </div>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[0.64rem] font-medium" style={{ color: "#8b97a4" }}>
            <Lock className="h-3 w-3" /> El desglose de costes solo lo ves tú
          </p>
        </div>
      </div>
    </div>
  )
}
