import { formatVoteDate } from "./dateUtils";

/**
 * Genera la cuadrícula de calendario HTML con el día ganador seleccionado en dorado.
 */
export function generateCalendarHtml(winnerDateStr: string): string {
  const parts = winnerDateStr.split("-");
  if (parts.length !== 3) return "";
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1; // 0-indexed
  const day = Number(parts[2]);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const monthName = monthNames[month];

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1, etc.
  const totalDays = getDaysInMonth(year, month);

  // Convert firstDayIndex so Monday=0, Sunday=6
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  let calendarGrid = "";
  // Empty slots before first day
  for (let i = 0; i < adjustedFirstDay; i++) {
    calendarGrid += `<td style="padding: 4px; text-align: center; color: #334155; font-size: 11px;"></td>`;
  }

  // Days of the month
  for (let d = 1; d <= totalDays; d++) {
    const isWinner = d === day;

    let cellStyle = "padding: 4px; text-align: center; font-size: 11px; border-radius: 4px;";
    if (isWinner) {
      cellStyle += "background-color: #fbbf24; color: #020617; font-weight: bold; border: 1px solid #fbbf24;";
    } else {
      cellStyle += "color: #94a3b8;";
    }

    calendarGrid += `<td style="${cellStyle}">${d}</td>`;

    const currentDayIndex = (adjustedFirstDay + d - 1) % 7;
    if (currentDayIndex === 6 && d < totalDays) {
      calendarGrid += `</tr><tr style="height: 24px;">`;
    }
  }

  return `
    <div style="margin: 0 auto 12px auto; max-width: 220px; background-color: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; font-family: sans-serif;">
      <div style="color: #ffffff; font-size: 13px; font-weight: bold; text-align: center; margin-bottom: 8px;">
        ${monthName} ${year}
      </div>
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <thead>
          <tr style="color: #64748b; font-size: 9px; font-weight: bold; height: 18px; text-align: center;">
            <th>L</th><th>M</th><th>X</th><th>J</th><th>V</th><th>S</th><th>D</th>
          </tr>
        </thead>
        <tbody>
          <tr style="height: 24px;">
            ${calendarGrid}
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Plantilla de correo para la convocatoria de un nuevo evento.
 */
export function getNewEventEmailHtml(
  baseUrl: string,
  logoUrl: string,
  votingUrl: string
): string {
  return `
    <div style="background-color: #020617; color: #f8fafc; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${logoUrl}" alt="Lunes Bacanal" style="width: 48px; height: 48px; border-radius: 12px; display: inline-block; object-fit: cover;" />
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 16px; margin-bottom: 4px; letter-spacing: -0.025em;">
          Lunes de Bacanal
        </h1>
      </div>
      
      <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0; margin-top: 0; margin-bottom: 24px; text-align: center;">
          Alguien ha convocado un Lunes de Bacanal. Vota qué día te viene bien antes de la fecha límite.
        </p>
        <div style="text-align: center;">
          <a href="${votingUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; transition: background-color 0.2s;">
            Votar Fechas
          </a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #1e293b; padding-top: 16px;">
        <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.5; text-align: center;">
          Si el botón superior no funciona, copia y pega este enlace en tu navegador:<br />
          <a href="${votingUrl}" style="color: #6366f1; word-break: break-all;">${votingUrl}</a>
        </p>
      </div>
    </div>
  `;
}

/**
 * Plantilla de correo para anunciar una fecha confirmada y ganadora.
 */
export function getWinnerEmailHtml(
  baseUrl: string,
  logoUrl: string,
  winnerDateStr: string,
  attendees: { nombre: string; photoURL: string | null }[]
): {
  html: string;
  attachments: { filename: string; content: Buffer; cid: string }[];
} {
  const attachments: { filename: string; content: Buffer; cid: string }[] = [];

  const getAvatarHtml = (photoURL: string | null, name: string, index: number) => {
    if (photoURL) {
      if (photoURL.startsWith("data:image/")) {
        const commaIndex = photoURL.indexOf(",");
        if (commaIndex !== -1) {
          const base64Data = photoURL.slice(commaIndex + 1);
          let ext = "png";
          const match = photoURL.slice(0, commaIndex).match(/data:image\/([a-zA-Z+]+);base64/);
          if (match && match[1]) {
            ext = match[1];
          }
          const cid = `avatar_${index}`;
          attachments.push({
            filename: `avatar_${index}.${ext}`,
            content: Buffer.from(base64Data, "base64"),
            cid: cid,
          });
          return `<img src="cid:${cid}" width="30" height="30" style="border-radius: 50%; object-fit: cover; display: block;" alt="avatar" />`;
        }
      } else if (photoURL.startsWith("http")) {
        return `<img src="${photoURL}" width="30" height="30" style="border-radius: 50%; object-fit: cover; display: block;" alt="avatar" />`;
      }
    }
    const initials = name.substring(0, 2).toUpperCase();
    return `<div style="width: 30px; height: 30px; border-radius: 50%; background-color: #4f46e5; color: #ffffff; text-align: center; line-height: 30px; font-size: 11px; font-weight: bold; display: block;">${initials}</div>`;
  };

  const tableRows = attendees
    .map(
      (att, idx) => `
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 8px 0; width: 40px; vertical-align: middle;">
          ${getAvatarHtml(att.photoURL, att.nombre, idx)}
        </td>
        <td style="padding: 8px 0; vertical-align: middle; font-size: 14px; color: #cbd5e1; font-weight: 500;">
          ${att.nombre}
        </td>
      </tr>
    `
    )
    .join("");

  const calendarPartStr = generateCalendarHtml(winnerDateStr);
  const formatted = formatVoteDate(winnerDateStr);

  const html = `
    <div style="background-color: #020617; color: #f8fafc; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${logoUrl}" alt="Lunes Bacanal" style="width: 48px; height: 48px; border-radius: 12px; display: inline-block; object-fit: cover;" />
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 16px; margin-bottom: 4px; letter-spacing: -0.025em;">
          Lunes de Bacanal
        </h1>
      </div>

      <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #cbd5e1; margin-top: 0; font-size: 18px; font-weight: bold; text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 12px;">
          Bacanal confirmada
        </h2>
        
        <div style="margin: 16px 0; padding: 16px; background-color: #020617; border: 1px solid #1e293b; border-radius: 6px; font-size: 14px; line-height: 1.6; text-align: center;">
          <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 16px 0;">
            Votación cerrada. Fecha definitiva: ${formatted}.
          </p>
          ${calendarPartStr}
          <div style="margin-top: 16px;">
            <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Lunes+de+Bacanal&dates=${winnerDateStr.replace(/-/g, "")}T200000/${winnerDateStr.replace(/-/g, "")}T235959&details=Reunion+Lunes+de+Bacanal." target="_blank" style="background-color: #fbbf24; color: #020617; padding: 8px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px; display: inline-block;">
              Añadir a Google Calendar
            </a>
          </div>
        </div>
        
        <h3 style="color: #ffffff; font-size: 14px; font-weight: bold; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
          Asistentes confirmados a continuación (${attendees.length})
        </h3>
        
        ${attendees.length > 0
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
  `;

  return { html, attachments };
}

/**
 * Plantilla de correo para anunciar una bacanal en empate.
 */
export function getTieEmailHtml(baseUrl: string, logoUrl: string): string {
  return `
    <div style="background-color: #020617; color: #f8fafc; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${logoUrl}" alt="Lunes Bacanal" style="width: 48px; height: 48px; border-radius: 12px; display: inline-block; object-fit: cover;" />
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 16px; margin-bottom: 4px; letter-spacing: -0.025em;">
          Lunes de Bacanal
        </h1>
      </div>
      
      <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0; margin-top: 0; margin-bottom: 24px; text-align: center;">
          La votación ha terminado en empate. Entra en la aplicación para elegir la fecha definitiva.
        </p>
        <div style="text-align: center;">
          <a href="${baseUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
            Resolver Empate
          </a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center;">
        <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.5;">
          Este correo fue enviado al organizador del Lunes de Bacanal.
        </p>
      </div>
    </div>
  `;
}

/**
 * Plantilla de correo para la confirmación de registro de usuario.
 */
export function getVerificationEmailHtml(logoUrl: string, verificationLink: string): string {
  return `
    <div style="background-color: #020617; color: #f8fafc; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${logoUrl}" alt="Lunes Bacanal" style="width: 48px; height: 48px; border-radius: 12px; display: inline-block; object-fit: cover;" />
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 16px; margin-bottom: 4px; letter-spacing: -0.025em;">
          Lunes de Bacanal
        </h1>
      </div>
      
      <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0; margin-top: 0; margin-bottom: 24px; text-align: center;">
          Confirma tu dirección de correo para activar tu cuenta.
        </p>
        <div style="text-align: center;">
          <a href="${verificationLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
            Confirmar Correo
          </a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center;">
        <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.5;">
          Si el botón no funciona, abre este enlace en tu navegador:<br />
          <a href="${verificationLink}" style="color: #6366f1; word-break: break-all;">${verificationLink}</a>
        </p>
      </div>
    </div>
  `;
}
