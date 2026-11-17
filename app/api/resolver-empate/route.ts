import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getWinnerEmailHtml } from "@/lib/emailTemplates";
import { getMailTransporter } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventoId,
      fecha_elegida,
      confirmedAttendees,
      allEmails,
      winnerTipo,
    } = body;

    if (!eventoId || !fecha_elegida) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios (eventoId, fecha_elegida)." },
        { status: 400 }
      );
    }

    const headersList = headers();
    const origin = headersList.get("origin") || "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || "http://localhost:3000";
    const logoUrl = `${baseUrl}/logo.jpg`;

    const { html: emailHtml, attachments } = getWinnerEmailHtml(
      baseUrl,
      logoUrl,
      fecha_elegida,
      confirmedAttendees || [],
      winnerTipo || "cena"
    );

    const senderEmail = process.env.EMAIL_USER || "lunesbacanal@gmail.com";
    const transporter = getMailTransporter();

    if (Array.isArray(allEmails) && allEmails.length > 0) {
      await transporter.sendMail({
        from: senderEmail,
        to: senderEmail,
        bcc: allEmails,
        subject: `Bacanal confirmada: ${fecha_elegida}`,
        html: emailHtml,
        attachments,
      });
    }

    return NextResponse.json({
      success: true,
      attendees_count: (confirmedAttendees || []).length,
    });
  } catch (err: unknown) {
    console.error("Resolver empate API error:", err);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al resolver el empate." },
      { status: 500 }
    );
  }
}
