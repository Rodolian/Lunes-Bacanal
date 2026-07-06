"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToEvent, submitVote } from "@/services/eventService";
import { Event } from "@/services/types";
import { useRouter } from "next/navigation";
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import "flatpickr/dist/themes/dark.css";
import Link from "next/link";
import { formatVoteDate } from "@/lib/dateUtils";

interface VoteFormProps {
  eventId: string;
}

export default function VoteForm({ eventId }: VoteFormProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [evento, setEvento] = useState<Event | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calendarRef = useRef<HTMLInputElement>(null);
  const fpInstanceRef = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToEvent(eventId, (eventData) => {
      if (eventData) {
        setEvento(eventData);
        if (eventData.fechas_propuestas?.length === 1) {
          setSelectedDates([eventData.fechas_propuestas[0]]);
        }
      } else {
        setError("El evento solicitado no existe.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [eventId]);

  // Inicializar flatpickr cuando el evento termine de cargar
  useEffect(() => {
    if (!evento?.fechas_propuestas || !calendarRef.current) return;

    fpInstanceRef.current = flatpickr(calendarRef.current, {
      mode: "multiple",
      inline: true, // Mostrar siempre abierto
      dateFormat: "Y-m-d",
      locale: Spanish,
      enable: evento.fechas_propuestas, // Permitir solo fechas propuestas
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

  // Sincronizar cambios de los checkboxes al calendario
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
      // Registrar voto usando la capa de servicio
      await submitVote(eventId, user.email, selectedDates);

      // Llamar al backend para comprobar la resolución
      fetch("/api/comprobar-resolucion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId: eventId,
          voterEmail: user.email,
          selectedDates: selectedDates,
        }),
      }).catch((err) => console.error("Resolution check failed (non-blocking):", err));

      router.push("/");
    } catch (err: unknown) {
      console.error("Error submitting vote:", err);
      const msg = err instanceof Error ? err.message : "Error al registrar tu voto. Inténtalo de nuevo.";
      setError(msg);
      setSubmitting(false);
    }
  };

  const handleBlankVote = async () => {
    setError(null);

    if (!user?.email) {
      setError("Debes estar autenticado para votar.");
      return;
    }

    if (!window.confirm("¿Confirmas que no puedes asistir ningún día? Tu voto se registrará en blanco.")) {
      return;
    }

    setSubmitting(true);

    try {
      // Registrar voto en blanco [] usando la capa de servicio
      await submitVote(eventId, user.email, []);

      // Llamar al backend para comprobar la resolución
      fetch("/api/comprobar-resolucion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId: eventId,
          voterEmail: user.email,
          selectedDates: [],
        }),
      }).catch((err) => console.error("Resolution check failed (non-blocking):", err));

      router.push("/");
    } catch (err: unknown) {
      console.error("Error submitting blank vote:", err);
      const msg = err instanceof Error ? err.message : "Error al registrar tu voto. Inténtalo de nuevo.";
      setError(msg);
      setSubmitting(false);
    }
  };

  const isSingleOption = evento?.fechas_propuestas?.length === 1;
  const singleDate = isSingleOption ? (evento?.fechas_propuestas?.[0] || "") : "";

  const handleSingleChoice = async (attend: boolean) => {
    setError(null);

    if (!user?.email) {
      setError("Debes estar autenticado para votar.");
      return;
    }

    setSubmitting(true);

    try {
      const dates = attend && singleDate ? [singleDate] : [];
      await submitVote(eventId, user.email, dates);

      // Llamar al backend para comprobar la resolución
      fetch("/api/comprobar-resolucion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventoId: eventId,
          voterEmail: user.email,
          selectedDates: dates,
        }),
      }).catch((err) => console.error("Resolution check failed (non-blocking):", err));

      router.push("/");
    } catch (err: unknown) {
      console.error("Error submitting single choice vote:", err);
      const msg = err instanceof Error ? err.message : "Error al registrar tu voto. Inténtalo de nuevo.";
      setError(msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-zinc-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-zinc-400 tracking-wider animate-pulse">
            Cargando bacanal...
          </p>
        </div>
      </div>
    );
  }

  const userEmail = user?.email;
  const isVoterPending = evento?.votantes_pendientes?.includes(userEmail || "");

  if (!evento || !isVoterPending) {
    return (
      <div className="max-w-md mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-xl space-y-6 text-center">
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
        <p className="text-sm text-zinc-400">
          {error || "Ya has emitido tu voto o no tienes permisos para esta bacanal."}
        </p>
        <Link
          href="/"
          className="inline-flex w-full justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-sm font-semibold text-white transition-all"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  const getTipoLabel = (fecha: string) => {
    const tipo = evento?.opciones_tipo?.[fecha] || "cena";
    return tipo === "almuerzo" ? "Almuerzo" : "Cena";
  };

  return (
    <div className="space-y-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .voting-calendar-wrapper .flatpickr-day.is-proposed {
            background-color: rgba(236, 72, 153, 0.15) !important;
            border-color: rgba(236, 72, 153, 0.4) !important;
            color: #f472b6 !important;
            font-weight: bold;
          }
          
          .voting-calendar-wrapper .flatpickr-day.selected,
          .voting-calendar-wrapper .flatpickr-day.selected.is-proposed,
          .voting-calendar-wrapper .flatpickr-day.selected:hover,
          .voting-calendar-wrapper .flatpickr-day.selected:focus {
            background-color: #10b981 !important;
            color: #000000 !important;
            border-color: #10b981 !important;
            font-weight: bold !important;
          }
          
          .flatpickr-days .flatpickr-day:nth-child(n+36) {
            display: none !important;
          }
          
          .flatpickr-calendar.inline {
            margin: 0 auto;
            background: #0f172a !important;
            border: 1px solid #1e293b !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
          }
        `,
        }}
      />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="text-center space-y-2 border-b border-zinc-800 pb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Votación de Bacanal
          </h1>
          <p className="text-xs text-zinc-400">
            Tu voto es privado y se registrará de forma segura
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="border-b border-zinc-800 pb-6 text-center">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Fecha Límite para Votar
            </span>
            <p className="text-base font-bold text-indigo-400 leading-tight">
              {evento.fecha_tope}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSingleOption ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-center space-y-4">
              <p className="text-sm text-zinc-400">
                Esta bacanal solo tiene una fecha propuesta:
              </p>
              <p className="text-2xl font-extrabold text-indigo-400">
                {formatVoteDate(singleDate)} ({getTipoLabel(singleDate)})
              </p>
              <p className="text-xs text-zinc-400">
                ¿Confirmas tu asistencia para este día?
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-300">
                Selecciona las fechas que te convengan:
              </label>

              <div className="space-y-2">
                {evento.fechas_propuestas?.map((fecha) => (
                  <label
                    key={fecha}
                    className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-all select-none ${
                      selectedDates.includes(fecha)
                        ? "border-emerald-500/30 bg-emerald-500/5 text-white font-medium"
                        : "border-zinc-850 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedDates.includes(fecha)}
                        onChange={() => handleCheckboxChange(fecha)}
                        className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-500 outline-none"
                      />
                      <span>{formatVoteDate(fecha)} ({getTipoLabel(fecha)})</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 pt-6 border-t border-zinc-800">
            <label className="block text-sm font-semibold text-zinc-300">
              Calendario de Fechas Disponibles
            </label>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 flex flex-col items-center voting-calendar-wrapper">
              <input
                id="votingCalendar"
                type="text"
                ref={calendarRef}
                placeholder="Selecciona las fechas directamente aquí..."
                readOnly
                className="hidden"
              />
            </div>
            <p className="text-[10px] text-zinc-500 text-center">
              Días propuestos en <span className="text-pink-400 font-semibold">rosa</span>. Seleccionados en <span className="text-emerald-400 font-semibold">verde</span>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {isSingleOption ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSingleChoice(true)}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white py-3 text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  {submitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    "Asistiré"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSingleChoice(false)}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center rounded-lg bg-red-950/40 border border-red-800/80 hover:bg-red-900/60 active:bg-red-950 text-red-200 py-3 text-sm font-semibold transition-all disabled:opacity-50 shadow-lg cursor-pointer"
                >
                  {submitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-200 border-t-transparent"></div>
                  ) : (
                    "No puedo asistir"
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  {submitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    "Enviar Votación"
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBlankVote}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center rounded-lg bg-red-950/40 border border-red-800/80 hover:bg-red-900/60 active:bg-red-950 text-red-200 py-3 text-sm font-semibold transition-all disabled:opacity-50 shadow-lg cursor-pointer"
                >
                  {submitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-200 border-t-transparent"></div>
                  ) : (
                    "No puedo ningún día"
                  )}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
