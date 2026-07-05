"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import Link from "next/link";

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
  fecha_elegida?: string;
  fecha_evento?: string;
  votos?: Voto[];
  estado?: string;
  fechas_empatadas?: string[];
}

interface UsuarioFirestore {
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

const getVoteCountForDate = (ev: Evento, dateStr: string): number => {
  if (!ev.votos) return 0;
  return ev.votos.filter(
    (v) => v.email !== ev.creador_email && v.fechas_elegidas.includes(dateStr)
  ).length;
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [pendingVotes, setPendingVotes] = useState<Evento[]>([]);
  const [allEvents, setAllEvents] = useState<Evento[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dbUser, setDbUser] = useState<UsuarioFirestore | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const getInitials = () => {
    if (dbUser?.nombre) {
      return dbUser.nombre.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "?";
  };

  useEffect(() => {
    if (!db || !user?.uid) return;
    return onSnapshot(doc(db, "usuarios", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setDbUser(docSnap.data());
      }
    });
  }, [user]);

  useEffect(() => {
    if (!db || !user?.email) {
      setLoadingData(false);
      return;
    }

    // 1. Listen for pending votes (where user email is in votantes_pendientes)
    const qPending = query(
      collection(db, "eventos"),
      where("votantes_pendientes", "array-contains", user.email)
    );

    const unsubscribePending = onSnapshot(
      qPending,
      (snapshot) => {
        const events = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Evento[];
        setPendingVotes(events);
      },
      (error) => {
        console.error("Error listening to pending events:", error);
      }
    );

    // 2. Listen for all events to display in the history
    const qAll = query(collection(db, "eventos"));

    const unsubscribeAll = onSnapshot(
      qAll,
      (snapshot) => {
        const events = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Evento[];
        setAllEvents(events);
        setLoadingData(false);
      },
      (error) => {
        console.error("Error listening to all events:", error);
        setLoadingData(false);
      }
    );

    return () => {
      unsubscribePending();
      unsubscribeAll();
    };
  }, [user]);

  // Helper to determine if an event is in the past / resolved
  const isPastEvent = (event: Evento) => {
    if (event.estado === "cerrado") return true;
    if (event.estado === "empate") return false; // Needs manual resolution
    if (event.fecha_elegida && event.fecha_elegida < todayStr) return true;
    if (event.fecha_evento && event.fecha_evento < todayStr) return true;
    if (event.fecha_tope && event.fecha_tope < todayStr) return true;
    return false;
  };

  const pastEvents = allEvents.filter((ev) => isPastEvent(ev));
  const futureEvents = allEvents.filter((ev) => !isPastEvent(ev) && ev.estado !== "empate");
  const tiedEvents = allEvents.filter((ev) => ev.creador_uid === user?.uid && ev.estado === "empate");

  const handleResolveTie = async (eventoId: string, fecha: string) => {
    const key = `${eventoId}-${fecha}`;
    setResolvingId(key);
    try {
      const response = await fetch("/api/resolver-empate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventoId, fecha_elegida: fecha }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al resolver el empate.");
      }
      alert("¡Empate resuelto con éxito! La notificación ha sido enviada a todos los participantes.");
    } catch (err: unknown) {
      console.error("Error resolving tie:", err);
      const msg = err instanceof Error ? err.message : "Error al resolver el empate.";
      alert(msg);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-[family-name:var(--font-geist-sans)]">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/30 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Lunes Bacanal" className="h-8 w-8 rounded-lg shadow-md shadow-indigo-500/20 object-cover" />
            <span className="font-bold tracking-tight text-white">Lunes Bacanal</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 md:inline-block">
              Conectado como: <strong className="text-slate-200">{user?.email}</strong>
            </span>
            <Link
              href="/perfil"
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-1.5 hover:border-slate-700 transition-all"
            >
              <div className="h-6 w-6 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                {dbUser?.photoURL ? (
                  <img src={dbUser.photoURL} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span>{getInitials()}</span>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-300 hover:text-white hidden sm:inline-block">
                {dbUser?.nombre || "Mi Perfil"}
              </span>
            </Link>
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
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-6 space-y-10 my-8">
        {/* Decorative Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[600px] w-[600px] rounded-full bg-indigo-600/5 blur-[150px]"></div>

        {/* Central Action Area */}
        <section className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm space-y-6">
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Hola {dbUser?.nombre || "Usuario"}
          </h1>
          <Link
            href="/crear-evento"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-indigo-500 active:bg-indigo-700 shadow-xl shadow-indigo-600/30 transform hover:-translate-y-0.5"
          >
            Solicitar Lunes de Bacanal
          </Link>
        </section>

        {/* Votaciones en Empate Section */}
        {tiedEvents.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-red-500 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              <span>Votaciones en Empate</span>
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400 font-semibold">
                {tiedEvents.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {tiedEvents.map((evento) => (
                <div
                  key={evento.id}
                  className="rounded-xl border border-red-500/30 bg-red-950/10 p-6 flex flex-col justify-between space-y-4 hover:border-red-500/50 transition-colors shadow-lg shadow-red-500/5"
                >
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                      Resolución requerida
                    </span>
                    <h3 className="font-bold text-white text-lg">
                      ¡Empate! Elige la fecha definitiva:
                    </h3>
                    <p className="text-sm font-semibold text-slate-350">
                      Motivo: <span className="text-slate-200">{evento.motivo || "Sin motivo"}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Fecha límite: <strong className="text-slate-300">{evento.fecha_tope}</strong>
                    </p>
                  </div>
                  
                  {/* Tie-breaker action buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    {evento.fechas_empatadas && evento.fechas_empatadas.length > 0 ? (
                      evento.fechas_empatadas.map((fecha) => (
                        <button
                          key={fecha}
                          onClick={() => handleResolveTie(evento.id, fecha)}
                          disabled={resolvingId === `${evento.id}-${fecha}`}
                          className="w-full flex justify-between items-center rounded-lg bg-red-950/40 border border-red-500/20 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-red-900/20 hover:border-red-500/40 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                          <span>{formatVoteDate(fecha)}</span>
                          <span className="text-[11px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-bold">
                            Elegir esta fecha
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">No hay fechas empatadas disponibles.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pending Votes Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Votaciones Pendientes</span>
            {pendingVotes.length > 0 && (
              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-400 font-semibold">
                {pendingVotes.length}
              </span>
            )}
          </h2>

          {loadingData ? (
            <div className="flex justify-center py-6 text-slate-500 animate-pulse text-sm">
              Cargando notificaciones...
            </div>
          ) : pendingVotes.length === 0 ? (
            <div className="rounded-xl border border-slate-800/50 bg-slate-900/10 p-6 text-center text-slate-500 text-sm">
              No tienes ninguna votación pendiente en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {pendingVotes.map((evento) => (
                <div
                  key={evento.id}
                  className="rounded-xl border border-indigo-500/20 bg-indigo-950/10 p-6 flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                      Acción requerida
                    </span>
                    <h3 className="font-bold text-white text-lg pt-1">
                      Tienes una votación pendiente
                    </h3>
                    <p className="text-sm font-semibold text-indigo-400">
                      Motivo: <span className="text-slate-200">{evento.motivo}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Fecha límite: <strong className="text-slate-300">{evento.fecha_tope}</strong>
                    </p>
                  </div>
                  <Link
                    href={`/votar/${evento.id}`}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500"
                  >
                    Votar ahora
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* History / Events Section */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-white border-b border-slate-800 pb-2">
            Histórico
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Future Events Card list */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">
                Eventos Activos
              </h3>
              {loadingData ? (
                <div className="h-20 rounded-xl bg-slate-900/20 animate-pulse border border-slate-800"></div>
              ) : futureEvents.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No hay eventos futuros registrados.</p>
              ) : (
                futureEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-5 rounded-xl border border-slate-850 bg-slate-900/20 space-y-2 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-slate-800 text-slate-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-lg">
                      Oculto
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">
                        Fecha Límite: <span className="text-slate-300">{ev.fecha_tope}</span>
                      </p>
                      <h4 className="font-bold text-slate-300">
                        Motivo: <span className="text-slate-500 italic select-none">[Reservado - Secreto]</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Creador: <span className="text-slate-500 italic select-none">[Anónimo]</span>
                      </p>

                      {/* Active votes preview */}
                      <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-left">
                        <p className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">
                          Votación en Curso (Votos de invitados)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {ev.fechas_propuestas?.map((fecha) => {
                            const count = getVoteCountForDate(ev, fecha);
                            return (
                              <div
                                key={fecha}
                                className="flex justify-between items-center bg-slate-950/40 border border-slate-850 px-2 py-1 rounded text-xs"
                              >
                                <span className="text-slate-400">{formatVoteDate(fecha)}</span>
                                <span className="font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Past Events Card list (The Secret Revealed!) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-amber-400 tracking-wider uppercase">
                Eventos Pasados
              </h3>
              {loadingData ? (
                <div className="h-20 rounded-xl bg-slate-900/20 animate-pulse border border-slate-800"></div>
              ) : pastEvents.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No hay eventos pasados registrados.</p>
              ) : (
                pastEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-lg">
                      Revelado
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">
                        Fecha Límite: <span className="text-slate-300">{ev.fecha_tope}</span>
                      </p>
                      <h4 className="font-bold text-white">
                        Motivo: <span className="text-indigo-400 font-semibold">{ev.motivo}</span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        Creado por: <span className="text-slate-400">{ev.creador_email || "Usuario de la App"}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/20 py-6 text-center text-sm text-slate-500 mt-auto">
        &copy; {new Date().getFullYear()} Lunes Bacanal. Todos los derechos reservados.
      </footer>
    </div>
  );
}
