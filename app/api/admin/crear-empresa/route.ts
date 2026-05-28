import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    // Verificar que el usuario sea admin
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { name, email, password, slug, phone, cif, address } = await req.json()

    if (!name || !email || !password || !slug) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 })
    }

    // Crear cliente con Service Role para usar admin API
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

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error("Error creando usuario:", authError)
      return NextResponse.json({ error: "Error al crear usuario: " + authError.message }, { status: 500 })
    }

    // 2. Crear empresa en tabla companies
    const { error: companyError } = await supabaseAdmin.from("companies").insert({
      id: authData.user.id,
      name,
      email,
      slug,
      phone: phone || null,
      cif: cif || null,
      address: address || null,
    })

    if (companyError) {
      console.error("Error creando empresa:", companyError)
      // Intentar eliminar el usuario creado
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: "Error al crear empresa: " + companyError.message }, { status: 500 })
    }

    // 3. Crear company_settings
    const { error: settingsError } = await supabaseAdmin.from("company_settings").insert({
      company_id: authData.user.id,
      margen_beneficio: 20,
      iva: 10,
      precio_minimo_servicio: 0,
    })

    if (settingsError) {
      console.error("Error creando settings:", settingsError)
    }

    // 4. Crear pricing_settings
    const { error: pricingError } = await supabaseAdmin.from("pricing_settings").insert({
      company_id: authData.user.id,
    })

    if (pricingError) {
      console.error("Error creando pricing_settings:", pricingError)
    }

    return NextResponse.json({ ok: true, company_id: authData.user.id })
  } catch (err) {
    console.error("Error en crear-empresa:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
