import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { eventoId, fecha_elegida } = await req.json();

    if (!eventoId || !fecha_elegida) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios (eventoId, fecha_elegida)." },
        { status: 400 }
      );
    }

    // 1. Get the event
    const eventDocRef = adminDb.collection("eventos").doc(eventoId);
    const eventDocSnap = await eventDocRef.get();
    if (!eventDocSnap.exists) {
      return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
    }

    interface VotoDoc {
      email: string;
      fechas_elegidas: string[];
    }

    interface EventoDoc {
      id: string;
      motivo?: string;
      creador_uid?: string;
      creador_email?: string;
      votos?: VotoDoc[];
    }

    const ev = { id: eventDocSnap.id, ...eventDocSnap.data() } as EventoDoc;

    // 2. Update Firestore event doc
    await eventDocRef.update({
      estado: "cerrado",
      fecha_elegida: fecha_elegida,
    });

    // 3. Fetch all users from Firestore
    interface UsuarioDoc {
      uid: string;
      email?: string;
      nombre?: string;
      photoURL?: string | null;
    }
    const usersSnapshot = await adminDb.collection("usuarios").get();
    const usersList = usersSnapshot.docs.map((docSnap) => ({
      uid: docSnap.id,
      ...(docSnap.data() as Omit<UsuarioDoc, "uid">),
    }));


    // 4. Find and map confirmed attendees
    const attendeesEmails = (ev.votos || [])
      .filter((voto) => voto.fechas_elegidas.includes(fecha_elegida))
      .map((voto) => voto.email);

    const confirmedAttendees = usersList
      .filter((u) => u.email && attendeesEmails.includes(u.email))
      .map((u) => ({
        nombre: u.nombre || "Usuario Anónimo",
        photoURL: u.photoURL || null,
      }));

    // Sort alphabetically by name
    confirmedAttendees.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Helper for vote dates formatting
    const formatVoteDate = (dateStr: string) => {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const dayName = daysOfWeek[date.getDay()];
      const dayNum = date.getDate();
      return `${dayName} ${dayNum}`;
    };

    const getAvatarHtml = (photoURL: string | null, name: string) => {
      if (photoURL) {
        return `<img src="${photoURL}" width="30" height="30" style="border-radius: 50%; object-fit: cover; display: block;" alt="avatar" />`;
      }
      const initials = name.substring(0, 2).toUpperCase();
      return `<div style="width: 30px; height: 30px; border-radius: 50%; background-color: #4f46e5; color: #ffffff; text-align: center; line-height: 30px; font-size: 11px; font-weight: bold; display: block;">${initials}</div>`;
    };

    const tableRows = confirmedAttendees
      .map(
        (att) => `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 8px 0; width: 40px; vertical-align: middle;">
            ${getAvatarHtml(att.photoURL, att.nombre)}
          </td>
          <td style="padding: 8px 0; vertical-align: middle; font-size: 14px; color: #cbd5e1; font-weight: 500;">
            ${att.nombre}
          </td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <div style="background-color: #020617; color: #f8fafc; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; font-size: 24px; font-weight: bold;">
            L
          </div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 16px; margin-bottom: 4px; letter-spacing: -0.025em;">
            Lunes de Bacanal
          </h1>
          <p style="color: #64748b; font-size: 13px; margin: 0;">🤫 Secreto Revelado</p>
        </div>

        <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h2 style="color: #10b981; margin-top: 0; font-size: 18px; font-weight: bold;">🎉 ¡Bacanal Confirmado!</h2>
          
          <div style="margin: 16px 0; padding: 16px; background-color: #020617; border: 1px solid #1e293b; border-radius: 6px; font-size: 14px; line-height: 1.6;">
            <strong>Fecha elegida:</strong> <span style="color: #10b981; font-weight: bold;">${formatVoteDate(fecha_elegida)} (${fecha_elegida})</span>
          </div>
          
          <h3 style="color: #ffffff; font-size: 14px; font-weight: bold; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
            Lista de Asistentes Confirmados (${confirmedAttendees.length})
          </h3>
          
          ${confirmedAttendees.length > 0
        ? `
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          `
        : `
            <p style="font-size: 14px; color: #64748b; font-style: italic; margin: 0;">Nadie pudo asistir en esta fecha.</p>
          `
      }
        </div>

        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center;">
          <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.5;">
            Este correo fue enviado a todos los miembros registrados de Lunes de Bacanal.
          </p>
        </div>
      </div>
    `;

    // 5. Send using Nodemailer
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

    const allEmails = usersList
      .map((u) => u.email)
      .filter((email): email is string => typeof email === "string");

    if (allEmails.length > 0) {
      await transporter.sendMail({
        from: senderEmail,
        to: senderEmail,
        bcc: allEmails,
        subject: "📢 Resultado de tu votación para la bacanal",
        html: emailHtml,
      });
    }

    return NextResponse.json({ success: true, attendees_count: confirmedAttendees.length });
  } catch (err: unknown) {
    console.error("Resolver empate API error:", err);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al resolver el empate." },
      { status: 500 }
    );
  }
}
