import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { ADMIN_EMAIL } from "@/lib/admin"

/**
 * Endpoint de diagnóstico para probar la impersonation
 * Visita: /api/admin/test-impersonate en tu navegador (cuando estés logueado como admin)
 */
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

    const diagnostics: any = {
      step: "inicio",
      errors: [],
      warnings: [],
      info: {},
    }

    // 1. Verificar usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      diagnostics.errors.push("Error al obtener usuario: " + userError.message)
      diagnostics.step = "error_auth"
      return NextResponse.json(diagnostics)
    }

    if (!user) {
      diagnostics.errors.push("No hay usuario autenticado")
      diagnostics.step = "no_user"
      return NextResponse.json(diagnostics)
    }

    diagnostics.info.user = {
      id: user.id,
      email: user.email,
    }
    diagnostics.step = "user_ok"

    // 2. Verificar si es admin
    const adminEmail = ADMIN_EMAIL
    diagnostics.info.adminEmail = adminEmail
    diagnostics.info.isAdmin = user.email === adminEmail

    if (user.email !== adminEmail) {
      diagnostics.warnings.push(`Usuario ${user.email} no es admin (esperado: ${adminEmail})`)
    }

    // 3. Verificar que existe la tabla admin_sessions
    const { data: tables, error: tablesError } = await supabase
      .from("admin_sessions")
      .select("id")
      .limit(0)

    if (tablesError) {
      diagnostics.errors.push("Tabla admin_sessions no existe o no hay permisos: " + tablesError.message)
      diagnostics.step = "error_table"
      return NextResponse.json(diagnostics)
    }

    diagnostics.step = "table_ok"

    // 4. Verificar que existe la tabla companies
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name, email")
      .limit(5)

    if (companiesError) {
      diagnostics.errors.push("Error al leer companies: " + companiesError.message)
      return NextResponse.json(diagnostics)
    }

    diagnostics.info.companiesCount = companies?.length || 0
    diagnostics.info.companies = companies || []
    diagnostics.step = "companies_ok"

    // 5. Intentar insertar una sesión de prueba
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    const testCompanyId = companies?.[0]?.id

    if (!testCompanyId) {
      diagnostics.warnings.push("No hay empresas para hacer test de insert")
      return NextResponse.json(diagnostics)
    }

    const { data: insertData, error: insertError } = await supabase
      .from("admin_sessions")
      .insert({
        admin_user_id: user.id,
        impersonated_company_id: testCompanyId,
        expires_at: expiresAt.toISOString(),
      })
      .select()

    if (insertError) {
      diagnostics.errors.push("Error al insertar sesión de prueba: " + insertError.message)
      diagnostics.info.insertError = {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      }
      diagnostics.step = "error_insert"
      return NextResponse.json(diagnostics)
    }

    diagnostics.step = "insert_ok"
    diagnostics.info.insertedSession = insertData

    // 6. Limpiar la sesión de prueba
    await supabase
      .from("admin_sessions")
      .delete()
      .eq("admin_user_id", user.id)

    diagnostics.step = "cleanup_ok"
    diagnostics.info.status = "✅ TODO FUNCIONA CORRECTAMENTE"

    return NextResponse.json(diagnostics, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({
      step: "exception",
      errors: ["Excepción: " + err.message],
      stack: err.stack,
    }, { status: 500 })
  }
}
