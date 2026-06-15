import { redirect } from "next/navigation"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { StaffManager } from "@/components/dashboard/StaffManager"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { COLORS, SPACE, FONT_DISPLAY, FONT_BODY } from "@/lib/dashboard-ui"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const companyId = await getCompanyIdServer(supabase, user.id)
  if (!companyId) redirect("/dashboard")

  const { data: staffData } = await supabase
    .from("staff").select("*")
    .eq("company_id", companyId)
    .order("rol").order("nombre")

  return (
    <div style={{ maxWidth: SPACE.pageMax, margin: "0 auto", padding: "32px 32px 64px" }}>
      <Link href="/dashboard/ajustes" style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.textMuted, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, textDecoration: "none" }}>
        <ArrowLeft style={{ width: 14, height: 14 }} /> Volver a Ajustes
      </Link>
      <div style={{ marginBottom: SPACE.section }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: COLORS.navy, letterSpacing: "-0.025em", margin: 0 }}>
          Personal
        </h1>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
          Gestiona conductores, guías y monitores de tu empresa
        </p>
      </div>
      <StaffManager companyId={companyId} initialStaff={staffData ?? []} />
    </div>
  )
}