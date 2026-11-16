import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { headers } from "next/headers";
import { getPasswordResetEmailHtml } from "@/lib/emailTemplates";
import { getMailTransporter } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Debes indicar un correo electrónico." }, { status: 400 });
    }

    // 1. Generar el enlace de recuperación de contraseña de Firebase Auth
    const resetLink = await adminAuth.generatePasswordResetLink(email.trim());

    // 2. Configurar URL base y remitente
    const headersList = headers();
    const origin = headersList.get("origin") || "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || "http://localhost:3000";
    const logoUrl = `${baseUrl}/logo.jpg`;

    const senderEmail = process.env.EMAIL_USER || "lunesbacanal@gmail.com";
    const transporter = getMailTransporter();

    // 3. Generar HTML del correo con estilo de la aplicación
    const emailHtml = getPasswordResetEmailHtml(logoUrl, resetLink);

    // 4. Enviar el correo
    await transporter.sendMail({
      from: senderEmail,
      to: email.trim(),
      subject: "Restablecer contraseña de Lunes de Bacanal",
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error generating or sending password reset email:", err);
    const firebaseError = err as { code?: string; message?: string };

    if (firebaseError.code === "auth/user-not-found") {
      return NextResponse.json(
        { error: "No existe ninguna cuenta registrada con ese correo electrónico.", code: "auth/user-not-found" },
        { status: 404 }
      );
    }

    if (firebaseError.code === "auth/invalid-email") {
      return NextResponse.json(
        { error: "El formato del correo electrónico no es válido.", code: "auth/invalid-email" },
        { status: 400 }
      );
    }

    const msg = err instanceof Error ? err.message : "Error inesperado al enviar el correo de recuperación.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
