import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(req: NextRequest) {
  try {
    const response = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ impersonating: false })
    }

    const adminEmail = process.env.ADMIN_EMAIL || "marcfelixkrayer@gmail.com"
    if (user.email !== adminEmail) {
      return NextResponse.json({ impersonating: false })
    }

    // Buscar sesión de impersonation activa
    const { data: session, error: sessionError } = await supabase
      .from("admin_sessions")
      .select("impersonated_company_id, expires_at")
      .eq("admin_user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ impersonating: false })
    }

    return NextResponse.json({
      impersonating: true,
      company_id: session.impersonated_company_id,
      expires_at: session.expires_at,
    })
  } catch (err) {
    console.error("Error en get-impersonation:", err)
    return NextResponse.json({ impersonating: false })
  }
}
