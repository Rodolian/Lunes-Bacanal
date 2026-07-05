"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import "flatpickr/dist/themes/dark.css";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";

interface FlatpickrInstance {
  destroy: () => void;
  clear: () => void;
}

export default function CrearEventoPage() {
  const { user } = useAuth();
  const router = useRouter();


  // Form states
  const [motivo, setMotivo] = useState("Niños");
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("");
  const [fechasPropuestas, setFechasPropuestas] = useState<string[]>([]);
  const [fechaTope, setFechaTope] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for flatpickr DOM inputs
  const fechasPropuestasRef = useRef<HTMLInputElement>(null);
  const fechaTopeRef = useRef<HTMLInputElement>(null);

  // Flatpickr instances refs to destroy on unmount or reset
  const fpMultipleRef = useRef<FlatpickrInstance | null>(null);
  const fpSingleRef = useRef<FlatpickrInstance | null>(null);

  useEffect(() => {
    // Initialize Fechas Propuestas datepicker (multiple selection + inline calendar)
    if (fechasPropuestasRef.current) {
      fpMultipleRef.current = flatpickr(fechasPropuestasRef.current, {
        mode: "multiple",
        inline: true, // Render inline always open
        dateFormat: "Y-m-d",
        locale: Spanish,
        onDayCreate: (dObj, d, fp, dayElem) => {
          if (dayElem.dateObj && dayElem.dateObj.getDay() === 1) {
            dayElem.classList.add("is-monday");
          }
        },
        onChange: (selectedDates) => {
          const dateStrings = selectedDates.map((date) => {
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - offset * 60 * 1000);
            return localDate.toISOString().split("T")[0];
          });
          setFechasPropuestas(dateStrings);
        },
      });
    }

    // Initialize Fecha Tope de Votación datepicker (single selection)
    if (fechaTopeRef.current) {
      fpSingleRef.current = flatpickr(fechaTopeRef.current, {
        mode: "single",
        dateFormat: "Y-m-d",
        locale: Spanish,
        onChange: (selectedDates) => {
          if (selectedDates.length > 0) {
            const date = selectedDates[0];
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - offset * 60 * 1000);
            setFechaTope(localDate.toISOString().split("T")[0]);
          } else {
            setFechaTope("");
          }
        },
      });
    }

    return () => {
      if (fpMultipleRef.current) fpMultipleRef.current.destroy();
      if (fpSingleRef.current) fpSingleRef.current.destroy();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!user) {
      setErrorMessage("Debes iniciar sesión para crear un evento.");
      return;
    }

    if (fechasPropuestas.length === 0) {
      setErrorMessage("Debes proponer al menos una fecha.");
      return;
    }

    if (!fechaTope) {
      setErrorMessage("Debes seleccionar una fecha límite para votar.");
      return;
    }

    // Validate that fechaTope is not after the earliest proposed date
    const earliestDate = fechasPropuestas.reduce(
      (min, current) => (current < min ? current : min),
      fechasPropuestas[0]
    );
    if (fechaTope > earliestDate) {
      alert("Antes de esa fecha limite hay al menos un dia propuesto para lunes de bacanal");
      setErrorMessage("Antes de esa fecha limite hay al menos un dia propuesto para lunes de bacanal");
      return;
    }

    setSubmitting(true);

    try {
      if (!db) {
        throw new Error("Base de datos de Firestore no configurada.");
      }

      // Fetch all registered users to automate invitations
      const usersSnapshot = await getDocs(collection(db, "usuarios"));
      let allEmails: string[] = [];
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && typeof data.email === "string") {
          allEmails.push(data.email);
        }
      });

      // Exclude creator email from invitations list
      allEmails = allEmails.filter((email) => email !== user.email);

      if (allEmails.length === 0) {
        throw new Error(
          "No se encontraron otros usuarios registrados en el sistema para invitar automáticamente."
        );
      }

      const docRef = await addDoc(collection(db, "eventos"), {
        motivo: motivo === "Otros" ? motivoPersonalizado : motivo,
        fechas_propuestas: fechasPropuestas,
        fecha_tope: fechaTope,
        creador_uid: user.uid,
        creador_email: user.email,
        votantes_pendientes: allEmails,
        created_at: new Date().toISOString(),
      });

      // Trigger Resend email notification
      try {
        await fetch("/api/notificar-evento", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventoId: docRef.id,
            votantes: allEmails,
          }),
        });
      } catch (notifyErr) {
        console.error("Error triggering email notification API:", notifyErr);
      }

      setSuccessMessage("¡Evento 'Lunes de Bacanal' creado con éxito e invitados notificados!");
      
      // Reset Form
      setMotivo("Niños");
      setMotivoPersonalizado("");
      setFechasPropuestas([]);
      setFechaTope("");

      if (fpMultipleRef.current) fpMultipleRef.current.clear();
      if (fpSingleRef.current) fpSingleRef.current.clear();

      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      console.error("Error creating event:", err);
      const errorMsg = err instanceof Error ? err.message : "Error al guardar el evento en Firestore. Inténtalo de nuevo.";
      setErrorMessage(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-[family-name:var(--font-geist-sans)]">
      {/* CSS Injection for gold Mondays in Flatpickr */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .flatpickr-day.is-monday {
            background-color: #ffd700 !important;
            color: #000000 !important;
            font-weight: bold !important;
            border-color: #ffd700 !important;
          }
          .flatpickr-day.is-monday:hover, 
          .flatpickr-day.is-monday:focus {
            background-color: #e5c100 !important;
            border-color: #e5c100 !important;
            color: #000000 !important;
          }
          /* Selected dates in proposals calendar: pink background and black text */
          .proposals-calendar-wrapper .flatpickr-day.selected,
          .proposals-calendar-wrapper .flatpickr-day.selected.is-monday,
          .proposals-calendar-wrapper .flatpickr-day.selected:hover,
          .proposals-calendar-wrapper .flatpickr-day.selected:focus {
            background-color: #ec4899 !important;
            color: #000000 !important;
            border-color: #ec4899 !important;
            font-weight: bold !important;
          }
          /* Limit flatpickr calendars to exactly 5 rows (35 day elements max) */
          .flatpickr-days .flatpickr-day:nth-child(n+36) {
            display: none !important;
          }
          /* Center the inline flatpickr calendar */
          .flatpickr-calendar.inline {
            margin: 0 auto;
            background: #0f172a !important;
            border: 1px solid #1e293b !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
          }
        `,
        }}
      />

      <Header />

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center p-6 my-10">
        {/* Decorative Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-600/5 blur-[150px]"></div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Solicitar Lunes de Bacanal
              </h1>
              <p className="text-xs text-slate-400">
                Todos los usuarios registrados serán invitados de forma automática
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-700 transition-all"
            >
              Volver
            </Link>
          </div>

          {successMessage && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Motivo */}
            <div className="space-y-2">
              <label htmlFor="motivo" className="block text-sm font-medium text-slate-300">
                Motivo del Evento
              </label>
              <select
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Niños">Niños</option>
                <option value="Boda">Boda</option>
                <option value="Casa">Casa</option>
                <option value="Otros">Otros</option>
              </select>

              {motivo === "Otros" && (
                <div className="pt-2 animate-fadeIn">
                  <input
                    type="text"
                    required
                    placeholder="Escribe el motivo personalizado"
                    value={motivoPersonalizado}
                    onChange={(e) => setMotivoPersonalizado(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Fechas Propuestas (Inline calendar) */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Fechas Propuestas
              </label>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 flex flex-col items-center proposals-calendar-wrapper">
                <input
                  id="fechasPropuestas"
                  type="text"
                  ref={fechasPropuestasRef}
                  placeholder="Selecciona las fechas en el calendario"
                  readOnly
                  className="hidden"
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Nota: Los lunes están resaltados en{" "}
                <span className="text-amber-400 font-semibold">dorado</span> en el calendario.
              </p>
            </div>

            {/* Fecha Tope de Votación */}
            <div className="space-y-2">
              <label htmlFor="fechaTope" className="block text-sm font-medium text-slate-300">
                Fecha Límite para Votar
              </label>
              <input
                id="fechaTope"
                type="text"
                ref={fechaTopeRef}
                placeholder="Selecciona la fecha límite..."
                readOnly
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
            >
              {submitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                "Crear Evento"
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/20 py-6 text-center text-sm text-slate-500 mt-auto">
        &copy; {new Date().getFullYear()} Lunes Bacanal. Todos los derechos reservados.
      </footer>
    </div>
  );
}
