"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete"
import { createClient } from "@/lib/supabase"

type QuoteFormProps = { slug: string }
type Company = { id: string; name: string; logo_url: string | null; color_primario: string | null }

const STEPS = ["Contacto", "Viaje", "Vehículo", "Resumen"]

function StepBar({ current, color }: { current: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 48 }}>
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: done || active ? color : '#fff',
                border: `1px solid ${done || active ? color : '#d1d5db'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: done || active ? '#fff' : '#9ca3af',
                boxShadow: active ? `0 0 0 4px ${color}15` : 'none',
                transition: 'all 0.2s',
                flexShrink: 0
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: active ? 600 : 500,
                color: active ? color : done ? '#6b7280' : '#9ca3af',
                whiteSpace: 'nowrap' as const
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1,
                height: 1,
                margin: '0 12px',
                marginBottom: 22,
                background: done ? color : '#e5e7eb',
                transition: 'background 0.3s'
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
      <label style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#374151',
        letterSpacing: '-0.01em'
      }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

function Inp({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        height: 48,
        border: `1px solid ${focused ? '#d1d5db' : '#e5e7eb'}`,
        borderRadius: 12,
        padding: '0 16px',
        fontSize: 15,
        background: '#fff',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        boxSizing: 'border-box' as const,
        width: '100%',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(0,0,0,0.04)' : 'none',
        transition: 'all 0.2s',
        ...style
      }}
    />
  )
}

function Sel({ children, style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <select {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
      style={{
        height: 48,
        border: `1px solid ${focused ? '#d1d5db' : '#e5e7eb'}`,
        borderRadius: 12,
        padding: '0 16px',
        fontSize: 15,
        background: '#fff',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        boxSizing: 'border-box' as const,
        width: '100%',
        outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(0,0,0,0.04)' : 'none',
        transition: 'all 0.2s',
        ...style
      }}>
      {children}
    </select>
  )
}

function PaxCounter({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      overflow: 'hidden',
      width: 180,
      background: '#fff'
    }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        style={{
          width: 48,
          height: 48,
          background: 'none',
          border: 'none',
          fontSize: 20,
          cursor: 'pointer',
          color: '#6b7280',
          fontWeight: 600,
          flexShrink: 0,
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => (e.currentTarget.style.color = color)}
        onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
      >
        −
      </button>
      <span style={{
        flex: 1,
        textAlign: 'center' as const,
        fontSize: 18,
        fontWeight: 700,
        color: '#111827'
      }}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        style={{
          width: 48,
          height: 48,
          background: 'none',
          border: 'none',
          fontSize: 20,
          cursor: 'pointer',
          color,
          fontWeight: 600,
          flexShrink: 0,
          transition: 'all 0.2s'
        }}
      >
        +
      </button>
    </div>
  )
}

function AddressField({ id, name, value, onChange, placeholder, required, icon }: { id: string; name: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean; icon?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { suggestions, isLoading } = useAddressAutocomplete(value)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  return (
    <div ref={wrapperRef} style={{ position: 'relative' as const }}>
      <div style={{ position: 'relative' as const }}>
        {icon && <span style={{
          position: 'absolute' as const,
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 16,
          pointerEvents: 'none'
        }}>{icon}</span>}
        <input id={id} name={name} value={value} required={required} placeholder={placeholder} autoComplete="off"
          onFocus={() => { setIsOpen(true); setFocused(true) }}
          onBlur={() => setFocused(false)}
          onChange={e => { onChange(e.target.value); setIsOpen(true) }}
          style={{
            height: 48,
            border: `1px solid ${focused ? '#d1d5db' : '#e5e7eb'}`,
            borderRadius: 12,
            padding: icon ? '0 16px 0 44px' : '0 16px',
            fontSize: 15,
            background: '#fff',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            boxSizing: 'border-box' as const,
            width: '100%',
            outline: 'none',
            boxShadow: focused ? '0 0 0 3px rgba(0,0,0,0.04)' : 'none',
            transition: 'all 0.2s'
          }}
        />
      </div>
      {isOpen && (isLoading || suggestions.length > 0) && (
        <div style={{
          position: 'absolute' as const,
          zIndex: 30,
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 8,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {isLoading ? <p style={{
            padding: '12px 16px',
            fontSize: 14,
            color: '#9ca3af'
          }}>Buscando...</p>
            : suggestions.slice(0, 5).map(s => (
              <button key={s} type="button" style={{
                display: 'block',
                width: '100%',
                textAlign: 'left' as const,
                padding: '12px 16px',
                fontSize: 14,
                color: '#374151',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                borderBottom: '1px solid #f3f4f6',
                transition: 'background 0.15s'
              }}
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
  const [focused, setFocused] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { suggestions, isLoading } = useAddressAutocomplete(value)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  return (
    <div ref={wrapperRef} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#6b7280',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0
      }}>{index + 1}</div>
      <div style={{ flex: 1, position: 'relative' as const }}>
        <input value={value} placeholder={`Parada ${index + 1}`} autoComplete="off"
          onFocus={() => { setIsOpen(true); setFocused(true) }}
          onBlur={() => setFocused(false)}
          onChange={e => { onChange(e.target.value); setIsOpen(true) }}
          style={{
            height: 44,
            border: `1px solid ${focused ? '#d1d5db' : '#e5e7eb'}`,
            borderRadius: 12,
            padding: '0 16px',
            fontSize: 14,
            background: '#fff',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            boxSizing: 'border-box' as const,
            width: '100%',
            outline: 'none',
            boxShadow: focused ? '0 0 0 3px rgba(0,0,0,0.04)' : 'none',
            transition: 'all 0.2s'
          }}
        />
        {isOpen && (isLoading || suggestions.length > 0) && (
          <div style={{
            position: 'absolute' as const,
            zIndex: 30,
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 8,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {isLoading ? <p style={{
              padding: '12px 16px',
              fontSize: 14,
              color: '#9ca3af'
            }}>Buscando...</p>
              : suggestions.slice(0, 5).map(s => (
                <button key={s} type="button" style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left' as const,
                  padding: '12px 16px',
                  fontSize: 14,
                  color: '#374151',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  borderBottom: '1px solid #f3f4f6',
                  transition: 'background 0.15s'
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={() => { onChange(s); setIsOpen(false) }}>📍 {s}</button>
              ))}
          </div>
        )}
      </div>
      <button type="button" onClick={onRemove} style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        border: '1px solid #fecaca',
        background: '#fef2f2',
        color: '#ef4444',
        fontSize: 20,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.2s'
      }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#fee2e2'
          e.currentTarget.style.borderColor = '#fca5a5'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#fef2f2'
          e.currentTarget.style.borderColor = '#fecaca'
        }}
      >×</button>
    </div>
  )
}

// Mapa con Leaflet + OpenStreetMap
function RouteMap({ origin, destination, stops, arrival, color }: { origin: string; destination: string; stops: string[]; arrival: string; color: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_KEY!

  async function geocode(address: string): Promise<[number, number] | null> {
    try {
      const res = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${apiKey}`)
      const data = await res.json()
      if (data.features?.length > 0) {
        const { lat, lon } = data.features[0].properties
        return [lat, lon]
      }
    } catch { }
    return null
  }

  useEffect(() => {
    if (!mapRef.current) return
    if (!origin || !destination) return

    let destroyed = false

    async function initMap() {
      setLoading(true)
      setError(false)

      try {
        const L = (await import('leaflet')).default
        await import('leaflet/dist/leaflet.css' as any)

        if (destroyed) return

        // Destruir mapa anterior
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        }

        // Geocodificar todos los puntos
        const puntos = [origin, ...stops.filter(Boolean), destination]
        if (arrival && arrival !== destination) puntos.push(arrival)

        const coords = await Promise.all(puntos.map(p => geocode(p)))
        const validCoords = coords.filter(Boolean) as [number, number][]

        if (validCoords.length < 2 || destroyed) return

        // Crear mapa
        const map = L.map(mapRef.current!, { zoomControl: true, attributionControl: false })
        mapInstanceRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

        // Iconos personalizados
        const makeIcon = (bg: string, label: string) => L.divIcon({
          className: '',
          html: `<div style="width:32px;height:32px;border-radius:50%;background:${bg};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;font-family:system-ui">${label}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        const labels = ['A', ...stops.filter(Boolean).map((_, i) => String(i + 1)), 'B', arrival && arrival !== destination ? '🏁' : ''].filter(Boolean)

        validCoords.forEach((coord, i) => {
          const isOrigin = i === 0
          const isDestination = i === validCoords.length - 1 && !arrival
          const isArrival = arrival && arrival !== destination && i === validCoords.length - 1
          const bg = isOrigin ? '#16a34a' : isArrival ? '#7c3aed' : isDestination ? color : '#6b7280'
          L.marker(coord, { icon: makeIcon(bg, labels[i] || String(i)) }).addTo(map)
        })

        // Dibujar ruta con Geoapify Routing
        const waypointsStr = validCoords.map(c => `${c[0]},${c[1]}`).join('|')
        const routeRes = await fetch(`https://api.geoapify.com/v1/routing?waypoints=${waypointsStr}&mode=drive&apiKey=${apiKey}`)
        const routeData = await routeRes.json()

        if (routeData.features?.length > 0 && !destroyed) {
          const geojson = routeData.features[0]
          L.geoJSON(geojson, { style: { color, weight: 4, opacity: 0.8 } }).addTo(map)
        }

        // Ajustar vista
        const bounds = L.latLngBounds(validCoords.map(c => L.latLng(c[0], c[1])))
        map.fitBounds(bounds, { padding: [30, 30] })

        setLoading(false)
      } catch (e) {
        console.error(e)
        setError(true)
        setLoading(false)
      }
    }

    initMap()
    return () => { destroyed = true }
  }, [origin, destination, stops.join(','), arrival, color])

  if (!origin || !destination) return null

  return (
    <div style={{
      marginTop: 12,
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid #e5e7eb',
      position: 'relative' as const,
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
    }}>
      {loading && (
        <div style={{
          position: 'absolute' as const,
          inset: 0,
          background: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          borderRadius: 16
        }}>
          <p style={{
            fontSize: 14,
            color: '#9ca3af',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontWeight: 500
          }}>Calculando ruta...</p>
        </div>
      )}
      {error && (
        <div style={{
          background: '#fef2f2',
          padding: '16px 20px',
          borderRadius: 16
        }}>
          <p style={{
            fontSize: 14,
            color: '#dc2626',
            margin: 0,
            fontWeight: 500
          }}>No se pudo cargar el mapa</p>
        </div>
      )}
      <div ref={mapRef} style={{ height: 320, width: '100%' }} />

      {/* Leyenda */}
      <div style={{
        display: 'flex',
        gap: 16,
        padding: '14px 20px',
        background: '#f9fafb',
        flexWrap: 'wrap' as const,
        borderTop: '1px solid #e5e7eb'
      }}>
        {[
          { color: '#16a34a', label: 'Origen' },
          { color: '#6b7280', label: stops.filter(Boolean).length > 0 ? `${stops.filter(Boolean).length} parada${stops.filter(Boolean).length > 1 ? 's' : ''}` : null },
          { color, label: 'Destino' },
          arrival && arrival !== destination ? { color: '#7c3aed', label: 'Llegada final' } : null,
        ].filter(Boolean).filter(i => (i as any).label).map((item: any, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: item.color,
              flexShrink: 0,
              border: '2px solid #fff',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
            }} />
            <span style={{
              fontSize: 13,
              color: '#6b7280',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontWeight: 500
            }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function QuoteForm({ slug }: QuoteFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [company, setCompany] = useState<Company | null>(null)
  const [loadingCompany, setLoadingCompany] = useState(true)

  // Paso 0 — Contacto
  const [clientType, setClientType] = useState<'particular' | 'empresa'>('particular')
  const [requesterName, setRequesterName] = useState('')
  const [requesterEmail, setRequesterEmail] = useState('')
  const [requesterPhone, setRequesterPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyTaxId, setCompanyTaxId] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [contactPerson, setContactPerson] = useState('')

  // Paso 1 — Viaje
  const [tripType, setTripType] = useState<'ida' | 'idavuelta'>('ida')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [arrival, setArrival] = useState('') // donde finalizan los pasajeros (puede diferir del destino)
  const [sameArrival, setSameArrival] = useState(true) // si llegada = destino
  const [stops, setStops] = useState<string[]>([])
  const [tripDate, setTripDate] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [passengers, setPassengers] = useState(1)

  // Paso 2 — Vehículo
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

  // Llegada efectiva para el cálculo
  const arrivalFinal = sameArrival ? destination : arrival

  function validateStep() {
    if (step === 0) {
      if (!requesterName.trim() || !requesterEmail.trim() || !requesterPhone.trim()) { alert('Rellena nombre, email y teléfono'); return false }
      if (clientType === 'empresa' && (!companyName.trim() || !companyTaxId.trim())) { alert('Rellena los datos de empresa'); return false }
    }
    if (step === 1) {
      if (!origin.trim() || !destination.trim()) { alert('Indica origen y destino'); return false }
      if (!tripDate || !departureTime) { alert('Indica fecha y hora de salida'); return false }
      if (tripType === 'idavuelta' && (!returnDate || !returnTime)) { alert('Indica fecha y hora de regreso'); return false }
      if (!sameArrival && !arrival.trim()) { alert('Indica la dirección de llegada final'); return false }
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
      !sameArrival ? 'Llegada final: ' + arrival : '',
      comments ? 'Comentarios: ' + comments : '',
    ].filter(Boolean).join('\n')

    const filledStops = stops.filter(s => s.trim())

    const { error } = await supabase.from('quote_requests').insert({
      company_id: company.id,
      status: 'nuevo',
      requester_name: requesterName,
      requester_email: requesterEmail,
      requester_phone: requesterPhone,
      origin,
      destination: arrivalFinal, // el destino final es donde acaban los pasajeros
      stops: filledStops.length > 0 ? JSON.stringify(filledStops) : null,
      trip_date: tripDate,
      departure_time: departureTime,
      return_date: tripType === 'idavuelta' ? returnDate || null : null,
      return_time: tripType === 'idavuelta' ? returnTime || null : null,
      passengers,
      vehicle_type: vehicleType,
      comments: extraDetails || null,
    })

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

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }
  const sectionTitle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 32,
    letterSpacing: '-0.02em'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      fontFamily: "'DM Sans', system-ui, sans-serif"
    }}>

      {/* HEADER */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #f3f4f6',
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 20
      }}>
        {company.logo_url && (
          <img
            src={company.logo_url}
            alt={company.name}
            style={{
              height: 48,
              width: 'auto',
              objectFit: 'contain',
              borderRadius: 8
            }}
          />
        )}
        <div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#111827',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            {company.name}
          </h1>
          <p style={{
            fontSize: 14,
            color: '#6b7280',
            margin: '4px 0 0',
            fontWeight: 500
          }}>
            Solicitud de presupuesto · Respuesta en menos de 24h
          </p>
        </div>
      </div>

      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '48px 24px 100px'
      }}>
        <StepBar current={step} color={color} />

        <div style={{
          background: '#fff',
          border: '1px solid #f3f4f6',
          borderRadius: 20,
          padding: '40px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>

          {/* PASO 0 — CONTACTO */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 28 }}>
              <h2 style={sectionTitle}>Datos de contacto</h2>

              <Field label="Tipo de cliente">
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['particular', 'empresa'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setClientType(t)}
                      style={{
                        flex: 1,
                        height: 52,
                        borderRadius: 14,
                        border: `1px solid ${clientType === t ? color : '#e5e7eb'}`,
                        background: clientType === t ? color : '#fff',
                        color: clientType === t ? '#fff' : '#374151',
                        fontWeight: 600,
                        fontSize: 15,
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        transition: 'all 0.2s',
                        boxShadow: clientType === t ? `0 4px 12px ${color}25` : 'none'
                      }}>
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
                <div style={{
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: 20,
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  padding: 24
                }}>
                  <h3 style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#111827',
                    margin: 0,
                    letterSpacing: '-0.01em'
                  }}>Datos de empresa</h3>
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
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 28 }}>
              <h2 style={sectionTitle}>Detalles del viaje</h2>

              <Field label="Tipo de viaje">
                <div style={{ display: 'flex', gap: 12 }}>
                  {([['ida', '➡️ Solo ida'], ['idavuelta', '🔄 Ida y vuelta']] as const).map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setTripType(val)}
                      style={{
                        flex: 1,
                        height: 52,
                        borderRadius: 14,
                        border: `1px solid ${tripType === val ? color : '#e5e7eb'}`,
                        background: tripType === val ? color : '#fff',
                        color: tripType === val ? '#fff' : '#374151',
                        fontWeight: 600,
                        fontSize: 15,
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        transition: 'all 0.2s',
                        boxShadow: tripType === val ? `0 4px 12px ${color}25` : 'none'
                      }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </Field>

              {/* RUTA */}
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                padding: 24,
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 20
              }}>
                <h3 style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#111827',
                  margin: 0,
                  letterSpacing: '-0.01em'
                }}>Ruta del servicio</h3>

                <Field label="Origen" required>
                  <AddressField id="origin" name="origin" value={origin} onChange={setOrigin} placeholder="Dirección o ciudad de salida" required icon="🟢" />
                </Field>

                {/* Paradas */}
                {stops.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', margin: 0 }}>PARADAS INTERMEDIAS</p>
                    {stops.map((stop, i) => (
                      <StopField key={i} index={i} value={stop} onChange={v => updateStop(i, v)} onRemove={() => removeStop(i)} />
                    ))}
                  </div>
                )}

                <button type="button" onClick={addStop} style={{
                  height: 44,
                  borderRadius: 12,
                  border: `1px dashed ${color}80`,
                  background: 'none',
                  color: color,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  transition: 'all 0.2s'
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${color}08`
                    e.currentTarget.style.borderStyle = 'solid'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.borderStyle = 'dashed'
                  }}
                >
                  + Añadir parada intermedia
                </button>

                <Field label="Destino" required hint="Dónde quieren llegar los pasajeros">
                  <AddressField id="destination" name="destination" value={destination} onChange={setDestination} placeholder="Dirección o ciudad de destino" required icon="🔴" />
                </Field>

                {/* Llegada final diferente */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                    <input type="checkbox" checked={!sameArrival} onChange={e => setSameArrival(!e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: color, cursor: 'pointer' }} />
                    El bus finaliza el servicio en un lugar diferente al destino
                  </label>
                  {!sameArrival && (
                    <div style={{ marginTop: 12 }}>
                      <Field label="Lugar de finalización del servicio" hint="Donde se bajan los pasajeros y el bus regresa al garaje">
                        <AddressField id="arrival" name="arrival" value={arrival} onChange={setArrival} placeholder="Dirección de llegada final" icon="🏁" />
                      </Field>
                    </div>
                  )}
                </div>
              </div>

              {/* MAPA */}
              {origin && destination && (
                <RouteMap
                  origin={origin}
                  destination={destination}
                  stops={stops}
                  arrival={arrivalFinal}
                  color={color}
                />
              )}

              {/* FECHAS */}
              <div style={{ display: 'grid', gridTemplateColumns: tripType === 'idavuelta' ? '1fr 1fr' : '1fr', gap: 20 }}>
                <div style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 16,
                  padding: 24
                }}>
                  <h3 style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: 20,
                    letterSpacing: '-0.01em'
                  }}>Salida</h3>
                  <div style={grid2}>
                    <Field label="Fecha" required><Inp type="date" value={tripDate} onChange={e => setTripDate(e.target.value)} required /></Field>
                    <Field label="Hora" required><Inp type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} required /></Field>
                  </div>
                </div>
                {tripType === 'idavuelta' && (
                  <div style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    padding: 24
                  }}>
                    <h3 style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#111827',
                      marginBottom: 20,
                      letterSpacing: '-0.01em'
                    }}>Regreso</h3>
                    <div style={grid2}>
                      <Field label="Fecha" required><Inp type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} required /></Field>
                      <Field label="Hora" required><Inp type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} required /></Field>
                    </div>
                  </div>
                )}
              </div>

              <Field label="Número de pasajeros" required>
                <PaxCounter value={passengers} onChange={setPassengers} color={color} />
              </Field>
            </div>
          )}

          {/* PASO 2 — VEHÍCULO */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 28 }}>
              <h2 style={sectionTitle}>Vehículo y servicio</h2>

              <Field label="Tipo de vehículo">
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                  {([
                    ['minibus', 'Minibús', 'Hasta 20 pasajeros', '🚐'],
                    ['autobus', 'Autobús', 'Hasta 55 pasajeros', '🚌'],
                    ['autocar', 'Autocar Gran Turismo', 'Hasta 70 pasajeros', '🚍'],
                  ] as const).map(([val, label, sub, icon]) => (
                    <button key={val} type="button" onClick={() => setVehicleType(val)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 18,
                        padding: '18px 20px',
                        borderRadius: 16,
                        border: `1px solid ${vehicleType === val ? color : '#e5e7eb'}`,
                        background: vehicleType === val ? `${color}08` : '#fff',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        transition: 'all 0.2s',
                        textAlign: 'left' as const,
                        boxShadow: vehicleType === val ? `0 4px 12px ${color}15` : '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                      onMouseEnter={e => {
                        if (vehicleType !== val) {
                          e.currentTarget.style.borderColor = '#d1d5db'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (vehicleType !== val) {
                          e.currentTarget.style.borderColor = '#e5e7eb'
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
                        }
                      }}
                    >
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        background: vehicleType === val ? color : '#f9fafb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        flexShrink: 0,
                        transition: 'all 0.2s'
                      }}>
                        {icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: vehicleType === val ? color : '#111827',
                          margin: 0,
                          letterSpacing: '-0.01em'
                        }}>
                          {label}
                        </p>
                        <p style={{
                          fontSize: 13,
                          color: '#6b7280',
                          margin: '4px 0 0',
                          fontWeight: 500
                        }}>
                          {sub}
                        </p>
                      </div>
                      {vehicleType === val && (
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          ✓
                        </div>
                      )}
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
                  placeholder="Equipaje especial, necesidades concretas, instrucciones..."
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  rows={4}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: '16px',
                    fontSize: 15,
                    background: '#fff',
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    boxSizing: 'border-box' as const,
                    width: '100%',
                    outline: 'none',
                    resize: 'vertical' as const,
                    lineHeight: 1.6,
                    transition: 'all 0.2s'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#d1d5db'
                    e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.04)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </Field>
            </div>
          )}

          {/* PASO 3 — RESUMEN */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              <h2 style={sectionTitle}>Resumen de tu solicitud</h2>

              {[
                { label: 'Nombre', value: requesterName },
                { label: 'Email', value: requesterEmail },
                { label: 'Teléfono', value: requesterPhone },
                { label: 'Tipo de cliente', value: clientType === 'empresa' ? `Empresa — ${companyName}` : 'Particular' },
                { label: 'Origen', value: origin },
                stops.filter(Boolean).length > 0 ? { label: 'Paradas', value: stops.filter(Boolean).join(' → ') } : null,
                { label: 'Destino', value: destination },
                !sameArrival && arrival ? { label: 'Llegada final', value: arrival } : null,
                { label: 'Fecha de salida', value: `${tripDate} a las ${departureTime}` },
                tripType === 'idavuelta' ? { label: 'Regreso', value: `${returnDate} a las ${returnTime}` } : null,
                { label: 'Pasajeros', value: String(passengers) },
                { label: 'Vehículo', value: vehicleType === 'minibus' ? 'Minibús' : vehicleType === 'autobus' ? 'Autobús' : 'Autocar GT' },
                { label: 'Tipo de servicio', value: serviceType },
                comments ? { label: 'Comentarios', value: comments } : null,
              ].filter(Boolean).map((row: any, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '16px 0',
                  borderBottom: '1px solid #f3f4f6',
                  gap: 20
                }}>
                  <span style={{
                    fontSize: 14,
                    color: '#6b7280',
                    fontWeight: 500,
                    flexShrink: 0
                  }}>{row.label}</span>
                  <span style={{
                    fontSize: 14,
                    color: '#111827',
                    fontWeight: 600,
                    textAlign: 'right' as const
                  }}>{row.value}</span>
                </div>
              ))}

              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 14,
                padding: '16px 20px',
                marginTop: 20
              }}>
                <p style={{
                  fontSize: 14,
                  color: '#166534',
                  margin: 0,
                  lineHeight: 1.6,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontWeight: 500
                }}>
                  Recibirás una respuesta en menos de 24 horas con el presupuesto detallado.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* NAVEGACIÓN */}
        <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1,
                height: 56,
                borderRadius: 16,
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#374151',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#f9fafb'
                e.currentTarget.style.borderColor = '#d1d5db'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.borderColor = '#e5e7eb'
              }}
            >
              ← Atrás
            </button>
          )}
          {step < 3 ? (
            <button type="button" onClick={() => { if (validateStep()) setStep(s => s + 1) }}
              style={{
                flex: 2,
                height: 56,
                borderRadius: 16,
                border: 'none',
                background: color,
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                boxShadow: `0 8px 16px ${color}30`,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = `0 12px 24px ${color}40`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = `0 8px 16px ${color}30`
              }}
            >
              Siguiente →
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={isSubmitting}
              style={{
                flex: 2,
                height: 56,
                borderRadius: 16,
                border: 'none',
                background: color,
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                boxShadow: `0 8px 16px ${color}30`,
                opacity: isSubmitting ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = `0 12px 24px ${color}40`
                }
              }}
              onMouseLeave={e => {
                if (!isSubmitting) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = `0 8px 16px ${color}30`
                }
              }}
            >
              {isSubmitting ? 'Enviando...' : '✅ Enviar solicitud'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}