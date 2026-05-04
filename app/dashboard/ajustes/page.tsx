import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
import { SettingsForm } from "@/components/dashboard/SettingsForm"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export default async function AjustesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: userData } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!userData?.company_id) redirect("/dashboard")

  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", userData.company_id)
    .maybeSingle()

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", userData.company_id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="bg-[#1e3a5f] px-6 py-4 flex justify-between items-center">
        <div className="text-white font-semibold">🚌 Busvio</div>
        <LogoutButton />
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/dashboard" className="text-sm text-gray-500 inline-flex items-center gap-1 mb-6">
          <ArrowLeft className="h-4 w-4" /> Volver al panel
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">⚙️ Ajustes de la empresa</h1>
        <SettingsForm settings={settings} companyId={userData.company_id} company={company} />
      </div>
    </div>
  )
}