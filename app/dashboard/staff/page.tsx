import { redirect } from "next/navigation"
import { FlotaFlyLogo, FlotaFlyWordmark } from "@/components/FlotaFlyLogo"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { LogoutButton } from "@/components/dashboard/LogoutButton"
import { StaffManager } from "@/components/dashboard/StaffManager"
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

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: userData } = await supabase
    .from("users").select("company_id").eq("id", user.id).maybeSingle()
  if (!userData?.company_id) redirect("/dashboard")

  const { data: staffData } = await supabase
    .from("staff").select("*")
    .eq("company_id", userData.company_id)
    .order("rol").order("nombre")

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f4", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: "#111827", padding: "0 1.5rem", height: "56px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, background: "#fff", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FlotaFlyLogo size={19} />
          </div>
          <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600, color: "#fff", fontSize: "0.9375rem" }}><FlotaFlyWordmark flotaColor="#fff" /></span>
        </div>
        <LogoutButton />
      </div>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <Link href="/dashboard/ajustes" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#6b7280", display: "inline-flex", alignItems: "center", gap: "5px", marginBottom: "1.75rem", textDecoration: "none" }}>
          <ArrowLeft style={{ width: "14px", height: "14px" }} /> Volver a Ajustes
        </Link>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "1.375rem", fontWeight: 600, color: "#111827", letterSpacing: "-0.01em", margin: 0 }}>
            Personal
          </h1>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.8125rem", color: "#6b7280", marginTop: "4px" }}>
            Gestiona conductores, guías y monitores de tu empresa
          </p>
        </div>
        <StaffManager companyId={userData.company_id} initialStaff={staffData ?? []} />
      </div>
    </div>
  )
}