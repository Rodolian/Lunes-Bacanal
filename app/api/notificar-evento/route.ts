import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getNewEventEmailHtml } from "@/lib/emailTemplates";
import { getMailTransporter } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { eventoId, votantes, fechasPropuestas, opcionesTipo } = await req.json();

    if (!eventoId || !votantes || !Array.isArray(votantes) || votantes.length === 0) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios (eventoId, votantes)." },
        { status: 400 }
      );
    }

    const headersList = headers();
    const origin = headersList.get("origin") || "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || "http://localhost:3000";
    const logoUrl = `${baseUrl}/logo.jpg`;
    const votingUrl = `${baseUrl}/votar/${eventoId}`;

    const senderEmail = process.env.EMAIL_USER || "lunesbacanal@gmail.com";
    const transporter = getMailTransporter();

    const emailHtml = getNewEventEmailHtml(baseUrl, logoUrl, votingUrl, fechasPropuestas, opcionesTipo);

    // MODO DEPURACIÓN: enviar únicamente a adrianrodero@gmail.com
    const debugRecipients = ["adrianrodero@gmail.com"];

    const mailOptions = {
      from: senderEmail,
      to: debugRecipients,
      subject: `Nueva propuesta de Lunes de Bacanal`,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, messageId: info.messageId, recipients: debugRecipients });
  } catch (err: unknown) {
    console.error("Unexpected notification API error:", err);
    const errorMsg = err instanceof Error ? err.message : "Ocurrió un error inesperado al enviar las notificaciones.";
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
