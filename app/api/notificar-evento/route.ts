import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { headers } from "next/headers";
import { getNewEventEmailHtml } from "@/lib/emailTemplates";

export async function POST(req: NextRequest) {
  try {
    const { eventoId, votantes } = await req.json();

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

    const senderEmail = process.env.EMAIL_USER;

    // Configure Nodemailer transporter with Gmail and OAuth2
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: senderEmail,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
      },
    } as SMTPTransport.Options);

    const emailHtml = getNewEventEmailHtml(baseUrl, logoUrl, votingUrl);

    // Send email using Nodemailer
    const mailOptions = {
      from: senderEmail,
      to: senderEmail, // Send to self to satisfy SMTP rules
      bcc: votantes,   // BCC all voters for privacy
      subject: `Nueva propuesta de Lunes de Bacanal`,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (err: unknown) {
    console.error("Unexpected notification API error:", err);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al enviar las notificaciones." },
      { status: 500 }
    );
  }
}
