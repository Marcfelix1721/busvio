'use client'

import Link from 'next/link'
import { FlotaFlyWordmark } from '@/components/FlotaFlyLogo'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function OnboardingPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [companyName, setCompanyName] = useState('')
  const [slug, setSlug] = useState('')

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData) return

      const { data: company } = await supabase
        .from('companies')
        .select('name, slug')
        .eq('id', userData.company_id)
        .single()

      if (company) {
        setCompanyName(company.name)
        setSlug(company.slug)
      }
    }
    getData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg text-center">
        {/* Icono éxito */}
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          ¡Bienvenido a <FlotaFlyWordmark />{companyName ? `, ${companyName}` : ''}!
        </h1>
        <p className="text-gray-500 text-lg mb-10">
          Tu cuenta está lista. Ahora configura tu empresa para empezar a enviar presupuestos profesionales.
        </p>

        {/* Pasos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 text-left space-y-4">
          {[
            { num: '1', title: 'Configura tu empresa', desc: 'Añade tu logo, color corporativo y datos fiscales.' },
            { num: '2', title: 'Ajusta los precios', desc: 'Introduce el coste de combustible, conductor y márgenes.' },
            { num: '3', title: 'Comparte tu enlace', desc: slug ? `flotafly.com/${slug}` : 'Tu enlace personalizado estará listo en segundos.' },
          ].map((step) => (
            <div key={step.num} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {step.num}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="text-sm text-gray-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/ajustes"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Configurar mi empresa →
          </Link>
          <Link
            href="/dashboard"
            className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Ir al dashboard directamente
          </Link>
        </div>

        {slug && (
          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-500 mb-1">Tu enlace para clientes</p>
            <p className="text-sm font-mono font-semibold text-blue-700">
              flotafly.com/{slug}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}