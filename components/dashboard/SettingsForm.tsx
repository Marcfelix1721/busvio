"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import {
  Building2, Palette, MapPin, Bus, Wrench, UserRound,
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
  { id: "vehiculos", label: "Vehículos", icon: Bus },
  { id: "costes", label: "Costes del vehículo", icon: Wrench },
  { id: "conductor", label: "Conductor", icon: UserRound },
  { id: "extras", label: "Extras y recargos", icon: Sparkles },
  { id: "comercial", label: "Margen e IVA", icon: TrendingUp },
]

function SectionWrapper({ id, title, icon: Icon, children, color = "#1e3a5f" }: {
  id: string; title: string; icon: any; children: React.ReactNode; color?: string
}) {
  return (
    <div id={id} className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 shadow-sm" style={{ background: color }}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-[0.9375rem] font-semibold text-[#111827] leading-tight">{title}</h2>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function FieldGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="p-6">
      {title && (
        <p className="text-[0.6875rem] font-bold tracking-[0.08em] uppercase text-[#9ca3af] mb-4">{title}</p>
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
    <div className={`flex flex-col gap-1.5 ${span ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-[0.75rem] font-medium text-[#6b7280]">
        {label}
        {unit && <span className="ml-1 text-[#9ca3af] font-normal">· {unit}</span>}
      </label>
      <div className="relative">
        <input
          id={id} type="number" min={0} step="0.01" value={value}
          onChange={(e) => onChange(id, parseFloat(e.target.value) || 0)}
          className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 text-[0.8125rem] text-[#111827] outline-none transition-all focus:border-[#1e3a5f] focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/10"
        />
      </div>
    </div>
  )
}

function TextField({ label, id, value, onChange, placeholder, hint, span = false }: {
  label: string; id: string; value: string
  onChange: (id: string, val: string) => void; placeholder?: string; hint?: string; span?: boolean
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${span ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-[0.75rem] font-medium text-[#6b7280]">{label}</label>
      <input
        id={id} type="text" value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 text-[0.8125rem] text-[#111827] outline-none transition-all focus:border-[#1e3a5f] focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/10 placeholder:text-[#d1d5db]"
      />
      {hint && <p className="text-[0.7rem] text-[#9ca3af]">{hint}</p>}
    </div>
  )
}

function LocationField({ label, sublabel, id, value, onChange, placeholder }: {
  label: string; sublabel: string; id: string; value: string
  onChange: (id: string, val: string) => void; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.75rem] font-medium text-[#374151]">
        {label}
        <span className="ml-1 text-[0.7rem] text-[#9ca3af] font-normal">· {sublabel}</span>
      </label>
      <input
        id={id} type="text" value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-[#dbeafe] bg-[#f0f7ff] px-3 text-[0.8125rem] text-[#111827] outline-none transition-all focus:border-[#1e3a5f] focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/10 placeholder:text-[#bfdbfe]"
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
    precio_combustible: settings?.precio_combustible ?? 1.65,
    consumo_minibus: settings?.consumo_minibus ?? 12,
    consumo_autobus: settings?.consumo_autobus ?? 25,
    consumo_autocar: settings?.consumo_autocar ?? 30,
    amortizacion_km: settings?.amortizacion_km ?? 0.15,
    mantenimiento_km: settings?.mantenimiento_km ?? 0.08,
    seguro_dia: settings?.seguro_dia ?? 35,
    peajes_nacional: settings?.peajes_nacional ?? 4,
    peajes_internacional: settings?.peajes_internacional ?? 6,
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

  return (
    <div className="flex gap-8 items-start">

      {/* NAV LATERAL */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 sticky top-6">
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-3 py-3 border-b border-[#f3f4f6]">
            <p className="text-[0.65rem] font-bold tracking-[0.1em] uppercase text-[#9ca3af] px-2">Secciones</p>
          </div>
          <nav className="p-2 flex flex-col gap-0.5">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = activeSection === id
              return (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-all text-[0.8125rem] font-medium ${
                    active
                      ? "bg-[#1e3a5f] text-white shadow-sm"
                      : "text-[#6b7280] hover:bg-[#f5f5f4] hover:text-[#111827]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                  {active && <ChevronRight className="h-3 w-3 ml-auto shrink-0 opacity-60" />}
                </button>
              )
            })}
          </nav>

          {/* Botón guardar en el nav */}
          <div className="p-3 border-t border-[#f3f4f6]">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center justify-center gap-2 w-full h-9 rounded-lg text-[0.8125rem] font-semibold transition-all ${
                saved
                  ? "bg-emerald-500 text-white"
                  : "bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90 active:scale-[0.98]"
              }`}
            >
              {saved ? <><Check className="h-3.5 w-3.5" /> Guardado</> : saving ? "Guardando..." : <><Save className="h-3.5 w-3.5" /> Guardar</>}
            </button>
            {message && <p className="text-[0.7rem] text-red-500 mt-2 text-center">{message}</p>}
          </div>
        </div>
      </aside>

      {/* CONTENIDO */}
      <div className="flex-1 min-w-0 flex flex-col gap-8">

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
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.75rem] font-medium text-[#6b7280]">Color corporativo</label>
              <div className="flex items-center gap-3">
                <div className="relative h-9 w-9 rounded-lg border border-[#e5e7eb] overflow-hidden cursor-pointer shrink-0">
                  <input
                    type="color" value={companyValues.color_primario}
                    onChange={(e) => handleCompanyChange("color_primario", e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer border-none opacity-0"
                  />
                  <div className="h-full w-full rounded-lg" style={{ background: companyValues.color_primario }} />
                </div>
                <span className="text-[0.8rem] font-mono text-[#6b7280]">{companyValues.color_primario}</span>
                <div
                  className="h-8 px-4 rounded-lg flex items-center text-[0.75rem] font-semibold text-white tracking-wide"
                  style={{ background: companyValues.color_primario }}
                >
                  Vista previa
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[0.75rem] font-medium text-[#6b7280]">Logo de la empresa</label>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] flex items-center justify-center overflow-hidden">
                  {logoUrl
                    ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                    : <span className="text-[0.65rem] text-[#d1d5db] text-center leading-tight">Sin<br/>logo</span>
                  }
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
                  <button
                    type="button" disabled={uploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg border border-[#e5e7eb] bg-white text-[0.8125rem] font-medium text-[#374151] hover:bg-[#f9fafb] hover:border-[#d1d5db] transition-all"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingLogo ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
                  </button>
                  <p className="text-[0.7rem] text-[#9ca3af] mt-1">PNG, JPG o WebP · Fondo transparente recomendado</p>
                </div>
              </div>
            </div>
          </FieldGroup>
        </SectionWrapper>

        {/* BASE DE OPERACIONES */}
        <SectionWrapper id="operaciones" title="Base de operaciones" icon={MapPin} color="#0f766e">
          <div className="p-6">
            <div className="rounded-xl bg-[#f0fdf9] border border-[#99f6e4] p-4 mb-5">
              <p className="text-[0.8rem] text-[#134e4a] leading-relaxed">
                Estas direcciones se usan para calcular los <strong className="font-semibold">kilómetros en vacío</strong> — desde el garaje hasta el punto de recogida del cliente — y el coste de parking durante el servicio.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#f0fdf9] border border-[#99f6e4] flex items-center justify-center">
                    <MapPin className="h-3.5 w-3.5 text-[#0f766e]" />
                  </div>
                  <span className="text-[0.8rem] font-semibold text-[#111827]">Garaje</span>
                  <span className="text-[0.7rem] text-[#9ca3af]">· salida del bus</span>
                </div>
                <LocationField
                  id="garage_address" label="" sublabel=""
                  value={locationValues.garage_address}
                  onChange={handleLocationChange}
                  placeholder="Calle del Garaje 5, 08001 Barcelona"
                />
              </div>
              <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#f0fdf9] border border-[#99f6e4] flex items-center justify-center">
                    <MapPin className="h-3.5 w-3.5 text-[#0f766e]" />
                  </div>
                  <span className="text-[0.8rem] font-semibold text-[#111827]">Parking habitual</span>
                  <span className="text-[0.7rem] text-[#9ca3af]">· donde espera el bus</span>
                </div>
                <LocationField
                  id="parking_address" label="" sublabel=""
                  value={locationValues.parking_address}
                  onChange={handleLocationChange}
                  placeholder="Parking Central, Madrid"
                />
              </div>
            </div>
          </div>
        </SectionWrapper>

        {/* VEHÍCULOS */}
        <SectionWrapper id="vehiculos" title="Vehículos — Consumo" icon={Bus} color="#1e40af">
          <FieldGroup title="Litros cada 100 km por tipo de vehículo">
            {f("consumo_minibus", "Minibus", "L/100km")}
            {f("consumo_autobus", "Autobús", "L/100km")}
            {f("consumo_autocar", "Autocar Gran Turismo", "L/100km")}
            {f("precio_combustible", "Precio del combustible", "€/litro")}
          </FieldGroup>
        </SectionWrapper>

        {/* COSTES */}
        <SectionWrapper id="costes" title="Costes del vehículo" icon={Wrench} color="#b45309">
          <FieldGroup title="Desgaste y operación">
            {f("amortizacion_km", "Amortización", "€/km")}
            {f("mantenimiento_km", "Mantenimiento", "€/km")}
            {f("seguro_dia", "Seguro", "€/día")}
          </FieldGroup>
          <FieldDivider />
          <FieldGroup title="Peajes estimados">
            {f("peajes_nacional", "Nacional", "€/100km")}
            {f("peajes_internacional", "Internacional", "€/100km")}
          </FieldGroup>
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

        {/* COMERCIAL */}
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
        <div className="lg:hidden flex flex-col gap-2">
          {message && <p className="text-sm text-red-500">{message}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center justify-center gap-2 h-11 w-full rounded-xl text-[0.9375rem] font-semibold transition-all ${
              saved ? "bg-emerald-500 text-white" : "bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90"
            }`}
          >
            {saved ? <><Check className="h-4 w-4" /> Guardado correctamente</> : saving ? "Guardando..." : <><Save className="h-4 w-4" /> Guardar ajustes</>}
          </button>
        </div>

      </div>
    </div>
  )
}