import fs from "fs";
import path from "path";
import {
  getNewEventEmailHtml,
  getWinnerEmailHtml,
  getTieEmailHtml,
  getVerificationEmailHtml,
} from "../lib/emailTemplates";

const PREVIEWS_DIR = path.join(__dirname, "../doc/email-previews");

// Asegurar que el directorio de salida exista
if (!fs.existsSync(PREVIEWS_DIR)) {
  fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
}

const dummyBaseUrl = "https://lunes-bacanal.vercel.app";
// URL de prueba temporal para ver el logo
const dummyLogoUrl = "https://lunes-bacanal.vercel.app/logo.jpg";
const dummyVotingUrl = `${dummyBaseUrl}/votar/test-event-123`;
const dummyVerificationLink = "https://lunes-bacanal.firebaseapp.com/__/auth/action?mode=verifyEmail&apiKey=AIzaSy...&oobCode=dummyCode";

console.log("Generando vistas previas de notificaciones...");

// 1. Email de Nueva Convocatoria
const dummyProposals = ["2026-07-13", "2026-07-20", "2026-07-27"];
const dummyOpcionesTipo: Record<string, "almuerzo" | "cena"> = {
  "2026-07-13": "cena",
  "2026-07-20": "almuerzo",
  "2026-07-27": "cena"
};
const newEventHtml = getNewEventEmailHtml(
  dummyBaseUrl,
  dummyLogoUrl,
  dummyVotingUrl,
  dummyProposals,
  dummyOpcionesTipo
);
fs.writeFileSync(path.join(PREVIEWS_DIR, "nueva-bacanal.html"), newEventHtml, "utf-8");

// 2. Email de Bacanal Confirmada
const dummyAttendees = [
  { nombre: "Adrián Rodero", photoURL: null },
  { nombre: "Carlos Gracia", photoURL: "https://api.dicebear.com/7.x/initials/svg?seed=CG" },
  { nombre: "María Auxiliadora", photoURL: null },
  { nombre: "Sebastián Beltrán", photoURL: "https://api.dicebear.com/7.x/initials/svg?seed=SB" },
];
// Lunes 13 de Julio de 2026
const winnerDate = "2026-07-13";
const { html: winnerHtml } = getWinnerEmailHtml(dummyBaseUrl, dummyLogoUrl, winnerDate, dummyAttendees, "almuerzo");
fs.writeFileSync(path.join(PREVIEWS_DIR, "bacanal-confirmada.html"), winnerHtml, "utf-8");

// 3. Email de Empate (Enviado al Organizador)
const tieHtml = getTieEmailHtml(dummyBaseUrl, dummyLogoUrl);
fs.writeFileSync(path.join(PREVIEWS_DIR, "empate.html"), tieHtml, "utf-8");

// 4. Email de Confirmación de Registro (NUEVO)
const verificationHtml = getVerificationEmailHtml(dummyLogoUrl, dummyVerificationLink);
fs.writeFileSync(path.join(PREVIEWS_DIR, "confirmacion-registro.html"), verificationHtml, "utf-8");

console.log(`Vistas previas creadas con éxito en: ${PREVIEWS_DIR}`);
