import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(req: NextRequest) {
  try {
    const { company_id } = await req.json()

    if (!company_id) {
      return NextResponse.json({ error: "Falta company_id" }, { status: 400 })
    }

    // Crear cliente de Supabase con cookies para obtener el usuario actual
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

    // Verificar que el usuario actual sea el admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const adminEmail = process.env.ADMIN_EMAIL || "marcfelixkrayer@gmail.com"
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: "No autorizado - solo admin" }, { status: 403 })
    }

    // Verificar que la empresa existe
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
    }

    // Limpiar sesiones expiradas del admin
    await supabase
      .from("admin_sessions")
      .delete()
      .eq("admin_user_id", user.id)

    // Crear nueva sesión de impersonation
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 hora de duración

    const { error: sessionError } = await supabase
      .from("admin_sessions")
      .insert({
        admin_user_id: user.id,
        impersonated_company_id: company_id,
        expires_at: expiresAt.toISOString(),
      })

    if (sessionError) {
      console.error("Error creando sesión de admin:", sessionError)
      return NextResponse.json({ error: "Error al crear sesión de impersonation" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error en impersonate:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
