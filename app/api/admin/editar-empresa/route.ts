import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@supabase/supabase-js"
import { ADMIN_EMAIL } from "@/lib/admin"

export async function POST(req: NextRequest) {
  try {
    // Verificar que el usuario sea admin (mismo patrón que crear-empresa)
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { companyId, name, email, phone, cif, address, active } = await req.json()
    if (!companyId) {
      return NextResponse.json({ error: "Falta el identificador de la empresa" }, { status: 400 })
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

    // Email actual (para detectar cambios)
    const { data: current } = await supabaseAdmin
      .from("companies").select("email").eq("id", companyId).maybeSingle()

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (phone !== undefined) updates.phone = phone || null
    if (cif !== undefined) updates.cif = cif || null
    if (address !== undefined) updates.address = address || null
    if (active !== undefined) updates.active = active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay cambios que guardar" }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin.from("companies").update(updates).eq("id", companyId)
    if (updateError) {
      console.error("Error actualizando empresa:", updateError)
      return NextResponse.json({ error: "Error al actualizar la empresa: " + updateError.message }, { status: 500 })
    }

    // Si el email cambió, actualizar también el acceso (auth.users)
    if (email !== undefined && current && email !== current.email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(companyId, { email })
      if (authError) {
        console.error("Error actualizando email de acceso:", authError)
        return NextResponse.json({ ok: true, warning: "Empresa actualizada, pero no se pudo cambiar el email de acceso: " + authError.message })
      }
    }

    // Expulsión inmediata: al desactivar se banea el acceso (revoca el login y
    // el refresh de sesión); al reactivar se quita el baneo.
    if (active !== undefined) {
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(companyId, {
        ban_duration: active ? "none" : "876000h",
      })
      if (banError) console.error("No se pudo actualizar el baneo de acceso:", banError)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error en editar-empresa:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
