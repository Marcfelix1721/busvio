'use client'

import { useEffect, useState } from 'react'

export function MapaRuta({ origin, destination, stops = [] }: { origin: string; destination: string; stops?: string[] }) {
  const [mapUrl, setMapUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const stopsKey = stops.join('|')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/mapa-ruta?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&stops=${encodeURIComponent(JSON.stringify(stops))}`
        )
        if (!res.ok) { setError(true); return }
        const data = await res.json()
        setMapUrl(data.mapUrl)
      } catch {
        setError(true)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, stopsKey])

  if (error) return null

  if (!mapUrl) return (
    <div className="w-full h-[220px] bg-[#f3f4f6] rounded-xl border border-[#e5e7eb] flex items-center justify-center mb-4">
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-[#9ca3af] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-[#9ca3af]">Cargando mapa...</p>
      </div>
    </div>
  )

  return (
    <div className="rounded-xl overflow-hidden border border-[#e5e7eb] mb-4" style={{ height: "220px" }}>
      <img
        src={mapUrl}
        alt={`Ruta de ${origin} a ${destination}`}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  )
}
