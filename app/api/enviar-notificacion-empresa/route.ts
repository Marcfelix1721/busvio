import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@supabase/supabase-js"
import { RESEND_FROM, getResendClient } from "@/lib/resend"

export async function POST(req: NextRequest) {
  try {
    const {
      company_id,
      requester_name,
      requester_email,
      origin,
      destination,
      trip_date,
      passengers,
      service_type,
    } = await req.json()

    if (!company_id || !requester_name) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 })
    }

    // Obtener datos de la empresa (service role: lee email/notification_emails
    // server-side, sin depender de los permisos de columna de anon tras el revoke).
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name, email, color_primario, notification_emails")
      .eq("id", company_id)
      .single()

    if (companyError || !company) {
      console.error("Error al obtener empresa:", companyError)
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
    }

    // Determinar a quién enviar: notification_emails si existe, si no el email principal
    const recipientEmails = company.notification_emails && company.notification_emails.length > 0
      ? company.notification_emails
      : [company.email]

    if (!recipientEmails || recipientEmails.length === 0) {
      console.error("No hay emails a los que enviar")
      return NextResponse.json({ error: "No hay emails configurados para notificaciones" }, { status: 400 })
    }

    const color = company.color_primario || "#1e3a5f"

    const resend = getResendClient()
    if (!resend) {
      console.error("RESEND_API_KEY ausente — notificación no enviada")
      return NextResponse.json({ error: "Servicio de email no configurado" }, { status: 500 })
    }

    const { error } = await resend.emails.send({
      from: RESEND_FROM,
      to: recipientEmails,
      subject: `Nueva solicitud de presupuesto — ${requester_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">

                  <!-- Header -->
                  <tr>
                    <td style="background-color: ${color}; padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">
                        🚌 ${company.name}
                      </h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">
                        Nueva solicitud de presupuesto
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 24px 0; font-size: 16px; color: #111827; line-height: 1.6;">
                        Hola,
                      </p>
                      <p style="margin: 0 0 32px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                        Has recibido una nueva solicitud de presupuesto. Aquí están los detalles:
                      </p>

                      <!-- Details Card -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 32px;">
                        <tr>
                          <td style="padding: 24px;">
                            <h3 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 0.05em;">
                              Detalles de la solicitud
                            </h3>

                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                                  Cliente:
                                </td>
                                <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">
                                  ${requester_name}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                                  Email:
                                </td>
                                <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">
                                  ${requester_email}
                                </td>
                              </tr>
                              <tr>
                                <td colspan="2" style="padding: 12px 0 8px 0;">
                                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                                  Origen:
                                </td>
                                <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">
                                  ${origin}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                                  Destino:
                                </td>
                                <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">
                                  ${destination}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                                  Fecha:
                                </td>
                                <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">
                                  ${trip_date}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                                  Pasajeros:
                                </td>
                                <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">
                                  ${passengers}
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                                  Tipo de servicio:
                                </td>
                                <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">
                                  ${service_type}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 8px 0 24px 0;">
                            <a href="https://flotafly.com/dashboard" style="display: inline-block; background-color: ${color}; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 15px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s;">
                              Ver solicitud en el dashboard
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
                        Responde lo antes posible para mantener a tus clientes satisfechos 😊
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6;">
                        ${company.name} — Sistema de gestión de presupuestos FlotaFly<br>
                        Este email se envía automáticamente cuando recibes una nueva solicitud
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ error: "Error al enviar el email" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error enviar-notificacion-empresa:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
