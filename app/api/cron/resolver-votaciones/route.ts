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

export async function GET(req: NextRequest) {
  try {
    // 1. Verificación de Seguridad (Vercel Cron Authorization)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "No autorizado. Firma de seguridad CRON no válida o ausente." },
        { status: 401 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // 2. Obtener todos los eventos para resolver en memoria
    const querySnapshot = await adminDb.collection("events").get();

    const eventsToResolve = querySnapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Event, "id">) }))
      .filter((ev) => {
        if (ev.estado === "cerrado" || ev.estado === "empate") return false;

        const isDeadlineReached = ev.fecha_tope ? ev.fecha_tope <= todayStr : false;
        const everyoneHasVoted = Array.isArray(ev.votantes_pendientes) && ev.votantes_pendientes.length === 0;

        return isDeadlineReached || everyoneHasVoted;
      });

    const processedEvents = [];

    // 3. Procesar cada evento vencido
    for (const ev of eventsToResolve) {
      // Determinar resultado usando el servicio puro
      const { winner, winningDates } = calculateWinner(ev as Event);

      // 4. Obtener perfiles de usuarios
      let usersList: UsuarioDoc[] = [];
      try {
        const usersSnapshot = await adminDb.collection("users").get();
        usersList = usersSnapshot.docs.map((docSnap) => ({
          uid: docSnap.id,
          ...(docSnap.data() as Omit<UsuarioDoc, "uid">),
        }));
      } catch (fetchUsersErr) {
        console.error("Error fetching users list:", fetchUsersErr);
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
          // --- Ganador ---
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
            .filter((email): email is string => typeof email === "string");

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
          // --- Empate (Enviar solo al organizador) ---
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
        console.error(`Error sending resolution emails for event ${ev.id}:`, emailErr);
      }

      // 6. Actualizar base de datos
      const eventDocRef = adminDb.collection("events").doc(ev.id);
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

      processedEvents.push({
        id: ev.id,
        motivo: ev.motivo,
        ganador: winner || "Empate",
        destinatario: creatorEmail,
      });
    }

    return NextResponse.json({
      success: true,
      processed_count: eventsToResolve.length,
      processed: processedEvents,
    });
  } catch (err: unknown) {
    console.error("Resolution cron error:", err);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado durante el procesamiento del cron." },
      { status: 500 }
    );
  }
}
