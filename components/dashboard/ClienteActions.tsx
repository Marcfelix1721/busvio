"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ESTADOS = [
  { value: "potencial",  label: "Potencial",  color: "#d97706", bg: "#fef3c7" },
  { value: "activo",     label: "Activo",     color: "#16a34a", bg: "#f0fdf4" },
  { value: "recurrente", label: "Recurrente", color: "#2563eb", bg: "#eff6ff" },
  { value: "inactivo",   label: "Inactivo",   color: "#6b7280", bg: "#f3f4f6" },
  { value: "perdido",    label: "Perdido",    color: "#dc2626", bg: "#fef2f2" },
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

  const s = { fontFamily: "'DM Sans', system-ui, sans-serif" }
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8, ...s }
  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20, marginBottom: 14 }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ESTADO DE RELACIÓN */}
      <div style={card}>
        <span style={label}>Estado de relación</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ESTADOS.map(e => (
            <button key={e.value} type="button" onClick={() => setEstado(estado === e.value ? "" : e.value)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${estado === e.value ? e.color : "#e5e7eb"}`, background: estado === e.value ? e.bg : "#fff", cursor: "pointer", ...s, transition: "all 0.15s" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: estado === e.value ? e.color : "#374151" }}>{e.label}</span>
              {estado === e.value && <span style={{ marginLeft: "auto", fontSize: 12, color: e.color }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ETIQUETAS */}
      <div style={card}>
        <span style={label}>Etiquetas</span>
        {etiquetas.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {etiquetas.map(tag => (
              <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, background: "#f3f4f6", color: "#374151", borderRadius: 6, padding: "3px 10px", ...s }}>
                {tag}
                <button type="button" onClick={() => removeEtiqueta(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input value={nuevaEtiqueta} onChange={e => setNuevaEtiqueta(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEtiqueta(nuevaEtiqueta) } }}
            placeholder="Nueva etiqueta..." style={{ flex: 1, height: 34, border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "0 10px", fontSize: 13, outline: "none", ...s }} />
          <button type="button" onClick={() => addEtiqueta(nuevaEtiqueta)}
            style={{ height: 34, padding: "0 12px", background: "#111827", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", ...s }}>
            +
          </button>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {ETIQUETAS_SUGERIDAS.filter(t => !etiquetas.includes(t)).map(tag => (
            <button key={tag} type="button" onClick={() => addEtiqueta(tag)}
              style={{ fontSize: 11, background: "#f9fafb", border: "1px dashed #e5e7eb", color: "#6b7280", borderRadius: 5, padding: "3px 8px", cursor: "pointer", ...s }}>
              + {tag}
            </button>
          ))}
        </div>
      </div>

      {/* NOTAS INTERNAS */}
      <div style={card}>
        <span style={label}>Notas internas</span>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={5}
          placeholder="Preferencias, historial de trato, condiciones especiales..."
          style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "10px 12px", fontSize: 13, resize: "vertical", outline: "none", ...s, boxSizing: "border-box" }} />
      </div>

      {/* GUARDAR */}
      <button onClick={handleSave} disabled={saving}
        style={{ height: 42, background: saved ? "#10b981" : "#111827", color: "#fff", border: "none", borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", ...s, transition: "background 0.2s" }}>
        {saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  )
}