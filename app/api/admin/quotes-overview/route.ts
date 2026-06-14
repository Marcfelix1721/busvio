import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@supabase/supabase-js"
import { ADMIN_EMAIL } from "@/lib/admin"

// Lectura GLOBAL de solicitudes para el panel admin (KPIs/gráfico/actividad).
// Va por service role porque el RLS de quote_requests acota la lectura a la
// empresa dueña y a sus conductores; el admin no encaja en ninguno, así que
// lee aquí tras verificar que el llamante es el superadmin.
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verificar que el llamante es realmente el superadmin
    const token = authHeader.replace(/^Bearer\s+/i, "")
    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(token)
    if (callerErr || !caller || caller.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from("quote_requests")
      .select("id, company_id, status, created_at, updated_at, requester_name, origin, destination, final_price, estimated_price")
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error leyendo quote_requests (admin):", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quotes: data ?? [] })
  } catch (err) {
    console.error("Error en quotes-overview:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
