import fs from "fs";
import path from "path";

const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const delimiterIndex = trimmed.indexOf("=");
    if (delimiterIndex === -1) return;
    const key = trimmed.slice(0, delimiterIndex).trim();
    let val = trimmed.slice(delimiterIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

import { adminDb } from "../lib/firebaseAdmin";

async function main() {
  console.log("=== DIAGNÓSTICO DE EVENTOS ===");
  try {
    const snapshot = await adminDb.collection("events").get();
    if (snapshot.empty) {
      console.log("No se encontraron eventos.");
      return;
    }

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`\nID: ${doc.id}`);
      console.log(`Motivo: ${data.motivo}`);
      console.log(`Estado: ${data.estado}`);
      console.log(`Fecha Elegida: ${data.fecha_elegida}`);
      console.log(`Creador Email: ${data.creador_email}`);
      console.log(`Votantes Pendientes:`, data.votantes_pendientes);
      console.log(`Votos Registrados:`, (data.votos || []).map((v: any) => v.email));
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
