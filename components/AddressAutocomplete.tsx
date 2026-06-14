"use client"

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent } from "react"

export type AddressSuggestion = { formatted: string; lat: number; lon: number }

type Props = {
  value: string
  /** Cambios de texto (escritura libre). */
  onChange: (text: string) => void
  /** Selección de una sugerencia: incluye coordenadas (para geocodificar bases). */
  onSelect?: (s: AddressSuggestion) => void
  placeholder?: string
  inputStyle?: CSSProperties
  inputClassName?: string
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void
  id?: string
}

/**
 * Input de dirección con autocompletado de Geoapify (España).
 * Geocodifica al seleccionar y devuelve coordenadas vía onSelect.
 * Reutilizable en onboarding, ajustes y (próximamente) gestión de bases.
 */
export function AddressAutocomplete({
  value, onChange, onSelect, placeholder, inputStyle, inputClassName, onFocus, onBlur, id,
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextFetch = useRef(false)

  useEffect(() => {
    // No volver a buscar inmediatamente tras elegir una sugerencia.
    if (skipNextFetch.current) { skipNextFetch.current = false; return }
    const q = value.trim()
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      try {
        const key = process.env.NEXT_PUBLIC_GEOAPIFY_KEY
        const res = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}&filter=countrycode:es&lang=es&limit=5&apiKey=${key}`
        )
        const data = await res.json()
        const sugg: AddressSuggestion[] = (data.features ?? [])
          .map((f: { properties: { formatted: string; lat: number; lon: number } }) => ({
            formatted: f.properties.formatted, lat: f.properties.lat, lon: f.properties.lon,
          }))
          .filter((s: AddressSuggestion) => s.formatted)
        setSuggestions(sugg)
        setOpen(sugg.length > 0)
        setActive(-1)
      } catch {
        setSuggestions([]); setOpen(false)
      }
    }, 280)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [value])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const pick = (s: AddressSuggestion) => {
    skipNextFetch.current = true
    onChange(s.formatted)
    onSelect?.(s)
    setOpen(false)
    setSuggestions([])
    setActive(-1)
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        id={id}
        type="text"
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        className={inputClassName}
        style={inputStyle}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => { if (suggestions.length) setOpen(true); onFocus?.(e) }}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)) }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(suggestions[active]) }
          else if (e.key === "Escape") { setOpen(false) }
        }}
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute", zIndex: 60, top: "calc(100% + 4px)", left: 0, right: 0,
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
            boxShadow: "0 14px 32px -12px rgba(15,27,45,0.28)", listStyle: "none",
            margin: 0, padding: 4, maxHeight: 240, overflowY: "auto",
            fontFamily: "var(--font-body), 'DM Sans', system-ui, sans-serif",
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.formatted}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(s) }}
              onMouseEnter={() => setActive(i)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px",
                borderRadius: 7, fontSize: 13, lineHeight: 1.35, cursor: "pointer",
                color: "#0f1b2d", background: i === active ? "#eef7fa" : "transparent",
              }}
            >
              <span style={{ color: "#0891b2", marginTop: 1, flexShrink: 0 }}>📍</span>
              <span>{s.formatted}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
