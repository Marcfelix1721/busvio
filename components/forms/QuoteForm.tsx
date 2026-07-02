"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete"
import { createClient } from "@/lib/supabase"

type QuoteFormProps = { slug: string }
type Company = { id: string; name: string; logo_url: string | null; color_primario: string | null }

const STEPS = ["Contacto", "Viaje", "Servicio", "Resumen"]

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
  // Permite ESCRIBIR el número (teclado numérico en móvil) y ajustar con − / +.
  const [text, setText] = useState(String(value))
  useEffect(() => { setText(String(value)) }, [value])

  const handleText = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '')
    if (digits === '') { setText(''); return } // permitir vacío mientras se escribe
    let n = parseInt(digits, 10)
    if (n < 1) n = 1
    if (n > 100) n = 100
    setText(String(n))
    onChange(n)
  }
  const handleBlur = () => {
    let n = parseInt(text || '0', 10)
    if (isNaN(n) || n < 1) n = 1
    if (n > 100) n = 100
    setText(String(n))
    onChange(n)
  }

  const stepBtn = (label: string, onClick: () => void, disabled: boolean) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label === '−' ? 'Quitar pasajero' : 'Añadir pasajero'}
      style={{
        width: 48, height: 48, background: 'none', border: 'none', fontSize: 22,
        cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#d1d5db' : '#6b7280',
        fontWeight: 600, flexShrink: 0, transition: 'all 0.2s'
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = color }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.color = '#6b7280' }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb',
      borderRadius: 12, overflow: 'hidden', width: 200, background: '#fff'
    }}>
      {stepBtn('−', () => onChange(Math.max(1, value - 1)), value <= 1)}
      <input
        type="text" inputMode="numeric" pattern="[0-9]*"
        value={text}
        onChange={e => handleText(e.target.value)}
        onBlur={handleBlur}
        onFocus={e => e.currentTarget.select()}
        aria-label="Número de pasajeros"
        style={{
          flex: 1, width: '100%', minWidth: 0, height: 48, padding: 0,
          textAlign: 'center' as const, fontSize: 18, fontWeight: 700, color: '#111827',
          border: 'none', borderLeft: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6',
          outline: 'none', background: 'transparent', fontFamily: "'DM Sans', system-ui, sans-serif"
        }}
      />
      {stepBtn('+', () => onChange(Math.min(100, value + 1)), value >= 100)}
    </div>
  )
}

/* ===================== Fecha y hora (calendario + lista de horas) ===================== */
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const WEEKDAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const TIME_SLOTS: string[] = (() => {
  const out: string[] = []
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  return out
})()
const pad2 = (n: number) => String(n).padStart(2, '0')
const toISO = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`
const fromISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d } }
const fmtFechaES = (s: string) => { if (!s) return ''; const { y, m, d } = fromISO(s); return `${pad2(d)}/${pad2(m)}/${y}` }

const triggerStyle = (open: boolean, focused: boolean, color: string): React.CSSProperties => ({
  height: 48, width: '100%', border: `1px solid ${open || focused ? color : '#e5e7eb'}`, borderRadius: 12,
  padding: '0 14px', fontSize: 15, background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif",
  boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  cursor: 'pointer', outline: 'none', boxShadow: open ? `0 0 0 3px ${color}12` : 'none', transition: 'all 0.2s', gap: 8,
})

function CalIcon() {
  return (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>)
}
function ClockIcon() {
  return (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></svg>)
}
function NavBtn({ dir, onClick, disabled }: { dir: 'left' | 'right'; onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={dir === 'left' ? 'Mes anterior' : 'Mes siguiente'}
      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#d1d5db' : '#374151', padding: 0 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  )
}

function DatePicker({ value, onChange, color, min }: { value: string; onChange: (v: string) => void; color: string; min?: string }) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const now = new Date()
  const todayISO = toISO(now.getFullYear(), now.getMonth() + 1, now.getDate())
  const minISO = min && min > todayISO ? min : todayISO

  const base = value ? fromISO(value) : fromISO(minISO)
  const [view, setView] = useState<{ y: number; m: number }>({ y: base.y, m: base.m })
  useEffect(() => { if (value) { const v = fromISO(value); setView({ y: v.y, m: v.m }) } }, [value])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const firstDow = (new Date(view.y, view.m - 1, 1).getDay() + 6) % 7 // Lunes = 0
  const daysInMonth = new Date(view.y, view.m, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prev = () => setView(v => v.m === 1 ? { y: v.y - 1, m: 12 } : { y: v.y, m: v.m - 1 })
  const next = () => setView(v => v.m === 12 ? { y: v.y + 1, m: 1 } : { y: v.y, m: v.m + 1 })
  const minView = fromISO(minISO)
  const canPrev = view.y > minView.y || (view.y === minView.y && view.m > minView.m)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={triggerStyle(open, focused, color)}>
        <span style={{ color: value ? '#111827' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value ? fmtFechaES(value) : 'dd/mm/aaaa'}</span>
        <CalIcon />
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 70, top: 'calc(100% + 6px)', left: 0, width: 300, maxWidth: '85vw', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 18px 40px -16px rgba(15,27,45,0.3)', padding: 14, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <NavBtn dir="left" onClick={prev} disabled={!canPrev} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>{MONTHS_ES[view.m - 1]} {view.y}</span>
            <NavBtn dir="right" onClick={next} disabled={false} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {WEEKDAYS_ES.map((w, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9ca3af', padding: '4px 0' }}>{w}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />
              const iso = toISO(view.y, view.m, d)
              const disabled = iso < minISO
              const selected = value === iso
              const isToday = iso === todayISO
              return (
                <button key={i} type="button" disabled={disabled} onClick={() => { onChange(iso); setOpen(false) }}
                  style={{ height: 38, borderRadius: 9, border: isToday && !selected ? `1px solid ${color}55` : '1px solid transparent', background: selected ? color : 'transparent', color: disabled ? '#d1d5db' : selected ? '#fff' : '#111827', fontSize: 14, fontWeight: selected ? 700 : 500, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.12s', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  onMouseEnter={e => { if (!disabled && !selected) e.currentTarget.style.background = `${color}12` }}
                  onMouseLeave={e => { if (!disabled && !selected) e.currentTarget.style.background = 'transparent' }}>
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TimePicker({ value, onChange, color, minExclusive }: { value: string; onChange: (v: string) => void; color: string; minExclusive?: string }) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  useEffect(() => {
    if (open && listRef.current) {
      const sel = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
      if (sel) sel.scrollIntoView({ block: 'center' })
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={triggerStyle(open, focused, color)}>
        <span style={{ color: value ? '#111827' : '#9ca3af' }}>{value || 'hh:mm'}</span>
        <ClockIcon />
      </button>
      {open && (
        <ul ref={listRef} style={{ position: 'absolute', zIndex: 70, top: 'calc(100% + 6px)', left: 0, width: '100%', minWidth: 120, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 18px 40px -16px rgba(15,27,45,0.3)', listStyle: 'none', margin: 0, padding: 4, maxHeight: 240, overflowY: 'auto', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          {TIME_SLOTS.map(t => {
            const selected = t === value
            const disabled = !!minExclusive && t <= minExclusive // mismo día: no antes/igual que la salida
            return (
              <li key={t} data-selected={selected}
                onClick={() => { if (disabled) return; onChange(t); setOpen(false) }}
                aria-disabled={disabled}
                style={{ padding: '9px 12px', borderRadius: 8, fontSize: 14, fontWeight: selected ? 700 : 500, color: disabled ? '#d1d5db' : selected ? '#fff' : '#111827', background: selected ? color : 'transparent', cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'center' }}
                onMouseEnter={e => { if (!selected && !disabled) e.currentTarget.style.background = `${color}12` }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}>
                {t}
              </li>
            )
          })}
        </ul>
      )}
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

  // Paso 2 — Servicio
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
      // Validar la combinación fecha+hora completa del regreso (no solo la fecha).
      if (tripType === 'idavuelta' && returnDate && tripDate && returnDate < tripDate) {
        alert('La fecha de regreso no puede ser anterior a la de salida'); return false
      }
      if (tripType === 'idavuelta' && returnDate === tripDate && returnTime && departureTime && returnTime <= departureTime) {
        alert('Si el regreso es el mismo día, la hora de regreso debe ser posterior a la de salida'); return false
      }
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
      vehicle_type: null,
      comments: extraDetails || null,
    })

    if (error) { alert('No se pudo enviar la solicitud'); setIsSubmitting(false); return }

    // Enviar notificación por email a la empresa. Es un aviso INTERNO: si falla,
    // NO se muestra error al cliente ni se bloquea su flujo — la solicitud ya está
    // guardada y recibe igualmente su confirmación de "en revisión". Solo se loguea.
    try {
      const notifRes = await fetch('/api/enviar-notificacion-empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company.id,
          requester_name: requesterName,
          requester_email: requesterEmail,
          origin,
          destination: arrivalFinal,
          trip_date: tripDate,
          passengers,
          service_type: serviceType,
        }),
      })
      if (!notifRes.ok) {
        const body = await notifRes.text().catch(() => '')
        console.error('Aviso de notificación falló:', notifRes.status, body)
      }
    } catch (err) {
      // Error silencioso - no bloquea el envío del formulario
      console.error('Error al enviar notificación:', err)
    }

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
                    <Field label="Fecha" required><DatePicker value={tripDate} onChange={setTripDate} color={color} /></Field>
                    <Field label="Hora" required><TimePicker value={departureTime} onChange={setDepartureTime} color={color} /></Field>
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
                      <Field label="Fecha" required><DatePicker value={returnDate} onChange={setReturnDate} color={color} min={tripDate || undefined} /></Field>
                      <Field label="Hora" required><TimePicker value={returnTime} onChange={setReturnTime} color={color} minExclusive={returnDate && returnDate === tripDate ? departureTime : undefined} /></Field>
                    </div>
                  </div>
                )}
              </div>

              <Field label="Número de pasajeros" required>
                <PaxCounter value={passengers} onChange={setPassengers} color={color} />
              </Field>
            </div>
          )}

          {/* PASO 2 — Servicio */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 28 }}>
              <h2 style={sectionTitle}>Tipo de servicio</h2>

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
                { label: 'Fecha de salida', value: `${fmtFechaES(tripDate)} a las ${departureTime}` },
                tripType === 'idavuelta' ? { label: 'Regreso', value: `${fmtFechaES(returnDate)} a las ${returnTime}` } : null,
                { label: 'Pasajeros', value: String(passengers) },
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