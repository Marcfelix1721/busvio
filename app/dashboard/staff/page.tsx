import { redirect } from "next/navigation"
import { getCompanyIdServer } from "@/lib/get-company-id-server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
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

  const companyId = await getCompanyIdServer(supabase, user.id)
  if (!companyId) redirect("/dashboard")

  const { data: staffData } = await supabase
    .from("staff").select("*")
    .eq("company_id", companyId)
    .order("rol").order("nombre")

  return (
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
      <StaffManager companyId={companyId} initialStaff={staffData ?? []} />
    </div>
  )
}