"use client"

import { useState } from "react"
import { Calculator, ChevronDown, ChevronUp, Loader2, Mail, Save } from "lucide-react"
import jsPDF from "jspdf"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase"
import { QuoteRequest } from "@/lib/types"

type Company = {
  id: string
  name: string
  email: string
  phone: string
  cif?: string
  address?: string
  website?: string
  logo_url?: string
  color_primario?: string
}

const statusClasses: Record<QuoteRequest["status"], string> = {
  nuevo: "bg-blue-50 text-blue-700 border-blue-200",
  en_revision: "bg-amber-50 text-amber-700 border-amber-200",
  enviado: "bg-purple-50 text-purple-700 border-purple-200",
  aceptado: "bg-green-50 text-green-700 border-green-200",
  rechazado: "bg-red-50 text-red-700 border-red-200",
  cancelado: "bg-gray-50 text-gray-600 border-gray-200",
}

const statuses: Array<{ value: QuoteRequest["status"]; label: string }> = [
  { value: "nuevo", label: "Nuevo" },
  { value: "en_revision", label: "En revisión" },
  { value: "enviado", label: "Enviado" },
  { value: "aceptado", label: "Aceptado" },
  { value: "rechazado", label: "Rechazado" },
  { value: "cancelado", label: "Cancelado" },
]

type Desglose = {
  combustible: number
  vehiculo: number
  peajes: number
  conductor: number
  pluses: number
  desglose_pluses: string[]
  subtotal: number
  margen: number
  base_imponible: number
  iva_porcentaje: number
  importe_iva: number
  total: number
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [30, 58, 95]
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export function QuoteActions({ quote, company }: { quote: QuoteRequest; company: Company | null }) {
  const supabase = createClient()
  const [status, setStatus] = useState<QuoteRequest["status"]>(quote.status)
  const [finalPrice, setFinalPrice] = useState<number | "">(quote.final_price ?? "")
  const [internalNotes, setInternalNotes] = useState(quote.internal_notes ?? "")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [calculando, setCalculando] = useState(false)
  const [rutaInfo, setRutaInfo] = useState<{
    distanceKm: number
    durationText: string
    precioSugerido: number | null
    desglose: Desglose | null
  } | null>(
    quote.estimated_km
      ? { distanceKm: quote.estimated_km, durationText: "", precioSugerido: quote.estimated_price ?? null, desglose: null }
      : null
  )
  const [rutaError, setRutaError] = useState("")
  const [mostrarDesglose, setMostrarDesglose] = useState(false)

  const calcularRuta = async () => {
    setCalculando(true)
    setRutaError("")
    setRutaInfo(null)
    try {
      const res = await fetch("/api/calcular-ruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: quote.origin,
          destination: quote.destination,
          stops: quote.stops ?? "",
          company_id: quote.company_id,
          vehicle_type: quote.vehicle_type,
          trip_date: quote.trip_date,
          departure_time: quote.departure_time,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setRutaError(data.error ?? "Error al calcular la ruta"); return }
      const { distanceKm, durationText, precioSugerido, desglose } = data
      setRutaInfo({ distanceKm, durationText, precioSugerido, desglose })
      await supabase.from("quote_requests").update({
        estimated_km: distanceKm,
        ...(precioSugerido !== null && { estimated_price: precioSugerido }),
      }).eq("id", quote.id)
      if (precioSugerido !== null && finalPrice === "") setFinalPrice(precioSugerido)
    } catch {
      setRutaError("Error de conexión al calcular la ruta")
    } finally {
      setCalculando(false)
    }
  }

  const updateStatus = async (nextStatus: QuoteRequest["status"]) => {
    setSaving(true)
    setMessage("")
    const { error } = await supabase.from("quote_requests").update({ status: nextStatus }).eq("id", quote.id)
    setSaving(false)
    if (error) { setMessage("No se pudo actualizar el estado"); return }
    setStatus(nextStatus)
    setMessage("Guardado correctamente")
  }

  const saveChanges = async () => {
    setSaving(true)
    setMessage("")
    const { error } = await supabase.from("quote_requests").update({
      final_price: finalPrice === "" ? null : finalPrice,
      internal_notes: internalNotes.trim() === "" ? null : internalNotes.trim(),
    }).eq("id", quote.id)
    setSaving(false)
    if (error) { setMessage("No se pudieron guardar los cambios"); return }
    setMessage("Guardado correctamente")
  }

  const generarPDFBase64 = async (): Promise<string> => {
    const doc = new jsPDF()
    const precio = finalPrice || quote.estimated_price || 0
    const numPresupuesto = `P-${quote.id.slice(0, 8).toUpperCase()}`
    const pageWidth = 210
    const empresaNombre = company?.name ?? "Busvio"
    const empresaEmail = company?.email ?? ""
    const empresaTelefono = company?.phone ?? ""
    const empresaCIF = company?.cif ?? ""
    const empresaDireccion = company?.address ?? ""
    const colorHex = company?.color_primario ?? "#1e3a5f"
    const [r, g, b] = hexToRgb(colorHex)

    // CABECERA
    doc.setFillColor(r, g, b)
    doc.rect(0, 0, pageWidth, 45, "F")
    doc.setTextColor(255, 255, 255)

    let logoLoaded = false
    if (company?.logo_url) {
      const logoBase64 = await loadImageAsBase64(company.logo_url)
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, "PNG", 15, 5, 35, 35)
          logoLoaded = true
        } catch { logoLoaded = false }
      }
    }

    const textX = logoLoaded ? 55 : 15
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text(empresaNombre.toUpperCase(), textX, 16)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    if (empresaDireccion) doc.text(empresaDireccion, textX, 24)
    if (empresaEmail) doc.text(empresaEmail, textX, 30)
    if (empresaTelefono) doc.text(`Tel: ${empresaTelefono}`, textX, 36)

    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("PRESUPUESTO", pageWidth - 15, 15, { align: "right" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Nº ${numPresupuesto}`, pageWidth - 15, 23, { align: "right" })
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, pageWidth - 15, 30, { align: "right" })
    if (empresaCIF) doc.text(`CIF: ${empresaCIF}`, pageWidth - 15, 37, { align: "right" })

    // DATOS DEL SOLICITANTE
    let y = 60
    doc.setTextColor(r, g, b)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("DATOS DEL SOLICITANTE", 15, y)
    doc.setDrawColor(r, g, b)
    doc.line(15, y + 2, pageWidth - 15, y + 2)

    y += 10
    doc.setTextColor(80, 80, 80)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("Nombre:", 15, y)
    doc.setFont("helvetica", "normal")
    doc.text(quote.requester_name ?? "-", 45, y)
    doc.setFont("helvetica", "bold")
    doc.text("Email:", 110, y)
    doc.setFont("helvetica", "normal")
    doc.text(quote.requester_email ?? "-", 125, y)

    y += 8
    doc.setFont("helvetica", "bold")
    doc.text("Teléfono:", 15, y)
    doc.setFont("helvetica", "normal")
    doc.text(quote.requester_phone ?? "-", 45, y)

    // DETALLES DEL VIAJE
    y += 16
    doc.setTextColor(r, g, b)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("DETALLES DEL VIAJE", 15, y)
    doc.line(15, y + 2, pageWidth - 15, y + 2)

    y += 10
    doc.setTextColor(80, 80, 80)
    doc.setFont("helvetica", "bold")
    doc.text("Origen:", 15, y)
    doc.setFont("helvetica", "normal")
    const origenLines = doc.splitTextToSize(quote.origin ?? "-", 140)
    doc.text(origenLines, 45, y)
    y += origenLines.length * 5 + 3

    doc.setFont("helvetica", "bold")
    doc.text("Destino:", 15, y)
    doc.setFont("helvetica", "normal")
    const destinoLines = doc.splitTextToSize(quote.destination ?? "-", 140)
    doc.text(destinoLines, 45, y)
    y += destinoLines.length * 5 + 3

    if (quote.stops) {
      doc.setFont("helvetica", "bold")
      doc.text("Paradas:", 15, y)
      doc.setFont("helvetica", "normal")
      const paradasLines = doc.splitTextToSize(quote.stops, 140)
      doc.text(paradasLines, 45, y)
      y += paradasLines.length * 5 + 3
    }

    y += 2
    doc.setFont("helvetica", "bold")
    doc.text("Fecha viaje:", 15, y)
    doc.setFont("helvetica", "normal")
    doc.text(new Date(quote.trip_date).toLocaleDateString("es-ES"), 45, y)
    doc.setFont("helvetica", "bold")
    doc.text("Pasajeros:", 110, y)
    doc.setFont("helvetica", "normal")
    doc.text(String(quote.passengers ?? "-"), 135, y)

    y += 8
    doc.setFont("helvetica", "bold")
    doc.text("Vehículo:", 15, y)
    doc.setFont("helvetica", "normal")
    doc.text(quote.vehicle_type ?? "-", 45, y)
    doc.setFont("helvetica", "bold")
    doc.text("Hora salida:", 110, y)
    doc.setFont("helvetica", "normal")
    doc.text(quote.departure_time ?? "-", 140, y)

    if (rutaInfo) {
      y += 8
      doc.setFont("helvetica", "bold")
      doc.text("Distancia:", 15, y)
      doc.setFont("helvetica", "normal")
      doc.text(`${rutaInfo.distanceKm} km`, 45, y)
      if (rutaInfo.durationText) {
        doc.setFont("helvetica", "bold")
        doc.text("Duración est.:", 110, y)
        doc.setFont("helvetica", "normal")
        doc.text(rutaInfo.durationText, 140, y)
      }
    }

    // DESGLOSE DE COSTES
    if (rutaInfo?.desglose) {
      y += 16
      doc.setTextColor(r, g, b)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("DESGLOSE DE COSTES", 15, y)
      doc.line(15, y + 2, pageWidth - 15, y + 2)
      y += 10
      doc.setTextColor(80, 80, 80)
      const items: [string, string][] = [
        ["Combustible", `${rutaInfo.desglose.combustible} €`],
        ["Vehículo (amort. + mant. + seguro)", `${rutaInfo.desglose.vehiculo} €`],
        ["Peajes estimados", `${rutaInfo.desglose.peajes} €`],
        ["Conductor", `${rutaInfo.desglose.conductor} €`],
        ...(rutaInfo.desglose.pluses > 0 ? [["Pluses conductor", `${rutaInfo.desglose.pluses} €`] as [string, string]] : []),
      ]
      items.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal")
        doc.text(label, 20, y)
        doc.text(value, pageWidth - 15, y, { align: "right" })
        y += 7
      })
      doc.line(15, y, pageWidth - 15, y)
      y += 6
      doc.setFont("helvetica", "bold")
      doc.text("Subtotal costes", 20, y)
      doc.text(`${rutaInfo.desglose.subtotal} €`, pageWidth - 15, y, { align: "right" })
      y += 7
      doc.setFont("helvetica", "normal")
      doc.text("Margen comercial", 20, y)
      doc.text(`${rutaInfo.desglose.margen} €`, pageWidth - 15, y, { align: "right" })
      y += 7
      doc.setFont("helvetica", "bold")
      doc.text("Base imponible", 20, y)
      doc.text(`${rutaInfo.desglose.base_imponible} €`, pageWidth - 15, y, { align: "right" })
      y += 7
      doc.setFont("helvetica", "normal")
      doc.text(`IVA (${rutaInfo.desglose.iva_porcentaje}%)`, 20, y)
      doc.text(`${rutaInfo.desglose.importe_iva} €`, pageWidth - 15, y, { align: "right" })
    }

    // PRECIO TOTAL CON IVA
    y += 16
    doc.setFillColor(r, g, b)
    doc.rect(0, y, pageWidth, 32, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("TOTAL (IVA incluido)", 15, y + 10)
    doc.setFontSize(22)
    doc.text(`${precio} €`, 15, y + 25)

    // PIE
    doc.setTextColor(150, 150, 150)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.text("Este presupuesto tiene una validez de 30 días desde la fecha de emisión.", 15, 285)
    doc.text(`${empresaNombre} — Gestión de transporte discrecional`, 15, 290)

    return doc.output("datauristring").split(",")[1]
  }

  const enviarPresupuesto = async () => {
    setEnviando(true)
    setMessage("")
    try {
      const pdfBase64 = await generarPDFBase64()
      const numeroPresupuesto = `P-${quote.id.slice(0, 8).toUpperCase()}`
      const precio = finalPrice || quote.estimated_price || 0
      const res = await fetch("/api/enviar-presupuesto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: quote.requester_email,
          nombre: quote.requester_name,
          pdfBase64,
          numeroPresupuesto,
          origen: quote.origin,
          destino: quote.destination,
          fecha: new Date(quote.trip_date).toLocaleDateString("es-ES"),
          precio,
          empresaNombre: company?.name ?? "Busvio",
          iva: rutaInfo?.desglose?.iva_porcentaje ?? 21,
          baseImponible: rutaInfo?.desglose?.base_imponible ?? null,
          importeIva: rutaInfo?.desglose?.importe_iva ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setMessage(`❌ Error: ${data.error}`); return }
      await supabase.from("quote_requests").update({
        status: "enviado",
        final_price: precio === 0 ? null : Number(precio),
      }).eq("id", quote.id)
      setStatus("enviado")
      setMessage("✅ Presupuesto enviado por email correctamente")
    } catch (err) {
      console.error(err)
      setMessage("❌ Error de conexión al enviar el email")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            Cálculo de ruta y precio
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <Button type="button" onClick={calcularRuta} disabled={calculando} className="h-10 w-full bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
            {calculando ? <><Loader2 className="size-4 animate-spin" /> Calculando...</> : <><Calculator className="size-4" /> Calcular km y precio</>}
          </Button>
          {rutaError && <p className="text-sm text-red-500">{rutaError}</p>}
          {rutaInfo && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Distancia:</span>
                <span className="font-bold text-[#1e3a5f]">{rutaInfo.distanceKm} km</span>
              </div>
              {rutaInfo.durationText && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Duración est.:</span>
                  <span className="font-semibold">{rutaInfo.durationText}</span>
                </div>
              )}
              {rutaInfo.precioSugerido !== null ? (
                <>
                  <div className="flex justify-between text-sm border-t border-blue-200 pt-2 mt-2">
                    <span className="text-gray-600 font-medium">Precio sugerido (IVA inc.):</span>
                    <span className="font-bold text-green-700 text-base">{rutaInfo.precioSugerido} €</span>
                  </div>
                  {rutaInfo.desglose && (
                    <div className="mt-2">
                      <button onClick={() => setMostrarDesglose(!mostrarDesglose)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                        {mostrarDesglose ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        {mostrarDesglose ? "Ocultar desglose" : "Ver desglose"}
                      </button>
                      {mostrarDesglose && (
                        <div className="mt-2 space-y-1 border-t border-blue-200 pt-2">
                          <DesgloseRow label="⛽ Combustible" value={rutaInfo.desglose.combustible} />
                          <DesgloseRow label="🔧 Vehículo" value={rutaInfo.desglose.vehiculo} />
                          <DesgloseRow label="🛣️ Peajes" value={rutaInfo.desglose.peajes} />
                          <DesgloseRow label="👨‍✈️ Conductor" value={rutaInfo.desglose.conductor} />
                          {rutaInfo.desglose.pluses > 0 && (
                            <>
                              <DesgloseRow label="⏰ Pluses" value={rutaInfo.desglose.pluses} />
                              {rutaInfo.desglose.desglose_pluses.map((p, i) => (
                                <p key={i} className="text-xs text-gray-400 pl-4">• {p}</p>
                              ))}
                            </>
                          )}
                          <div className="flex justify-between text-xs pt-1 border-t border-blue-200">
                            <span className="text-gray-500">Subtotal costes</span>
                            <span className="text-gray-600">{rutaInfo.desglose.subtotal} €</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Margen comercial</span>
                            <span className="text-gray-600">+{rutaInfo.desglose.margen} €</span>
                          </div>
                          <div className="flex justify-between text-xs border-t border-blue-200 pt-1">
                            <span className="text-gray-500">Base imponible</span>
                            <span className="text-gray-600">{rutaInfo.desglose.base_imponible} €</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">IVA ({rutaInfo.desglose.iva_porcentaje}%)</span>
                            <span className="text-gray-600">+{rutaInfo.desglose.importe_iva} €</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold border-t border-blue-300 pt-1">
                            <span>TOTAL (IVA inc.)</span>
                            <span className="text-green-700">{rutaInfo.desglose.total} €</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-400 pt-1">Sin tarifas configuradas. Ve a Ajustes para definir los costes.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <CardHeader className="p-0">
          <CardTitle className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">Estado actual</CardTitle>
          <Badge className={`${statusClasses[status]} mt-2 w-fit border px-3 py-1 text-sm font-semibold`}>
            {statuses.find((item) => item.value === status)?.label ?? status}
          </Badge>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">Cambiar estado</p>
          <div className="grid grid-cols-2 gap-2">
            {statuses.map((nextStatus) => (
              <Button key={nextStatus.value} type="button" variant={nextStatus.value === status ? "default" : "outline"} onClick={() => updateStatus(nextStatus.value)} disabled={saving}
                className={nextStatus.value === status ? "h-8 rounded-md bg-[#1e3a5f] px-3 py-1 text-xs text-white hover:bg-[#1e3a5f]/90" : "h-8 rounded-md border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"}>
                {nextStatus.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <CardContent className="grid gap-4 p-0">
          <div className="grid gap-2">
            <Label htmlFor="final_price" className="text-sm font-semibold text-slate-800">Precio final con IVA (€)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">€</span>
              <Input id="final_price" type="number" min={0} value={finalPrice} onChange={(e) => setFinalPrice(e.target.value === "" ? "" : Number(e.target.value))} className="h-11 pl-7 text-lg" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="internal_notes" className="text-sm font-semibold text-slate-800">Notas internas</Label>
            <Textarea id="internal_notes" rows={4} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className="resize-none" placeholder="Anotaciones para el equipo..." />
          </div>
          <Button type="button" onClick={saveChanges} disabled={saving} variant="outline" className="h-10 w-full border-gray-200 text-gray-800">
            <Save className="size-4" /> Guardar cambios
          </Button>
          <Button type="button" onClick={enviarPresupuesto} disabled={enviando} className="h-10 w-full bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
            {enviando ? <><Loader2 className="size-4 animate-spin" /> Enviando...</> : <><Mail className="size-4" /> Enviar presupuesto por email</>}
          </Button>
          {message && <p className="text-sm text-slate-500">{message}</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function DesgloseRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-700 font-medium">{value} €</span>
    </div>
  )
}