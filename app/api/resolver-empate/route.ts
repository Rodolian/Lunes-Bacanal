import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { headers } from "next/headers";
import { getWinnerEmailHtml } from "@/lib/emailTemplates";

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

    // 1. Obtener el evento
    const eventDocRef = adminDb.collection("events").doc(eventoId);
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

    // 2. Actualizar documento de Firestore
    await eventDocRef.update({
      estado: "cerrado",
      fecha_elegida: fecha_elegida,
    });

    // 3. Obtener todos los usuarios de Firestore
    interface UsuarioDoc {
      uid: string;
      email?: string;
      nombre?: string;
      photoURL?: string | null;
    }
    const usersSnapshot = await adminDb.collection("users").get();
    const usersList = usersSnapshot.docs.map((docSnap) => ({
      uid: docSnap.id,
      ...(docSnap.data() as Omit<UsuarioDoc, "uid">),
    }));

    // 4. Mapear asistentes confirmados
    const attendeesEmails = (ev.votos || [])
      .filter((voto) => voto.fechas_elegidas.includes(fecha_elegida))
      .map((voto) => voto.email);

    const confirmedAttendees = usersList
      .filter((u) => u.email && (attendeesEmails.includes(u.email) || u.uid === ev.creador_uid))
      .map((u) => ({
        nombre: u.nombre || "Usuario Anónimo",
        photoURL: u.photoURL || null,
      }));

    // Ordenar alfabéticamente
    confirmedAttendees.sort((a, b) => a.nombre.localeCompare(b.nombre));

    const headersList = headers();
    const origin = headersList.get("origin") || "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || "http://localhost:3000";
    const logoUrl = `${baseUrl}/logo.jpg`;

    // Generar HTML de correo
    const { html: emailHtml, attachments } = getWinnerEmailHtml(
      baseUrl,
      logoUrl,
      fecha_elegida,
      confirmedAttendees
    );

    // 5. Enviar usando Nodemailer
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
        subject: `Bacanal confirmada: ${fecha_elegida}`,
        html: emailHtml,
        attachments,
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
