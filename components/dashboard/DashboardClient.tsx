'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Inbox, ChevronRight } from 'lucide-react'
import { QuoteRequest } from '@/lib/types'

const statusConfig: Record<QuoteRequest["status"], { label: string; color: string; bg: string; dot: string }> = {
  nuevo:       { label: "Nuevo",       color: "#0369a1", bg: "#f0f9ff", dot: "#0ea5e9" },
  en_revision: { label: "En revisión", color: "#92400e", bg: "#fffbeb", dot: "#f59e0b" },
  enviado:     { label: "Enviado",     color: "#5b21b6", bg: "#f5f3ff", dot: "#8b5cf6" },
  aceptado:    { label: "Aceptado",    color: "#166534", bg: "#f0fdf4", dot: "#22c55e" },
  rechazado:   { label: "Rechazado",   color: "#991b1b", bg: "#fef2f2", dot: "#ef4444" },
  cancelado:   { label: "Cancelado",   color: "#6b7280", bg: "#f9fafb", dot: "#d1d5db" },
}

const relacionConfig: Record<string, { label: string; color: string; dot: string }> = {
  potencial:  { label: "Potencial",  color: "#92400e", dot: "#f59e0b" },
  activo:     { label: "Activo",     color: "#166534", dot: "#22c55e" },
  recurrente: { label: "Recurrente", color: "#1e40af", dot: "#3b82f6" },
  inactivo:   { label: "Inactivo",   color: "#6b7280", dot: "#9ca3af" },
  perdido:    { label: "Perdido",    color: "#991b1b", dot: "#ef4444" },
}

const statusOptions: Array<{ value: QuoteRequest["status"] | "todas"; label: string }> = [
  { value: "todas",       label: "Todas" },
  { value: "nuevo",       label: "Nuevo" },
  { value: "en_revision", label: "En revisión" },
  { value: "enviado",     label: "Enviado" },
  { value: "aceptado",    label: "Aceptado" },
  { value: "rechazado",   label: "Rechazado" },
  { value: "cancelado",   label: "Cancelado" },
]

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
}
function diasHasta(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

type Props = {
  requests: QuoteRequest[]
  relacionMap: Record<string, string>
}

export function DashboardClient({ requests, relacionMap }: Props) {
  const [q, setQ] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<QuoteRequest["status"] | "todas">('todas')

  const filtered = requests
    .filter(r => selectedStatus === 'todas' || r.status === selectedStatus)
    .filter(r => {
      if (!q.trim()) return true
      const search = q.toLowerCase()
      return [r.requester_name, r.requester_email, r.origin, r.destination, r.requester_phone]
        .some(f => f?.toLowerCase().includes(search))
    })

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* TOOLBAR */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Solicitudes</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {/* BUSCADOR REACTIVO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 14px', width: 280 }}>
          <Search style={{ width: 14, height: 14, color: '#9ca3af', flexShrink: 0 }} />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar cliente, ciudad, email..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#374151', fontFamily: "'DM Sans', system-ui, sans-serif" }}
          />
          {q && (
            <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
          )}
        </div>
      </div>

      {/* FILTROS DE ESTADO */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {statusOptions.map(opt => {
          const isActive = selectedStatus === opt.value
          const count = opt.value === 'todas' ? requests.length : requests.filter(r => r.status === opt.value).length
          return (
            <button
              key={opt.value}
              onClick={() => setSelectedStatus(opt.value)}
              style={{
                fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isActive ? '#111827' : '#f3f4f6',
                color: isActive ? '#fff' : '#6b7280',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
              <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.6 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* TABLA */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            {['Cliente', 'Ruta', 'Relación', 'Fecha viaje', 'Precio', 'Estado', 'Recibida', ''].map((h, i) => (
              <th key={i} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 44, height: 44, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Inbox style={{ width: 20, height: 20, color: '#d1d5db' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', margin: 0 }}>Sin resultados</p>
                  <p style={{ fontSize: 12, color: '#d1d5db', margin: 0 }}>
                    {q ? `No hay solicitudes que coincidan con "${q}"` : 'Prueba con otro filtro'}
                  </p>
                </div>
              </td>
            </tr>
          ) : filtered.map((r, idx) => {
            const dias = diasHasta(r.trip_date)
            const urgente = dias >= 0 && dias <= 7 && !['aceptado', 'cancelado', 'rechazado'].includes(r.status)
            const rel = relacionMap[r.requester_email]
            const relCfg = rel ? relacionConfig[rel] : null
            const sCfg = statusConfig[r.status]
            const precio = r.final_price ?? r.estimated_price
            const isLast = idx === filtered.length - 1

            return (
              <tr key={r.id} style={{
                borderBottom: isLast ? 'none' : '1px solid #f9fafb',
                background: urgente ? '#fffdf0' : 'transparent',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = urgente ? '#fffbeb' : '#fafafa')}
                onMouseLeave={e => (e.currentTarget.style.background = urgente ? '#fffdf0' : 'transparent')}
              >
                {/* Cliente */}
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                        {r.requester_name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{r.requester_name}</span>
                        {urgente && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#b45309', borderRadius: 4, padding: '1px 5px' }}>⚡ {dias}d</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{r.requester_email}</p>
                    </div>
                  </div>
                </td>

                {/* Ruta */}
                <td style={{ padding: '14px 20px' }}>
                  <p style={{ fontSize: 13, color: '#374151', fontWeight: 500, margin: 0, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.origin?.split(',')[0]}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    → {r.destination?.split(',')[0]}
                  </p>
                </td>

                {/* Relación */}
                <td style={{ padding: '14px 20px' }}>
                  {relCfg ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: relCfg.color, fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: relCfg.dot, flexShrink: 0 }} />
                      {relCfg.label}
                    </span>
                  ) : <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>}
                </td>

                {/* Fecha viaje */}
                <td style={{ padding: '14px 20px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: urgente ? '#b45309' : '#374151', margin: 0 }}>
                    {fmtShort(r.trip_date)}
                  </p>
                  {urgente && <p style={{ fontSize: 11, color: '#f59e0b', margin: '2px 0 0' }}>en {dias} día{dias !== 1 ? 's' : ''}</p>}
                </td>

                {/* Precio */}
                <td style={{ padding: '14px 20px' }}>
                  {precio ? (
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                      {precio.toLocaleString('es-ES')} €
                    </span>
                  ) : <span style={{ fontSize: 12, color: '#e5e7eb' }}>—</span>}
                </td>

                {/* Estado */}
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                    background: sCfg.bg, color: sCfg.color,
                    border: `1px solid ${sCfg.dot}33`,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: sCfg.dot }} />
                    {sCfg.label}
                  </span>
                </td>

                {/* Recibida */}
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{fmt(r.created_at)}</span>
                </td>

                {/* Abrir */}
                <td style={{ padding: '14px 20px' }}>
                  <Link href={`/dashboard/solicitudes/${r.id}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 12, fontWeight: 600, color: '#111827', textDecoration: 'none',
                    background: '#f3f4f6', borderRadius: 6, padding: '5px 10px',
                    whiteSpace: 'nowrap',
                  }}>
                    Abrir <ChevronRight style={{ width: 12, height: 12 }} />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}