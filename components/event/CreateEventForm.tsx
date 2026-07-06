"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchAllUsers } from "@/services/userService";
import { createEvent } from "@/services/eventService";
import flatpickr from "flatpickr";
import { Spanish } from "flatpickr/dist/l10n/es.js";
import "flatpickr/dist/themes/dark.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatVoteDate } from "@/lib/dateUtils";
export default function CreateEventForm() {
  const { user } = useAuth();
  const router = useRouter();

  // Form states
  const [motivo, setMotivo] = useState("Niños");
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("");
  const [fechasPropuestas, setFechasPropuestas] = useState<string[]>([]);
  const [fechaTope, setFechaTope] = useState<string>("");
  const [opcionesTipo, setOpcionesTipo] = useState<Record<string, "almuerzo" | "cena">>({});

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for flatpickr DOM inputs
  const fechasPropuestasRef = useRef<HTMLInputElement>(null);
  const fechaTopeRef = useRef<HTMLInputElement>(null);

  // Flatpickr instances refs
  const fpMultipleRef = useRef<flatpickr.Instance | null>(null);
  const fpSingleRef = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    // Initialize Fechas Propuestas datepicker (multiple selection + inline calendar)
    if (fechasPropuestasRef.current) {
      fpMultipleRef.current = flatpickr(fechasPropuestasRef.current, {
        mode: "multiple",
        inline: true, // Render inline always open
        dateFormat: "Y-m-d",
        locale: Spanish,
        minDate: "today",
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

          // Sincronizar opcionesTipo
          setOpcionesTipo((prev) => {
            const updated = { ...prev };
            dateStrings.forEach((d) => {
              if (!updated[d]) {
                updated[d] = "cena";
              }
            });
            Object.keys(updated).forEach((key) => {
              if (!dateStrings.includes(key)) {
                delete updated[key];
              }
            });
            return updated;
          });

          // Habilitar/Deshabilitar y restringir el selector de fechaTope
          if (dateStrings.length > 0) {
            const sortedDates = [...dateStrings].sort();
            const earliestDateStr = sortedDates[0];
            
            const parts = earliestDateStr.split("-");
            const earliestDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            const maxDate = new Date(earliestDate);
            maxDate.setDate(maxDate.getDate() - 1);

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (fpSingleRef.current) {
              fpSingleRef.current.set("minDate", tomorrow);
              fpSingleRef.current.set("maxDate", maxDate);

              const currentTope = fechaTopeRef.current?.value;
              if (currentTope) {
                const currentVal = new Date(currentTope);
                if (currentVal > maxDate || currentVal < tomorrow) {
                  fpSingleRef.current.clear();
                  setFechaTope("");
                }
              }
              fechaTopeRef.current?.removeAttribute("disabled");
            }
          } else {
            if (fpSingleRef.current) {
              fpSingleRef.current.clear();
              setFechaTope("");
              fechaTopeRef.current?.setAttribute("disabled", "true");
            }
          }
        },
      });
    }

    // Initialize Fecha Tope de Votación datepicker (single selection)
    if (fechaTopeRef.current) {
      fpSingleRef.current = flatpickr(fechaTopeRef.current, {
        mode: "single",
        dateFormat: "Y-m-d",
        locale: Spanish,
        minDate: "today",
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
      // Iniciar deshabilitado si no hay fechas seleccionadas
      fechaTopeRef.current.setAttribute("disabled", "true");
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

    if (!user || !user.email) {
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

    // Validar que la fecha límite sea anterior a la fecha propuesta más temprana
    const earliestDate = fechasPropuestas.reduce(
      (min, current) => (current < min ? current : min),
      fechasPropuestas[0]
    );
    if (fechaTope >= earliestDate) {
      setErrorMessage("La fecha límite para votar debe ser al menos un día antes del primer día propuesto.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (fechaTope <= todayStr) {
      setErrorMessage("La fecha límite para votar debe ser a partir de mañana.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Obtener todos los usuarios registrados usando la capa de servicio
      const usersList = await fetchAllUsers();
      let allEmails = usersList
        .map((u) => u.email)
        .filter((email): email is string => typeof email === "string");

      // Excluir al creador
      allEmails = allEmails.filter((email) => email !== user.email);

      if (allEmails.length === 0) {
        throw new Error(
          "No se encontraron otros usuarios registrados en el sistema para invitar automáticamente."
        );
      }

      // 2. Guardar el evento en Firestore usando eventService
      const newEventId = await createEvent({
        motivo: motivo === "Otros" ? motivoPersonalizado : motivo,
        fechas_propuestas: fechasPropuestas,
        fecha_tope: fechaTope,
        creador_uid: user.uid,
        creador_email: user.email,
        votantes_pendientes: allEmails,
        estado: "abierto",
        opciones_tipo: opcionesTipo,
      });

      // 3. Notificar a los invitados por correo vía API
      try {
        await fetch("/api/notificar-evento", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventoId: newEventId,
            votantes: allEmails,
            fechasPropuestas: fechasPropuestas,
            opcionesTipo: opcionesTipo,
          }),
        });
      } catch (notifyErr) {
        console.error("Error triggering email notification API:", notifyErr);
      }

      setSuccessMessage("Evento creado con éxito e invitados notificados.");

      // Limpiar Formulario
      setMotivo("Niños");
      setMotivoPersonalizado("");
      setFechasPropuestas([]);
      setFechaTope("");

      if (fpMultipleRef.current) fpMultipleRef.current.clear();
      if (fpSingleRef.current) fpSingleRef.current.clear();

      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      console.error("Error creating event:", err);
      const errorMsg = err instanceof Error ? err.message : "Error al crear el evento.";
      setErrorMessage(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-xl space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Solicitar Lunes de Bacanal
          </h1>
          <p className="text-xs text-zinc-400">
            Todos los usuarios registrados serán invitados de forma automática
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
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
        <div className="space-y-2">
          <label htmlFor="motivo" className="block text-sm font-medium text-zinc-300">
            Motivo del Evento
          </label>
          <select
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
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
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white placeholder-zinc-550 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-zinc-300">
            Fechas Propuestas
          </label>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 flex flex-col items-center proposals-calendar-wrapper">
            <input
              id="fechasPropuestas"
              type="text"
              ref={fechasPropuestasRef}
              placeholder="Selecciona las fechas en el calendario"
              readOnly
              className="hidden"
            />
          </div>
          <p className="text-xs text-zinc-500 text-center">
            Nota: Los lunes están resaltados en{" "}
            <span className="text-amber-400 font-semibold">dorado</span> en el calendario.
          </p>
        </div>

        {fechasPropuestas.length > 0 && (
          <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 animate-fadeIn">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Preferencias de Almuerzo / Cena
            </h3>
            <div className="divide-y divide-zinc-900">
              {fechasPropuestas.map((fecha) => (
                <div key={fecha} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-zinc-300 font-medium">
                    {formatVoteDate(fecha)}
                  </span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                      <input
                        type="radio"
                        name={`tipo-${fecha}`}
                        value="almuerzo"
                        checked={opcionesTipo[fecha] === "almuerzo"}
                        onChange={() => {
                          setOpcionesTipo((prev) => ({ ...prev, [fecha]: "almuerzo" }));
                        }}
                        className="h-3.5 w-3.5 border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className={opcionesTipo[fecha] === "almuerzo" ? "text-indigo-400 font-bold" : "text-zinc-500"}>
                        Almuerzo
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                      <input
                        type="radio"
                        name={`tipo-${fecha}`}
                        value="cena"
                        checked={opcionesTipo[fecha] === "cena" || !opcionesTipo[fecha]}
                        onChange={() => {
                          setOpcionesTipo((prev) => ({ ...prev, [fecha]: "cena" }));
                        }}
                        className="h-3.5 w-3.5 border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className={opcionesTipo[fecha] === "cena" || !opcionesTipo[fecha] ? "text-indigo-400 font-bold" : "text-zinc-500"}>
                        Cena
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="fechaTope" className="block text-sm font-medium text-zinc-300">
            Fecha Límite para Votar
          </label>
          <input
            id="fechaTope"
            type="text"
            ref={fechaTopeRef}
            placeholder={fechasPropuestas.length === 0 ? "Primero selecciona fechas propuestas..." : "Selecciona la fecha límite..."}
            readOnly
            disabled={fechasPropuestas.length === 0}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white placeholder-zinc-550 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:border-zinc-800"
          />
        </div>

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
  );
}
