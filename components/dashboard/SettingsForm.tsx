"use client"

import { useState, useRef } from "react"
import { Save, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase"

type Settings = Record<string, number>
type Company = {
  id: string
  name: string
  slug: string
  email: string
  phone: string
  cif?: string
  address?: string
  website?: string
  logo_url?: string
  color_primario?: string
}

function Field({ label, id, value, onChange, unit }: {
  label: string
  id: string
  value: number
  onChange: (id: string, val: number) => void
  unit?: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} {unit && <span className="text-gray-400 font-normal">({unit})</span>}
      </Label>
      <Input id={id} type="number" min={0} step="0.01" value={value}
        onChange={(e) => onChange(id, parseFloat(e.target.value) || 0)} className="h-9" />
    </div>
  )
}

function TextField({ label, id, value, onChange, placeholder }: {
  label: string; id: string; value: string
  onChange: (id: string, val: string) => void; placeholder?: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</Label>
      <Input id={id} type="text" value={value} onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder} className="h-9" />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

export function SettingsForm({ settings, companyId, company }: {
  settings: Settings | null; companyId: string; company: Company | null
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [companyValues, setCompanyValues] = useState({
    name: company?.name ?? "",
    email: company?.email ?? "",
    phone: company?.phone ?? "",
    cif: company?.cif ?? "",
    address: company?.address ?? "",
    website: company?.website ?? "",
    color_primario: company?.color_primario ?? "#1e3a5f",
  })

  const [logoUrl, setLogoUrl] = useState(company?.logo_url ?? "")
  const [uploadingLogo, setUploadingLogo] = useState(false)

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
    descuento_baja_temporada: settings?.descuento_baja_temporada ?? 0,
    recargo_alta_temporada: settings?.recargo_alta_temporada ?? 15,
  })

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const handleChange = (id: string, val: number) => setValues((prev) => ({ ...prev, [id]: val }))
  const handleCompanyChange = (id: string, val: string) => setCompanyValues((prev) => ({ ...prev, [id]: val }))

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const ext = file.name.split(".").pop()
    const fileName = `${companyId}.${ext}`
    const { error } = await supabase.storage.from("logos").upload(fileName, file, { upsert: true })
    if (error) {
      setMessage("❌ Error al subir el logo: " + error.message)
      setUploadingLogo(false)
      return
    }
    const { data } = supabase.storage.from("logos").getPublicUrl(fileName)
    await supabase.from("companies").update({ logo_url: data.publicUrl }).eq("id", companyId)
    setLogoUrl(data.publicUrl + `?t=${Date.now()}`)
    setUploadingLogo(false)
    setMessage("✅ Logo subido correctamente — recargando...")
    setTimeout(() => window.location.reload(), 1000)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage("")
    const { error: companyError } = await supabase.from("companies").update({
      name: companyValues.name,
      email: companyValues.email,
      phone: companyValues.phone,
      cif: companyValues.cif,
      address: companyValues.address,
      website: companyValues.website,
      color_primario: companyValues.color_primario,
    }).eq("id", companyId)
    if (companyError) {
      setMessage("❌ Error al guardar datos de empresa: " + companyError.message)
      setSaving(false)
      return
    }
    const { error } = await supabase.from("company_settings")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("company_id", companyId)
    setSaving(false)
    if (error) { setMessage("❌ Error al guardar ajustes: " + error.message); return }
    setMessage("✅ Ajustes guardados correctamente")
  }

  const f = (id: string, label: string, unit?: string) => (
    <Field key={id} id={id} label={label} value={values[id]} onChange={handleChange} unit={unit} />
  )
  const t = (id: string, label: string, placeholder?: string) => (
    <TextField key={id} id={id} label={label} value={companyValues[id as keyof typeof companyValues]} onChange={handleCompanyChange} placeholder={placeholder} />
  )

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">🏢 Datos de la empresa</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {t("name", "Nombre de la empresa", "Autocares García S.L.")}
          {t("cif", "CIF", "B12345678")}
          {t("email", "Email de contacto", "info@empresa.com")}
          {t("phone", "Teléfono", "+34 600 000 000")}
          {t("address", "Dirección", "Calle Mayor 1, 08001 Barcelona")}
          {t("website", "Web", "www.empresa.com")}
        </div>

        <div className="grid gap-1.5">
          <Label className="text-sm font-medium text-gray-700">Color corporativo</Label>
          <div className="flex items-center gap-3">
            <input type="color" value={companyValues.color_primario}
              onChange={(e) => handleCompanyChange("color_primario", e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-gray-200" />
            <span className="text-sm text-gray-500">{companyValues.color_primario}</span>
            <div className="h-8 w-32 rounded-md text-white text-xs flex items-center justify-center font-semibold"
              style={{ backgroundColor: companyValues.color_primario }}>
              Vista previa
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label className="text-sm font-medium text-gray-700">Logo de la empresa</Label>
          <div className="flex items-center gap-4">
            {logoUrl && (
              <img src={logoUrl} alt="Logo"
                className="h-16 w-auto object-contain rounded border border-gray-200 p-1" />
            )}
            <div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                className="hidden" onChange={handleLogoUpload} />
              <Button type="button" variant="outline" disabled={uploadingLogo}
                onClick={() => fileInputRef.current?.click()}
                className="h-9 border-gray-200 text-gray-700">
                <Upload className="size-4" />
                {uploadingLogo ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
              </Button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG o WebP. Recomendado: fondo transparente.</p>
            </div>
          </div>
        </div>
      </div>

      <Section title="🚌 Vehículos — Consumo (litros/100km)">
        {f("consumo_minibus", "Minibus")}
        {f("consumo_autobus", "Autobús")}
        {f("consumo_autocar", "Autocar")}
        {f("precio_combustible", "Precio combustible", "€/litro")}
      </Section>

      <Section title="🔧 Costes del vehículo">
        {f("amortizacion_km", "Amortización", "€/km")}
        {f("mantenimiento_km", "Mantenimiento", "€/km")}
        {f("seguro_dia", "Seguro", "€/día")}
      </Section>

      <Section title="🛣️ Peajes">
        {f("peajes_nacional", "Nacional", "€/100km")}
        {f("peajes_internacional", "Internacional", "€/100km")}
      </Section>

      <Section title="👨‍✈️ Conductor — Costes base">
        {f("coste_hora_conductor", "Coste hora", "€/hora")}
        {f("dieta_nacional", "Dieta nacional", "€")}
        {f("dieta_internacional", "Dieta internacional", "€")}
        {f("plus_telefono", "Plus teléfono", "€")}
        {f("plus_disponibilidad", "Plus disponibilidad/limpieza", "€")}
      </Section>

      <Section title="⏰ Pluses automáticos del conductor">
        {f("plus_11horas", "Plus +11 horas", "€")}
        {f("plus_nocturnidad", "Nocturnidad (salida 22h-4:59h)", "€")}
        {f("plus_sabado", "Plus sábado", "€")}
        {f("plus_domingo", "Plus domingo", "€")}
        {f("plus_festivo", "Plus festivo nacional", "€")}
        {f("plus_noche_fuera_nacional", "Noche fuera nacional", "€")}
        {f("plus_noche_fuera_internacional", "Noche fuera internacional", "€")}
      </Section>

      <Section title="✨ Extras opcionales">
        {f("coste_guia", "Guía turístico", "€/día")}
        {f("coste_azafata", "Azafata/o", "€/día")}
        {f("recargo_ac", "Recargo aire acondicionado", "%")}
        {f("recargo_internacional", "Recargo servicio internacional", "%")}
        {f("precio_minimo_servicio", "Precio mínimo por servicio", "€")}
        {f("tasas_aparcamiento", "Tasas aparcamiento estimadas", "€")}
      </Section>

      <Section title="💰 Margen comercial y temporada">
        {f("margen_beneficio", "Margen de beneficio", "%")}
        {f("descuento_baja_temporada", "Descuento baja temporada", "%")}
        {f("recargo_alta_temporada", "Recargo alta temporada", "%")}
      </Section>

      <div className="flex flex-col gap-3 items-end">
        {message && <p className="text-sm">{message}</p>}
        <Button onClick={handleSave} disabled={saving}
          className="h-11 px-8 bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
          <Save className="size-4" />
          {saving ? "Guardando..." : "Guardar ajustes"}
        </Button>
      </div>
    </div>
  )
}