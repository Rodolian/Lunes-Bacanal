import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { headers } from "next/headers";
import { getVerificationEmailHtml } from "@/lib/emailTemplates";

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
    const emailHtml = getVerificationEmailHtml(logoUrl, verificationLink);

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
