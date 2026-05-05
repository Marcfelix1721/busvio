'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const estados = [
  { value: 'potencial', label: '🟡 Potencial', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'activo', label: '🟢 Activo', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'recurrente', label: '🔵 Recurrente', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'inactivo', label: '⚫ Inactivo', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  { value: 'perdido', label: '🔴 Perdido', color: 'bg-red-50 text-red-700 border-red-200' },
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Relación comercial
        </h2>
        {mensaje && (
          <span className="text-xs text-green-600 font-medium">{mensaje}</span>
        )}
      </div>

      <div className={`inline-flex items-center border px-3 py-1.5 rounded-full text-sm font-semibold mb-4 ${estadoActual?.color}`}>
        {estadoActual?.label}
      </div>

      <p className="text-xs text-gray-400 mb-3">Cambiar estado:</p>
      <div className="grid grid-cols-2 gap-2">
        {estados.map((e) => (
          <button
            key={e.value}
            onClick={() => cambiarEstado(e.value)}
            disabled={guardando || e.value === estado}
            className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all
              ${e.value === estado
                ? `${e.color} border opacity-60 cursor-default`
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  )
}