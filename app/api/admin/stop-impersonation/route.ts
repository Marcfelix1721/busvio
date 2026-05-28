import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Eliminar todas las sesiones de impersonation del admin
    await supabase
      .from("admin_sessions")
      .delete()
      .eq("admin_user_id", user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error en stop-impersonation:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
