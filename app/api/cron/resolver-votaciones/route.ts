import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export const dynamic = "force-dynamic";

interface Voto {
  email: string;
  fechas_elegidas: string[];
}

interface Evento {
  id: string;
  motivo?: string;
  fechas_propuestas?: string[];
  fecha_tope?: string;
  creador_uid?: string;
  creador_email?: string;
  votantes_pendientes?: string[];
  votos?: Voto[];
  estado?: string;
  fecha_elegida?: string;
  fechas_empatadas?: string[];
}

interface UsuarioDoc {
  uid: string;
  email?: string;
  nombre?: string;
  photoURL?: string | null;
}

const formatVoteDate = (dateStr: string) => {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const dayName = daysOfWeek[date.getDay()];
  const dayNum = date.getDate();
  return `${dayName} ${dayNum}`;
};

export async function GET(req: NextRequest) {
  try {
    // 1. Security Check (Vercel Cron Authorization Header)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "No autorizado. Firma de seguridad CRON no válida o ausente." },
        { status: 401 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // 2. Fetch all events to evaluate OR conditions in memory
    const querySnapshot = await adminDb.collection("eventos").get();

    const eventsToResolve = querySnapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<Evento, "id">) }))
      .filter((ev) => {
        if (ev.estado === "cerrado" || ev.estado === "empate") return false;

        const isDeadlineReached = ev.fecha_tope ? ev.fecha_tope <= todayStr : false;
        const everyoneHasVoted = Array.isArray(ev.votantes_pendientes) && ev.votantes_pendientes.length === 0;

        return isDeadlineReached || everyoneHasVoted;
      });

    const processedEvents = [];

    // 3. Process each event
    for (const ev of eventsToResolve) {
      const propuestas = ev.fechas_propuestas || [];
      const countMap: Record<string, number> = {};

      propuestas.forEach((fecha) => {
        countMap[fecha] = 0;
      });

      // Recount only other users' votes (exclude creator)
      if (ev.votos) {
        ev.votos.forEach((voto) => {
          if (voto.email === ev.creador_email) return;
          voto.fechas_elegidas.forEach((fecha) => {
            if (fecha in countMap) {
              countMap[fecha] += 1;
            }
          });
        });
      }

      let maxVotes = -1;
      let winningDates: string[] = [];

      propuestas.forEach((fecha) => {
        const votes = countMap[fecha];
        if (votes > maxVotes) {
          maxVotes = votes;
          winningDates = [fecha];
        } else if (votes === maxVotes) {
          winningDates.push(fecha);
        }
      });

      // Determine result
      const isTie = winningDates.length > 1 || winningDates.length === 0;
      const winner = !isTie ? winningDates[0] : null;

      // 4. Retrieve all user profiles for data matching
      let usersList: UsuarioDoc[] = [];
      try {
        const usersSnapshot = await adminDb.collection("usuarios").get();
        usersList = usersSnapshot.docs.map((docSnap) => ({
          uid: docSnap.id,
          ...(docSnap.data() as Omit<UsuarioDoc, "uid">),
        }));
      } catch (fetchUsersErr) {
        console.error("Error fetching users list:", fetchUsersErr);
      }

      const creatorUser = usersList.find((u) => u.uid === ev.creador_uid);
      const creatorName = creatorUser?.nombre || ev.creador_email || "Anónimo";
      const creatorEmail = creatorUser?.email || ev.creador_email;

      // 5. Send notification email based on resolution result
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
          // --- CASE A: Absolute Winner ---
          const attendeesEmails = (ev.votos || [])
            .filter((voto) => voto.fechas_elegidas.includes(winner))
            .map((voto) => voto.email);

          const confirmedAttendees = usersList
            .filter((u) => u.email && attendeesEmails.includes(u.email))
            .map((u) => ({
              nombre: u.nombre || "Usuario Anónimo",
              photoURL: u.photoURL || null,
            }));

          confirmedAttendees.sort((a, b) => a.nombre.localeCompare(b.nombre));

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
                  <strong>Fecha elegida:</strong> <span style="color: #10b981; font-weight: bold;">${formatVoteDate(winner)} (${winner})</span>
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
        } else {
          // --- CASE B: Tie (Send ONLY to creator) ---
          if (creatorEmail) {
            const origin = req.headers.get("origin") || "";
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin || "http://localhost:3000";

            const emailHtml = `
              <div style="background-color: #020617; color: #f8fafc; padding: 32px; font-family: sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
                <h2 style="color: #f59e0b; margin-top: 0;">⚠️ Empate en la votación de tu bacanal</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                  Tu bacanal para el motivo <strong>"${ev.motivo || "Sin motivo"}"</strong> ha terminado en empate.
                </p>
                <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                  Entra en tu panel de control de la aplicación para elegir la fecha ganadora y notificar a los asistentes.
                </p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${baseUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                    Ir al Panel de Control
                  </a>
                </div>
                <p style="font-size: 13px; color: #64748b; margin: 0; border-top: 1px solid #1e293b; padding-top: 16px;">
                  El evento ha quedado en estado de empate en el sistema para permitirte decidir la fecha definitiva.
                </p>
              </div>
            `;

            await transporter.sendMail({
              from: senderEmail,
              to: creatorEmail,
              subject: "📢 Resultado de tu votación para la bacanal",
              html: emailHtml,
            });
          }
        }
      } catch (emailErr) {
        console.error(`Error sending resolution emails for event ${ev.id}:`, emailErr);
      }

      // 6. Update Firestore document (set state based on winner/tie)
      const eventDocRef = adminDb.collection("eventos").doc(ev.id);
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
