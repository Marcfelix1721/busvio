'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegistroPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir a la landing con el modal de demo
    router.push('/')
  }, [router])

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f4", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <p style={{ color: "#6b7280", fontSize: 14 }}>Redirigiendo...</p>
    </div>
  )
}
