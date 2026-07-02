import { NextRequest, NextResponse } from "next/server"
import { resendFrom, getResendClient } from "@/lib/resend"

export async function POST(req: NextRequest) {
  try {
    const { to, nombre, pdfBase64, numeroPresupuesto, origen, destino, fecha, precio, empresaNombre, iva, baseImponible, importeIva } = await req.json()

    if (!to || !pdfBase64) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 })
    }

    const resend = getResendClient()
    if (!resend) {
      console.error("RESEND_API_KEY ausente — presupuesto no enviado")
      return NextResponse.json({ error: "Servicio de email no configurado" }, { status: 500 })
    }

    const { error } = await resend.emails.send({
      from: resendFrom(empresaNombre),
      to: [to],
      subject: `Tu presupuesto de transporte Nº ${numeroPresupuesto}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e3a5f; padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🚌 ${empresaNombre}</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0;">Gestión de transporte discrecional</p>
          </div>
          <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e293b; margin-top: 0;">Hola ${nombre},</h2>
            <p style="color: #475569;">Gracias por contactar con nosotros. Adjuntamos tu presupuesto personalizado.</p>
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1e3a5f;">
              <h3 style="margin: 0 0 12px 0; color: #1e3a5f;">Detalles del viaje</h3>
              <p style="margin: 4px 0; color: #475569;"><strong>Origen:</strong> ${origen}</p>
              <p style="margin: 4px 0; color: #475569;"><strong>Destino:</strong> ${destino}</p>
              <p style="margin: 4px 0; color: #475569;"><strong>Fecha:</strong> ${fecha}</p>
              ${baseImponible ? `
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
              <p style="margin: 4px 0; color: #475569;"><strong>Base imponible:</strong> ${baseImponible} €</p>
              <p style="margin: 4px 0; color: #475569;"><strong>IVA (${iva}%):</strong> ${importeIva} €</p>
              ` : ""}
              <p style="margin: 12px 0 0 0; color: #1e3a5f; font-size: 20px; font-weight: bold;">Total (IVA inc.): ${precio} €</p>
            </div>
            <p style="color: #475569;">El presupuesto detallado está adjunto en PDF. Tiene una validez de <strong>30 días</strong>.</p>
            <p style="color: #475569;">Para aceptar o consultar cualquier duda, responde a este email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">${empresaNombre} — Gestión de transporte discrecional</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `presupuesto-${numeroPresupuesto}.pdf`,
          content: pdfBase64,
        },
      ],
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ error: "Error al enviar el email" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error enviar-presupuesto:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}