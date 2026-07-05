"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import Link from "next/link";
import Header from "@/components/Header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarPlus, BellRing, VenetianMask, PartyPopper } from "lucide-react";

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
  uid?: string;
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
  const { user } = useAuth();
  const [pendingVotes, setPendingVotes] = useState<Evento[]>([]);
  const [allEvents, setAllEvents] = useState<Evento[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dbUser, setDbUser] = useState<UsuarioFirestore | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<UsuarioFirestore[]>([]);


  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, "usuarios"), (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        uid: docSnap.id,
        ...docSnap.data(),
      })) as UsuarioFirestore[];
      setUsersList(list);
    });
  }, []);

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

  // Helper to determine if an event is in the past / resolved (closed + > 1 day after fecha_elegida)
  const isPastEvent = (event: Evento) => {
    if (event.estado !== "cerrado" || !event.fecha_elegida) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = event.fecha_elegida.split("-");
    if (parts.length !== 3) return false;
    const elegidaDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    elegidaDate.setHours(0, 0, 0, 0);

    const graceDate = new Date(elegidaDate);
    graceDate.setDate(graceDate.getDate() + 1);
    graceDate.setHours(0, 0, 0, 0);

    return today.getTime() > graceDate.getTime();
  };

  const getCreatorUser = (creadorUid?: string) => {
    if (!creadorUid) return null;
    return usersList.find((u) => u.uid === creadorUid) || null;
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
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 font-[family-name:var(--font-geist-sans)]">
      <Header />

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-6 space-y-8 my-6 z-10">
        
        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Hero / Acción Principal */}
          <Card className="md:col-span-3 border-zinc-800 bg-zinc-900/20 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center text-center p-8 space-y-6">
              <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                Hola, {dbUser?.nombre || "Usuario"}
              </h1>
              <Link
                href="/crear-evento"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-8 py-6 h-auto cursor-pointer border-none shadow-none flex items-center gap-2"
                )}
              >
                <CalendarPlus className="h-5 w-5" />
                Solicitar Lunes de Bacanal
              </Link>
            </CardContent>
          </Card>

          {/* Votaciones Pendientes / Empates */}
          <Card className="md:col-span-2 border-zinc-850 bg-zinc-900/10">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-zinc-900/50 pb-4">
              <BellRing className="h-5 w-5 text-indigo-400 animate-pulse" />
              <div>
                <CardTitle className="text-lg font-bold text-zinc-100">Votaciones Pendientes</CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Acciones que requieren tu participación
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              {/* Empates first */}
              {tiedEvents.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
                    Empates por Resolver ({tiedEvents.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {tiedEvents.map((evento) => (
                      <div
                        key={evento.id}
                        className="rounded-xl border border-red-500/20 bg-red-950/5 p-5 space-y-3"
                      >
                        <div>
                          <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                            Desempate requerido
                          </span>
                          <h4 className="font-bold text-zinc-100 text-sm mt-1">
                            Elige la fecha definitiva para la bacanal:
                          </h4>
                          <p className="text-xs text-zinc-300 mt-1">
                            Motivo: <span className="text-zinc-200 font-semibold">{evento.motivo || "Sin motivo"}</span>
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            Fecha límite de votación: {evento.fecha_tope}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {evento.fechas_empatadas && evento.fechas_empatadas.length > 0 ? (
                            evento.fechas_empatadas.map((fecha) => (
                              <button
                                key={fecha}
                                onClick={() => handleResolveTie(evento.id, fecha)}
                                disabled={resolvingId === `${evento.id}-${fecha}`}
                                className="w-full flex justify-between items-center rounded-lg bg-red-950/20 border border-red-500/10 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-red-900/20 hover:border-red-500/30 transition-all disabled:opacity-50"
                              >
                                <span>{formatVoteDate(fecha)}</span>
                                <span className="text-[10px] bg-red-500/25 text-red-300 px-1.5 py-0.5 rounded font-bold">
                                  Elegir esta fecha
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="text-xs text-zinc-500 italic">No hay fechas empatadas disponibles.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending user votes */}
              {loadingData ? (
                <div className="flex justify-center py-6 text-zinc-500 animate-pulse text-sm">
                  Cargando votaciones...
                </div>
              ) : pendingVotes.length === 0 && tiedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-500">
                  <p className="text-sm">No tienes ninguna votación pendiente en este momento.</p>
                  <p className="text-xs text-zinc-600 mt-1">¡Estás al día!</p>
                </div>
              ) : (
                pendingVotes.length > 0 && (
                  <div className="space-y-4">
                    {tiedEvents.length > 0 && <div className="border-t border-zinc-900/50 my-4"></div>}
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Pendientes de Votar ({pendingVotes.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {pendingVotes.map((evento) => (
                        <div
                          key={evento.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-550/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
                              <span className="h-1 w-1 rounded-full bg-indigo-400 animate-ping"></span>
                              Voto pendiente
                            </span>
                            <h4 className="font-bold text-zinc-105 text-sm">
                              Bacanal sorpresa propuesto
                            </h4>
                            <p className="text-xs text-zinc-300">
                              Motivo: <span className="text-zinc-200 font-semibold">{evento.motivo}</span>
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              Fecha límite: {evento.fecha_tope}
                            </p>
                          </div>
                          <Link
                            href={`/votar/${evento.id}`}
                            className={cn(
                              buttonVariants({ size: "sm" }),
                              "bg-indigo-600 hover:bg-indigo-500 text-white font-medium self-start sm:self-center cursor-pointer"
                            )}
                          >
                            Votar ahora
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Bacanales Próximas */}
          <Card className="md:col-span-1 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
            <CardHeader className="border-b border-zinc-900/50 pb-4">
              <CardTitle className="text-lg font-bold text-zinc-100">Bacanales Próximas</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Planificación de eventos futuros
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {loadingData ? (
                <div className="h-20 rounded-xl bg-zinc-900/20 animate-pulse border border-zinc-800"></div>
              ) : futureEvents.length === 0 ? (
                <p className="text-xs text-zinc-500 italic text-center py-4">No hay eventos activos.</p>
              ) : (
                <div className="space-y-4">
                  {futureEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 space-y-3 relative overflow-hidden"
                    >
                      {ev.estado === "cerrado" ? (
                        <>
                          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-bl-lg">
                            Programado
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              ¡Bacanal programado!
                            </p>
                            <h4 className="font-bold text-zinc-100 text-sm">
                              Fecha elegida:{" "}
                              <span className="text-emerald-400 block font-semibold text-base mt-0.5">
                                {ev.fecha_elegida ? formatVoteDate(ev.fecha_elegida) : ""}
                              </span>
                            </h4>
                            
                            <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1 border-t border-zinc-900">
                              <VenetianMask className="h-4 w-4 text-zinc-550 shrink-0" />
                              <div>
                                <p className="text-[10px] text-zinc-500">Organizador y Motivo</p>
                                <p className="italic text-zinc-400 font-medium select-none">Reservado - Secreto</p>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-400 text-[9px] uppercase font-bold px-2 py-0.5 rounded-bl-lg">
                            En Votación
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs text-zinc-400">
                              Fecha Límite: <span className="text-zinc-300 font-semibold">{ev.fecha_tope}</span>
                            </p>
                            <div className="flex items-center gap-2 text-xs text-zinc-400 pb-2">
                              <VenetianMask className="h-4 w-4 text-zinc-500 shrink-0" />
                              <div className="space-y-0.5">
                                <p className="text-[10px] text-zinc-500">Motivo de propuesta</p>
                                <p className="italic text-zinc-400 select-none">Reservado - Secreto</p>
                              </div>
                            </div>

                            {/* Active votes preview */}
                            <div className="pt-2.5 border-t border-zinc-900 space-y-1.5">
                              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                                Votos actuales de invitados
                              </p>
                              <div className="grid grid-cols-1 gap-1.5">
                                {ev.fechas_propuestas?.map((fecha) => {
                                  const count = getVoteCountForDate(ev, fecha);
                                  return (
                                    <div
                                      key={fecha}
                                      className="flex justify-between items-center bg-zinc-950/60 border border-zinc-900 px-2 py-1 rounded text-[11px]"
                                    >
                                      <span className="text-zinc-400">{formatVoteDate(fecha)}</span>
                                      <span className="font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded">
                                        {count} {count === 1 ? 'voto' : 'votos'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Histórico Revelado */}
        <Card className="border-zinc-800 bg-zinc-900/10">
          <CardHeader className="flex flex-row items-center gap-2 border-b border-zinc-900/50 pb-4">
            <PartyPopper className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle className="text-lg font-bold text-zinc-100">Histórico Revelado</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Bacanales pasadas y sus secretos descubiertos
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loadingData ? (
              <div className="h-20 rounded-xl bg-zinc-900/20 animate-pulse border border-zinc-800"></div>
            ) : pastEvents.length === 0 ? (
              <p className="text-xs text-zinc-500 italic text-center py-6">No hay eventos pasados registrados.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastEvents.map((ev) => {
                  const creatorUser = getCreatorUser(ev.creador_uid);
                  const creatorName = creatorUser?.nombre || ev.creador_email || "Anónimo";
                  const initials = creatorUser?.nombre 
                    ? creatorUser.nombre.substring(0, 2).toUpperCase() 
                    : (ev.creador_email ? ev.creador_email.substring(0, 2).toUpperCase() : "?");
                  
                  return (
                    <div
                      key={ev.id}
                      className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-3 relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="absolute top-0 right-0 bg-amber-500/15 text-amber-400 text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-bl-lg">
                        Revelado
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[11px] text-zinc-400">
                          Fecha del Bacanal: <span className="text-zinc-300 font-semibold">{ev.fecha_elegida ? formatVoteDate(ev.fecha_elegida) : ""}</span>
                        </p>
                        
                        <div className="flex items-start gap-2.5">
                          <PartyPopper className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-zinc-500 font-medium">Motivo de reunión</p>
                            <h4 className="font-bold text-indigo-400 text-sm">
                              {ev.motivo}
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar size="sm" className="h-6 w-6 border border-zinc-850">
                            <AvatarImage src={creatorUser?.photoURL || undefined} alt={creatorName} />
                            <AvatarFallback className="bg-zinc-850 text-[9px] text-zinc-300 font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-[11px]">
                            <span className="text-zinc-550">Propuesto por: </span>
                            <span className="text-zinc-300 font-medium">{creatorName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-850 bg-zinc-950 py-6 text-center text-xs text-zinc-500 mt-auto">
        &copy; {new Date().getFullYear()} Lunes Bacanal. Todos los derechos reservados.
      </footer>
    </div>
  );
}
