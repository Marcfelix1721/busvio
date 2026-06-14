"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { AddressAutocomplete } from "@/components/AddressAutocomplete"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import {
  MapPin, Bus, TrendingUp, PartyPopper,
  ChevronLeft, ChevronRight, Check, Copy, ArrowRight,
} from "lucide-react"

const STEPS = ["Bienvenida", "Operaciones", "Vehículo", "Precios", "Listo"]
const ACCENT = "#1e3a5f"

type Props = {
  companyId: string
  companyName: string
  slug: string
  initialGarage?: string
  initialPricing?: { price_per_km?: number }
  initialSettings?: { margen_beneficio?: number; iva?: number; precio_minimo_servicio?: number }
}

// ---------- UI helpers (mismos estilos que el resto de la app) ----------

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 44 }}>
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: done || active ? ACCENT : "#fff",
                border: `1px solid ${done || active ? ACCENT : "#d1d5db"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 600,
                color: done || active ? "#fff" : "#9ca3af",
                boxShadow: active ? `0 0 0 4px ${ACCENT}15` : "none",
                transition: "all 0.2s", flexShrink: 0,
              }}>
                {done ? <Check style={{ width: 14, height: 14 }} /> : i + 1}
              </div>
              <span style={{
                fontSize: 11, fontWeight: active ? 600 : 500,
                color: active ? ACCENT : done ? "#6b7280" : "#9ca3af",
                whiteSpace: "nowrap",
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 1, margin: "0 12px", marginBottom: 22,
                background: done ? ACCENT : "#e5e7eb", transition: "background 0.3s",
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", letterSpacing: "-0.01em" }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>{hint}</p>}
    </div>
  )
}

function Inp({ unit, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { unit?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: "relative" }}>
      <input {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          height: 48, width: "100%", borderRadius: 12,
          border: `1px solid ${focused ? ACCENT : "#e5e7eb"}`,
          background: "#fff", padding: unit ? "0 44px 0 16px" : "0 16px",
          fontSize: 15, color: "#111827", outline: "none",
          fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box",
          boxShadow: focused ? `0 0 0 3px ${ACCENT}12` : "none", transition: "all 0.2s",
        }}
      />
      {unit && (
        <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af", pointerEvents: "none" }}>
          {unit}
        </span>
      )}
    </div>
  )
}

function InfoBox({ children, color = "teal" }: { children: React.ReactNode; color?: "teal" | "blue" }) {
  const palette = color === "teal"
    ? { bg: "#f0fdf9", border: "#bbf7d0", text: "#166534" }
    : { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" }
  return (
    <div style={{ background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 24 }}>
      <p style={{ fontSize: 13, color: palette.text, margin: 0, lineHeight: 1.6 }}>{children}</p>
    </div>
  )
}

function StepHeader({ icon: Icon, color, title, desc }: { icon: any; color: string; title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon style={{ width: 24, height: 24, color: "#fff" }} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
      <p style={{ fontSize: 14, color: "#6b7280", margin: "8px 0 0", lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}

// ---------- Wizard ----------

export function OnboardingWizard({ companyId, companyName, slug, initialGarage, initialPricing, initialSettings }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [vehicleId, setVehicleId] = useState<string | null>(null)

  const [garage, setGarage] = useState(initialGarage ?? "")
  const [vehicle, setVehicle] = useState({ marca_modelo: "", matricula: "", plazas: "", consumo: "" })
  const [pricing, setPricing] = useState({
    price_per_km: initialPricing?.price_per_km != null ? String(initialPricing.price_per_km) : "",
    precio_minimo_servicio: initialSettings?.precio_minimo_servicio != null ? String(initialSettings.precio_minimo_servicio) : "",
    margen_beneficio: initialSettings?.margen_beneficio != null ? String(initialSettings.margen_beneficio) : "20",
    iva: initialSettings?.iva != null ? String(initialSettings.iva) : "10",
  })

  const publicUrl = `flotafly.com/${slug}`
  const num = (v: string) => (v.trim() === "" ? null : parseFloat(v.replace(",", ".")))

  // Persiste la base de operaciones (Paso 2)
  const saveGarage = async () => {
    const { error } = await supabase.from("pricing_settings").upsert(
      { company_id: companyId, garage_address: garage.trim() || null },
      { onConflict: "company_id" }
    )
    return error
  }

  // Persiste el primer vehículo (Paso 3). Solo si hay datos suficientes.
  const saveVehicle = async () => {
    const tieneDatos = vehicle.matricula.trim() && vehicle.marca_modelo.trim() && vehicle.plazas.trim()
    if (!tieneDatos) return null
    const payload = {
      company_id: companyId,
      matricula: vehicle.matricula.toUpperCase().trim(),
      marca_modelo: vehicle.marca_modelo.trim(),
      plazas: parseInt(vehicle.plazas),
      consumo: num(vehicle.consumo),
      tipo: "autocar",
      estado: "activo",
    }
    if (vehicleId) {
      const { error } = await supabase.from("vehicles").update(payload).eq("id", vehicleId)
      return error
    }
    const { data, error } = await supabase.from("vehicles").insert(payload).select("id").single()
    if (!error && data) setVehicleId(data.id)
    return error
  }

  // Persiste los precios base (Paso 4)
  const savePricing = async () => {
    const { error: e1 } = await supabase.from("pricing_settings").upsert(
      { company_id: companyId, price_per_km: num(pricing.price_per_km) ?? 0 },
      { onConflict: "company_id" }
    )
    if (e1) return e1
    const { error: e2 } = await supabase.from("company_settings").upsert(
      {
        company_id: companyId,
        precio_minimo_servicio: num(pricing.precio_minimo_servicio) ?? 0,
        margen_beneficio: num(pricing.margen_beneficio) ?? 0,
        iva: num(pricing.iva) ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    )
    return e2
  }

  // Avanza guardando lo que corresponda a cada paso
  const next = async () => {
    setError("")
    setSaving(true)
    let err = null
    if (step === 1) err = await saveGarage()
    if (step === 2) err = await saveVehicle()
    if (step === 3) err = await savePricing()
    setSaving(false)
    if (err) { setError("Error al guardar: " + err.message); return }
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  const skipVehicle = () => { setError(""); setStep(s => s + 1) }
  const back = () => { setError(""); setStep(s => Math.max(s - 1, 0)) }

  const finish = async () => {
    setError("")
    setSaving(true)
    const { error } = await supabase.from("companies").update({ onboarding_completado: true }).eq("id", companyId)
    setSaving(false)
    if (error) { setError("Error: " + error.message); return }
    router.push("/dashboard")
    router.refresh()
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${publicUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("No se pudo copiar el enlace")
    }
  }

  const primaryBtn = (children: React.ReactNode, onClick: () => void, disabled = false): React.ReactNode => (
    <button onClick={onClick} disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 24px",
        borderRadius: 11, border: "none", fontSize: 14, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
        background: ACCENT, color: "#fff", fontFamily: "'DM Sans', system-ui, sans-serif",
        transition: "all 0.2s",
      }}>
      {children}
    </button>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Marca arriba */}
      <div style={{ padding: "24px 32px", display: "flex", alignItems: "center", gap: 10 }}>
        <FlotaFlyLogo size={32} />
        <p style={{ color: "#111827", fontWeight: 700, fontSize: 15, margin: 0, letterSpacing: "-0.01em" }}><FlotaFlyWordmark /></p>
      </div>

      {/* Contenido centrado */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 24px 48px" }}>
        <div style={{ width: "100%", maxWidth: 560 }}>

          <StepBar current={step} />

          {/* PASO 1 — Bienvenida */}
          {step === 0 && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <FlotaFlyLogo size={80} style={{ margin: "0 auto 24px" }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.025em" }}>
                Bienvenido a <FlotaFlyWordmark />, {companyName}
              </h1>
              <p style={{ fontSize: 16, color: "#6b7280", margin: "14px 0 36px", lineHeight: 1.6 }}>
                Configura tu cuenta en 5 minutos y empieza a recibir solicitudes
              </p>
              <div style={{ display: "flex", justifyContent: "center" }}>
                {primaryBtn(<>Empezar configuración <ArrowRight style={{ width: 16, height: 16 }} /></>, () => setStep(1))}
              </div>
            </div>
          )}

          {/* PASO 2 — Base de operaciones */}
          {step === 1 && (
            <div>
              <StepHeader icon={MapPin} color="#0f766e" title="Base de operaciones"
                desc="Indícanos dónde guardas el bus cuando no está trabajando." />
              <InfoBox>Necesitamos esta dirección para calcular los <strong>km en vacío</strong> que recorre el bus desde el garaje hasta el inicio de cada servicio.</InfoBox>
              <Field label="Dirección del garaje" hint="Empieza a escribir y elige una sugerencia">
                <AddressAutocomplete
                  value={garage}
                  onChange={setGarage}
                  placeholder="Calle del Garaje 5, 08001 Barcelona"
                  inputStyle={{
                    height: 48, width: "100%", borderRadius: 12, border: "1px solid #e5e7eb",
                    background: "#fff", padding: "0 16px", fontSize: 15, color: "#111827", outline: "none",
                    fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box", transition: "all 0.2s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px ${ACCENT}12` }}
                  onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none" }}
                />
              </Field>
            </div>
          )}

          {/* PASO 3 — Primer vehículo */}
          {step === 2 && (
            <div>
              <StepHeader icon={Bus} color="#6d28d9" title="Tu primer vehículo"
                desc="Añade un vehículo de tu flota. Podrás añadir más y completar sus costes después." />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Marca / Modelo">
                  <Inp value={vehicle.marca_modelo} onChange={e => setVehicle(v => ({ ...v, marca_modelo: e.target.value }))} placeholder="Mercedes Tourismo" />
                </Field>
                <Field label="Matrícula">
                  <Inp value={vehicle.matricula} onChange={e => setVehicle(v => ({ ...v, matricula: e.target.value }))} placeholder="1234 ABC" />
                </Field>
                <Field label="Plazas">
                  <Inp type="number" value={vehicle.plazas} onChange={e => setVehicle(v => ({ ...v, plazas: e.target.value }))} placeholder="55" />
                </Field>
                <Field label="Consumo" hint="Litros cada 100 km">
                  <Inp type="number" value={vehicle.consumo} onChange={e => setVehicle(v => ({ ...v, consumo: e.target.value }))} placeholder="28" unit="L" />
                </Field>
              </div>
              <button onClick={skipVehicle}
                style={{ marginTop: 18, background: "none", border: "none", color: "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, fontFamily: "'DM Sans', system-ui, sans-serif", padding: 0 }}>
                Añadir vehículos después
              </button>
            </div>
          )}

          {/* PASO 4 — Precio base */}
          {step === 3 && (
            <div>
              <StepHeader icon={TrendingUp} color="#0369a1" title="Precio base"
                desc="Estos valores se usan para calcular automáticamente los presupuestos." />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Precio por km">
                  <Inp type="number" value={pricing.price_per_km} onChange={e => setPricing(p => ({ ...p, price_per_km: e.target.value }))} placeholder="1.20" unit="€/km" />
                </Field>
                <Field label="Precio mínimo del servicio">
                  <Inp type="number" value={pricing.precio_minimo_servicio} onChange={e => setPricing(p => ({ ...p, precio_minimo_servicio: e.target.value }))} placeholder="150" unit="€" />
                </Field>
                <Field label="Margen de beneficio">
                  <Inp type="number" value={pricing.margen_beneficio} onChange={e => setPricing(p => ({ ...p, margen_beneficio: e.target.value }))} placeholder="20" unit="%" />
                </Field>
                <Field label="IVA">
                  <Inp type="number" value={pricing.iva} onChange={e => setPricing(p => ({ ...p, iva: e.target.value }))} placeholder="10" unit="%" />
                </Field>
              </div>
            </div>
          )}

          {/* PASO 5 — ¡Listo! */}
          {step === 4 && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <PartyPopper style={{ width: 34, height: 34, color: "#16a34a" }} />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>¡Todo listo!</h1>
              <p style={{ fontSize: 15, color: "#6b7280", margin: "12px 0 28px", lineHeight: 1.6 }}>
                Comparte este enlace con tus clientes para que te envíen solicitudes de presupuesto.
              </p>

              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", marginBottom: 24, textAlign: "left" }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 8px" }}>Tu enlace público</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: ACCENT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {publicUrl}
                  </span>
                  <button onClick={copyLink}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 14px", borderRadius: 9,
                      border: "1px solid #e5e7eb", background: copied ? "#10b981" : "#fff",
                      color: copied ? "#fff" : "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: "'DM Sans', system-ui, sans-serif", flexShrink: 0, transition: "all 0.2s",
                    }}>
                    {copied ? <><Check style={{ width: 14, height: 14 }} /> Copiado</> : <><Copy style={{ width: 14, height: 14 }} /> Copiar</>}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                {primaryBtn(saving ? "Guardando..." : <>Ir al dashboard <ArrowRight style={{ width: 16, height: 16 }} /></>, finish, saving)}
              </div>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 13, color: "#dc2626", textAlign: "center", margin: "20px 0 0" }}>{error}</p>
          )}

          {/* Navegación (pasos intermedios) */}
          {step > 0 && step < 4 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 36 }}>
              <button onClick={back} disabled={saving}
                style={{
                  display: "flex", alignItems: "center", gap: 6, height: 46, padding: "0 18px",
                  borderRadius: 11, border: "1px solid #e5e7eb", background: "#fff",
                  fontSize: 14, fontWeight: 600, color: "#374151",
                  cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>
                <ChevronLeft style={{ width: 16, height: 16 }} /> Anterior
              </button>
              {primaryBtn(
                <>{saving ? "Guardando..." : "Siguiente"} <ChevronRight style={{ width: 16, height: 16 }} /></>,
                next, saving
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
