import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { staff_id, email, password, company_id } = await req.json()

    if (!staff_id || !email || !password || !company_id) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, nombre')
      .eq('id', staff_id)
      .eq('company_id', company_id)
      .single()

    if (staffError || !staffData) {
      return NextResponse.json({ error: 'Conductor no encontrado: ' + staffError?.message }, { status: 404 })
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'conductor',
        staff_id,
        company_id,
        nombre: staffData.nombre,
      }
    })

    if (authError) {
      // Devolver el error exacto de Supabase
      return NextResponse.json({ 
        error: authError.message,
        code: authError.status,
        details: JSON.stringify(authError)
      }, { status: 400 })
    }

    await supabase
      .from('staff')
      .update({ user_id: authData.user.id, email })
      .eq('id', staff_id)

    return NextResponse.json({ success: true, user_id: authData.user.id })

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      details: JSON.stringify(error)
    }, { status: 500 })
  }
}