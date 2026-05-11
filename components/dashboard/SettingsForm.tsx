"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { Building2, MapPin, TrendingUp, Save, Upload, Check, ChevronRight } from "lucide-react"

type Company = {
  id: string; name: string; slug: string; email: string; phone: string
  cif?: string; address?: string; website?: string; logo_url?: string; color_primario?: string
}
type PricingSettings = { garage_address?: string; parking_address?: string }
type Settings = Record<string, number>

const NAV = [
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "operaciones", label: "Base de operaciones", icon: MapPin },
  { id: "comercial", label: "Margen e IVA", icon: TrendingUp },
]

function TextField({ label, id, value, onChange, placeholder, span = false, type = "text" }: {
  label: string; id: string; value: string; onChange: (id: string, val: string) => void
  placeholder?: string; span?: boolean; type?: string
}) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined, display: "flex", flexDirection: "column" as const, gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(id, e.target.value)} placeholder={placeholder}
        style={{ height: 38, width: "100%", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fafafa", padding: "0 12px", fontSize: 13, color: "#111827", outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box" as const }}
        onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)" }}
        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
      />
    </div>
  )
}

function NumberField({ label, id, value, onChange, unit, span = false }: {
  label: string; id: string; value: number; onChange: (id: string, val: number) => void; unit?: string; span?: boolean
}) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined, display: "flex", flexDirection: "column" as const, gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {label}{unit && <span style={{ color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>· {unit}</span>}
      </label>
      <input id={id} type="number" min={0} step="0.01" value={value}
        onChange={e => onChange(id, parseFloat(e.target.value) || 0)}
        style={{ height: 38, width: "100%", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fafafa", padding: "0 12px", fontSize: 13, color: "#111827", outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box" as const }}
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
    margen_beneficio: settings?.margen_beneficio ?? 20,
    iva: settings?.iva ?? 10,
    precio_minimo_servicio: settings?.precio_minimo_servicio ?? 0,
    descuento_baja_temporada: settings?.descuento_baja_temporada ?? 0,
    recargo_alta_temporada: settings?.recargo_alta_temporada ?? 0,
  })

  const handleChange = (id: string, val: number) => setValues(p => ({ ...p, [id]: val }))
  const handleCompanyChange = (id: string, val: string) => setCompanyValues(p => ({ ...p, [id]: val }))
  const handleLocationChange = (id: string, val: string) => setLocationValues(p => ({ ...p, [id]: val }))

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
    setSaving(true); setSaved(false); setMessage("")

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

    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }
  const sectionHeader = (color: string, Icon: any, title: string, desc: string) => (
    <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon style={{ width: 18, height: 18, color: "#fff" }} />
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{title}</p>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{desc}</p>
      </div>
    </div>
  )

  return (
    <div style={{ display: "flex", gap: 28, alignItems: "flex-start", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* NAV LATERAL */}
      <aside style={{ width: 190, flexShrink: 0, position: "sticky", top: 24 }}>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#9ca3af", padding: "0 4px", margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Secciones</p>
          </div>
          <nav style={{ padding: 8, display: "flex", flexDirection: "column" as const, gap: 2 }}>
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = activeSection === id
              return (
                <button key={id} onClick={() => scrollTo(id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 8, textAlign: "left" as const, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif", background: active ? "#1e3a5f" : "transparent", color: active ? "#fff" : "#6b7280", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "#f5f5f4"; (e.currentTarget as HTMLElement).style.color = "#111827" } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6b7280" } }}
                >
                  <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{label}</span>
                  {active && <ChevronRight style={{ width: 12, height: 12, marginLeft: "auto", flexShrink: 0, opacity: 0.6 }} />}
                </button>
              )
            })}
          </nav>
          <div style={{ padding: 10, borderTop: "1px solid #f3f4f6" }}>
            <button onClick={handleSave} disabled={saving}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 38, borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', system-ui, sans-serif", background: saved ? "#10b981" : "#1e3a5f", color: "#fff", transition: "all 0.2s" }}
            >
              {saved ? <><Check style={{ width: 14, height: 14 }} /> Guardado</> : saving ? "Guardando..." : <><Save style={{ width: 14, height: 14 }} /> Guardar</>}
            </button>
            {message && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 8, textAlign: "center" as const, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{message}</p>}
          </div>
        </div>
      </aside>

      {/* CONTENIDO */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" as const, gap: 20 }}>

        {/* EMPRESA */}
        <div id="empresa" style={{ ...card, scrollMarginTop: 24 }}>
          {sectionHeader("#1e3a5f", Building2, "Datos de la empresa", "Información legal y de contacto")}
          <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <TextField id="name" label="Nombre de la empresa" value={companyValues.name} onChange={handleCompanyChange} placeholder="Autocares García S.L." />
            <TextField id="cif" label="CIF / NIF" value={companyValues.cif} onChange={handleCompanyChange} placeholder="B12345678" />
            <TextField id="email" label="Email de contacto" value={companyValues.email} onChange={handleCompanyChange} placeholder="info@empresa.com" />
            <TextField id="phone" label="Teléfono" value={companyValues.phone} onChange={handleCompanyChange} placeholder="+34 600 000 000" />
            <TextField id="address" label="Dirección fiscal" value={companyValues.address} onChange={handleCompanyChange} placeholder="Calle Mayor 1, 08001 Barcelona" span />
            <TextField id="website" label="Sitio web" value={companyValues.website} onChange={handleCompanyChange} placeholder="www.empresa.com" span />
          </div>

          <div style={{ borderTop: "1px solid #f3f4f6", padding: "20px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#9ca3af", margin: "0 0 16px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Identidad visual</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Color corporativo */}
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Color corporativo</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative", width: 38, height: 38, borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden", cursor: "pointer", flexShrink: 0 }}>
                    <input type="color" value={companyValues.color_primario} onChange={e => handleCompanyChange("color_primario", e.target.value)}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", cursor: "pointer", opacity: 0 }} />
                    <div style={{ width: "100%", height: "100%", background: companyValues.color_primario }} />
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: 13, color: "#6b7280" }}>{companyValues.color_primario}</span>
                  <div style={{ height: 32, padding: "0 14px", borderRadius: 8, background: companyValues.color_primario, display: "flex", alignItems: "center", fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    Preview
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Logo de la empresa</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 54, height: 54, flexShrink: 0, borderRadius: 10, border: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {logoUrl
                      ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                      : <span style={{ fontSize: 10, color: "#d1d5db", textAlign: "center" as const, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Sin logo</span>
                    }
                  </div>
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleLogoUpload} />
                    <button type="button" disabled={uploadingLogo} onClick={() => fileInputRef.current?.click()}
                      style={{ display: "flex", alignItems: "center", gap: 8, height: 34, padding: "0 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 500, color: "#374151", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                      <Upload style={{ width: 13, height: 13 }} />
                      {uploadingLogo ? "Subiendo..." : logoUrl ? "Cambiar" : "Subir logo"}
                    </button>
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>PNG, JPG o WebP</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BASE DE OPERACIONES */}
        <div id="operaciones" style={{ ...card, scrollMarginTop: 24 }}>
          {sectionHeader("#0f766e", MapPin, "Base de operaciones", "Dirección del garaje y parking habitual")}
          <div style={{ padding: "20px 24px" }}>
            <div style={{ background: "#f0fdf9", border: "1px solid #99f6e4", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "#134e4a", margin: 0, lineHeight: 1.6, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                Se usan para calcular los <strong>km en vacío</strong> desde el garaje hasta el punto de recogida del servicio.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { id: "garage_address", label: "Dirección del garaje", placeholder: "Calle del Garaje 5, 08001 Barcelona" },
                { id: "parking_address", label: "Parking habitual", placeholder: "Parking Central, Madrid" },
              ].map(({ id, label, placeholder }) => (
                <div key={id} style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                  <label htmlFor={id} style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</label>
                  <input id={id} type="text" value={locationValues[id as keyof typeof locationValues]}
                    onChange={e => handleLocationChange(id, e.target.value)} placeholder={placeholder}
                    style={{ height: 38, width: "100%", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fafafa", padding: "0 12px", fontSize: 13, color: "#111827", outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box" as const }}
                    onFocus={e => { e.target.style.borderColor = "#0f766e"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(15,118,110,0.08)" }}
                    onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MARGEN E IVA */}
        <div id="comercial" style={{ ...card, scrollMarginTop: 24 }}>
          {sectionHeader("#0369a1", TrendingUp, "Margen comercial e IVA", "Parámetros de rentabilidad aplicados a todos los presupuestos")}
          <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <NumberField id="margen_beneficio" label="Margen de beneficio" value={values.margen_beneficio} onChange={handleChange} unit="%" />
            <NumberField id="iva" label="IVA aplicado" value={values.iva} onChange={handleChange} unit="%" />
            <NumberField id="precio_minimo_servicio" label="Precio mínimo por servicio" value={values.precio_minimo_servicio} onChange={handleChange} unit="€" />
          </div>
          <div style={{ borderTop: "1px solid #f3f4f6", padding: "20px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#9ca3af", margin: "0 0 16px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Ajuste por temporada</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <NumberField id="descuento_baja_temporada" label="Descuento baja temporada" value={values.descuento_baja_temporada} onChange={handleChange} unit="%" />
              <NumberField id="recargo_alta_temporada" label="Recargo alta temporada" value={values.recargo_alta_temporada} onChange={handleChange} unit="%" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}