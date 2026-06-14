import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient as createServerClient } from "@supabase/supabase-js"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const {
      company_id,
      conductor_email,
      conductor_nombre,
      requester_name,
      origin,
      destination,
      trip_date,
      departure_time,
      vehiculo,
      duracion,
    } = await req.json()

    if (!conductor_email) {
      // El conductor no tiene email: no es un error bloqueante para la asignación
      return NextResponse.json({ ok: false, skipped: "sin_email" })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: company } = await supabase
      .from("companies")
      .select("name, color_primario")
      .eq("id", company_id)
      .maybeSingle()

    const color = company?.color_primario || "#1e3a5f"
    const empresaNombre = company?.name || "FlotaFly"
    const fechaFmt = trip_date
      ? new Date(trip_date).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : "—"

    const row = (label: string, value: string) => `
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">${label}</td>
        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">${value}</td>
      </tr>`

    const { error } = await resend.emails.send({
      from: `${empresaNombre} <onboarding@resend.dev>`,
      to: [conductor_email],
      subject: `Nuevo servicio asignado para el ${fechaFmt}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; padding: 40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
                <tr>
                  <td style="background-color: ${color}; padding: 32px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">🚌 Nuevo servicio asignado</h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">${empresaNombre}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 24px 0; font-size: 16px; color: #111827; line-height: 1.6;">Hola ${conductor_nombre || ""},</p>
                    <p style="margin: 0 0 28px 0; font-size: 15px; color: #374151; line-height: 1.6;">Se te ha asignado un nuevo servicio. Estos son los detalles:</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 32px;">
                      <tr><td style="padding: 24px;">
                        <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 0.05em;">Detalles del servicio</h3>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          ${row("Cliente", requester_name || "—")}
                          ${row("Ruta", `${origin || "—"} → ${destination || "—"}`)}
                          ${row("Fecha", fechaFmt)}
                          ${row("Hora de salida", departure_time || "—")}
                          ${row("Vehículo", vehiculo || "Por asignar")}
                          ${row("Duración estimada", duracion || "—")}
                        </table>
                      </td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center" style="padding: 8px 0 24px 0;">
                        <a href="https://flotafly.com/conductor/login" style="display: inline-block; background-color: ${color}; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 15px; font-weight: 700;">Ver en mi portal</a>
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6;">
                      ${empresaNombre} — Notificación automática de servicio
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error("Resend error (notificar-conductor):", error)
      return NextResponse.json({ error: "Error al enviar el email" }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error notificar-conductor:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
