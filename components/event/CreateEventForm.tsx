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

interface FlatpickrInstance {
  destroy: () => void;
  clear: () => void;
}

export default function CreateEventForm() {
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

  // Flatpickr instances refs
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

    // Validar que la fecha límite no sea posterior a la fecha propuesta más temprana
    const earliestDate = fechasPropuestas.reduce(
      (min, current) => (current < min ? current : min),
      fechasPropuestas[0]
    );
    if (fechaTope > earliestDate) {
      alert("Antes de esa fecha límite hay al menos un día propuesto para lunes de bacanal");
      setErrorMessage("Antes de esa fecha límite hay al menos un día propuesto para lunes de bacanal");
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

        <div className="space-y-2">
          <label htmlFor="fechaTope" className="block text-sm font-medium text-zinc-300">
            Fecha Límite para Votar
          </label>
          <input
            id="fechaTope"
            type="text"
            ref={fechaTopeRef}
            placeholder="Selecciona la fecha límite..."
            readOnly
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white placeholder-zinc-550 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer text-sm"
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
