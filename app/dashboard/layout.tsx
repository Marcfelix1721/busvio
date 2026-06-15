import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

/**
 * Layout único del dashboard: renderiza el sidebar UNA vez y envuelve a todas
 * las sub-páginas (antes cada página pintaba su propio sidebar/top-bar → §4.2).
 *
 * Excepción: si la empresa aún no terminó el onboarding, el wizard se muestra a
 * pantalla completa (sin chrome), así que devolvemos los hijos sin el shell.
 * La autorización real de datos la sigue haciendo cada página + RLS; aquí solo
 * decidimos el chrome.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  // ¿Onboarding sin terminar? → wizard a pantalla completa, sin sidebar.
  const companyId = await getCompanyIdServer(supabase, session.user.id)
  if (companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("onboarding_completado")
      .eq("id", companyId)
      .maybeSingle()
    if (company && company.onboarding_completado === false) {
      return <>{children}</>
    }
  }

  return <DashboardShell email={session.user.email}>{children}</DashboardShell>
}
