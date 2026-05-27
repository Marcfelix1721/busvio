"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { Building2, MapPin, TrendingUp, Save, Upload, Check } from "lucide-react"

type Company = {
  id: string; name: string; slug: string; email: string; phone: string
  cif?: string; address?: string; website?: string; logo_url?: string; color_primario?: string
}
type PricingSettings = { garage_address?: string; parking_address?: string; precio_combustible_global?: number }
type Settings = Record<string, number>

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#9ca3af", margin: "0 0 14px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {children}
    </p>
  )
}

function TextField({ label, id, value, onChange, placeholder, span = false }: {
  label: string; id: string; value: string
  onChange: (id: string, val: string) => void; placeholder?: string; span?: boolean
}) {
  return (
    <div style={{ gridColumn: span ? "1 / -1" : undefined, display: "flex", flexDirection: "column" as const, gap: 5 }}>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{label}</label>
      <input id={id} type="text" value={value} onChange={e => onChange(id, e.target.value)} placeholder={placeholder}
        style={{ height: 38, width: "100%", borderRadius: 9, border: "1.5px solid #e5e7eb", background: "#fafafa", padding: "0 12px", fontSize: 13, color: "#111827", outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box" as const, transition: "all 0.15s" }}
        onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.07)" }}
        onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
      />
    </div>
  )
}

function NumberField({ label, id, value, onChange, unit, span = false }: {
  label: string; id: string; value: number
  onChange: (id: string, val: number) => void; unit?: string; span?: boolean
}) {
  return (
    <div style={{ gridColumn: span ? "1 / -1" : undefined, display: "flex", flexDirection: "column" as const, gap: 5 }}>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {label}{unit && <span style={{ color: "#d1d5db", fontWeight: 400, marginLeft: 6 }}>·</span>}
        {unit && <span style={{ color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>{unit}</span>}
      </label>
      <div style={{ position: "relative" as const }}>
        <input id={id} type="number" min={0} step="0.01" value={value}
          onChange={e => onChange(id, parseFloat(e.target.value) || 0)}
          style={{ height: 38, width: "100%", borderRadius: 9, border: "1.5px solid #e5e7eb", background: "#fafafa", padding: unit ? "0 36px 0 12px" : "0 12px", fontSize: 13, color: "#111827", outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box" as const, transition: "all 0.15s" }}
          onFocus={e => { e.target.style.borderColor = "#1e3a5f"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.07)" }}
          onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; e.target.style.boxShadow = "none" }}
        />
        {unit && (
          <span style={{ position: "absolute" as const, right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9ca3af", pointerEvents: "none", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

function SectionBlock({ icon: Icon, color, title, desc, children }: {
  icon: any; color: string; title: string; desc: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon style={{ width: 17, height: 17, color: "#fff" }} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{title}</p>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{desc}</p>
        </div>
      </div>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  )
}

function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {children}
    </div>
  )
}

function Pad({ children, top = false }: { children: React.ReactNode; top?: boolean }) {
  return (
    <div style={{ padding: "20px 24px", borderTop: top ? "1px solid #f3f4f6" : undefined }}>
      {children}
    </div>
  )
}

export function SettingsForm({ settings, companyId, company, pricingSettings }: {
  settings: Settings | null; companyId: string; company: Company | null; pricingSettings?: PricingSettings | null
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    precio_combustible_global: pricingSettings?.precio_combustible_global ?? 0,
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const ext = file.name.split(".").pop()
    const fileName = `${companyId}.${ext}`
    const { error } = await supabase.storage.from("logos").upload(fileName, file, { upsert: true })
    if (error) { setMessage("Error al subir el logo"); setUploadingLogo(false); return }
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
    if (e1) { setMessage("Error: " + e1.message); setSaving(false); return }

    const { error: e2 } = await supabase.from("pricing_settings").upsert({
      company_id: companyId,
      garage_address: locationValues.garage_address || null,
      parking_address: locationValues.parking_address || null,
      precio_combustible_global: locationValues.precio_combustible_global,
    }, { onConflict: "company_id" })
    if (e2) { setMessage("Error: " + e2.message); setSaving(false); return }

    const { error: e3 } = await supabase.from("company_settings")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("company_id", companyId)
    if (e3) { setMessage("Error: " + e3.message); setSaving(false); return }

    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* EMPRESA */}
      <SectionBlock icon={Building2} color="#1e3a5f" title="Datos de la empresa" desc="Información legal y de contacto">
        <Pad>
          <Grid>
            <TextField id="name" label="Nombre de la empresa" value={companyValues.name} onChange={handleCompanyChange} placeholder="Autocares García S.L." />
            <TextField id="cif" label="CIF / NIF" value={companyValues.cif} onChange={handleCompanyChange} placeholder="B12345678" />
            <TextField id="email" label="Email de contacto" value={companyValues.email} onChange={handleCompanyChange} placeholder="info@empresa.com" />
            <TextField id="phone" label="Teléfono" value={companyValues.phone} onChange={handleCompanyChange} placeholder="+34 600 000 000" />
            <TextField id="address" label="Dirección fiscal" value={companyValues.address} onChange={handleCompanyChange} placeholder="Calle Mayor 1, 08001 Barcelona" span />
            <TextField id="website" label="Sitio web" value={companyValues.website} onChange={handleCompanyChange} placeholder="www.empresa.com" span />
          </Grid>
        </Pad>
        <Pad top>
          <Label>Identidad visual</Label>
          <Grid>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Color corporativo</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, height: 38 }}>
                <div style={{ position: "relative" as const, width: 38, height: 38, borderRadius: 9, border: "1.5px solid #e5e7eb", overflow: "hidden", cursor: "pointer", flexShrink: 0 }}>
                  <input type="color" value={companyValues.color_primario}
                    onChange={e => handleCompanyChange("color_primario", e.target.value)}
                    style={{ position: "absolute" as const, inset: 0, width: "100%", height: "100%", border: "none", cursor: "pointer", opacity: 0 }} />
                  <div style={{ width: "100%", height: "100%", background: companyValues.color_primario }} />
                </div>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#374151", background: "#f3f4f6", padding: "4px 10px", borderRadius: 6 }}>
                  {companyValues.color_primario}
                </span>
                <div style={{ height: 30, padding: "0 14px", borderRadius: 7, background: companyValues.color_primario, display: "flex", alignItems: "center", fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {company?.name?.split(" ")[0] ?? "Preview"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Logo de la empresa</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
                    : <span style={{ fontSize: 10, color: "#d1d5db", textAlign: "center" as const, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Sin logo</span>
                  }
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleLogoUpload} />
                  <button type="button" disabled={uploadingLogo} onClick={() => fileInputRef.current?.click()}
                    style={{ display: "flex", alignItems: "center", gap: 7, height: 34, padding: "0 14px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    <Upload style={{ width: 13, height: 13 }} />
                    {uploadingLogo ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
                  </button>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>PNG, JPG o WebP · Fondo transparente</p>
                </div>
              </div>
            </div>
          </Grid>
        </Pad>
      </SectionBlock>

      {/* BASE DE OPERACIONES */}
      <SectionBlock icon={MapPin} color="#0f766e" title="Base de operaciones" desc="Garaje, parking y precio combustible">
        <Pad>
          <div style={{ background: "#f0fdf9", border: "1px solid #bbf7d0", borderRadius: 10, padding: "11px 14px", marginBottom: 18 }}>
            <p style={{ fontSize: 12, color: "#166534", margin: 0, lineHeight: 1.6, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Estas direcciones se usan para calcular los <strong>km en vacío</strong> que recorre el bus desde el garaje hasta el inicio del servicio.
            </p>
          </div>
          <Grid>
            <TextField id="garage_address" label="Dirección del garaje" value={locationValues.garage_address} onChange={handleLocationChange} placeholder="Calle del Garaje 5, 08001 Barcelona" />
            <TextField id="parking_address" label="Parking habitual" value={locationValues.parking_address} onChange={handleLocationChange} placeholder="Parking Central, Madrid" />
          </Grid>
        </Pad>
        <Pad top>
          <Label>Precio combustible global</Label>
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "11px 14px", marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: "#92400e", margin: 0, lineHeight: 1.6, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Este precio se aplica a <strong>todos los vehículos</strong> para calcular el coste de combustible. Actualízalo regularmente según el precio del mercado.
            </p>
          </div>
          <NumberField
            id="precio_combustible_global"
            label="Precio combustible"
            value={locationValues.precio_combustible_global}
            onChange={(id, val) => handleLocationChange(id, String(val))}
            unit="€/L"
          />
        </Pad>
      </SectionBlock>

      {/* MARGEN E IVA */}
      <SectionBlock icon={TrendingUp} color="#0369a1" title="Margen comercial e IVA" desc="Se aplican a todos los presupuestos generados">
        <Pad>
          <Grid>
            <NumberField id="margen_beneficio" label="Margen de beneficio" value={values.margen_beneficio} onChange={handleChange} unit="%" />
            <NumberField id="iva" label="IVA aplicado" value={values.iva} onChange={handleChange} unit="%" />
            <NumberField id="precio_minimo_servicio" label="Precio mínimo por servicio" value={values.precio_minimo_servicio} onChange={handleChange} unit="€" />
          </Grid>
        </Pad>
        <Pad top>
          <Label>Ajuste por temporada</Label>
          <Grid>
            <NumberField id="descuento_baja_temporada" label="Descuento baja temporada" value={values.descuento_baja_temporada} onChange={handleChange} unit="%" />
            <NumberField id="recargo_alta_temporada" label="Recargo alta temporada" value={values.recargo_alta_temporada} onChange={handleChange} unit="%" />
          </Grid>
        </Pad>
      </SectionBlock>

      {/* GUARDAR */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", marginBottom: 28 }}>
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: saved ? "#10b981" : "#e5e7eb", flexShrink: 0, transition: "background 0.3s" }} />
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {message
              ? <span style={{ color: "#dc2626" }}>{message}</span>
              : saved
              ? <span style={{ color: "#10b981", fontWeight: 600 }}>Cambios guardados correctamente</span>
              : "Datos de empresa, operaciones y margen"
            }
          </p>
        </div>
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Las variables de coste se guardan automáticamente al crearlas o editarlas
          </p>
          <button onClick={handleSave} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 20px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', system-ui, sans-serif", background: saved ? "#10b981" : "#111827", color: "#fff", transition: "all 0.2s", flexShrink: 0 }}>
            {saved ? <><Check style={{ width: 14, height: 14 }} /> Guardado</> : saving ? "Guardando..." : <><Save style={{ width: 14, height: 14 }} /> Guardar ajustes</>}
          </button>
        </div>
      </div>

    </div>
  )
}