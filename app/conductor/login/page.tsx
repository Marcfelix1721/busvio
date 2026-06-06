'use client'

import { useState } from 'react'
import { FlotaFlyLogo } from '@/components/FlotaFlyLogo'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ConductorLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    // Verificar que es conductor
    const role = data.user?.user_metadata?.role
    if (role !== 'conductor') {
      await supabase.auth.signOut()
      setError('Esta área es solo para conductores')
      setLoading(false)
      return
    }

    router.push('/conductor')
  }

  const s = {
    page: {
      minHeight: '100vh',
      background: '#111827',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: 24,
    },
    card: {
      background: '#fff',
      borderRadius: 20,
      padding: '40px 36px',
      width: '100%',
      maxWidth: 400,
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 32,
    },
    title: { fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 },
    subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
    label: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' },
    input: {
      width: '100%', height: 44, border: '1px solid #e5e7eb', borderRadius: 10,
      padding: '0 14px', fontSize: 14, background: '#f9fafb',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      boxSizing: 'border-box' as const, outline: 'none',
    },
    btn: {
      width: '100%', height: 46, background: '#111827', color: '#fff',
      border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
      cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif",
      marginTop: 8,
    },
    error: {
      background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
      padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16,
    },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <FlotaFlyLogo size={40} />
          <div>
            <p style={{ ...s.title, fontSize: 18 }}>FlotaFly</p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Portal del conductor</p>
          </div>
        </div>

        <p style={s.title}>Bienvenido</p>
        <p style={s.subtitle}>Accede con tus credenciales</p>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={s.error}>{error}</div>}

          <div>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div>
            <label style={s.label}>Contraseña</label>
            <input
              style={s.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <button style={s.btn} onClick={handleLogin} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 24 }}>
          ¿Problemas para acceder? Contacta con tu empresa
        </p>
      </div>
    </div>
  )
}