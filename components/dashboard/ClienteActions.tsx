"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Check, X, Plus } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { COLORS, RADIUS, SHADOW, FONT_BODY } from "@/lib/dashboard-ui"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ESTADOS = [
  { value: "potencial",  label: "Potencial",  color: COLORS.warning },
  { value: "activo",     label: "Activo",     color: COLORS.teal },
  { value: "recurrente", label: "Recurrente", color: COLORS.navy },
  { value: "inactivo",   label: "Inactivo",   color: COLORS.textMuted },
  { value: "perdido",    label: "Perdido",    color: COLORS.danger },
]

const ETIQUETAS_SUGERIDAS = [
  "VIP", "Escuela", "Empresa", "Agencia", "Recurrente",
  "Boda", "Excursión", "Aeropuerto", "Corporativo",
]

type Props = {
  email: string
  companyId: string
  clienteId: string | null
  nombre: string
  telefono: string
  estadoInicial: string | null
  notasIniciales: string
  etiquetasIniciales: string[]
}

export function ClienteActions({ email, companyId, clienteId, nombre, telefono, estadoInicial, notasIniciales, etiquetasIniciales }: Props) {
  const [estado, setEstado] = useState(estadoInicial || "")
  const [notas, setNotas] = useState(notasIniciales)
  const [etiquetas, setEtiquetas] = useState<string[]>(etiquetasIniciales)
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    const payload = {
      company_id: companyId,
      email,
      nombre,
      telefono,
      estado_relacion: estado || null,
      notas,
      etiquetas,
      updated_at: new Date().toISOString(),
    }
    if (clienteId) {
      await supabase.from("clientes").update(payload).eq("id", clienteId)
    } else {
      await supabase.from("clientes").insert(payload)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function addEtiqueta(tag: string) {
    const t = tag.trim()
    if (t && !etiquetas.includes(t)) setEtiquetas(p => [...p, t])
    setNuevaEtiqueta("")
  }

  function removeEtiqueta(tag: string) {
    setEtiquetas(p => p.filter(e => e !== tag))
  }

  const current = ESTADOS.find(e => e.value === estado)
  const labelStyle: React.CSSProperties = { fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 10 }
  const card: React.CSSProperties = { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, boxShadow: SHADOW.card, padding: 18, marginBottom: 14 }
  const inputBase: React.CSSProperties = { border: `1px solid ${COLORS.borderStrong}`, borderRadius: RADIUS.sm, fontSize: 13, outline: "none", fontFamily: FONT_BODY, color: COLORS.text }

  return (
    <div style={{ fontFamily: FONT_BODY }}>

      {/* ESTADO DE RELACIÓN — selector compacto */}
      <div style={card}>
        <span style={labelStyle}>Estado de relación</span>
        <Select value={estado || "none"} onValueChange={v => setEstado(v === "none" ? "" : v)}>
          <SelectTrigger className="w-full" style={{ height: 40 }}>
            {current ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: current.color, flexShrink: 0 }} />
                <span style={{ color: COLORS.text, fontWeight: 600 }}>{current.label}</span>
              </span>
            ) : (
              <SelectValue placeholder="Sin clasificar" />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.textFaint, flexShrink: 0 }} />
              Sin clasificar
            </SelectItem>
            {ESTADOS.map(e => (
              <SelectItem key={e.value} value={e.value}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ETIQUETAS */}
      <div style={card}>
        <span style={labelStyle}>Etiquetas</span>
        {etiquetas.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {etiquetas.map(tag => (
              <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, background: COLORS.navySoft, color: COLORS.navy, borderRadius: 6, padding: "3px 6px 3px 10px" }}>
                {tag}
                <button type="button" onClick={() => removeEtiqueta(tag)} aria-label={`Quitar ${tag}`}
                  style={{ display: "inline-flex", background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted, padding: 0, lineHeight: 1 }}>
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input value={nuevaEtiqueta} onChange={e => setNuevaEtiqueta(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEtiqueta(nuevaEtiqueta) } }}
            placeholder="Nueva etiqueta..." style={{ ...inputBase, flex: 1, height: 36, padding: "0 10px" }} />
          <button type="button" onClick={() => addEtiqueta(nuevaEtiqueta)} aria-label="Añadir etiqueta"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 36, width: 36, background: COLORS.navy, color: "#fff", border: "none", borderRadius: RADIUS.sm, cursor: "pointer", flexShrink: 0 }}>
            <Plus style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {ETIQUETAS_SUGERIDAS.filter(t => !etiquetas.includes(t)).map(tag => (
            <button key={tag} type="button" onClick={() => addEtiqueta(tag)}
              style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, background: COLORS.surfaceAlt, border: `1px dashed ${COLORS.borderStrong}`, color: COLORS.textMuted, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: FONT_BODY }}>
              <Plus style={{ width: 11, height: 11 }} /> {tag}
            </button>
          ))}
        </div>
      </div>

      {/* NOTAS INTERNAS */}
      <div style={card}>
        <span style={labelStyle}>Notas internas</span>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={5}
          placeholder="Preferencias, historial de trato, condiciones especiales..."
          style={{ ...inputBase, width: "100%", padding: "10px 12px", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }} />
      </div>

      {/* GUARDAR */}
      <button onClick={handleSave} disabled={saving}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", height: 44, background: saved ? COLORS.teal : COLORS.navy, color: "#fff", border: "none", borderRadius: RADIUS.md, fontSize: 13.5, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: FONT_BODY, transition: "background 0.2s", opacity: saving ? 0.8 : 1 }}>
        {saved ? (<><Check style={{ width: 16, height: 16 }} /> Guardado</>) : saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  )
}
