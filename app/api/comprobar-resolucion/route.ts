import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getWinnerEmailHtml, getTieEmailHtml } from "@/lib/emailTemplates";
import { getMailTransporter } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventoId,
      winner,
      isTie,
      winnerTipo,
      confirmedAttendees,
      allEmails,
      creatorEmail,
    } = body;

    if (!eventoId) {
      return NextResponse.json({ error: "Falta eventoId." }, { status: 400 });
    }

    const headersList = headers();
    const origin = headersList.get("origin") || "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || "http://localhost:3000";
    const logoUrl = `${baseUrl}/logo.jpg`;

    const senderEmail = process.env.EMAIL_USER || "lunesbacanal@gmail.com";
    const transporter = getMailTransporter();

    if (winner) {
      const { html: emailHtml, attachments } = getWinnerEmailHtml(
        baseUrl,
        logoUrl,
        winner,
        confirmedAttendees || [],
        winnerTipo || "cena"
      );

      if (Array.isArray(allEmails) && allEmails.length > 0) {
        await transporter.sendMail({
          from: senderEmail,
          to: senderEmail,
          bcc: allEmails,
          subject: `Bacanal confirmada: ${winner}`,
          html: emailHtml,
          attachments,
        });
      }
    } else if (creatorEmail) {
      const emailHtml = getTieEmailHtml(baseUrl, logoUrl);
      await transporter.sendMail({
        from: senderEmail,
        to: creatorEmail,
        subject: `Empate en tu bacanal`,
        html: emailHtml,
      });
    }

    return NextResponse.json({
      resolved: true,
      winner: winner || null,
      tie: !!isTie,
    });
  } catch (err: unknown) {
    console.error("Comprobar resolución error:", err);
    const msg = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
