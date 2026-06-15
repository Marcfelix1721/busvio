'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Circle } from 'lucide-react'
import { COLORS, RADIUS, SHADOW, FONT_BODY } from '@/lib/dashboard-ui'

const estados = [
  { value: 'potencial',  label: 'Potencial',  color: COLORS.warning,   bg: COLORS.warningSoft },
  { value: 'activo',     label: 'Activo',     color: COLORS.teal,      bg: COLORS.tealSoft },
  { value: 'recurrente', label: 'Recurrente', color: COLORS.navy,      bg: COLORS.navySoft },
  { value: 'inactivo',   label: 'Inactivo',   color: COLORS.textMuted, bg: '#eef1f4' },
  { value: 'perdido',    label: 'Perdido',    color: COLORS.danger,    bg: COLORS.dangerSoft },
]

type Props = {
  companyId: string
  email: string
  nombre: string
  telefono: string
  estadoInicial: string | null
}

export function ClienteEstado({ companyId, email, nombre, telefono, estadoInicial }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [estado, setEstado] = useState(estadoInicial ?? 'potencial')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cambiarEstado = async (nuevoEstado: string) => {
    setGuardando(true)
    setMensaje('')

    const { error } = await supabase
      .from('clientes')
      .upsert({
        company_id: companyId,
        email,
        nombre,
        telefono,
        estado_relacion: nuevoEstado,
      }, {
        onConflict: 'company_id,email'
      })

    setGuardando(false)

    if (error) {
      setMensaje('Error al guardar')
      return
    }

    setEstado(nuevoEstado)
    setMensaje('Guardado')
    setTimeout(() => setMensaje(''), 2000)
  }

  const estadoActual = estados.find(e => e.value === estado)

  return (
    <div style={{ background: COLORS.surface, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, boxShadow: SHADOW.card, padding: 24, fontFamily: FONT_BODY }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
          Relación comercial
        </h2>
        {mensaje && (
          <span style={{ fontSize: 12, color: COLORS.teal, fontWeight: 600 }}>{mensaje}</span>
        )}
      </div>

      {estadoActual && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: `1px solid ${estadoActual.color}33`, background: estadoActual.bg, padding: '5px 12px', borderRadius: RADIUS.pill, fontSize: 13, fontWeight: 600, color: estadoActual.color, marginBottom: 16 }}>
          <Circle style={{ width: 9, height: 9, fill: estadoActual.color, color: estadoActual.color }} />
          {estadoActual.label}
        </div>
      )}

      <p style={{ fontSize: 12, color: COLORS.textFaint, marginBottom: 12 }}>Cambiar estado:</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {estados.map((e) => {
          const activo = e.value === estado
          return (
            <button
              key={e.value}
              onClick={() => cambiarEstado(e.value)}
              disabled={guardando || activo}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600,
                padding: '8px 12px', borderRadius: RADIUS.sm, fontFamily: FONT_BODY,
                transition: 'all 0.15s', textAlign: 'left',
                border: `1px solid ${activo ? `${e.color}33` : COLORS.border}`,
                background: activo ? e.bg : COLORS.surface,
                color: activo ? e.color : COLORS.textMuted,
                opacity: activo ? 0.6 : 1,
                cursor: activo ? 'default' : 'pointer',
              }}
            >
              <Circle style={{ width: 9, height: 9, fill: e.color, color: e.color, flexShrink: 0 }} />
              {e.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
