import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { nombre, empresa, email, telefono } = await req.json()

    if (!nombre || !email) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 })
    }

    const adminEmail = process.env.ADMIN_EMAIL || "marcfelixkrayer@gmail.com"

    const { error } = await resend.emails.send({
      from: "Busvio Demo <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `Nueva solicitud de demo — ${nombre}`,
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
                    <td style="background-color: #111827; padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">
                        🚌 Nueva solicitud de demo
                      </h1>
                      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">
                        Alguien quiere conocer Busvio
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 24px 0; font-size: 16px; color: #111827; line-height: 1.6;">
                        Has recibido una nueva solicitud de demo desde la landing page.
                      </p>

                      <!-- Details Card -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 32px;">
                        <tr>
                          <td style="padding: 24px;">
                            <h3 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">
                              Datos del interesado
                            </h3>

                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                                  Nombre:
                                </td>
                                <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">
                                  ${nombre}
                                </td>
                              </tr>
                              ${empresa ? `
                              <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                                  Empresa:
                                </td>
                                <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">
                                  ${empresa}
                                </td>
                              </tr>
                              ` : ''}
                              <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                                  Email:
                                </td>
                                <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">
                                  <a href="mailto:${email}" style="color: #1e3a5f; text-decoration: none;">${email}</a>
                                </td>
                              </tr>
                              ${telefono ? `
                              <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #6b7280; font-weight: 600;">
                                  Teléfono:
                                </td>
                                <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 500; text-align: right;">
                                  <a href="tel:${telefono}" style="color: #1e3a5f; text-decoration: none;">${telefono}</a>
                                </td>
                              </tr>
                              ` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
                        Contacta con ${nombre} lo antes posible para cerrar la venta 🚀
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6;">
                        Busvio — Sistema de gestión de presupuestos<br>
                        Este email se envía automáticamente cuando alguien solicita una demo
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
    console.error("Error solicitar-demo:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
