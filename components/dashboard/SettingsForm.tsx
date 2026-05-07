"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import {
  Building2, MapPin, UserRound,
  Sparkles, TrendingUp, Save, Upload, Check, ChevronRight
} from "lucide-react"

type Settings = Record<string, number>
type Company = {
  id: string; name: string; slug: string; email: string; phone: string
  cif?: string; address?: string; website?: string; logo_url?: string; color_primario?: string
}
type PricingSettings = { garage_address?: string; parking_address?: string }

const NAV = [
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "operaciones", label: "Base de operaciones", icon: MapPin },
  { id: "conductor", label: "Conductor", icon: UserRound },
  { id: "extras", label: "Extras y recargos", icon: Sparkles },
  { id: "comercial", label: "Margen e IVA", icon: TrendingUp },
]

function SectionWrapper({ id, title, icon: Icon, children, color = "#1e3a5f" }: {
  id: string; title: string; icon: any; children: React.ReactNode; color?: string
}) {
  return (
    <div id={id} className="scroll-mt-6" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: color }}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <h2 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1rem", fontWeight: 600, color: "#111827", letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {children}
      </div>
    </div>
  )
}

function FieldGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="p-6">
      {title && (
        <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: "1rem" }}>{title}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
        {children}
      </div>
    </div>
  )
}

function FieldDivider() {
  return <div className="border-t border-[#f3f4f6]" />
}

function Field({ label, id, value, onChange, unit, span = false }: {
  label: string; id: string; value: number
  onChange: (id: string, val: number) => void; unit?: string; span?: boolean
}) {
  return (
    <div className={span ? "sm:col-span-2" : ""} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label htmlFor={id} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280" }}>
        {label}
        {unit && <span style={{ marginLeft: "4px", color: "#9ca3af", fontWeight: 400 }}>· {unit}</span>}
      </label>
      <input
        id={id} type="number" min={0} step="0.01" value={value}
        onChange={(e) => onChange(id, parseFloat(e.target.value) || 0)}
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif", height: "36px", width: "100%", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fafafa", padding: "0 10px", fontSize: "0.8125rem", color: "#111827", outline: "none" }}
        onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" }}
        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
      />
    </div>
  )
}

function TextField({ label, id, value, onChange, placeholder, span = false }: {
  label: string; id: string; value: string
  onChange: (id: string, val: string) => void; placeholder?: string; span?: boolean
}) {
  return (
    <div className={span ? "sm:col-span-2" : ""} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label htmlFor={id} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280" }}>{label}</label>
      <input
        id={id} type="text" value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif", height: "36px", width: "100%", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fafafa", padding: "0 10px", fontSize: "0.8125rem", color: "#111827", outline: "none" }}
        onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" }}
        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
      />
    </div>
  )
}

export function SettingsForm({ settings, companyId, company, pricingSettings }: {
  settings: Settings | null; companyId: string; company: Company | null; pricingSettings?: PricingSettings | null
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeSection, setActiveSection] = useState("empresa")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState("")
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState(company?.logo_url ?? "")

  const [companyValues, setCompanyValues] = useState({
    name: company?.name ?? "",
    email: company?.email ?? "",
    phone: company?.phone ?? "",
    cif: company?.cif ?? "",
    address: company?.address ?? "",
    website: company?.website ?? "",
    color_primario: company?.color_primario ?? "#1e3a5f",
  })

  const [locationValues, setLocationValues] = useState({
    garage_address: pricingSettings?.garage_address ?? "",
    parking_address: pricingSettings?.parking_address ?? "",
  })

  const [values, setValues] = useState<Settings>({
    coste_hora_conductor: settings?.coste_hora_conductor ?? 18,
    dieta_nacional: settings?.dieta_nacional ?? 20,
    dieta_internacional: settings?.dieta_internacional ?? 30,
    plus_telefono: settings?.plus_telefono ?? 15,
    plus_disponibilidad: settings?.plus_disponibilidad ?? 185,
    plus_11horas: settings?.plus_11horas ?? 25,
    plus_nocturnidad: settings?.plus_nocturnidad ?? 35,
    plus_sabado: settings?.plus_sabado ?? 20,
    plus_domingo: settings?.plus_domingo ?? 60,
    plus_festivo: settings?.plus_festivo ?? 125,
    plus_noche_fuera_nacional: settings?.plus_noche_fuera_nacional ?? 30,
    plus_noche_fuera_internacional: settings?.plus_noche_fuera_internacional ?? 50,
    coste_guia: settings?.coste_guia ?? 150,
    coste_azafata: settings?.coste_azafata ?? 120,
    recargo_ac: settings?.recargo_ac ?? 5,
    recargo_internacional: settings?.recargo_internacional ?? 15,
    precio_minimo_servicio: settings?.precio_minimo_servicio ?? 200,
    tasas_aparcamiento: settings?.tasas_aparcamiento ?? 0,
    margen_beneficio: settings?.margen_beneficio ?? 20,
    iva: settings?.iva ?? 21,
    descuento_baja_temporada: settings?.descuento_baja_temporada ?? 0,
    recargo_alta_temporada: settings?.recargo_alta_temporada ?? 15,
  })

  const handleChange = (id: string, val: number) => setValues((p) => ({ ...p, [id]: val }))
  const handleCompanyChange = (id: string, val: string) => setCompanyValues((p) => ({ ...p, [id]: val }))
  const handleLocationChange = (id: string, val: string) => setLocationValues((p) => ({ ...p, [id]: val }))

  const scrollTo = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const ext = file.name.split(".").pop()
    const fileName = `${companyId}.${ext}`
    const { error } = await supabase.storage.from("logos").upload(fileName, file, { upsert: true })
    if (error) { setMessage("❌ Error al subir el logo: " + error.message); setUploadingLogo(false); return }
    const { data } = supabase.storage.from("logos").getPublicUrl(fileName)
    await supabase.from("companies").update({ logo_url: data.publicUrl }).eq("id", companyId)
    setLogoUrl(data.publicUrl + `?t=${Date.now()}`)
    setUploadingLogo(false)
    setTimeout(() => window.location.reload(), 800)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setMessage("")

    const { error: e1 } = await supabase.from("companies").update({
      name: companyValues.name, email: companyValues.email, phone: companyValues.phone,
      cif: companyValues.cif, address: companyValues.address, website: companyValues.website,
      color_primario: companyValues.color_primario,
    }).eq("id", companyId)
    if (e1) { setMessage("❌ " + e1.message); setSaving(false); return }

    const { error: e2 } = await supabase.from("pricing_settings").upsert({
      company_id: companyId,
      garage_address: locationValues.garage_address || null,
      parking_address: locationValues.parking_address || null,
    }, { onConflict: "company_id" })
    if (e2) { setMessage("❌ " + e2.message); setSaving(false); return }

    const { error: e3 } = await supabase.from("company_settings")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("company_id", companyId)
    if (e3) { setMessage("❌ " + e3.message); setSaving(false); return }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const f = (id: string, label: string, unit?: string, span?: boolean) => (
    <Field key={id} id={id} label={label} value={values[id]} onChange={handleChange} unit={unit} span={span} />
  )

  const navBtnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'DM Sans', system-ui, sans-serif",
    display: "flex", alignItems: "center", gap: "10px",
    width: "100%", padding: "8px 12px", borderRadius: "8px",
    textAlign: "left", fontSize: "0.8125rem", fontWeight: 500,
    border: "none", cursor: "pointer", transition: "all 0.15s",
    background: active ? "#1e3a5f" : "transparent",
    color: active ? "#fff" : "#6b7280",
  })

  return (
    <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* NAV LATERAL */}
      <aside style={{ width: "200px", flexShrink: 0, position: "sticky", top: "1.5rem" }} className="hidden lg:block">
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af", padding: "0 4px" }}>Secciones</p>
          </div>
          <nav style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = activeSection === id
              return (
                <button key={id} onClick={() => scrollTo(id)} style={navBtnStyle(active)}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "#f5f5f4"; (e.currentTarget as HTMLElement).style.color = "#111827" } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6b7280" } }}
                >
                  <Icon style={{ width: "14px", height: "14px", flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                  {active && <ChevronRight style={{ width: "12px", height: "12px", marginLeft: "auto", flexShrink: 0, opacity: 0.6 }} />}
                </button>
              )
            })}
          </nav>
          <div style={{ padding: "10px", borderTop: "1px solid #f3f4f6" }}>
            <button
              onClick={handleSave} disabled={saving}
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                width: "100%", height: "38px", borderRadius: "10px", border: "none",
                fontSize: "0.8125rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                background: saved ? "#10b981" : "#1e3a5f", color: "#fff", transition: "all 0.2s"
              }}
            >
              {saved ? <><Check style={{ width: "14px", height: "14px" }} /> Guardado</> : saving ? "Guardando..." : <><Save style={{ width: "14px", height: "14px" }} /> Guardar</>}
            </button>
            {message && <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.7rem", color: "#ef4444", marginTop: "8px", textAlign: "center" }}>{message}</p>}
          </div>
        </div>
      </aside>

      {/* CONTENIDO */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2rem" }}>

        {/* EMPRESA */}
        <SectionWrapper id="empresa" title="Datos de la empresa" icon={Building2}>
          <FieldGroup>
            <TextField id="name" label="Nombre de la empresa" value={companyValues.name} onChange={handleCompanyChange} placeholder="Autocares García S.L." />
            <TextField id="cif" label="CIF / NIF" value={companyValues.cif} onChange={handleCompanyChange} placeholder="B12345678" />
            <TextField id="email" label="Email de contacto" value={companyValues.email} onChange={handleCompanyChange} placeholder="info@empresa.com" />
            <TextField id="phone" label="Teléfono" value={companyValues.phone} onChange={handleCompanyChange} placeholder="+34 600 000 000" />
            <TextField id="address" label="Dirección fiscal" value={companyValues.address} onChange={handleCompanyChange} placeholder="Calle Mayor 1, 08001 Barcelona" span />
            <TextField id="website" label="Sitio web" value={companyValues.website} onChange={handleCompanyChange} placeholder="www.empresa.com" span />
          </FieldGroup>
          <FieldDivider />
          <FieldGroup title="Identidad visual">
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280" }}>Color corporativo</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ position: "relative", width: "36px", height: "36px", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden", cursor: "pointer", flexShrink: 0 }}>
                  <input type="color" value={companyValues.color_primario}
                    onChange={(e) => handleCompanyChange("color_primario", e.target.value)}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", cursor: "pointer", opacity: 0 }}
                  />
                  <div style={{ width: "100%", height: "100%", background: companyValues.color_primario }} />
                </div>
                <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280" }}>{companyValues.color_primario}</span>
                <div style={{ height: "32px", padding: "0 14px", borderRadius: "8px", background: companyValues.color_primario, display: "flex", alignItems: "center", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 600, color: "#fff" }}>
                  Vista previa
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", fontWeight: 500, color: "#6b7280" }}>Logo de la empresa</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "56px", height: "56px", flexShrink: 0, borderRadius: "10px", border: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }} />
                    : <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.65rem", color: "#d1d5db", textAlign: "center", lineHeight: 1.3 }}>Sin logo</span>
                  }
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleLogoUpload} />
                  <button type="button" disabled={uploadingLogo} onClick={() => fileInputRef.current?.click()}
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", gap: "8px", height: "36px", padding: "0 14px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "0.8125rem", fontWeight: 500, color: "#374151", cursor: "pointer" }}
                  >
                    <Upload style={{ width: "14px", height: "14px" }} />
                    {uploadingLogo ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
                  </button>
                  <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.7rem", color: "#9ca3af", marginTop: "4px" }}>PNG, JPG o WebP · Fondo transparente recomendado</p>
                </div>
              </div>
            </div>
          </FieldGroup>
        </SectionWrapper>

        {/* BASE DE OPERACIONES */}
        <SectionWrapper id="operaciones" title="Base de operaciones" icon={MapPin} color="#0f766e">
          <div style={{ padding: "1.5rem" }}>
            <div style={{ borderRadius: "10px", background: "#f0fdf9", border: "1px solid #99f6e4", padding: "14px 16px", marginBottom: "1.25rem" }}>
              <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#134e4a", lineHeight: 1.6 }}>
                Estas direcciones se usan para calcular los <strong>kilómetros en vacío</strong> — desde el garaje hasta el punto de recogida — y el coste de parking durante el servicio.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { id: "garage_address", label: "Garaje", sub: "salida del bus", placeholder: "Calle del Garaje 5, 08001 Barcelona" },
                { id: "parking_address", label: "Parking habitual", sub: "donde espera el bus", placeholder: "Parking Central, Madrid" },
              ].map(({ id, label, sub, placeholder }) => (
                <div key={id} style={{ borderRadius: "10px", border: "1px solid #e5e7eb", background: "#fff", padding: "1rem", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#f0fdf9", border: "1px solid #99f6e4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <MapPin style={{ width: "13px", height: "13px", color: "#0f766e" }} />
                    </div>
                    <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", fontWeight: 600, color: "#111827" }}>{label}</span>
                    <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.7rem", color: "#9ca3af" }}>· {sub}</span>
                  </div>
                  <input
                    id={id} type="text"
                    value={locationValues[id as keyof typeof locationValues]}
                    onChange={(e) => handleLocationChange(id, e.target.value)}
                    placeholder={placeholder}
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif", height: "36px", width: "100%", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fafafa", padding: "0 10px", fontSize: "0.8125rem", color: "#111827", outline: "none" }}
                    onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" }}
                    onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </SectionWrapper>

        {/* CONDUCTOR */}
        <SectionWrapper id="conductor" title="Conductor — Costes y pluses" icon={UserRound} color="#6d28d9">
          <FieldGroup title="Costes base">
            {f("coste_hora_conductor", "Coste por hora", "€/h")}
            {f("dieta_nacional", "Dieta nacional", "€")}
            {f("dieta_internacional", "Dieta internacional", "€")}
            {f("plus_telefono", "Plus teléfono", "€")}
            {f("plus_disponibilidad", "Plus disponibilidad / limpieza", "€")}
          </FieldGroup>
          <FieldDivider />
          <FieldGroup title="Pluses automáticos según condiciones del servicio">
            {f("plus_11horas", "Plus +11 horas", "€")}
            {f("plus_nocturnidad", "Nocturnidad (22h–4:59h)", "€")}
            {f("plus_sabado", "Plus sábado", "€")}
            {f("plus_domingo", "Plus domingo", "€")}
            {f("plus_festivo", "Plus festivo nacional", "€")}
            {f("plus_noche_fuera_nacional", "Noche fuera nacional", "€")}
            {f("plus_noche_fuera_internacional", "Noche fuera internacional", "€")}
          </FieldGroup>
        </SectionWrapper>

        {/* EXTRAS */}
        <SectionWrapper id="extras" title="Extras y recargos" icon={Sparkles} color="#be185d">
          <FieldGroup title="Personal adicional">
            {f("coste_guia", "Guía turístico", "€/día")}
            {f("coste_azafata", "Azafata / azafato", "€/día")}
          </FieldGroup>
          <FieldDivider />
          <FieldGroup title="Recargos por tipo de servicio">
            {f("recargo_ac", "Aire acondicionado", "%")}
            {f("recargo_internacional", "Servicio internacional", "%")}
            {f("tasas_aparcamiento", "Tasas de aparcamiento", "€")}
            {f("precio_minimo_servicio", "Precio mínimo por servicio", "€")}
          </FieldGroup>
        </SectionWrapper>

        {/* MARGEN E IVA */}
        <SectionWrapper id="comercial" title="Margen comercial e IVA" icon={TrendingUp} color="#0369a1">
          <FieldGroup title="Rentabilidad">
            {f("margen_beneficio", "Margen de beneficio", "%")}
            {f("iva", "IVA aplicado", "%")}
          </FieldGroup>
          <FieldDivider />
          <FieldGroup title="Ajuste por temporada">
            {f("descuento_baja_temporada", "Descuento baja temporada", "%")}
            {f("recargo_alta_temporada", "Recargo alta temporada", "%")}
          </FieldGroup>
        </SectionWrapper>

        {/* BOTÓN GUARDAR MÓVIL */}
        <div className="lg:hidden" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {message && <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#ef4444" }}>{message}</p>}
          <button onClick={handleSave} disabled={saving}
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", height: "44px", width: "100%", borderRadius: "12px", border: "none", fontSize: "0.9375rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", background: saved ? "#10b981" : "#1e3a5f", color: "#fff" }}
          >
            {saved ? <><Check style={{ width: "16px", height: "16px" }} /> Guardado correctamente</> : saving ? "Guardando..." : <><Save style={{ width: "16px", height: "16px" }} /> Guardar ajustes</>}
          </button>
        </div>

      </div>
    </div>
  )
}