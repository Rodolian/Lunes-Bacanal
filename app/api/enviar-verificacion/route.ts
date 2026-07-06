import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Falta email." }, { status: 400 });
    }

    // 1. Generar el enlace de verificación de Firebase Auth
    const verificationLink = await adminAuth.generateEmailVerificationLink(email);

    // 2. Configurar base de URL y remitente
    const headersList = headers();
    const origin = headersList.get("origin") || "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || "http://localhost:3000";
    const logoUrl = `${baseUrl}/logo.jpg`;

    const senderEmail = process.env.EMAIL_USER;
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

    // 3. HTML del correo sin emojis y con tono seco
    const emailHtml = `
      <div style="background-color: #020617; color: #f8fafc; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${logoUrl}" alt="Lunes Bacanal" style="width: 48px; height: 48px; border-radius: 12px; display: inline-block; object-fit: cover;" />
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 16px; margin-bottom: 4px; letter-spacing: -0.025em;">
            Lunes de Bacanal
          </h1>
        </div>
        
        <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0; margin-top: 0; margin-bottom: 24px; text-align: center;">
            Confirma tu dirección de correo para activar tu cuenta.
          </p>
          <div style="text-align: center;">
            <a href="${verificationLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
              Confirmar Correo
            </a>
          </div>
        </div>
        
        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center;">
          <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.5;">
            Si el botón no funciona, abre este enlace en tu navegador:<br />
            <a href="${verificationLink}" style="color: #6366f1; word-break: break-all;">${verificationLink}</a>
          </p>
        </div>
      </div>
    `;

    // Enviar el correo
    await transporter.sendMail({
      from: senderEmail,
      to: email,
      subject: "Confirma tu cuenta de Lunes de Bacanal",
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error generating or sending verification email:", err);
    const msg = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
