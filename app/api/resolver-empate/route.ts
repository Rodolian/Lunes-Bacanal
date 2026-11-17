import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
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
      resolvedByClient,
      confirmedAttendees: clientConfirmedAttendees,
      allEmails: clientAllEmails,
      winnerTipo: clientWinnerTipo,
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

    if (resolvedByClient) {
      const { html: emailHtml, attachments } = getWinnerEmailHtml(
        baseUrl,
        logoUrl,
        fecha_elegida,
        clientConfirmedAttendees || [],
        clientWinnerTipo || "cena"
      );

      const senderEmail = process.env.EMAIL_USER || "lunesbacanal@gmail.com";
      const transporter = getMailTransporter();

      if (Array.isArray(clientAllEmails) && clientAllEmails.length > 0) {
        await transporter.sendMail({
          from: senderEmail,
          to: senderEmail,
          bcc: clientAllEmails,
          subject: `Bacanal confirmada: ${fecha_elegida}`,
          html: emailHtml,
          attachments,
        });
      }

      return NextResponse.json({
        success: true,
        attendees_count: (clientConfirmedAttendees || []).length,
      });
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
      opciones_tipo?: Record<string, "almuerzo" | "cena">;
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

    const winnerTipo = ev.opciones_tipo?.[fecha_elegida] || "cena";
    // Generar HTML de correo
    const { html: emailHtml, attachments } = getWinnerEmailHtml(
      baseUrl,
      logoUrl,
      fecha_elegida,
      confirmedAttendees,
      winnerTipo
    );

    // 5. Enviar usando Nodemailer
    const senderEmail = process.env.EMAIL_USER || "lunesbacanal@gmail.com";
    const transporter = getMailTransporter();

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
