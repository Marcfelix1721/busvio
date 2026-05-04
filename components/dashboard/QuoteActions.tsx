"use client"

import { useState } from "react"
import { Calculator, Loader2, Save, Send } from "lucide-react"
import jsPDF from "jspdf"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase"
import { QuoteRequest } from "@/lib/types"

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

export function QuoteActions({ quote }: { quote: QuoteRequest }) {
  const supabase = createClient()
  const [status, setStatus] = useState<QuoteRequest["status"]>(quote.status)
  const [finalPrice, setFinalPrice] = useState<number | "">(quote.final_price ?? "")
  const [internalNotes, setInternalNotes] = useState(quote.internal_notes ?? "")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const [calculando, setCalculando] = useState(false)
  const [rutaInfo, setRutaInfo] = useState<{
    distanceKm: number
    durationText: string
    precioSugerido: number | null
  } | null>(
    quote.estimated_km
      ? { distanceKm: quote.estimated_km, durationText: "", precioSugerido: quote.estimated_price ?? null }
      : null
  )
  const [rutaError, setRutaError] = useState("")

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
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setRutaError(data.error ?? "Error al calcular la ruta")
        return
      }

      const { distanceKm, durationText } = data

      const { data: pricing } = await supabase
        .from("pricing_settings")
        .select("base_price, price_per_km")
        .eq("company_id", quote.company_id)
        .maybeSingle()

      let precioSugerido: number | null = null
      if (pricing) {
        precioSugerido = Math.round(pricing.base_price + pricing.price_per_km * distanceKm)
      }

      setRutaInfo({ distanceKm, durationText, precioSugerido })

      await supabase
        .from("quote_requests")
        .update({
          estimated_km: distanceKm,
          ...(precioSugerido !== null && { estimated_price: precioSugerido }),
        })
        .eq("id", quote.id)

      if (precioSugerido !== null && finalPrice === "") {
        setFinalPrice(precioSugerido)
      }
    } catch {
      setRutaError("Error de conexión al calcular la ruta")
    } finally {
      setCalculando(false)
    }
  }

  const updateStatus = async (nextStatus: QuoteRequest["status"]) => {
    setSaving(true)
    setMessage("")
    const { error } = await supabase
      .from("quote_requests")
      .update({ status: nextStatus })
      .eq("id", quote.id)
    setSaving(false)
    if (error) { setMessage("No se pudo actualizar el estado"); return }
    setStatus(nextStatus)
    setMessage("Guardado correctamente")
  }

  const saveChanges = async () => {
    setSaving(true)
    setMessage("")
    const { error } = await supabase
      .from("quote_requests")
      .update({
        final_price: finalPrice === "" ? null : finalPrice,
        internal_notes: internalNotes.trim() === "" ? null : internalNotes.trim(),
      })
      .eq("id", quote.id)
    setSaving(false)
    if (error) { setMessage("No se pudieron guardar los cambios"); return }
    setMessage("Guardado correctamente")
  }

  const generarPDF = () => {
    const doc = new jsPDF()
    doc.setFillColor(30, 58, 95)
    doc.rect(0, 0, 210, 35, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont("helvetica", "bold")
    doc.text("BUSVIO", 15, 20)
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text("PRESUPUESTO", 160, 20)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text(`Nº: P-${quote.id.slice(0, 8).toUpperCase()}`, 15, 50)
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 15, 58)
    doc.setFillColor(240, 244, 248)
    doc.rect(0, 68, 210, 8, "F")
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("DATOS DEL SOLICITANTE", 15, 74)
    doc.setFont("helvetica", "normal")
    doc.text(`Nombre: ${quote.requester_name ?? "-"}`, 15, 85)
    doc.text(`Email: ${quote.requester_email ?? "-"}`, 15, 93)
    doc.text(`Teléfono: ${quote.requester_phone ?? "-"}`, 15, 101)
    doc.setFillColor(240, 244, 248)
    doc.rect(0, 111, 210, 8, "F")
    doc.setFont("helvetica", "bold")
    doc.text("DETALLES DEL VIAJE", 15, 117)
    doc.setFont("helvetica", "normal")
    doc.text(`Origen: ${quote.origin ?? "-"}`, 15, 128)
    doc.text(`Destino: ${quote.destination ?? "-"}`, 110, 128)
    doc.text(`Fecha: ${quote.trip_date ?? "-"}`, 15, 136)
    doc.text(`Pasajeros: ${quote.passengers ?? "-"}`, 110, 136)
    doc.text(`Vehículo: ${quote.vehicle_type ?? "-"}`, 15, 144)
    if (rutaInfo) {
      doc.text(`Distancia: ${rutaInfo.distanceKm} km`, 15, 152)
    }
    doc.setFillColor(30, 58, 95)
    doc.rect(0, 160, 210, 30, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("PRECIO TOTAL", 15, 172)
    doc.setFontSize(20)
    doc.text(`${quote.final_price ?? quote.estimated_price ?? "0"} €`, 15, 183)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text("Este presupuesto tiene una validez de 30 dias desde la fecha de emision.", 15, 270)
    doc.text("Busvio — Gestion de transporte discrecional", 15, 276)
    doc.save(`presupuesto-${quote.id.slice(0, 8)}.pdf`)
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            Cálculo de ruta
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          <Button
            type="button"
            onClick={calcularRuta}
            disabled={calculando}
            className="h-10 w-full bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90"
          >
            {calculando ? (
              <><Loader2 className="size-4 animate-spin" /> Calculando...</>
            ) : (
              <><Calculator className="size-4" /> Calcular km y precio</>
            )}
          </Button>

          {rutaError && (
            <p className="text-sm text-red-500">{rutaError}</p>
          )}

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
                <div className="flex justify-between text-sm border-t border-blue-200 pt-2 mt-2">
                  <span className="text-gray-600 font-medium">Precio sugerido:</span>
                  <span className="font-bold text-green-700">{rutaInfo.precioSugerido} €</span>
                </div>
              ) : (
                <p className="text-xs text-gray-400 pt-1">
                  Sin tarifas configuradas. Ve a Ajustes para definir precio base y precio/km.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <CardHeader className="p-0">
          <CardTitle className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            Estado actual
          </CardTitle>
          <Badge className={`${statusClasses[status]} mt-2 w-fit border px-3 py-1 text-sm font-semibold`}>
            {statuses.find((item) => item.value === status)?.label ?? status}
          </Badge>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            Cambiar estado
          </p>
          <div className="grid grid-cols-2 gap-2">
            {statuses.map((nextStatus) => (
              <Button
                key={nextStatus.value}
                type="button"
                variant={nextStatus.value === status ? "default" : "outline"}
                onClick={() => updateStatus(nextStatus.value)}
                disabled={saving}
                className={
                  nextStatus.value === status
                    ? "h-8 rounded-md bg-[#1e3a5f] px-3 py-1 text-xs text-white hover:bg-[#1e3a5f]/90"
                    : "h-8 rounded-md border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                }
              >
                {nextStatus.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <CardContent className="grid gap-4 p-0">
          <div className="grid gap-2">
            <Label htmlFor="final_price" className="text-sm font-semibold text-slate-800">
              Precio final (€)
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">€</span>
              <Input
                id="final_price"
                type="number"
                min={0}
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="h-11 pl-7 text-lg"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="internal_notes" className="text-sm font-semibold text-slate-800">
              Notas internas
            </Label>
            <Textarea
              id="internal_notes"
              rows={4}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="resize-none"
              placeholder="Anotaciones para el equipo..."
            />
          </div>
          <Button type="button" onClick={saveChanges} disabled={saving} variant="outline" className="h-10 w-full border-gray-200 text-gray-800">
            <Save className="size-4" /> Guardar cambios
          </Button>
          <Button type="button" onClick={generarPDF} className="h-10 w-full bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
            <Send className="size-4" /> Enviar presupuesto
          </Button>
          {message && <p className="text-sm text-slate-500">{message}</p>}
        </CardContent>
      </Card>
    </div>
  )
}