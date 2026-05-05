"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete"
import { createClient } from "@/lib/supabase"

type QuoteFormProps = {
  slug: string
}

export function QuoteForm({ slug }: QuoteFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [clientType, setClientType] = useState<"particular" | "empresa">("particular")
  const [serviceType, setServiceType] = useState("Servicio discrecional (viaje a medida)")
  const [otherServiceType, setOtherServiceType] = useState("")
  const [vehicleType, setVehicleType] = useState<"minibus" | "autobus" | "autocar">("minibus")
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [stops, setStops] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addStop = () => setStops((prev) => [...prev, ""])
  const removeStop = (index: number) => setStops((prev) => prev.filter((_, i) => i !== index))
  const updateStop = (index: number, value: string) =>
    setStops((prev) => prev.map((s, i) => (i === index ? value : s)))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    const form = event.currentTarget
    const formData = new FormData(form)

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .single()

    if (companyError || !company) {
      setIsSubmitting(false)
      alert("Empresa no encontrada")
      return
    }

    const returnDate = String(formData.get("return_date") ?? "").trim()
    const returnTime = String(formData.get("return_time") ?? "").trim()
    const companyName = String(formData.get("company_name") ?? "").trim()
    const companyTaxId = String(formData.get("company_tax_id") ?? "").trim()
    const companyAddress = String(formData.get("company_address") ?? "").trim()
    const contactPerson = String(formData.get("contact_person") ?? "").trim()
    const otherServiceTypeValue = String(formData.get("other_service_type") ?? "").trim()
    const comments = String(formData.get("comments") ?? "").trim()

    const extraDetails = [
      `Tipo de cliente: ${clientType}`,
      `Tipo de servicio: ${serviceType}`,
      serviceType === "Otro" ? `Especificacion del tipo de servicio: ${otherServiceTypeValue}` : "",
      clientType === "empresa" ? `Nombre de la empresa: ${companyName}` : "",
      clientType === "empresa" ? `CIF: ${companyTaxId}` : "",
      clientType === "empresa" ? `Direccion fiscal: ${companyAddress}` : "",
      clientType === "empresa" ? `Persona de contacto: ${contactPerson}` : "",
      comments ? `Comentarios: ${comments}` : "",
    ]
      .filter(Boolean)
      .join("\n")

    const filledStops = stops.filter((s) => s.trim() !== "")

    const payload = {
      company_id: company.id,
      status: "nuevo" as const,
      requester_name: String(formData.get("requester_name") ?? ""),
      requester_email: String(formData.get("requester_email") ?? ""),
      requester_phone: String(formData.get("requester_phone") ?? ""),
      origin: String(formData.get("origin") ?? ""),
      destination: String(formData.get("destination") ?? ""),
      stops: filledStops.length > 0 ? JSON.stringify(filledStops) : null,
      trip_date: String(formData.get("trip_date") ?? ""),
      departure_time: String(formData.get("departure_time") ?? ""),
      return_date: returnDate || null,
      return_time: returnTime || null,
      passengers: Number(formData.get("passengers") ?? 0),
      vehicle_type: vehicleType,
      comments: extraDetails || null,
    }

    const { error: insertError } = await supabase
      .from("quote_requests")
      .insert(payload)

    if (insertError) {
      setIsSubmitting(false)
      alert("No se pudo enviar la solicitud")
      return
    }

    router.push(`/${slug}/gracias`)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <Card className="overflow-hidden border-0 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <CardHeader className="space-y-2 bg-[#1e3a5f] px-6 py-6 text-white">
            <CardTitle className="text-2xl font-semibold">
              Solicitud de presupuesto
            </CardTitle>
            <p className="text-sm text-slate-200">
              Completa el formulario y recibirás tu presupuesto en menos de 24 horas
            </p>
          </CardHeader>
          <CardContent className="px-6 py-6">
            <form onSubmit={handleSubmit} className="grid gap-8">

              {/* DATOS DE CONTACTO */}
              <section className="grid gap-4">
                <p className="text-xs font-bold tracking-widest text-slate-600 uppercase">
                  Datos de contacto
                </p>
                <div className="grid gap-2">
                  <Label className="text-xs font-bold tracking-wide text-slate-700 uppercase">
                    Tipo de cliente
                  </Label>
                  <div className="grid grid-cols-2 gap-2 max-w-xs">
                    <Button
                      type="button"
                      variant={clientType === "particular" ? "default" : "outline"}
                      className={clientType === "particular" ? "bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90" : "border-slate-300"}
                      onClick={() => setClientType("particular")}
                    >
                      Particular
                    </Button>
                    <Button
                      type="button"
                      variant={clientType === "empresa" ? "default" : "outline"}
                      className={clientType === "empresa" ? "bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90" : "border-slate-300"}
                      onClick={() => setClientType("empresa")}
                    >
                      Empresa
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="requester_name" className="text-xs font-bold tracking-wide text-slate-700 uppercase">
                      Nombre completo
                    </Label>
                    <Input id="requester_name" name="requester_name" required placeholder="Nombre y apellidos" className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="requester_phone" className="text-xs font-bold tracking-wide text-slate-700 uppercase">
                      Telefono
                    </Label>
                    <Input id="requester_phone" name="requester_phone" required placeholder="+34 600 000 000" className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="requester_email" className="text-xs font-bold tracking-wide text-slate-700 uppercase">
                    Email
                  </Label>
                  <Input id="requester_email" name="requester_email" type="email" required placeholder="correo@empresa.com" className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                </div>

                {clientType === "empresa" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="company_name" className="text-xs font-bold tracking-wide text-slate-700 uppercase">Nombre de la empresa</Label>
                      <Input id="company_name" name="company_name" required={clientType === "empresa"} placeholder="Razon social" className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="company_tax_id" className="text-xs font-bold tracking-wide text-slate-700 uppercase">CIF</Label>
                      <Input id="company_tax_id" name="company_tax_id" required={clientType === "empresa"} placeholder="B12345678" className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="company_address" className="text-xs font-bold tracking-wide text-slate-700 uppercase">Direccion fiscal</Label>
                      <Input id="company_address" name="company_address" required={clientType === "empresa"} placeholder="Calle, numero, ciudad" className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contact_person" className="text-xs font-bold tracking-wide text-slate-700 uppercase">Persona de contacto</Label>
                      <Input id="contact_person" name="contact_person" required={clientType === "empresa"} placeholder="Nombre y apellidos" className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                    </div>
                  </div>
                )}
              </section>

              {/* DETALLES DEL VIAJE */}
              <section className="grid gap-4 border-t border-slate-200 pt-6">
                <p className="text-xs font-bold tracking-widest text-slate-600 uppercase">
                  Detalles del viaje
                </p>

                {/* Origen y Destino */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="origin" className="text-xs font-bold tracking-wide text-slate-700 uppercase">Origen</Label>
                    <AddressAutocompleteField id="origin" name="origin" value={origin} onChange={setOrigin} required placeholder="Ciudad o direccion de salida" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="destination" className="text-xs font-bold tracking-wide text-slate-700 uppercase">Destino</Label>
                    <AddressAutocompleteField id="destination" name="destination" value={destination} onChange={setDestination} required placeholder="Ciudad o direccion de destino" />
                  </div>
                </div>

                {/* Paradas ilimitadas */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold tracking-wide text-slate-700 uppercase">
                      Paradas intermedias (opcional)
                    </Label>
                    <button
                      type="button"
                      onClick={addStop}
                      className="flex items-center gap-1 rounded-md border border-[#1e3a5f] px-3 py-1 text-xs font-semibold text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-colors"
                    >
                      <span className="text-base leading-none">+</span> Añadir parada
                    </button>
                  </div>

                  {stops.length === 0 && (
                    <p className="text-sm text-slate-400 italic">Sin paradas intermedias</p>
                  )}

                  <div className="grid gap-2">
                    {stops.map((stop, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-bold text-white">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <StopAutocompleteField
                            index={index}
                            value={stop}
                            onChange={(value) => updateStop(index, value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStop(index)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-200 text-red-400 hover:border-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Eliminar parada"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fechas y horas */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Salida */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 grid gap-3">
                    <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Salida</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="trip_date" className="text-xs font-semibold text-slate-700">Fecha</Label>
                        <Input id="trip_date" name="trip_date" type="date" required className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="departure_time" className="text-xs font-semibold text-slate-700">Hora</Label>
                        <Input id="departure_time" name="departure_time" type="time" required className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                      </div>
                    </div>
                  </div>

                  {/* Llegada */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 grid gap-3">
                    <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Llegada <span className="text-slate-400 normal-case font-normal">(opcional)</span></p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="return_date" className="text-xs font-semibold text-slate-700">Fecha</Label>
                        <Input id="return_date" name="return_date" type="date" className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="return_time" className="text-xs font-semibold text-slate-700">Hora</Label>
                        <Input id="return_time" name="return_time" type="time" className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pasajeros */}
                <div className="grid gap-2 max-w-xs">
                  <Label htmlFor="passengers" className="text-xs font-bold tracking-wide text-slate-700 uppercase">
                    Numero de pasajeros
                  </Label>
                  <Input id="passengers" name="passengers" type="number" min={1} required className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                </div>
              </section>

              {/* VEHÍCULO Y COMENTARIOS */}
              <section className="grid gap-4 border-t border-slate-200 pt-6">
                <p className="text-xs font-bold tracking-widest text-slate-600 uppercase">
                  Vehiculo y comentarios
                </p>

                <Input type="hidden" name="client_type" value={clientType} />

                <div className="grid gap-2">
                  <Label className="text-xs font-bold tracking-wide text-slate-700 uppercase">Tipo de servicio</Label>
                  <Select value={serviceType} onValueChange={setServiceType}>
                    <SelectTrigger className="w-full border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20">
                      <SelectValue placeholder="Selecciona el tipo de servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Servicio discrecional (viaje a medida)">Servicio discrecional (viaje a medida)</SelectItem>
                      <SelectItem value="Transporte escolar">Transporte escolar</SelectItem>
                      <SelectItem value="Transporte de empresa / trabajadores">Transporte de empresa / trabajadores</SelectItem>
                      <SelectItem value="Evento especial (boda, congreso, etc.)">Evento especial (boda, congreso, etc.)</SelectItem>
                      <SelectItem value="Excursion o viaje cultural">Excursion o viaje cultural</SelectItem>
                      <SelectItem value="Traslado aeropuerto / estacion">Traslado aeropuerto / estacion</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {serviceType === "Otro" && (
                  <div className="grid gap-2">
                    <Label htmlFor="other_service_type" className="text-xs font-bold tracking-wide text-slate-700 uppercase">Especifica el tipo de servicio</Label>
                    <Input id="other_service_type" name="other_service_type" value={otherServiceType} onChange={(e) => setOtherServiceType(e.target.value)} required={serviceType === "Otro"} placeholder="Describe brevemente el servicio" className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label className="text-xs font-bold tracking-wide text-slate-700 uppercase">Tipo de vehiculo</Label>
                  <Select defaultValue="minibus" value={vehicleType} onValueChange={(v) => setVehicleType(v as "minibus" | "autobus" | "autocar")}>
                    <SelectTrigger className="w-full border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20">
                      <SelectValue placeholder="Selecciona un vehiculo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minibus">Minibus (hasta 20 pax)</SelectItem>
                      <SelectItem value="autobus">Autobus (hasta 55 pax)</SelectItem>
                      <SelectItem value="autocar">Autocar Gran Turismo (hasta 70 pax)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="comments" className="text-xs font-bold tracking-wide text-slate-700 uppercase">Comentarios (opcional)</Label>
                  <Textarea id="comments" name="comments" rows={4} placeholder="Indica detalles adicionales del servicio" className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
                </div>
              </section>

              <Button type="submit" size="lg" disabled={isSubmitting} className="h-11 w-full bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
                {isSubmitting ? "Enviando..." : "Enviar solicitud"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// Campo de autocompletado para paradas individuales
type StopAutocompleteFieldProps = {
  index: number
  value: string
  onChange: (value: string) => void
}

function StopAutocompleteField({ index, value, onChange }: StopAutocompleteFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const { suggestions, isLoading } = useAddressAutocomplete(value)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const showDropdown = isOpen && (isLoading || suggestions.length > 0)

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        placeholder={`Parada ${index + 1}`}
        autoComplete="off"
        onFocus={() => setIsOpen(true)}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true) }}
        className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20"
      />
      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-md">
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-slate-500">Buscando...</p>
          ) : (
            suggestions.slice(0, 5).map((s) => (
              <button key={s} type="button" className="block w-full truncate px-3 py-2 text-left text-sm text-slate-700 hover:bg-[#1e3a5f] hover:text-white" onClick={() => { onChange(s); setIsOpen(false) }}>
                {s}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// Campo de autocompletado genérico (origen, destino)
type AddressAutocompleteFieldProps = {
  id: string
  name: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
}

function AddressAutocompleteField({ id, name, value, onChange, placeholder, required = false }: AddressAutocompleteFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const { suggestions, isLoading } = useAddressAutocomplete(value)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const showDropdown = isOpen && (isLoading || suggestions.length > 0)

  return (
    <div ref={wrapperRef} className="relative">
      <Input id={id} name={name} value={value} required={required} placeholder={placeholder} autoComplete="off" onFocus={() => setIsOpen(true)} onChange={(e) => { onChange(e.target.value); setIsOpen(true) }} className="border-slate-300 focus-visible:border-[#1e3a5f] focus-visible:ring-[#1e3a5f]/20" />
      {showDropdown && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-md">
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-slate-500">Buscando...</p>
          ) : (
            suggestions.slice(0, 5).map((s) => (
              <button key={s} type="button" className="block w-full truncate px-3 py-2 text-left text-sm text-slate-700 hover:bg-[#1e3a5f] hover:text-white" onClick={() => { onChange(s); setIsOpen(false) }}>
                {s}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}