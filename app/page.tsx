"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Zap, FileText, LayoutDashboard, X } from "lucide-react"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"

export default function LandingPage() {
  const [showDemoForm, setShowDemoForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [demoForm, setDemoForm] = useState({
    nombre: "",
    empresa: "",
    email: "",
    telefono: "",
  })

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
        }, 3000)
      } else {
        alert("Error al enviar la solicitud")
      }
    } catch (err) {
      alert("Error al enviar la solicitud")
    }

    setSubmitting(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #f3f4f6",
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FlotaFlyLogo size={32} />
            <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1rem", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}><FlotaFlyWordmark /></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link href="/login" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", fontWeight: 500, color: "#6b7280", padding: "6px 14px", borderRadius: "8px", textDecoration: "none" }}>
              Iniciar sesión
            </Link>
            <button onClick={() => setShowDemoForm(true)} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", fontWeight: 600, color: "#fff", background: "#111827", padding: "7px 16px", borderRadius: "9px", border: "none", cursor: "pointer" }}>
              Solicitar demo
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: "120px", paddingBottom: "80px", paddingLeft: "1.5rem", paddingRight: "1.5rem" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0369a1", fontSize: "0.75rem", fontWeight: 600, padding: "5px 12px", borderRadius: "999px", marginBottom: "1.75rem", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0ea5e9", display: "inline-block" }} />
            Diseñado para transporte discrecional
          </div>

          <h1 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "clamp(2.25rem, 5vw, 3.25rem)", fontWeight: 700, color: "#111827", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1.25rem" }}>
            Presupuesta más rápido,<br />
            <span style={{ color: "#1e3a5f" }}>cierra más viajes</span>
          </h1>

          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1rem", color: "#6b7280", maxWidth: "520px", margin: "0 auto 2rem", lineHeight: 1.7 }}>
            FlotaFly calcula automáticamente el precio real de cada servicio — combustible, conductor, peajes y margen — y envía el presupuesto al cliente en segundos.
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", flexWrap: "wrap", marginBottom: "1rem" }}>
            <button onClick={() => setShowDemoForm(true)} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: "inline-flex", alignItems: "center", gap: "6px", background: "#111827", color: "#fff", padding: "10px 22px", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 600, border: "none", cursor: "pointer" }}>
              Solicitar demo <ArrowRight style={{ width: "14px", height: "14px" }} />
            </button>
            <Link href="/login" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: "inline-flex", alignItems: "center", gap: "6px", background: "#fff", color: "#374151", padding: "10px 22px", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 500, border: "1px solid #e5e7eb", textDecoration: "none" }}>
              Acceder a mi cuenta
            </Link>
          </div>

          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#9ca3af" }}>
            Configuración en menos de 5 minutos · Sin permanencia
          </p>
        </div>

        {/* MOCKUP */}
        <div style={{ maxWidth: "900px", margin: "3.5rem auto 0" }}>
          <div style={{ background: "#f5f5f4", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "6px", boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
            <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid #f3f4f6" }}>
              {/* Browser bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
                <div style={{ display: "flex", gap: "5px" }}>
                  {["#fca5a5","#fcd34d","#86efac"].map(c => <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />)}
                </div>
                <div style={{ flex: 1, maxWidth: "260px", margin: "0 auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "4px 12px", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.7rem", color: "#9ca3af" }}>
                  app.flotafly.com/dashboard
                </div>
              </div>
              {/* Dashboard mockup */}
              <div style={{ display: "flex", minHeight: "280px" }}>
                {/* Sidebar */}
                <div style={{ width: "160px", background: "#111827", padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", marginBottom: "8px" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FlotaFlyLogo size={17} />
                    </div>
                    <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 700, color: "#fff" }}><FlotaFlyWordmark flotaColor="#fff" /></span>
                  </div>
                  {["Solicitudes","Clientes","Analytics","Ajustes"].map((item, i) => (
                    <div key={item} style={{ padding: "6px 8px", borderRadius: "6px", background: i === 0 ? "#1e3a5f" : "transparent", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.7rem", fontWeight: 500, color: i === 0 ? "#fff" : "#6b7280" }}>
                      {item}
                    </div>
                  ))}
                </div>
                {/* Content */}
                <div style={{ flex: 1, padding: "1.25rem", background: "#f5f5f4" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px", marginBottom: "1rem" }}>
                    {[
                      { label: "Solicitudes", value: "12", color: "#111827" },
                      { label: "En revisión", value: "5", color: "#d97706" },
                      { label: "Enviados", value: "4", color: "#1e3a5f" },
                      { label: "Aceptados", value: "3", color: "#059669" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#fff", borderRadius: "8px", padding: "10px 12px", border: "1px solid #e5e7eb" }}>
                        <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.6rem", color: "#9ca3af", marginBottom: "3px" }}>{s.label}</p>
                        <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1.25rem", fontWeight: 700, color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                    <div style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.7rem", fontWeight: 600, color: "#374151" }}>Solicitudes recientes</span>
                      <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.65rem", color: "#9ca3af" }}>Hoy</span>
                    </div>
                    {[
                      { route: "Madrid → Barcelona", client: "Viajes Pérez S.L.", price: "1.240 €", status: "Enviado", sc: { bg: "#eff6ff", color: "#1d4ed8" } },
                      { route: "Sevilla → Granada", client: "Grupo Escolar Sur", price: "420 €", status: "Aceptado", sc: { bg: "#f0fdf4", color: "#15803d" } },
                      { route: "Valencia → Alicante", client: "Club Deportivo FC", price: "310 €", status: "En revisión", sc: { bg: "#fffbeb", color: "#b45309" } },
                    ].map((row, i) => (
                      <div key={i} style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", borderBottom: i < 2 ? "1px solid #f9fafb" : "none" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.7rem", fontWeight: 600, color: "#111827" }}>{row.route}</p>
                          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.65rem", color: "#9ca3af" }}>{row.client}</p>
                        </div>
                        <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.7rem", fontWeight: 700, color: "#111827" }}>{row.price}</span>
                        <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.6rem", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: row.sc.bg, color: row.sc.color }}>{row.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "5rem 1.5rem", background: "#f5f5f4" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
              Todo lo que necesitas para presupuestar
            </h2>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", color: "#6b7280", maxWidth: "400px", margin: "0 auto" }}>
              Sin hojas de cálculo. Sin cálculos manuales. Sin errores.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: "1rem" }}>
            {[
              { icon: Zap, title: "Cálculo automático del precio", desc: "Introduce el origen y destino y FlotaFly calcula los kilómetros reales, combustible, conductor, peajes y margen al instante.", color: "#1e3a5f" },
              { icon: FileText, title: "PDF profesional en un clic", desc: "Genera un presupuesto en PDF con tu logo y colores corporativos. Se envía automáticamente al cliente por email.", color: "#0f766e" },
              { icon: LayoutDashboard, title: "Dashboard centralizado", desc: "Gestiona todas tus solicitudes desde un panel. Filtra por estado, busca por cliente y actualiza precios antes de enviar.", color: "#6d28d9" },
            ].map(({ icon: Icon, title, desc, color }, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: "16px", padding: "1.75rem", border: "1px solid #e5e7eb" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                  <Icon style={{ width: "18px", height: "18px", color: "#fff" }} />
                </div>
                <h3 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "#111827", marginBottom: "0.625rem", letterSpacing: "-0.01em" }}>{title}</h3>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#6b7280", lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section style={{ padding: "5rem 1.5rem", background: "#fff" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
              Cómo funciona
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: "2rem" }}>
            {[
              { step: "01", title: "Tu cliente rellena el formulario", desc: "Comparte tu enlace personalizado. El cliente introduce el origen, destino, fecha y pasajeros." },
              { step: "02", title: "FlotaFly calcula el precio", desc: "En segundos tienes el coste real del servicio con desglose completo visible solo para ti." },
              { step: "03", title: "Envías el presupuesto en PDF", desc: "Con un clic envías el PDF por email con tu imagen de marca. El cliente acepta o negocia." },
            ].map((item, i) => (
              <div key={i}>
                <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "2.5rem", fontWeight: 800, color: "#f3f4f6", display: "block", lineHeight: 1 }}>{item.step}</span>
                <h3 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", fontWeight: 600, color: "#111827", margin: "0.5rem 0 0.5rem", letterSpacing: "-0.01em" }}>{item.title}</h3>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#6b7280", lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "5rem 1.5rem", background: "#f5f5f4" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div style={{ background: "#111827", borderRadius: "20px", padding: "3rem 2rem", textAlign: "center" }}>
            <h2 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
              Empieza a usarlo hoy mismo
            </h2>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.9375rem", color: "#9ca3af", marginBottom: "2rem", lineHeight: 1.6 }}>
              Configura tu empresa en menos de 5 minutos y empieza a enviar presupuestos profesionales al instante.
            </p>
            <button onClick={() => setShowDemoForm(true)} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: "inline-flex", alignItems: "center", gap: "6px", background: "#fff", color: "#111827", fontWeight: 600, fontSize: "0.875rem", padding: "11px 24px", borderRadius: "10px", border: "none", cursor: "pointer" }}>
              Solicitar demo <ArrowRight style={{ width: "14px", height: "14px" }} />
            </button>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#4b5563", marginTop: "1rem" }}>
              Sin tarjeta de crédito · Sin compromiso
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #f3f4f6", padding: "1.5rem", background: "#fff" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <FlotaFlyLogo size={24} />
            <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", fontWeight: 600, color: "#374151" }}><FlotaFlyWordmark /></span>
          </div>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#9ca3af" }}>
            © {new Date().getFullYear()} FlotaFly · Gestión de presupuestos para transporte discrecional
          </p>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <Link href="/login" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#9ca3af", textDecoration: "none" }}>Acceder</Link>
          </div>
        </div>
      </footer>

      {/* Modal solicitar demo */}
      {showDemoForm && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem",
        }} onClick={() => !submitting && setShowDemoForm(false)}>
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            maxWidth: "480px",
            width: "100%",
            padding: "32px",
            position: "relative",
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowDemoForm(false)} style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px",
            }}>
              <X style={{ width: "20px", height: "20px", color: "#9ca3af" }} />
            </button>

            {!submitted ? (
              <>
                <h2 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "#111827", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
                  Solicitar demo
                </h2>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
                  Déjanos tus datos y nos pondremos en contacto contigo en menos de 24 horas.
                </p>

                <form onSubmit={handleSubmitDemo} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", fontWeight: 500, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={demoForm.nombre}
                      onChange={e => setDemoForm(p => ({ ...p, nombre: e.target.value }))}
                      style={{
                        width: "100%",
                        height: "42px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "0 14px",
                        fontSize: "0.875rem",
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        boxSizing: "border-box",
                      }}
                      placeholder="Tu nombre completo"
                    />
                  </div>

                  <div>
                    <label style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", fontWeight: 500, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Empresa
                    </label>
                    <input
                      type="text"
                      value={demoForm.empresa}
                      onChange={e => setDemoForm(p => ({ ...p, empresa: e.target.value }))}
                      style={{
                        width: "100%",
                        height: "42px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "0 14px",
                        fontSize: "0.875rem",
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        boxSizing: "border-box",
                      }}
                      placeholder="Nombre de tu empresa"
                    />
                  </div>

                  <div>
                    <label style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", fontWeight: 500, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={demoForm.email}
                      onChange={e => setDemoForm(p => ({ ...p, email: e.target.value }))}
                      style={{
                        width: "100%",
                        height: "42px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "0 14px",
                        fontSize: "0.875rem",
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        boxSizing: "border-box",
                      }}
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <label style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", fontWeight: 500, color: "#374151", display: "block", marginBottom: "6px" }}>
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={demoForm.telefono}
                      onChange={e => setDemoForm(p => ({ ...p, telefono: e.target.value }))}
                      style={{
                        width: "100%",
                        height: "42px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "0 14px",
                        fontSize: "0.875rem",
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        boxSizing: "border-box",
                      }}
                      placeholder="+34 600 000 000"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      marginTop: "8px",
                      height: "44px",
                      background: "#111827",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      cursor: submitting ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.6 : 1,
                    }}
                  >
                    {submitting ? "Enviando..." : "Enviar solicitud"}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={{ width: "64px", height: "64px", background: "#10b981", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                  <span style={{ fontSize: "32px" }}>✓</span>
                </div>
                <h3 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "#111827", marginBottom: "0.5rem" }}>
                  ¡Solicitud enviada!
                </h3>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.875rem", color: "#6b7280" }}>
                  Nos pondremos en contacto contigo muy pronto.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}