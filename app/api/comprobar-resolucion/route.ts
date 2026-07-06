import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { headers } from "next/headers";
import { calculateWinner } from "@/services/resolutionService";
import { getWinnerEmailHtml, getTieEmailHtml } from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";

import { Event } from "@/services/types";

interface UsuarioDoc {
  uid: string;
  email?: string;
  nombre?: string;
  photoURL?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const { eventoId, voterEmail, selectedDates } = await req.json();

    if (!eventoId) {
      return NextResponse.json({ error: "Falta eventoId." }, { status: 400 });
    }

    // 1. Leer el estado actual del evento
    const eventDocRef = adminDb.collection("events").doc(eventoId);
    const eventDocSnap = await eventDocRef.get();

    if (!eventDocSnap.exists) {
      return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
    }

    const ev = eventDocSnap.data() as Event;

    // Corrección en memoria para evitar condiciones de carrera por retraso de replicación en Firestore
    if (voterEmail) {
      if (!ev.votos) ev.votos = [];
      const yaVoto = ev.votos.some((v) => v.email === voterEmail);
      if (!yaVoto && selectedDates !== undefined) {
        ev.votos.push({ email: voterEmail, fechas_elegidas: selectedDates });
      }
      if (ev.votantes_pendientes) {
        ev.votantes_pendientes = ev.votantes_pendientes.filter((email) => email !== voterEmail);
      }
    }

    // 2. Solo resolver si pendientes está vacío y el evento está activo
    if (
      ev.estado === "cerrado" ||
      ev.estado === "empate" ||
      !ev.votantes_pendientes ||
      ev.votantes_pendientes.length > 0
    ) {
      return NextResponse.json({ resolved: false, reason: "No es necesario resolver aún." });
    }

    // 3. Escrutar votos usando el servicio puro
    const { winner, isTie, winningDates } = calculateWinner(ev);

    // 4. Obtener todos los usuarios registrados
    let usersList: UsuarioDoc[] = [];
    try {
      const usersSnapshot = await adminDb.collection("users").get();
      usersList = usersSnapshot.docs.map((docSnap) => ({
        uid: docSnap.id,
        ...(docSnap.data() as Omit<UsuarioDoc, "uid">),
      }));
    } catch (fetchErr) {
      console.error("Error fetching users:", fetchErr);
    }

    const creatorUser = usersList.find((u) => u.uid === ev.creador_uid);
    const creatorEmail = creatorUser?.email || ev.creador_email;

    const headersList = headers();
    const origin = headersList.get("origin") || "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || "http://localhost:3000";
    const logoUrl = `${baseUrl}/logo.jpg`;

    // 5. Enviar correos de notificación
    try {
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

      if (winner) {
        // --- Con ganador ---
        const attendeesEmails = (ev.votos || [])
          .filter((voto) => voto.fechas_elegidas.includes(winner))
          .map((voto) => voto.email);

        const confirmedAttendees = usersList
          .filter((u) => u.email && (attendeesEmails.includes(u.email) || u.uid === ev.creador_uid))
          .map((u) => ({
            nombre: u.nombre || "Usuario Anónimo",
            photoURL: u.photoURL || null,
          }));

        confirmedAttendees.sort((a, b) => a.nombre.localeCompare(b.nombre));

        const winnerTipo = ev.opciones_tipo?.[winner] || "cena";
        const { html: emailHtml, attachments } = getWinnerEmailHtml(
          baseUrl,
          logoUrl,
          winner,
          confirmedAttendees,
          winnerTipo
        );

        const allEmails = usersList
          .map((u) => u.email)
          .filter((e): e is string => typeof e === "string");

        if (allEmails.length > 0) {
          await transporter.sendMail({
            from: senderEmail,
            to: senderEmail,
            bcc: allEmails,
            subject: `Bacanal confirmada: ${winner}`,
            html: emailHtml,
            attachments,
          });
        }
      } else {
        // --- Empate ---
        if (creatorEmail) {
          const emailHtml = getTieEmailHtml(baseUrl, logoUrl);

          await transporter.sendMail({
            from: senderEmail,
            to: creatorEmail,
            subject: `Empate en tu bacanal`,
            html: emailHtml,
          });
        }
      }
    } catch (emailErr) {
      console.error("Error sending resolution emails:", emailErr);
    }

    // 6. Actualizar Firestore con el resultado
    if (winner) {
      await eventDocRef.update({
        estado: "cerrado",
        fecha_elegida: winner,
      });
    } else {
      await eventDocRef.update({
        estado: "empate",
        fechas_empatadas: winningDates,
      });
    }

    return NextResponse.json({ resolved: true, winner: winner || null, tie: isTie });
  } catch (err: unknown) {
    console.error("Comprobar resolución error:", err);
    const msg = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
