"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete"
import { createClient } from "@/lib/supabase"

type QuoteFormProps = {
  slug: string
}

type Company = {
  id: string
  name: string
  logo_url: string | null
  color_primario: string | null
}

const STEPS = ["Contacto", "Viaje", "Vehículo", "Resumen"]

function StepBar({ current, color }: { current: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: done ? color : active ? color : '#e5e7eb',
                border: `2px solid ${done || active ? color : '#e5e7eb'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                color: done || active ? '#fff' : '#9ca3af',
                boxShadow: active ? `0 0 0 4px ${color}22` : 'none',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? color : done ? '#374151' : '#9ca3af', whiteSpace: 'nowrap' as const }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 18, background: done ? color : '#e5e7eb', borderRadius: 2, transition: 'background 0.3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function Inp({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        height: 44, border: `1.5px solid ${focused ? '#1e3a5f' : '#e5e7eb'}`,
        borderRadius: 10, padding: '0 14px', fontSize: 14,
        background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif",
        boxSizing: 'border-box' as const, width: '100%', outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(30,58,95,0.08)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...style,
      }}
    />
  )
}

function Sel({ children, style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        height: 44, border: `1.5px solid ${focused ? '#1e3a5f' : '#e5e7eb'}`,
        borderRadius: 10, padding: '0 14px', fontSize: 14,
        background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif",
        boxSizing: 'border-box' as const, width: '100%', outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(30,58,95,0.08)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...style,
      }}
    >
      {children}
    </select>
  )
}

function PaxCounter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', width: 160, background: '#fafafa' }}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} style={{ width: 44, height: 44, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#374151', fontWeight: 700, flexShrink: 0 }}>−</button>
      <span style={{ flex: 1, textAlign: 'center' as const, fontSize: 16, fontWeight: 700, color: '#111827' }}>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} style={{ width: 44, height: 44, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#374151', fontWeight: 700, flexShrink: 0 }}>+</button>
    </div>
  )
}

function AddressField({ id, name, value, onChange, placeholder, required }: { id: string; name: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { suggestions, isLoading } = useAddressAutocomplete(value)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        id={id} name={name} value={value} required={required}
        placeholder={placeholder} autoComplete="off"
        onFocus={() => { setIsOpen(true); setFocused(true) }}
        onBlur={() => setFocused(false)}
        onChange={e => { onChange(e.target.value); setIsOpen(true) }}
        style={{
          height: 44, border: `1.5px solid ${focused ? '#1e3a5f' : '#e5e7eb'}`,
          borderRadius: 10, padding: '0 14px', fontSize: 14,
          background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif",
          boxSizing: 'border-box' as const, width: '100%', outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(30,58,95,0.08)' : 'none',
          transition: 'border-color 0.15s',
        }}
      />
      {isOpen && (isLoading || suggestions.length > 0) && (
        <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {isLoading ? (
            <p style={{ padding: '10px 14px', fontSize: 13, color: '#9ca3af' }}>Buscando...</p>
          ) : suggestions.slice(0, 5).map(s => (
            <button key={s} type="button" style={{ display: 'block', width: '100%', textAlign: 'left' as const, padding: '10px 14px', fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", borderBottom: '1px solid #f3f4f6' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              onClick={() => { onChange(s); setIsOpen(false) }}>
              📍 {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StopField({ index, value, onChange, onRemove }: { index: number; value: string; onChange: (v: string) => void; onRemove: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { suggestions, isLoading } = useAddressAutocomplete(value)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  return (
    <div ref={wrapperRef} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{index + 1}</div>
      <div style={{ flex: 1, position: 'relative' }}>
        <input
          value={value} placeholder={`Parada ${index + 1}`} autoComplete="off"
          onFocus={() => { setIsOpen(true); setFocused(true) }}
          onBlur={() => setFocused(false)}
          onChange={e => { onChange(e.target.value); setIsOpen(true) }}
          style={{ height: 40, border: `1.5px solid ${focused ? '#1e3a5f' : '#e5e7eb'}`, borderRadius: 10, padding: '0 14px', fontSize: 13, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const, width: '100%', outline: 'none' }}
        />
        {isOpen && (isLoading || suggestions.length > 0) && (
          <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {isLoading ? <p style={{ padding: '10px 14px', fontSize: 13, color: '#9ca3af' }}>Buscando...</p>
              : suggestions.slice(0, 5).map(s => (
                <button key={s} type="button" style={{ display: 'block', width: '100%', textAlign: 'left' as const, padding: '10px 14px', fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  onClick={() => { onChange(s); setIsOpen(false) }}>📍 {s}</button>
              ))}
          </div>
        )}
      </div>
      <button type="button" onClick={onRemove} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
    </div>
  )
}

export function QuoteForm({ slug }: QuoteFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [company, setCompany] = useState<Company | null>(null)
  const [loadingCompany, setLoadingCompany] = useState(true)

  // Paso 1 — Contacto
  const [clientType, setClientType] = useState<'particular' | 'empresa'>('particular')
  const [requesterName, setRequesterName] = useState('')
  const [requesterEmail, setRequesterEmail] = useState('')
  const [requesterPhone, setRequesterPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyTaxId, setCompanyTaxId] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [contactPerson, setContactPerson] = useState('')

  // Paso 2 — Viaje
  const [tripType, setTripType] = useState<'ida' | 'idavuelta'>('ida')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [stops, setStops] = useState<string[]>([])
  const [tripDate, setTripDate] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [passengers, setPassengers] = useState(1)

  // Paso 3 — Vehículo
  const [vehicleType, setVehicleType] = useState<'minibus' | 'autobus' | 'autocar'>('minibus')
  const [serviceType, setServiceType] = useState('Servicio discrecional (viaje a medida)')
  const [otherServiceType, setOtherServiceType] = useState('')
  const [comments, setComments] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const color = company?.color_primario || '#1e3a5f'

  useEffect(() => {
    supabase.from('companies').select('id, name, logo_url, color_primario').eq('slug', slug).single()
      .then(({ data }) => { setCompany(data); setLoadingCompany(false) })
  }, [slug])

  const addStop = () => setStops(p => [...p, ''])
  const removeStop = (i: number) => setStops(p => p.filter((_, j) => j !== i))
  const updateStop = (i: number, v: string) => setStops(p => p.map((s, j) => j === i ? v : s))

  function validateStep() {
    if (step === 0) {
      if (!requesterName.trim() || !requesterEmail.trim() || !requesterPhone.trim()) { alert('Rellena nombre, email y teléfono'); return false }
      if (clientType === 'empresa' && (!companyName.trim() || !companyTaxId.trim())) { alert('Rellena los datos de empresa'); return false }
    }
    if (step === 1) {
      if (!origin.trim() || !destination.trim()) { alert('Indica origen y destino'); return false }
      if (!tripDate || !departureTime) { alert('Indica fecha y hora de salida'); return false }
      if (tripType === 'idavuelta' && (!returnDate || !returnTime)) { alert('Indica fecha y hora de regreso'); return false }
    }
    return true
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    if (!company) return

    const extraDetails = [
      'Tipo de cliente: ' + clientType,
      'Tipo de servicio: ' + serviceType,
      serviceType === 'Otro' ? 'Especificacion: ' + otherServiceType : '',
      clientType === 'empresa' ? 'Empresa: ' + companyName : '',
      clientType === 'empresa' ? 'CIF: ' + companyTaxId : '',
      clientType === 'empresa' ? 'Direccion fiscal: ' + companyAddress : '',
      clientType === 'empresa' ? 'Persona de contacto: ' + contactPerson : '',
      comments ? 'Comentarios: ' + comments : '',
    ].filter(Boolean).join('\n')

    const filledStops = stops.filter(s => s.trim())
    const payload = {
      company_id: company.id,
      status: 'nuevo' as const,
      requester_name: requesterName,
      requester_email: requesterEmail,
      requester_phone: requesterPhone,
      origin, destination,
      stops: filledStops.length > 0 ? JSON.stringify(filledStops) : null,
      trip_date: tripDate,
      departure_time: departureTime,
      return_date: tripType === 'idavuelta' ? returnDate || null : null,
      return_time: tripType === 'idavuelta' ? returnTime || null : null,
      passengers,
      vehicle_type: vehicleType,
      comments: extraDetails || null,
    }

    const { error } = await supabase.from('quote_requests').insert(payload)
    if (error) { alert('No se pudo enviar la solicitud'); setIsSubmitting(false); return }
    router.push('/' + slug + '/gracias')
  }

  if (loadingCompany) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f4', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <p style={{ color: '#9ca3af', fontSize: 14 }}>Cargando...</p>
    </div>
  )

  if (!company) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f4', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <p style={{ color: '#ef4444', fontSize: 14 }}>Empresa no encontrada</p>
    </div>
  )

  const inputStyle: React.CSSProperties = { height: 44, border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '0 14px', fontSize: 14, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box', width: '100%', outline: 'none' }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }

  // Precio estimado básico según vehículo y pasajeros
  const precioBase: Record<string, number> = { minibus: 180, autobus: 320, autocar: 420 }
  const precioEstimado = precioBase[vehicleType] + passengers * 2

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f4', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: color, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        {company.logo_url && (
          <img src={company.logo_url} alt={company.name} style={{ height: 40, width: 'auto', objectFit: 'contain', borderRadius: 6 }} />
        )}
        <div>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{company.name}</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>Solicitud de presupuesto · Respuesta en menos de 24h</p>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px 80px' }}>

        <StepBar current={step} color={color} />

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px 28px' }}>

          {/* PASO 0 — CONTACTO */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={sectionTitle}>👤 Datos de contacto</p>

              {/* Tipo cliente */}
              <Field label="Tipo de cliente">
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['particular', 'empresa'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setClientType(t)}
                      style={{ flex: 1, height: 44, borderRadius: 10, border: `2px solid ${clientType === t ? color : '#e5e7eb'}`, background: clientType === t ? color : '#fff', color: clientType === t ? '#fff' : '#374151', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s', textTransform: 'capitalize' as const }}>
                      {t === 'particular' ? '👤 Particular' : '🏢 Empresa'}
                    </button>
                  ))}
                </div>
              </Field>

              <div style={grid2}>
                <Field label="Nombre completo" required>
                  <Inp placeholder="Nombre y apellidos" value={requesterName} onChange={e => setRequesterName(e.target.value)} required />
                </Field>
                <Field label="Teléfono" required>
                  <Inp placeholder="+34 600 000 000" value={requesterPhone} onChange={e => setRequesterPhone(e.target.value)} required />
                </Field>
              </div>

              <Field label="Email" required>
                <Inp type="email" placeholder="correo@ejemplo.com" value={requesterEmail} onChange={e => setRequesterEmail(e.target.value)} required />
              </Field>

              {clientType === 'empresa' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: 0 }}>Datos de empresa</p>
                  <div style={grid2}>
                    <Field label="Razón social" required>
                      <Inp placeholder="Nombre empresa" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    </Field>
                    <Field label="CIF" required>
                      <Inp placeholder="B12345678" value={companyTaxId} onChange={e => setCompanyTaxId(e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Dirección fiscal">
                    <Inp placeholder="Calle, número, ciudad" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
                  </Field>
                  <Field label="Persona de contacto">
                    <Inp placeholder="Nombre y apellidos" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* PASO 1 — VIAJE */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={sectionTitle}>🗺️ Detalles del viaje</p>

              {/* Tipo de viaje */}
              <Field label="Tipo de viaje">
                <div style={{ display: 'flex', gap: 8 }}>
                  {([['ida', '➡️ Solo ida'], ['idavuelta', '🔄 Ida y vuelta']] as const).map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setTripType(val)}
                      style={{ flex: 1, height: 44, borderRadius: 10, border: `2px solid ${tripType === val ? color : '#e5e7eb'}`, background: tripType === val ? color : '#fff', color: tripType === val ? '#fff' : '#374151', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s' }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </Field>

              <div style={grid2}>
                <Field label="Origen" required>
                  <AddressField id="origin" name="origin" value={origin} onChange={setOrigin} placeholder="Ciudad o dirección de salida" required />
                </Field>
                <Field label="Destino" required>
                  <AddressField id="destination" name="destination" value={destination} onChange={setDestination} placeholder="Ciudad o dirección de destino" required />
                </Field>
              </div>

              {/* Paradas */}
              <Field label="Paradas intermedias">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stops.length === 0 && <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>Sin paradas intermedias</p>}
                  {stops.map((stop, i) => (
                    <StopField key={i} index={i} value={stop} onChange={v => updateStop(i, v)} onRemove={() => removeStop(i)} />
                  ))}
                  <button type="button" onClick={addStop} style={{ height: 38, borderRadius: 8, border: `1.5px dashed ${color}`, background: 'none', color: color, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    + Añadir parada
                  </button>
                </div>
              </Field>

              {/* Fechas */}
              <div style={{ display: 'grid', gridTemplateColumns: tripType === 'idavuelta' ? '1fr 1fr' : '1fr', gap: 16 }}>
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>🟢 Salida</p>
                  <div style={grid2}>
                    <Field label="Fecha" required>
                      <Inp type="date" value={tripDate} onChange={e => setTripDate(e.target.value)} required />
                    </Field>
                    <Field label="Hora" required>
                      <Inp type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} required />
                    </Field>
                  </div>
                </div>
                {tripType === 'idavuelta' && (
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>🔴 Regreso</p>
                    <div style={grid2}>
                      <Field label="Fecha" required>
                        <Inp type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} required />
                      </Field>
                      <Field label="Hora" required>
                        <Inp type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} required />
                      </Field>
                    </div>
                  </div>
                )}
              </div>

              <Field label="Número de pasajeros" required>
                <PaxCounter value={passengers} onChange={setPassengers} />
              </Field>
            </div>
          )}

          {/* PASO 2 — VEHÍCULO */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={sectionTitle}>🚌 Vehículo y servicio</p>

              <Field label="Tipo de vehículo">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {([
                    ['minibus', '🚐 Minibús', 'Hasta 20 pasajeros'],
                    ['autobus', '🚌 Autobús', 'Hasta 55 pasajeros'],
                    ['autocar', '🚍 Autocar Gran Turismo', 'Hasta 70 pasajeros'],
                  ] as const).map(([val, label, sub]) => (
                    <button key={val} type="button" onClick={() => setVehicleType(val)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, border: `2px solid ${vehicleType === val ? color : '#e5e7eb'}`, background: vehicleType === val ? color + '08' : '#fff', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.15s', textAlign: 'left' as const }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: vehicleType === val ? color : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{val === 'minibus' ? '🚐' : val === 'autobus' ? '🚌' : '🚍'}</div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: vehicleType === val ? color : '#111827', margin: 0 }}>{label.split(' ').slice(1).join(' ')}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{sub}</p>
                      </div>
                      {vehicleType === val && <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</div>}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Tipo de servicio">
                <Sel value={serviceType} onChange={e => setServiceType(e.target.value)}>
                  <option>Servicio discrecional (viaje a medida)</option>
                  <option>Transporte escolar</option>
                  <option>Transporte de empresa / trabajadores</option>
                  <option>Evento especial (boda, congreso, etc.)</option>
                  <option>Excursion o viaje cultural</option>
                  <option>Traslado aeropuerto / estacion</option>
                  <option>Otro</option>
                </Sel>
              </Field>

              {serviceType === 'Otro' && (
                <Field label="Especifica el servicio" required>
                  <Inp placeholder="Describe brevemente el servicio" value={otherServiceType} onChange={e => setOtherServiceType(e.target.value)} />
                </Field>
              )}

              <Field label="Comentarios adicionales">
                <textarea
                  placeholder="Indica cualquier detalle adicional del servicio..."
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  rows={4}
                  style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 14, background: '#fafafa', fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: 'border-box' as const, width: '100%', outline: 'none', resize: 'vertical' as const }}
                />
              </Field>

              {/* Precio estimado */}
              <div style={{ background: color + '08', border: `1px solid ${color}33`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: color, textTransform: 'uppercase' as const, letterSpacing: '0.06em', margin: 0 }}>Precio estimado orientativo</p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>El precio final lo confirma la empresa</p>
                </div>
                <p style={{ fontSize: 24, fontWeight: 800, color: color, margin: 0 }}>{precioEstimado}€</p>
              </div>
            </div>
          )}

          {/* PASO 3 — RESUMEN */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={sectionTitle}>✅ Resumen de tu solicitud</p>

              {[
                { label: '👤 Nombre', value: requesterName },
                { label: '📧 Email', value: requesterEmail },
                { label: '📞 Teléfono', value: requesterPhone },
                { label: '🏷️ Tipo', value: clientType === 'empresa' ? 'Empresa — ' + companyName : 'Particular' },
                { label: '📍 Origen', value: origin },
                { label: '🏁 Destino', value: destination },
                stops.length > 0 ? { label: '🔵 Paradas', value: stops.filter(Boolean).join(' · ') } : null,
                { label: '📅 Fecha salida', value: tripDate + ' a las ' + departureTime },
                tripType === 'idavuelta' ? { label: '🔄 Regreso', value: returnDate + ' a las ' + returnTime } : null,
                { label: '👥 Pasajeros', value: String(passengers) },
                { label: '🚌 Vehículo', value: vehicleType === 'minibus' ? 'Minibús (hasta 20 pax)' : vehicleType === 'autobus' ? 'Autobús (hasta 55 pax)' : 'Autocar Gran Turismo (hasta 70 pax)' },
                { label: '🎯 Servicio', value: serviceType },
                comments ? { label: '💬 Comentarios', value: comments } : null,
              ].filter(Boolean).map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f3f4f6', gap: 16 }}>
                  <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500, flexShrink: 0 }}>{(row as any).label}</span>
                  <span style={{ fontSize: 13, color: '#111827', fontWeight: 600, textAlign: 'right' as const }}>{(row as any).value}</span>
                </div>
              ))}

              <div style={{ background: color + '08', border: `1px solid ${color}33`, borderRadius: 12, padding: '16px', marginTop: 8 }}>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Precio estimado orientativo</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: color, margin: 0 }}>{precioEstimado}€</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>El precio final lo confirma la empresa en menos de 24h</p>
              </div>
            </div>
          )}

        </div>

        {/* BOTONES NAVEGACIÓN */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1)}
              style={{ flex: 1, height: 50, borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              ← Atrás
            </button>
          )}
          {step < 3 ? (
            <button type="button"
              onClick={() => { if (validateStep()) setStep(s => s + 1) }}
              style={{ flex: 2, height: 50, borderRadius: 12, border: 'none', background: color, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: '0 4px 12px rgba(30,58,95,0.25)' }}>
              Siguiente →
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={isSubmitting}
              style={{ flex: 2, height: 50, borderRadius: 12, border: 'none', background: color, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: '0 4px 12px rgba(30,58,95,0.25)', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? 'Enviando...' : '✅ Enviar solicitud'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}