import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    // Verificar que el usuario sea admin
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { company_id } = await req.json()

    if (!company_id) {
      return NextResponse.json({ error: "Falta company_id" }, { status: 400 })
    }

    // Crear cliente con Service Role
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Obtener el email de la empresa
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("email")
      .eq("id", company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
    }

    // Generar magic link para ese usuario
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: company.email,
    })

    if (error) {
      console.error("Error generando magic link:", error)
      return NextResponse.json({ error: "Error al generar sesión" }, { status: 500 })
    }

    // Extraer el token del magic link
    // El magic link tiene formato: http://...#access_token=...&refresh_token=...
    const url = new URL(data.properties.action_link)
    const hash = url.hash.substring(1) // Quitar el #
    const params = new URLSearchParams(hash)
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: "Error al extraer tokens" }, { status: 500 })
    }

    // Devolver los tokens para que el cliente los use
    return NextResponse.json({
      ok: true,
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  } catch (err) {
    console.error("Error en impersonate:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
