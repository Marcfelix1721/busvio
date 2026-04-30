"use client"

import { useState } from "react"
import { Save, Send } from "lucide-react"
import jsPDF from "jspdf"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase"
import { QuoteRequest } from "@/lib/types"

type QuoteActionsProps = {
  quote?: QuoteRequest
  request?: QuoteRequest
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

export function QuoteActions({ quote, request }: QuoteActionsProps) {
  const currentQuote = quote ?? request
  if (!currentQuote) return null

  const supabase = createClient()
  const [status, setStatus] = useState<QuoteRequest["status"]>(currentQuote.status)
  const [finalPrice, setFinalPrice] = useState<number | "">(currentQuote.final_price ?? "")
  const [internalNotes, setInternalNotes] = useState(currentQuote.internal_notes ?? "")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const updateStatus = async (nextStatus: QuoteRequest["status"]) => {
    setSaving(true)
    setMessage("")

    const { error } = await supabase
      .from("quote_requests")
      .update({ status: nextStatus })
      .eq("id", currentQuote.id)

    setSaving(false)

    if (error) {
      setMessage("No se pudo actualizar el estado")
      return
    }

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
      .eq("id", currentQuote.id)

    setSaving(false)

    if (error) {
      setMessage("No se pudieron guardar los cambios")
      return
    }

    setMessage("Guardado correctamente")
  }

  const generarPDF = () => {
    const quote = currentQuote as QuoteRequest & {
      requester_name?: string
      requester_email?: string
      requester_phone?: string
      trip_date?: string
      estimated_price?: number | string
    }

    const doc = new jsPDF()

    // Header
    doc.setFillColor(30, 58, 95)
    doc.rect(0, 0, 210, 35, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont("helvetica", "bold")
    doc.text("BUSVIO", 15, 20)
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text("PRESUPUESTO", 160, 20)

    // Reset color
    doc.setTextColor(0, 0, 0)

    // Numero y fecha
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text(`Nº: P-${quote.id.slice(0, 8).toUpperCase()}`, 15, 50)
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 15, 58)

    // Datos solicitante
    doc.setFillColor(240, 244, 248)
    doc.rect(0, 68, 210, 8, "F")
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("DATOS DEL SOLICITANTE", 15, 74)

    doc.setFont("helvetica", "normal")
    doc.text(`Nombre: ${quote.requester_name ?? quote.full_name}`, 15, 85)
    doc.text(`Email: ${quote.requester_email ?? quote.email}`, 15, 93)
    doc.text(`Teléfono: ${quote.requester_phone ?? quote.phone ?? "-"}`, 15, 101)

    // Detalles viaje
    doc.setFillColor(240, 244, 248)
    doc.rect(0, 111, 210, 8, "F")
    doc.setFont("helvetica", "bold")
    doc.text("DETALLES DEL VIAJE", 15, 117)

    doc.setFont("helvetica", "normal")
    doc.text(`Origen: ${quote.origin}`, 15, 128)
    doc.text(`Destino: ${quote.destination}`, 110, 128)
    doc.text(`Fecha: ${quote.trip_date ?? quote.travel_date ?? "-"}`, 15, 136)
    doc.text(`Pasajeros: ${quote.passengers ?? "-"}`, 110, 136)
    doc.text(`Vehículo: ${quote.vehicle_type ?? "-"}`, 15, 144)

    // Precio
    doc.setFillColor(30, 58, 95)
    doc.rect(0, 160, 210, 30, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("PRECIO TOTAL", 15, 172)
    doc.setFontSize(20)
    doc.text(`${quote.final_price ?? quote.estimated_price ?? "0"} €`, 15, 183)

    // Footer
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(
      "Este presupuesto tiene una validez de 30 dias desde la fecha de emision.",
      15,
      270
    )
    doc.text("Busvio — Gestion de transporte discrecional", 15, 276)

    doc.save(`presupuesto-${quote.id.slice(0, 8)}.pdf`)
  }

  return (
    <div className="space-y-6">
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
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
                €
              </span>
              <Input
                id="final_price"
                type="number"
                min={0}
                value={finalPrice}
                onChange={(event) =>
                  setFinalPrice(
                    event.target.value === "" ? "" : Number(event.target.value)
                  )
                }
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
              onChange={(event) => setInternalNotes(event.target.value)}
              className="resize-none"
              placeholder="Anotaciones para el equipo..."
            />
          </div>

          <Button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            variant="outline"
            className="h-10 w-full border-gray-200 text-gray-800"
          >
            <Save className="size-4" /> Guardar cambios
          </Button>

          <Button
            type="button"
            onClick={generarPDF}
            className="h-10 w-full bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]"
          >
            <Send className="size-4" /> Enviar presupuesto
          </Button>

          {message ? <p className="text-sm text-slate-500">{message}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
