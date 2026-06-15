"use client"

import { useState, useRef, useEffect, type CSSProperties, type FocusEvent } from "react"
import { createClient } from "@/lib/supabase"
import { AddressAutocomplete } from "@/components/AddressAutocomplete"
import { Building2, MapPin, TrendingUp, Save, Upload, Check, Bell, Shield, Lock } from "lucide-react"
import { COLORS, RADIUS, SHADOW, FONT_BODY } from "@/lib/dashboard-ui"

type Company = {
  id: string; name: string; slug: string; email: string; phone: string
  cif?: string; address?: string; website?: string; logo_url?: string; color_primario?: string
  notification_emails?: string[]
}
type PricingSettings = { garage_address?: string; parking_address?: string; precio_combustible_global?: number }
type Settings = Record<string, number>

// Estilo y foco compartidos para los inputs de dirección con autocompletado
// (mismo aspecto que TextField).
const ADDR_STYLE: CSSProperties = {
  height: 38, width: "100%", borderRadius: RADIUS.sm, border: `1.5px solid ${COLORS.borderStrong}`,
  background: COLORS.surfaceAlt, padding: "0 12px", fontSize: 13, color: COLORS.text, outline: "none",
  fontFamily: FONT_BODY, boxSizing: "border-box", transition: "all 0.15s",
}
const addrFocus = (e: FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = COLORS.navy; e.target.style.background = COLORS.surface; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.07)"
}
const addrBlur = (e: FocusEvent<HTMLInputElement>) => {
  e.target.style.borderColor = COLORS.borderStrong; e.target.style.background = COLORS.surfaceAlt; e.target.style.boxShadow = "none"
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: COLORS.textMuted, margin: "0 0 14px", fontFamily: FONT_BODY }}>
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
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 500, color: COLORS.textMuted, fontFamily: FONT_BODY }}>{label}</label>
      <input id={id} type="text" value={value} onChange={e => onChange(id, e.target.value)} placeholder={placeholder}
        style={{ height: 38, width: "100%", borderRadius: RADIUS.sm, border: `1.5px solid ${COLORS.borderStrong}`, background: COLORS.surfaceAlt, padding: "0 12px", fontSize: 13, color: COLORS.text, outline: "none", fontFamily: FONT_BODY, boxSizing: "border-box" as const, transition: "all 0.15s" }}
        onFocus={e => { e.target.style.borderColor = COLORS.navy; e.target.style.background = COLORS.surface; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.07)" }}
        onBlur={e => { e.target.style.borderColor = COLORS.borderStrong; e.target.style.background = COLORS.surfaceAlt; e.target.style.boxShadow = "none" }}
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
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 500, color: COLORS.textMuted, fontFamily: FONT_BODY }}>
        {label}{unit && <span style={{ color: COLORS.borderStrong, fontWeight: 400, marginLeft: 6 }}>·</span>}
        {unit && <span style={{ color: COLORS.textFaint, fontWeight: 400, marginLeft: 4 }}>{unit}</span>}
      </label>
      <div style={{ position: "relative" as const }}>
        <input id={id} type="number" min={0} step="0.01" value={value}
          onChange={e => onChange(id, parseFloat(e.target.value) || 0)}
          style={{ height: 38, width: "100%", borderRadius: RADIUS.sm, border: `1.5px solid ${COLORS.borderStrong}`, background: COLORS.surfaceAlt, padding: unit ? "0 36px 0 12px" : "0 12px", fontSize: 13, color: COLORS.text, outline: "none", fontFamily: FONT_BODY, boxSizing: "border-box" as const, transition: "all 0.15s" }}
          onFocus={e => { e.target.style.borderColor = COLORS.navy; e.target.style.background = COLORS.surface; e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.07)" }}
          onBlur={e => { e.target.style.borderColor = COLORS.borderStrong; e.target.style.background = COLORS.surfaceAlt; e.target.style.boxShadow = "none" }}
        />
        {unit && (
          <span style={{ position: "absolute" as const, right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: COLORS.textFaint, pointerEvents: "none", fontFamily: FONT_BODY }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

function PasswordField({ label, id, value, onChange, error, placeholder }: {
  label: string; id: string; value: string
  onChange: (id: string, val: string) => void; error?: string; placeholder?: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
      <label htmlFor={id} style={{ fontSize: 12, fontWeight: 500, color: COLORS.textMuted, fontFamily: FONT_BODY }}>{label}</label>
      <input id={id} type="password" value={value} onChange={e => onChange(id, e.target.value)} placeholder={placeholder} autoComplete="new-password"
        style={{ height: 38, width: "100%", borderRadius: RADIUS.sm, border: `1.5px solid ${error ? "#fca5a5" : COLORS.borderStrong}`, background: COLORS.surfaceAlt, padding: "0 12px", fontSize: 13, color: COLORS.text, outline: "none", fontFamily: FONT_BODY, boxSizing: "border-box" as const, transition: "all 0.15s" }}
        onFocus={e => { e.target.style.borderColor = error ? COLORS.danger : COLORS.navy; e.target.style.background = COLORS.surface; e.target.style.boxShadow = `0 0 0 3px ${error ? "rgba(220,38,38,0.08)" : "rgba(30,58,95,0.07)"}` }}
        onBlur={e => { e.target.style.borderColor = error ? "#fca5a5" : COLORS.borderStrong; e.target.style.background = COLORS.surfaceAlt; e.target.style.boxShadow = "none" }}
      />
      {error && <p style={{ fontSize: 11.5, color: COLORS.danger, margin: "1px 0 0", fontFamily: FONT_BODY }}>{error}</p>}
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
          <p style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, margin: 0, fontFamily: FONT_BODY }}>{title}</p>
          <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0, fontFamily: FONT_BODY }}>{desc}</p>
        </div>
      </div>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, overflow: "hidden" }}>
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
    <div style={{ padding: "20px 24px", borderTop: top ? `1px solid ${COLORS.border}` : undefined }}>
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

  const [notificationEmails, setNotificationEmails] = useState<string[]>(company?.notification_emails ?? [])
  const [newEmail, setNewEmail] = useState("")

  // Seguridad — cambio de contraseña
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" })
  const [pwdErrors, setPwdErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMessage, setPwdMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [authEmail, setAuthEmail] = useState("")
  const [isImpersonating, setIsImpersonating] = useState(false)
  const handlePwdChange = (id: string, val: string) => setPwd(p => ({ ...p, [id]: val }))

  // Detecta el usuario autenticado y si hay una sesión de impersonation activa
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      setAuthEmail(user.email ?? "")
      const { data: imp } = await supabase
        .from("admin_sessions")
        .select("id")
        .eq("admin_user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle()
      if (!cancelled) setIsImpersonating(!!imp)
    }
    check()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChangePassword = async () => {
    setPwdMessage(null)
    const errs: { current?: string; next?: string; confirm?: string } = {}
    if (!pwd.current) errs.current = "Introduce tu contraseña actual"
    if (pwd.next.length < 8) errs.next = "La nueva contraseña debe tener al menos 8 caracteres"
    if (pwd.confirm !== pwd.next) errs.confirm = "Las contraseñas no coinciden"
    setPwdErrors(errs)
    if (Object.keys(errs).length > 0) return

    setPwdSaving(true)

    // 1. Verifica que la contraseña actual es correcta re-autenticando
    if (!authEmail) {
      setPwdSaving(false)
      setPwdMessage({ type: "error", text: "No se pudo verificar la sesión actual" })
      return
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password: pwd.current })
    if (signInError) {
      setPwdSaving(false)
      setPwdErrors({ current: "La contraseña actual es incorrecta" })
      return
    }

    // 2. Cambia la contraseña
    const { error } = await supabase.auth.updateUser({ password: pwd.next })
    setPwdSaving(false)
    if (error) {
      setPwdMessage({ type: "error", text: error.message || "No se pudo cambiar la contraseña" })
      return
    }
    setPwd({ current: "", next: "", confirm: "" })
    setPwdErrors({})
    setPwdMessage({ type: "success", text: "Contraseña actualizada correctamente" })
  }

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
      notification_emails: notificationEmails,
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
    <div style={{ fontFamily: FONT_BODY }}>

      {/* EMPRESA */}
      <SectionBlock icon={Building2} color={COLORS.navy} title="Datos de la empresa" desc="Información legal y de contacto">
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
              <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.textMuted, fontFamily: FONT_BODY }}>Color corporativo</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, height: 38 }}>
                <div style={{ position: "relative" as const, width: 38, height: 38, borderRadius: RADIUS.sm, border: `1.5px solid ${COLORS.borderStrong}`, overflow: "hidden", cursor: "pointer", flexShrink: 0 }}>
                  <input type="color" value={companyValues.color_primario}
                    onChange={e => handleCompanyChange("color_primario", e.target.value)}
                    style={{ position: "absolute" as const, inset: 0, width: "100%", height: "100%", border: "none", cursor: "pointer", opacity: 0 }} />
                  <div style={{ width: "100%", height: "100%", background: companyValues.color_primario }} />
                </div>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: COLORS.text, background: COLORS.navySoft, padding: "4px 10px", borderRadius: 6 }}>
                  {companyValues.color_primario}
                </span>
                <div style={{ height: 30, padding: "0 14px", borderRadius: 7, background: companyValues.color_primario, display: "flex", alignItems: "center", fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: FONT_BODY }}>
                  {company?.name?.split(" ")[0] ?? "Preview"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.textMuted, fontFamily: FONT_BODY }}>Logo de la empresa</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: RADIUS.sm, border: `1.5px solid ${COLORS.borderStrong}`, background: COLORS.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
                    : <span style={{ fontSize: 10, color: COLORS.textFaint, textAlign: "center" as const, fontFamily: FONT_BODY }}>Sin logo</span>
                  }
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={handleLogoUpload} />
                  <button type="button" disabled={uploadingLogo} onClick={() => fileInputRef.current?.click()}
                    style={{ display: "flex", alignItems: "center", gap: 7, height: 34, padding: "0 14px", borderRadius: RADIUS.sm, border: `1.5px solid ${COLORS.borderStrong}`, background: COLORS.surface, fontSize: 12, fontWeight: 600, color: COLORS.text, cursor: "pointer", fontFamily: FONT_BODY }}>
                    <Upload style={{ width: 13, height: 13 }} />
                    {uploadingLogo ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
                  </button>
                  <p style={{ fontSize: 11, color: COLORS.textFaint, margin: 0, fontFamily: FONT_BODY }}>PNG, JPG o WebP · Fondo transparente</p>
                </div>
              </div>
            </div>
          </Grid>
        </Pad>
      </SectionBlock>

      {/* BASE DE OPERACIONES */}
      <SectionBlock icon={MapPin} color={COLORS.teal} title="Base de operaciones" desc="Garaje, parking y precio combustible">
        <Pad>
          <div style={{ background: COLORS.tealSoft, border: `1px solid ${COLORS.tealSoft}`, borderRadius: RADIUS.sm, padding: "11px 14px", marginBottom: 18 }}>
            <p style={{ fontSize: 12, color: COLORS.tealDeep, margin: 0, lineHeight: 1.6, fontFamily: FONT_BODY }}>
              Estas direcciones se usan para calcular los <strong>km en vacío</strong> que recorre el bus desde el garaje hasta el inicio del servicio.
            </p>
          </div>
          <Grid>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label htmlFor="garage_address" style={{ fontSize: 12, fontWeight: 500, color: COLORS.textMuted, fontFamily: FONT_BODY }}>Dirección del garaje</label>
              <AddressAutocomplete
                id="garage_address"
                value={locationValues.garage_address}
                onChange={(v) => handleLocationChange("garage_address", v)}
                placeholder="Calle del Garaje 5, 08001 Barcelona"
                inputStyle={ADDR_STYLE} onFocus={addrFocus} onBlur={addrBlur}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label htmlFor="parking_address" style={{ fontSize: 12, fontWeight: 500, color: COLORS.textMuted, fontFamily: FONT_BODY }}>Parking habitual</label>
              <AddressAutocomplete
                id="parking_address"
                value={locationValues.parking_address}
                onChange={(v) => handleLocationChange("parking_address", v)}
                placeholder="Parking Central, Madrid"
                inputStyle={ADDR_STYLE} onFocus={addrFocus} onBlur={addrBlur}
              />
            </div>
          </Grid>
        </Pad>
        <Pad top>
          <Label>Precio combustible global</Label>
          <div style={{ background: COLORS.warningSoft, border: `1px solid ${COLORS.warningSoft}`, borderRadius: RADIUS.sm, padding: "11px 14px", marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: COLORS.warning, margin: 0, lineHeight: 1.6, fontFamily: FONT_BODY }}>
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

      {/* NOTIFICACIONES */}
      <SectionBlock icon={Bell} color={COLORS.navy} title="Emails de notificación" desc="Gestiona quién recibe avisos de nuevas solicitudes">
        <Pad>
          <div style={{ background: COLORS.navySoft, border: `1px solid ${COLORS.navySoft}`, borderRadius: RADIUS.sm, padding: "11px 14px", marginBottom: 18 }}>
            <p style={{ fontSize: 12, color: COLORS.navy, margin: 0, lineHeight: 1.6, fontFamily: FONT_BODY }}>
              Estos emails recibirán un aviso cada vez que llegue una nueva solicitud de presupuesto. Puedes añadir varios emails.
            </p>
          </div>

          {/* Lista de emails */}
          {notificationEmails.length > 0 && (
            <div style={{ marginBottom: 16, display: "flex", flexDirection: "column" as const, gap: 8 }}>
              {notificationEmails.map((email, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: COLORS.surfaceAlt,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: RADIUS.sm
                }}>
                  <span style={{ fontSize: 13, color: COLORS.text, fontFamily: FONT_BODY }}>
                    {email}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotificationEmails(prev => prev.filter((_, i) => i !== idx))}
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: COLORS.danger,
                      background: COLORS.dangerSoft,
                      border: `1px solid ${COLORS.dangerSoft}`,
                      borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: FONT_BODY
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input para añadir nuevo email */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: COLORS.textMuted, fontFamily: FONT_BODY }}>
                Añadir nuevo email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="ejemplo@empresa.com"
                style={{
                  height: 38,
                  width: "100%",
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${COLORS.borderStrong}`,
                  background: COLORS.surfaceAlt,
                  padding: "0 12px",
                  fontSize: 13,
                  color: COLORS.text,
                  outline: "none",
                  fontFamily: FONT_BODY,
                  boxSizing: "border-box" as const,
                  transition: "all 0.15s"
                }}
                onFocus={e => {
                  e.target.style.borderColor = COLORS.navy
                  e.target.style.background = COLORS.surface
                  e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.07)"
                }}
                onBlur={e => {
                  e.target.style.borderColor = COLORS.borderStrong
                  e.target.style.background = COLORS.surfaceAlt
                  e.target.style.boxShadow = "none"
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    if (newEmail.trim() && newEmail.includes("@")) {
                      setNotificationEmails(prev => [...prev, newEmail.trim()])
                      setNewEmail("")
                    }
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (newEmail.trim() && newEmail.includes("@")) {
                  setNotificationEmails(prev => [...prev, newEmail.trim()])
                  setNewEmail("")
                }
              }}
              style={{
                height: 38,
                padding: "0 18px",
                borderRadius: RADIUS.md,
                border: "none",
                background: COLORS.navy,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONT_BODY,
                flexShrink: 0,
                transition: "all 0.15s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = COLORS.navyDeep
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = COLORS.navy
              }}
            >
              Añadir
            </button>
          </div>

          {notificationEmails.length === 0 && (
            <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "12px 0 0", fontFamily: FONT_BODY }}>
              Si no añades ningún email, se usará el email de contacto de la empresa ({companyValues.email}) como fallback.
            </p>
          )}
        </Pad>
      </SectionBlock>

      {/* MARGEN E IVA */}
      <SectionBlock icon={TrendingUp} color={COLORS.navy} title="Margen comercial e IVA" desc="Se aplican a todos los presupuestos generados">
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
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, overflow: "hidden", marginBottom: 28 }}>
        <div style={{ padding: "14px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: saved ? COLORS.teal : COLORS.border, flexShrink: 0, transition: "background 0.3s" }} />
          <p style={{ fontSize: 12, color: COLORS.textFaint, margin: 0, fontFamily: FONT_BODY }}>
            {message
              ? <span style={{ color: COLORS.danger }}>{message}</span>
              : saved
              ? <span style={{ color: COLORS.teal, fontWeight: 600 }}>Cambios guardados correctamente</span>
              : "Datos de empresa, operaciones y margen"
            }
          </p>
        </div>
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 12, color: COLORS.textFaint, margin: 0, fontFamily: FONT_BODY }}>
            Las variables de coste se guardan automáticamente al crearlas o editarlas
          </p>
          <button onClick={handleSave} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 20px", borderRadius: RADIUS.md, border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: FONT_BODY, background: saved ? COLORS.teal : COLORS.navy, color: "#fff", transition: "all 0.2s", flexShrink: 0 }}>
            {saved ? <><Check style={{ width: 14, height: 14 }} /> Guardado</> : saving ? "Guardando..." : <><Save style={{ width: 14, height: 14 }} /> Guardar ajustes</>}
          </button>
        </div>
      </div>

      {/* SEGURIDAD */}
      {isImpersonating ? (
        <div style={{ marginBottom: 20, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <Lock style={{ width: 16, height: 16, color: COLORS.textMuted, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0, fontFamily: FONT_BODY }}>
            La gestión de contraseña no está disponible en modo impersonación
          </p>
        </div>
      ) : (
      <SectionBlock icon={Shield} color={COLORS.teal} title="Seguridad" desc="Gestiona tu contraseña y acceso a la cuenta">
        <Pad>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 16, maxWidth: 440 }}>
            <PasswordField id="current" label="Contraseña actual" value={pwd.current} onChange={handlePwdChange} error={pwdErrors.current} placeholder="••••••••" />
            <PasswordField id="next" label="Nueva contraseña" value={pwd.next} onChange={handlePwdChange} error={pwdErrors.next} placeholder="Mínimo 8 caracteres" />
            <PasswordField id="confirm" label="Confirmar nueva contraseña" value={pwd.confirm} onChange={handlePwdChange} error={pwdErrors.confirm} placeholder="Repite la nueva contraseña" />
          </div>

          {pwdMessage && (
            <div style={{
              marginTop: 16, borderRadius: RADIUS.sm, padding: "11px 14px",
              background: pwdMessage.type === "success" ? COLORS.tealSoft : COLORS.dangerSoft,
              border: `1px solid ${pwdMessage.type === "success" ? COLORS.tealSoft : COLORS.dangerSoft}`,
              maxWidth: 440,
            }}>
              <p style={{ fontSize: 12.5, margin: 0, fontWeight: 600, color: pwdMessage.type === "success" ? COLORS.tealDeep : COLORS.danger, fontFamily: FONT_BODY }}>
                {pwdMessage.text}
              </p>
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <button onClick={handleChangePassword} disabled={pwdSaving}
              style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 20px", borderRadius: RADIUS.md, border: "none", fontSize: 13, fontWeight: 600, cursor: pwdSaving ? "not-allowed" : "pointer", fontFamily: FONT_BODY, background: COLORS.navy, color: "#fff", opacity: pwdSaving ? 0.7 : 1, transition: "all 0.2s" }}>
              <Lock style={{ width: 14, height: 14 }} />
              {pwdSaving ? "Cambiando..." : "Cambiar contraseña"}
            </button>
          </div>
        </Pad>
      </SectionBlock>
      )}

    </div>
  )
}