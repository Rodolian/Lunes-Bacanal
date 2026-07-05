"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import "flatpickr/dist/themes/dark.css";
import Link from "next/link";

interface Evento {
  id: string;
  motivo?: string;
  fechas_propuestas?: string[];
  fecha_tope?: string;
  votantes_pendientes?: string[];
}

interface FlatpickrInstance {
  destroy: () => void;
  setDate: (dates: string | Date | string[] | Date[], triggerChange?: boolean) => void;
}

export default function VotarPage() {
  const { user, logout } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for calendar sync
  const calendarRef = useRef<HTMLInputElement>(null);
  const fpInstanceRef = useRef<FlatpickrInstance | null>(null);

  useEffect(() => {
    if (!db || !id) {
      setLoading(false);
      return;
    }

    const fetchEvent = async () => {
      try {
        const docRef = doc(db, "eventos", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEvento({
            id: docSnap.id,
            ...docSnap.data(),
          } as Evento);
        } else {
          setError("El evento solicitado no existe.");
        }
      } catch (err: unknown) {
        console.error("Error fetching event:", err);
        setError("Error al cargar los datos del evento. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  // Initialize flatpickr after the event data loads
  useEffect(() => {
    if (!evento?.fechas_propuestas || !calendarRef.current) return;

    fpInstanceRef.current = flatpickr(calendarRef.current, {
      mode: "multiple",
      inline: true, // Always show calendar open
      dateFormat: "Y-m-d",
      locale: Spanish,
      enable: evento.fechas_propuestas, // Restrict dates selection only to proposals
      onDayCreate: (dObj, d, fp, dayElem) => {
        if (dayElem.dateObj) {
          const offset = dayElem.dateObj.getTimezoneOffset();
          const localDate = new Date(dayElem.dateObj.getTime() - offset * 60 * 1000);
          const dateStr = localDate.toISOString().split("T")[0];
          if (evento.fechas_propuestas?.includes(dateStr)) {
            dayElem.classList.add("is-proposed");
          }
        }
      },
      onChange: (selectedDatesArr) => {
        const dateStrings = selectedDatesArr.map((date) => {
          const offset = date.getTimezoneOffset();
          const localDate = new Date(date.getTime() - offset * 60 * 1000);
          return localDate.toISOString().split("T")[0];
        });
        setSelectedDates(dateStrings);
      },
    });

    return () => {
      if (fpInstanceRef.current) {
        fpInstanceRef.current.destroy();
        fpInstanceRef.current = null;
      }
    };
  }, [evento]);

  // Sync state changes back to flatpickr instance
  useEffect(() => {
    if (fpInstanceRef.current) {
      fpInstanceRef.current.setDate(selectedDates, false);
    }
  }, [selectedDates]);

  const handleCheckboxChange = (fecha: string) => {
    setSelectedDates((prev) =>
      prev.includes(fecha) ? prev.filter((d) => d !== fecha) : [...prev, fecha]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user?.email) {
      setError("Debes estar autenticado para votar.");
      return;
    }

    if (selectedDates.length === 0) {
      setError("Debes seleccionar al menos una fecha para emitir tu voto.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/votar-y-resolver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventoId: id,
          email: user.email,
          selectedDates: selectedDates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al registrar tu voto.");
      }

      // Redirect home
      router.push("/");
    } catch (err: unknown) {
      console.error("Error submitting vote:", err);
      const msg = err instanceof Error ? err.message : "Error al registrar tu voto. Inténtalo de nuevo.";
      setError(msg);
      setSubmitting(false);
    }
  };

  // 1. Loading Screen
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100 font-[family-name:var(--font-geist-sans)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-slate-400 tracking-wider animate-pulse">
            Cargando bacanal...
          </p>
        </div>
      </div>
    );
  }

  const userEmail = user?.email;
  const isVoterPending = evento?.votantes_pendientes?.includes(userEmail || "");

  // 2. Permission / Already voted screen
  if (!evento || !isVoterPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100 font-[family-name:var(--font-geist-sans)]">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Acceso Restringido</h1>
          <p className="text-sm text-slate-400">
            {error || "Ya has emitido tu voto o no tienes permisos para esta bacanal"}
          </p>
          <Link
            href="/"
            className="inline-flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:bg-indigo-700"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 3. Voting Form Screen
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-[family-name:var(--font-geist-sans)]">
      {/* CSS style overrides */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* Highlight proposed dates in pink */
          .voting-calendar-wrapper .flatpickr-day.is-proposed {
            background-color: rgba(236, 72, 153, 0.15) !important;
            border-color: rgba(236, 72, 153, 0.4) !important;
            color: #f472b6 !important;
            font-weight: bold;
          }
          
          /* Highlight selected dates in green */
          .voting-calendar-wrapper .flatpickr-day.selected,
          .voting-calendar-wrapper .flatpickr-day.selected.is-proposed,
          .voting-calendar-wrapper .flatpickr-day.selected:hover,
          .voting-calendar-wrapper .flatpickr-day.selected:focus {
            background-color: #10b981 !important;
            color: #000000 !important;
            border-color: #10b981 !important;
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

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/30 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Lunes Bacanal" className="h-8 w-8 rounded-lg shadow-md shadow-indigo-500/20 object-cover" />
            <span className="font-bold tracking-tight text-white">Lunes Bacanal</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 sm:inline-block">
              Conectado como: <strong className="text-slate-200">{user?.email}</strong>
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center p-6 my-10">
        {/* Decorative Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-600/5 blur-[150px]"></div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2 border-b border-slate-800 pb-4">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Votación de Bacanal
            </h1>
            <p className="text-xs text-slate-400">
              Tu voto es privado y se registrará de forma segura
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Details (Motive & Limits) */}
          <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Motivo de la Bacanal
              </span>
              <p className="text-base font-bold text-white leading-tight">
                {evento.motivo || "No especificado"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Fecha Límite para Votar
              </span>
              <p className="text-base font-bold text-indigo-400 leading-tight">
                {evento.fecha_tope}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* List Selection Checkboxes */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-300">
                Selecciona las fechas que te convengan:
              </label>

              <div className="space-y-2">
                {evento.fechas_propuestas?.map((fecha) => (
                  <label
                    key={fecha}
                    className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all select-none ${
                      selectedDates.includes(fecha)
                        ? "border-emerald-500/30 bg-emerald-500/5 text-white font-medium"
                        : "border-slate-800 bg-slate-950/40 text-slate-350 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedDates.includes(fecha)}
                        onChange={() => handleCheckboxChange(fecha)}
                        className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-950 outline-none"
                      />
                      <span>{fecha}</span>
                    </div>

                    {/* Special Monday indicator for visual context */}
                    {new Date(fecha).getDay() === 0 && (
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                        Lunes
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Interactive Calendar displaying proposed dates and selected state */}
            <div className="space-y-3 pt-6 border-t border-slate-850">
              <label className="block text-sm font-semibold text-slate-300">
                Calendario de Fechas Disponibles
              </label>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 flex flex-col items-center voting-calendar-wrapper">
                <input
                  id="votingCalendar"
                  type="text"
                  ref={calendarRef}
                  placeholder="Selecciona las fechas directamente aquí..."
                  readOnly
                  className="hidden"
                />
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                Días propuestos en <span className="text-pink-400 font-semibold">rosa</span>. Seleccionados en <span className="text-emerald-400 font-semibold">verde</span>.
              </p>
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
                "Enviar Votación"
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
