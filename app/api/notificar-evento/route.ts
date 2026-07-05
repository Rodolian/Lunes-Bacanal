import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { headers } from "next/headers";

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

    // Send email using Nodemailer
    const mailOptions = {
      from: senderEmail,
      to: senderEmail, // Send to self to satisfy SMTP rules
      bcc: votantes,   // BCC all voters for privacy
      subject: `Nueva propuesta de Lunes de Bacanal`,
      html: `
        <div style="background-color: #020617; color: #f8fafc; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${logoUrl}" alt="Lunes Bacanal" style="width: 48px; height: 48px; border-radius: 12px; display: inline-block; object-fit: cover;" />
            <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 16px; margin-bottom: 4px; letter-spacing: -0.025em;">
              Lunes de Bacanal
            </h1>
          </div>
          
          <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0; margin-top: 0; margin-bottom: 24px; text-align: center;">
              Alguien ha convocado un Lunes de Bacanal. Vota qué día te viene bien antes de la fecha límite.
            </p>
            <div style="text-align: center;">
              <a href="${votingUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; transition: background-color 0.2s;">
                Votar Fechas
              </a>
            </div>
          </div>
          
          <div style="border-top: 1px solid #1e293b; padding-top: 16px;">
            <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.5; text-align: center;">
              Si el botón superior no funciona, copia y pega este enlace en tu navegador:<br />
              <a href="${votingUrl}" style="color: #6366f1; word-break: break-all;">${votingUrl}</a>
            </p>
          </div>
        </div>
      `,
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
