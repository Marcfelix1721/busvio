"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowRight, Check, X, Sparkles, Clock, Calculator, FileText, Sliders,
  Send, ShieldCheck, MapPin, Fuel, Users, Quote, ChevronRight, Lock,
  Receipt, Route, BadgeCheck, LayoutDashboard,
} from "lucide-react"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"

/* ============================ Sistema de marca ============================ */
const NAVY = "#1e3a5f"
const NAVY_DEEP = "#0c1c30"
const TEAL = "#0891b2"
const INK = "#0f1b2d"
const MUTED = "#54616f"

/* Desglose de costes — mismas cifras en toda la página (coherencia). */
const COST_ROWS: { label: string; value: string; tone?: "cost" | "margin" }[] = [
  { label: "Kilómetros (garaje → ruta → garaje)", value: "1.242 km", tone: "cost" },
  { label: "Combustible", value: "372 €", tone: "cost" },
  { label: "Conductor + dietas", value: "410 €", tone: "cost" },
  { label: "Peajes", value: "96 €", tone: "cost" },
  { label: "Tu margen", value: "250 €", tone: "margin" },
]
const TOTAL = "1.128 €"

/* ============================ Página ============================ */
export default function LandingPage() {
  const [showDemoForm, setShowDemoForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [demoForm, setDemoForm] = useState({ nombre: "", empresa: "", email: "", telefono: "" })
  const rootRef = useRef<HTMLDivElement>(null)

  // Activa animaciones tras hidratar (contenido visible si no hay JS) y observa
  // los bloques con [data-reveal] para revelarlos al entrar en pantalla.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.classList.add("js-ready")
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("ff-in")
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    )
    root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  async function handleSubmitDemo(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch("/api/solicitar-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoForm),
      })
      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          setShowDemoForm(false)
          setSubmitted(false)
          setDemoForm({ nombre: "", empresa: "", email: "", telefono: "" })
        }, 3200)
      } else {
        alert("Error al enviar la solicitud")
      }
    } catch {
      alert("Error al enviar la solicitud")
    }
    setSubmitting(false)
  }

  const openDemo = () => setShowDemoForm(true)

  return (
    <div ref={rootRef} className="lp font-body min-h-screen overflow-x-hidden text-[#0f1b2d]" style={{ background: "#fafafa" }}>

      {/* ============================ NAV ============================ */}
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(255,255,255,0.82)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled ? "1px solid #e9ecef" : "1px solid transparent",
          boxShadow: scrolled ? "0 6px 24px -18px rgba(15,27,45,0.45)" : "none",
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="FlotaFly — inicio">
            <FlotaFlyLogo size={34} />
            <span className="font-display text-[1.15rem] font-bold tracking-tight">
              <FlotaFlyWordmark />
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="ff-btn rounded-xl px-3 py-2 text-sm font-semibold text-[#54616f] hover:text-[#0f1b2d] sm:px-4"
            >
              Iniciar sesión
            </Link>
            <button
              onClick={openDemo}
              className="ff-btn inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white sm:px-5"
              style={{ background: NAVY, boxShadow: "0 8px 20px -10px rgba(30,58,95,0.7)" }}
            >
              Solicitar demo
            </button>
          </div>
        </div>
      </nav>

      {/* ============================ HERO ============================ */}
      <header className="relative overflow-hidden px-5 pt-28 pb-16 sm:px-8 sm:pt-32 lg:pt-40 lg:pb-24">
        {/* Fondo decorativo: malla suave + halos teal */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(15,27,45,0.05) 1px, transparent 0)",
              backgroundSize: "26px 26px",
              maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 80%)",
            }}
          />
          <div className="absolute -top-24 right-[-10%] h-[420px] w-[420px] rounded-full" style={{ background: "rgba(8,145,178,0.12)", filter: "blur(90px)" }} />
          <div className="absolute top-40 left-[-12%] h-[380px] w-[380px] rounded-full" style={{ background: "rgba(30,58,95,0.10)", filter: "blur(90px)" }} />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          {/* Columna de texto */}
          <div className="text-center lg:text-left">
            <span
              className="ff-rise inline-flex max-w-full items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
              style={{ animationDelay: "0ms", background: "#fff", borderColor: "#dbe4ec", color: NAVY }}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="ff-ping absolute inline-flex h-full w-full rounded-full" style={{ background: TEAL }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: TEAL }} />
              </span>
              Para empresas de transporte discrecional
            </span>

            <h1
              className="ff-rise font-display mt-6 text-[2.1rem] font-bold leading-[1.06] tracking-tight sm:text-[3.25rem] lg:text-[3.6rem]"
              style={{ animationDelay: "70ms", color: INK }}
            >
              El presupuesto exacto en{" "}
              <span className="relative whitespace-nowrap" style={{ color: TEAL }}>
                30 segundos
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 200 10" fill="none" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 7 C 50 2, 150 2, 198 7" stroke={TEAL} strokeWidth="3" strokeLinecap="round" opacity="0.45" />
                </svg>
              </span>
              , no en 2 horas
            </h1>

            <p
              className="ff-rise mx-auto mt-6 max-w-xl text-[1.02rem] leading-relaxed lg:mx-0"
              style={{ animationDelay: "140ms", color: MUTED }}
            >
              FlotaFly calcula solo el precio real de cada servicio —kilómetros desde tu
              garaje, combustible, conductor, peajes y tu margen— y envía un PDF con tu
              marca al cliente. Tú solo compartes un enlace.
            </p>

            <div
              className="ff-rise mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row lg:justify-start"
              style={{ animationDelay: "210ms" }}
            >
              <button
                onClick={openDemo}
                className="ff-btn inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[0.95rem] font-semibold text-white"
                style={{ background: NAVY, boxShadow: "0 14px 30px -12px rgba(30,58,95,0.75)" }}
              >
                Solicitar demo <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/login"
                className="ff-btn inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3.5 text-[0.95rem] font-semibold"
                style={{ background: "#fff", borderColor: "#dbe1e8", color: INK }}
              >
                Acceder a mi cuenta
              </Link>
            </div>

            <p className="ff-rise mt-5 text-xs font-medium" style={{ animationDelay: "280ms", color: "#8b97a4" }}>
              Configuración en 5 minutos · Sin permanencia · Soporte en español
            </p>
          </div>

          {/* Columna demo */}
          <div className="ff-rise relative" style={{ animationDelay: "180ms" }}>
            <DemoCalcCard />
          </div>
        </div>
      </header>

      {/* ============================ EL PROBLEMA ============================ */}
      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16">
          <div data-reveal className="ff-reveal">
            <Eyebrow tone="danger">El día a día sin FlotaFly</Eyebrow>
            <h2 className="font-display mt-4 text-[2rem] font-bold leading-tight tracking-tight sm:text-[2.6rem]" style={{ color: INK }}>
              Cada presupuesto te roba<br className="hidden sm:block" /> media mañana
            </h2>
            <p className="mt-5 max-w-lg text-[1.02rem] leading-relaxed" style={{ color: MUTED }}>
              Abres el Excel de siempre, buscas los kilómetros en el mapa, sumas
              combustible, conductor, dietas y peajes con la calculadora, le aplicas tu
              margen y maquetas el documento. Para cuando respondes, el cliente ya tiene
              tres presupuestos de la competencia.
            </p>
            <p className="mt-4 font-display text-lg font-semibold" style={{ color: NAVY }}>
              Y cada cálculo a ojo te come el margen.
            </p>
          </div>

          <ul data-reveal className="ff-reveal grid gap-3" style={{ animationDelay: "120ms" }}>
            {[
              { icon: Calculator, title: "Cálculos a mano en Excel y Word", desc: "Sumas y restas que cualquier despiste convierte en pérdidas." },
              { icon: Route, title: "Olvidas los km de vuelta al garaje", desc: "El trayecto en vacío que nadie cobra y que sale de tu bolsillo." },
              { icon: Clock, title: "Tardas horas o días en responder", desc: "El presupuesto se queda esperando entre servicio y servicio." },
              { icon: Users, title: "Pierdes clientes por lentitud", desc: "El que antes responde con un precio claro, se lleva el viaje." },
            ].map(({ icon: Icon, title, desc }) => (
              <li
                key={title}
                className="flex items-start gap-4 rounded-2xl border bg-white p-4 sm:p-5"
                style={{ borderColor: "#ececec" }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "#fdeceb", color: "#c0392b" }}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold" style={{ color: INK }}>{title}</p>
                  <p className="mt-0.5 text-sm leading-snug" style={{ color: MUTED }}>{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================ CÓMO FUNCIONA ============================ */}
      <section id="como-funciona" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28" style={{ background: "#f3f5f7" }}>
        <div className="mx-auto max-w-6xl">
          <div data-reveal className="ff-reveal mx-auto max-w-2xl text-center">
            <Eyebrow>Así de simple</Eyebrow>
            <h2 className="font-display mt-4 text-[2rem] font-bold leading-tight tracking-tight sm:text-[2.6rem]" style={{ color: INK }}>
              De la solicitud al PDF, sin tocar una calculadora
            </h2>
          </div>

          <div className="relative mt-14 grid gap-6 md:grid-cols-3 md:gap-5">
            {/* línea conectora (desktop) */}
            <div aria-hidden className="absolute left-[16%] right-[16%] top-9 hidden h-px md:block" style={{ background: "linear-gradient(90deg, transparent, #c9d4dd 12%, #c9d4dd 88%, transparent)" }} />
            {[
              {
                n: "1", title: "Comparte tu enlace", icon: Send,
                desc: "Tu cliente abre tu formulario y escribe origen, destino, fecha y número de pasajeros.",
                visual: <StepForm />,
              },
              {
                n: "2", title: "FlotaFly calcula el precio real", icon: Calculator,
                desc: "Ruta desde tu garaje, combustible, conductor, peajes y tu margen, al instante.",
                visual: <StepCalc />,
              },
              {
                n: "3", title: "Se envía el PDF con tu marca", icon: FileText,
                desc: "El cliente recibe un presupuesto profesional con tu logo. Tú ves el desglose completo.",
                visual: <StepPdf />,
              },
            ].map((s, i) => (
              <div key={s.n} data-reveal className="ff-reveal relative" style={{ animationDelay: `${i * 110}ms` }}>
                <div className="ff-card relative flex h-full flex-col rounded-3xl border bg-white p-6" style={{ borderColor: "#e6e9ec" }}>
                  <div className="flex items-center gap-3">
                    <span
                      className="font-display flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white"
                      style={{ background: i === 1 ? TEAL : NAVY, boxShadow: `0 10px 22px -10px ${i === 1 ? "rgba(8,145,178,0.8)" : "rgba(30,58,95,0.8)"}` }}
                    >
                      {s.n}
                    </span>
                    <s.icon className="h-5 w-5" style={{ color: MUTED }} />
                  </div>
                  <h3 className="font-display mt-5 text-lg font-bold tracking-tight" style={{ color: INK }}>{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>{s.desc}</p>
                  <div className="mt-5 rounded-2xl border p-3" style={{ borderColor: "#eef1f3", background: "#fafbfc" }}>
                    {s.visual}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ DIFERENCIADOR (navy) ============================ */}
      <section className="relative overflow-hidden px-5 py-20 sm:px-8 lg:py-28" style={{ background: `linear-gradient(160deg, ${NAVY_DEEP} 0%, #15314f 100%)` }}>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 right-[-8%] h-[460px] w-[460px] rounded-full" style={{ background: "rgba(8,145,178,0.18)", filter: "blur(110px)" }} />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div data-reveal className="ff-reveal max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]" style={{ background: "rgba(8,145,178,0.15)", color: "#5fd3ee" }}>
              <Sparkles className="h-3.5 w-3.5" /> Nuestro diferenciador
            </span>
            <h2 className="font-display mt-5 text-[2rem] font-bold leading-tight tracking-tight text-white sm:text-[2.7rem]">
              Calculamos los kilómetros que otros se dejan
            </h2>
            <p className="mt-5 text-[1.05rem] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              El viaje no empieza en la recogida: empieza en tu garaje y termina cuando el
              autocar vuelve. FlotaFly cuenta el trayecto completo para que el precio cubra
              tu coste real, no uno inventado.
            </p>
          </div>

          {/* Diagrama del recorrido con garaje */}
          <div data-reveal className="ff-reveal mt-12 rounded-3xl border p-6 sm:p-8" style={{ animationDelay: "100ms", background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.12)" }}>
            <RouteDiagram />
          </div>

          {/* Privacidad del desglose: cliente vs empresa */}
          <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:items-stretch">
            <div data-reveal className="ff-reveal">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                <Users className="h-4 w-4" /> Lo que ve tu cliente
              </p>
              <ClientPdfCard onOpen={openDemo} />
            </div>
            <div data-reveal className="ff-reveal" style={{ animationDelay: "100ms" }}>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "#5fd3ee" }}>
                <Lock className="h-4 w-4" /> Lo que ves tú
              </p>
              <OwnerBreakdownCard />
            </div>
          </div>
          <p data-reveal className="ff-reveal mt-7 text-center text-[0.95rem]" style={{ color: "rgba(255,255,255,0.62)" }}>
            Tu cliente ve un precio claro y profesional. Tú ves cómo se compone y cuánto ganas.
          </p>
        </div>
      </section>

      {/* ============================ CARACTERÍSTICAS (bento) ============================ */}
      <section id="caracteristicas" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div data-reveal className="ff-reveal mx-auto max-w-2xl text-center">
            <Eyebrow>Todo en una herramienta</Eyebrow>
            <h2 className="font-display mt-4 text-[2rem] font-bold leading-tight tracking-tight sm:text-[2.6rem]" style={{ color: INK }}>
              Pensado para cómo trabajas de verdad
            </h2>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {/* Tile grande */}
            <article data-reveal className="ff-reveal ff-card md:col-span-2 flex flex-col justify-between overflow-hidden rounded-3xl border bg-white p-7" style={{ borderColor: "#e6e9ec" }}>
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: NAVY }}>
                  <Calculator className="h-6 w-6" />
                </span>
                <h3 className="font-display mt-5 text-xl font-bold tracking-tight" style={{ color: INK }}>
                  Cálculo automático con lógica de garaje
                </h3>
                <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed" style={{ color: MUTED }}>
                  Introduce el servicio y FlotaFly resuelve kilómetros reales, combustible,
                  conductor, dietas, peajes y margen en segundos. Siempre con el mismo criterio.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Km reales", "Combustible", "Conductor", "Dietas", "Peajes", "Margen"].map((t) => (
                  <span key={t} className="rounded-lg border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: "#e3eaf0", background: "#f5f8fa", color: NAVY }}>
                    {t}
                  </span>
                ))}
              </div>
            </article>

            {/* PDF con marca */}
            <article data-reveal className="ff-reveal ff-card flex flex-col rounded-3xl border bg-white p-7" style={{ animationDelay: "70ms", borderColor: "#e6e9ec" }}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: TEAL }}>
                <FileText className="h-6 w-6" />
              </span>
              <h3 className="font-display mt-5 text-lg font-bold tracking-tight" style={{ color: INK }}>PDF con tu marca</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed" style={{ color: MUTED }}>
                Tu logo, tus colores. Un presupuesto que parece de una gran empresa.
              </p>
            </article>

            {/* Panel centralizado */}
            <article data-reveal className="ff-reveal ff-card flex flex-col rounded-3xl border bg-white p-7" style={{ animationDelay: "70ms", borderColor: "#e6e9ec" }}>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: NAVY }}>
                <LayoutDashboard className="h-6 w-6" />
              </span>
              <h3 className="font-display mt-5 text-lg font-bold tracking-tight" style={{ color: INK }}>Panel centralizado</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed" style={{ color: MUTED }}>
                Todas tus solicitudes en un sitio: filtra, busca y ajusta antes de enviar.
              </p>
            </article>

            {/* Variables configurables (wide) */}
            <article data-reveal className="ff-reveal ff-card md:col-span-2 flex flex-col rounded-3xl border p-7" style={{ animationDelay: "140ms", borderColor: "#dde7ee", background: "linear-gradient(135deg,#f5f9fb,#eef4f7)" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: TEAL }}>
                    <Sliders className="h-6 w-6" />
                  </span>
                  <h3 className="font-display mt-5 text-xl font-bold tracking-tight" style={{ color: INK }}>
                    Variables 100% configurables
                  </h3>
                  <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed" style={{ color: MUTED }}>
                    Precio por km, dietas, peajes, recargos de temporada y tu margen. Tú pones
                    las reglas, FlotaFly las aplica siempre igual.
                  </p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { k: "Precio/km", v: "0,95 €" },
                  { k: "Dieta conductor", v: "45 €" },
                  { k: "Recargo finde", v: "+12 %" },
                  { k: "Margen", v: "18 %" },
                ].map((c) => (
                  <div key={c.k} className="rounded-xl border bg-white px-3 py-2.5" style={{ borderColor: "#e3eaf0" }}>
                    <p className="text-[0.7rem] font-medium" style={{ color: "#8b97a4" }}>{c.k}</p>
                    <p className="font-display text-base font-bold" style={{ color: NAVY }}>{c.v}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ============================ PRUEBA SOCIAL ============================ */}
      <section className="px-5 py-20 sm:px-8 lg:py-24" style={{ background: "#f3f5f7" }}>
        <div className="mx-auto max-w-6xl">
          <p data-reveal className="ff-reveal text-center text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: "#8b97a4" }}>
            Empresas de autocar que dejan de calcular a mano
          </p>
          <div data-reveal className="ff-reveal mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="ff-shimmer h-11 w-28 rounded-xl sm:h-12 sm:w-36" aria-hidden />
            ))}
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-stretch">
            {/* Testimonio (placeholder) */}
            <figure data-reveal className="ff-reveal ff-card flex flex-col justify-between rounded-3xl border bg-white p-7 sm:p-9" style={{ borderColor: "#e6e9ec" }}>
              <Quote className="h-8 w-8" style={{ color: "#cfe0e8" }} />
              <blockquote className="font-display mt-4 text-xl font-medium leading-snug tracking-tight sm:text-2xl" style={{ color: INK }}>
                «Antes tardaba media mañana en cada presupuesto. Ahora mando el enlace y el
                cliente tiene el precio antes de colgar el teléfono.»
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full font-display text-base font-bold text-white" style={{ background: NAVY }}>
                  A
                </span>
                <div>
                  <p className="font-semibold" style={{ color: INK }}>Responsable de operaciones</p>
                  <p className="text-sm" style={{ color: MUTED }}>Empresa de autocar · testimonio de ejemplo</p>
                </div>
              </figcaption>
            </figure>

            {/* Sellos de confianza */}
            <div data-reveal className="ff-reveal grid gap-3" style={{ animationDelay: "100ms" }}>
              {[
                { icon: ShieldCheck, t: "Sin permanencia", d: "Te quedas porque te sirve, no por un contrato." },
                { icon: Clock, t: "Configuración en 5 minutos", d: "Cargas tus tarifas y empiezas el mismo día." },
                { icon: Users, t: "Soporte en español", d: "Personas que conocen el sector del autocar." },
                { icon: Lock, t: "Tus datos, siempre tuyos", d: "Privados y bajo tu control en todo momento." },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex items-start gap-3.5 rounded-2xl border bg-white p-4" style={{ borderColor: "#e6e9ec" }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "#eaf6f9", color: TEAL }}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="font-semibold leading-tight" style={{ color: INK }}>{t}</p>
                    <p className="mt-0.5 text-sm leading-snug" style={{ color: MUTED }}>{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================ CTA FINAL ============================ */}
      <section className="px-5 py-20 sm:px-8 lg:py-28">
        <div data-reveal className="ff-reveal relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12 sm:py-20" style={{ background: `linear-gradient(150deg, ${NAVY_DEEP}, #1c3e63)` }}>
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -bottom-24 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full" style={{ background: "rgba(8,145,178,0.22)", filter: "blur(100px)" }} />
          </div>
          <div className="relative">
            <h2 className="font-display mx-auto max-w-2xl text-[1.9rem] font-bold leading-tight tracking-tight text-white sm:text-[2.7rem]">
              ¿Listo para dejar de calcular a mano?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[1.02rem]" style={{ color: "rgba(255,255,255,0.72)" }}>
              Configura tu empresa en 5 minutos y empieza a enviar presupuestos que cierran.
            </p>
            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <button
                onClick={openDemo}
                className="ff-btn inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-[0.95rem] font-bold"
                style={{ color: NAVY, boxShadow: "0 16px 34px -14px rgba(0,0,0,0.6)" }}
              >
                Solicitar demo <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/login"
                className="ff-btn inline-flex items-center justify-center gap-2 rounded-xl border px-7 py-3.5 text-[0.95rem] font-semibold text-white"
                style={{ borderColor: "rgba(255,255,255,0.28)" }}
              >
                Acceder a mi cuenta
              </Link>
            </div>
            <p className="mt-5 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
              Sin tarjeta · Sin permanencia · Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>

      {/* ============================ FOOTER ============================ */}
      <footer className="border-t px-5 py-12 sm:px-8" style={{ borderColor: "#e7eaee", background: "#fff" }}>
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <FlotaFlyLogo size={30} />
                <span className="font-display text-lg font-bold tracking-tight"><FlotaFlyWordmark /></span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed" style={{ color: MUTED }}>
                Presupuestos automáticos para empresas de autocar y transporte discrecional.
              </p>
            </div>
            <FooterCol title="Producto" links={[
              { label: "Cómo funciona", href: "#como-funciona" },
              { label: "Características", href: "#caracteristicas" },
            ]} />
            <FooterColButton title="Empezar" onDemo={openDemo} loginHref="/login" />
            <FooterCol title="Legal" links={[
              { label: "Aviso legal", href: "#" },
              { label: "Privacidad", href: "#" },
            ]} />
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row" style={{ borderColor: "#eef1f3" }}>
            <p className="text-xs" style={{ color: "#9aa5b1" }}>© 2026 FlotaFly. Todos los derechos reservados.</p>
            <p className="text-xs" style={{ color: "#9aa5b1" }}>Hecho en España para el transporte discrecional</p>
          </div>
        </div>
      </footer>

      {/* ============================ MODAL DEMO ============================ */}
      {showDemoForm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(12,28,48,0.55)", backdropFilter: "blur(4px)", animation: "ff-fade 0.2s ease both" }}
          onClick={() => !submitting && setShowDemoForm(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-7 sm:p-8"
            style={{ boxShadow: "0 30px 70px -20px rgba(0,0,0,0.5)", animation: "ff-pop 0.25s cubic-bezier(0.16,0.84,0.44,1) both" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDemoForm(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-[#9aa5b1] transition hover:bg-[#f3f5f7] hover:text-[#0f1b2d]"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            {!submitted ? (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "#eaf6f9", color: TEAL }}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="font-display mt-4 text-2xl font-bold tracking-tight" style={{ color: INK }}>Solicitar demo</h2>
                <p className="mt-1.5 text-sm" style={{ color: MUTED }}>
                  Déjanos tus datos y te enseñamos FlotaFly con tus tarifas. Respondemos en menos de 24 h.
                </p>

                <form onSubmit={handleSubmitDemo} className="mt-6 flex flex-col gap-4">
                  <Field label="Nombre" required value={demoForm.nombre} onChange={(v) => setDemoForm((p) => ({ ...p, nombre: v }))} placeholder="Tu nombre completo" />
                  <Field label="Empresa" value={demoForm.empresa} onChange={(v) => setDemoForm((p) => ({ ...p, empresa: v }))} placeholder="Nombre de tu empresa" />
                  <Field label="Email" type="email" required value={demoForm.email} onChange={(v) => setDemoForm((p) => ({ ...p, email: v }))} placeholder="tu@empresa.com" />
                  <Field label="Teléfono" type="tel" value={demoForm.telefono} onChange={(v) => setDemoForm((p) => ({ ...p, telefono: v }))} placeholder="+34 600 000 000" />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="ff-btn mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[0.95rem] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: NAVY }}
                  >
                    {submitting ? "Enviando..." : <>Enviar solicitud <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "#10b981" }}>
                  <Check className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-display mt-5 text-xl font-bold" style={{ color: INK }}>¡Solicitud enviada!</h3>
                <p className="mt-1.5 text-sm" style={{ color: MUTED }}>Nos pondremos en contacto contigo muy pronto.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================ Subcomponentes ============================ */

function Eyebrow({ children, tone = "teal" }: { children: React.ReactNode; tone?: "teal" | "danger" }) {
  const styles = tone === "danger"
    ? { background: "#fdeceb", color: "#c0392b" }
    : { background: "#eaf6f9", color: TEAL }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]" style={styles}>
      {children}
    </span>
  )
}

function Field({
  label, value, onChange, placeholder, type = "text", required = false,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.8rem] font-semibold" style={{ color: "#374151" }}>
        {label} {required && <span style={{ color: TEAL }}>*</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border px-3.5 text-sm outline-none transition focus:border-[#1e3a5f] focus:ring-4 focus:ring-[#1e3a5f]/10"
        style={{ borderColor: "#e2e6ea", background: "#fafbfc" }}
      />
    </label>
  )
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-sm font-bold" style={{ color: INK }}>{title}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="ff-underline text-sm" style={{ color: MUTED }}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FooterColButton({ title, onDemo, loginHref }: { title: string; onDemo: () => void; loginHref: string }) {
  return (
    <div>
      <p className="text-sm font-bold" style={{ color: INK }}>{title}</p>
      <ul className="mt-3 flex flex-col gap-2">
        <li>
          <button onClick={onDemo} className="ff-underline text-left text-sm" style={{ color: MUTED }}>Solicitar demo</button>
        </li>
        <li>
          <Link href={loginHref} className="ff-underline text-sm" style={{ color: MUTED }}>Iniciar sesión</Link>
        </li>
      </ul>
    </div>
  )
}

/* ---------- Demo animada del hero ---------- */
function DemoCalcCard() {
  return (
    <div className="relative mx-auto max-w-md">
      {/* badges flotantes (desktop) */}
      <div className="ff-float absolute -left-6 top-16 z-10 hidden rounded-2xl border bg-white px-3.5 py-2.5 shadow-lg lg:block" style={{ borderColor: "#e6e9ec", animationDelay: "0.4s" }}>
        <p className="font-display text-lg font-bold" style={{ color: TEAL }}>≈ 30 s</p>
        <p className="text-[0.7rem] font-medium" style={{ color: MUTED }}>de cálculo</p>
      </div>
      <div className="ff-float absolute -right-5 bottom-20 z-10 hidden rounded-2xl border bg-white px-3.5 py-2.5 shadow-lg lg:block" style={{ borderColor: "#e6e9ec", animationDelay: "1.4s" }}>
        <p className="font-display text-lg font-bold" style={{ color: "#15803d" }}>0 errores</p>
        <p className="text-[0.7rem] font-medium" style={{ color: MUTED }}>de cálculo</p>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-white" style={{ borderColor: "#e6e9ec", boxShadow: "0 40px 80px -32px rgba(15,27,45,0.45)" }}>
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

        <div className="p-4 sm:p-5">
          {/* ruta */}
          <div className="relative rounded-2xl border px-3 py-3.5" style={{ borderColor: "#eef1f3", background: "#f7f9fb" }}>
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
            {/* punto que recorre la ruta */}
            <span className="ff-route-dot absolute top-[14px] h-2 w-2 rounded-full" style={{ background: TEAL, boxShadow: `0 0 0 4px rgba(8,145,178,0.2)` }} aria-hidden />
            <p className="mt-3 text-center text-[0.65rem] font-medium" style={{ color: MUTED }}>
              1.242 km · ida y vuelta al garaje incluida
            </p>
          </div>

          {/* desglose */}
          <div className="mt-4 flex flex-col gap-2">
            {COST_ROWS.map((r, i) => (
              <div
                key={r.label}
                className="ff-rise flex items-center justify-between"
                style={{ animationDelay: `${500 + i * 180}ms` }}
              >
                <span className="flex items-center gap-2 text-[0.78rem]" style={{ color: MUTED }}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: r.tone === "margin" ? "#eafaf0" : "#eef2f5", color: r.tone === "margin" ? "#15803d" : NAVY }}>
                    {i === 0 ? <Route className="h-3 w-3" /> : i === 1 ? <Fuel className="h-3 w-3" /> : i === 2 ? <Users className="h-3 w-3" /> : i === 3 ? <Receipt className="h-3 w-3" /> : <BadgeCheck className="h-3 w-3" />}
                  </span>
                  {r.label}
                </span>
                <span className="font-display text-[0.82rem] font-semibold" style={{ color: r.tone === "margin" ? "#15803d" : INK }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* total */}
          <div className="ff-rise mt-4 flex items-end justify-between rounded-2xl px-4 py-3.5" style={{ animationDelay: "1500ms", background: NAVY }}>
            <div>
              <p className="text-[0.62rem] font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>Precio final para el cliente</p>
              <p className="font-display text-2xl font-bold text-white">{TOTAL}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.62rem] font-bold" style={{ background: "rgba(255,255,255,0.16)", color: "#fff" }}>
              <Check className="h-3 w-3" /> PDF enviado
            </span>
          </div>
          <p className="ff-rise mt-2.5 flex items-center justify-center gap-1.5 text-[0.66rem] font-medium" style={{ animationDelay: "1650ms", color: "#8b97a4" }}>
            <Lock className="h-3 w-3" /> El desglose de costes solo lo ves tú
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---------- Visuales de "Cómo funciona" ---------- */
function StepForm() {
  return (
    <div className="flex flex-col gap-2">
      {[
        { l: "Origen", v: "Madrid" },
        { l: "Destino", v: "Barcelona" },
        { l: "Fecha", v: "14 jun · 08:00" },
        { l: "Pasajeros", v: "52" },
      ].map((f) => (
        <div key={f.l} className="flex items-center justify-between rounded-lg border bg-white px-2.5 py-1.5" style={{ borderColor: "#eef1f3" }}>
          <span className="text-[0.65rem] font-medium" style={{ color: "#8b97a4" }}>{f.l}</span>
          <span className="text-[0.72rem] font-semibold" style={{ color: INK }}>{f.v}</span>
        </div>
      ))}
    </div>
  )
}

function StepCalc() {
  return (
    <div className="flex flex-col gap-1.5">
      {[
        { l: "Combustible", v: "372 €" },
        { l: "Conductor + dietas", v: "410 €" },
        { l: "Peajes", v: "96 €" },
        { l: "Margen", v: "250 €", hot: true },
      ].map((f) => (
        <div key={f.l} className="flex items-center justify-between">
          <span className="text-[0.68rem]" style={{ color: MUTED }}>{f.l}</span>
          <span className="font-display text-[0.72rem] font-semibold" style={{ color: f.hot ? "#15803d" : INK }}>{f.v}</span>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between border-t pt-2" style={{ borderColor: "#eef1f3" }}>
        <span className="text-[0.68rem] font-semibold" style={{ color: INK }}>Total</span>
        <span className="font-display text-sm font-bold" style={{ color: NAVY }}>{TOTAL}</span>
      </div>
    </div>
  )
}

function StepPdf() {
  return (
    <div className="rounded-lg border bg-white p-2.5" style={{ borderColor: "#eef1f3" }}>
      <div className="flex items-center gap-1.5 border-b pb-2" style={{ borderColor: "#f1f3f5" }}>
        <FlotaFlyLogo size={13} />
        <span className="text-[0.6rem] font-bold" style={{ color: INK }}>Tu Empresa de Autocares</span>
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="h-1.5 w-3/4 rounded-full" style={{ background: "#eef1f3" }} />
        <div className="h-1.5 w-1/2 rounded-full" style={{ background: "#eef1f3" }} />
      </div>
      <div className="mt-2.5 flex items-center justify-between rounded-md px-2 py-1.5" style={{ background: "#f5f8fa" }}>
        <span className="text-[0.6rem] font-medium" style={{ color: MUTED }}>Total</span>
        <span className="font-display text-[0.72rem] font-bold" style={{ color: NAVY }}>{TOTAL}</span>
      </div>
    </div>
  )
}

/* ---------- Diagrama del recorrido (diferenciador) ---------- */
function RouteDiagram() {
  const stops = [
    { l: "Garaje", s: "Salida en vacío", icon: MapPin },
    { l: "Recogida", s: "Subes al cliente", icon: Users },
    { l: "Destino", s: "Servicio realizado", icon: MapPin },
    { l: "Vuelta al garaje", s: "El km que otros olvidan", icon: Route, hot: true },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {stops.map((st, i) => (
        <div key={st.l} className="relative">
          {i < stops.length - 1 && (
            <ChevronRight className="absolute right-[-14px] top-4 hidden h-5 w-5 sm:block" style={{ color: "rgba(255,255,255,0.3)" }} aria-hidden />
          )}
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: st.hot ? TEAL : "rgba(255,255,255,0.1)", color: "#fff", boxShadow: st.hot ? "0 0 0 4px rgba(8,145,178,0.25)" : "none" }}
            >
              <st.icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>0{i + 1}</span>
          </div>
          <p className="mt-2.5 font-display font-bold" style={{ color: st.hot ? "#5fd3ee" : "#fff" }}>{st.l}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{st.s}</p>
        </div>
      ))}
    </div>
  )
}

/* ---------- Tarjeta: lo que ve el cliente ---------- */
function ClientPdfCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="ff-card flex h-full flex-col rounded-3xl bg-white p-5" style={{ boxShadow: "0 30px 60px -28px rgba(0,0,0,0.5)" }}>
      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#eef1f3" }}>
        <div className="flex items-center gap-2">
          <FlotaFlyLogo size={20} />
          <span className="font-display text-sm font-bold" style={{ color: INK }}>Tu Empresa de Autocares</span>
        </div>
        <span className="rounded-md px-2 py-0.5 text-[0.6rem] font-bold uppercase" style={{ background: "#f5f8fa", color: NAVY }}>Presupuesto</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {[
          { l: "Ruta", v: "Madrid → Barcelona" },
          { l: "Fecha", v: "14 jun · 08:00" },
          { l: "Pasajeros", v: "52" },
          { l: "Vehículo", v: "Autocar 55 plazas" },
        ].map((f) => (
          <div key={f.l}>
            <p className="text-[0.7rem] font-medium" style={{ color: "#8b97a4" }}>{f.l}</p>
            <p className="font-semibold" style={{ color: INK }}>{f.v}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-5">
        <div className="flex items-end justify-between rounded-2xl px-4 py-4" style={{ background: "#f5f8fa" }}>
          <span className="text-sm font-semibold" style={{ color: MUTED }}>Total del servicio</span>
          <span className="font-display text-3xl font-bold" style={{ color: NAVY }}>{TOTAL}</span>
        </div>
        <p className="mt-2.5 text-center text-xs" style={{ color: "#9aa5b1" }}>Un precio claro. Sin desglose de tus costes.</p>
      </div>
    </div>
  )
}

/* ---------- Tarjeta: lo que ve la empresa ---------- */
function OwnerBreakdownCard() {
  return (
    <div className="flex h-full flex-col rounded-3xl border p-5" style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(8,145,178,0.4)" }}>
      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <span className="font-display text-sm font-bold text-white">Desglose interno</span>
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.6rem] font-bold uppercase" style={{ background: "rgba(8,145,178,0.2)", color: "#5fd3ee" }}>
          <Lock className="h-2.5 w-2.5" /> Privado
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        {COST_ROWS.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <span style={{ color: "rgba(255,255,255,0.66)" }}>{r.label}</span>
            <span className="font-display font-semibold" style={{ color: r.tone === "margin" ? "#5fee9f" : "#fff" }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between border-t pt-3.5" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <span className="text-sm font-semibold text-white">Precio al cliente</span>
        <span className="font-display text-2xl font-bold" style={{ color: "#5fd3ee" }}>{TOTAL}</span>
      </div>
    </div>
  )
}
