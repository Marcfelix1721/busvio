import { QuoteForm } from "@/components/forms/QuoteForm"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: company } = await supabase
    .from("companies")
    .select("name, active")
    .eq("slug", slug)
    .maybeSingle()

  // Empresa desactivada: no acepta solicitudes
  if (company && company.active === false) {
    return (
      <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'DM Sans', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #eef0f3", borderRadius: 18, boxShadow: "0 1px 3px rgba(16,24,40,0.06)", padding: "48px 40px", maxWidth: 460, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 26 }}>🚫</div>
          <h1 style={{ fontSize: 21, fontWeight: 700, color: "#111827", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
            Esta empresa no está aceptando solicitudes en este momento
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
            Vuelve a intentarlo más tarde o ponte en contacto directamente con {company.name || "la empresa"}.
          </p>
        </div>
      </main>
    )
  }

  return <QuoteForm slug={slug} />
}
