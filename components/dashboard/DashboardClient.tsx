"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUserProfile, subscribeToAllUsers } from "@/services/userService";
import { subscribeToPendingEvents, subscribeToAllEvents, resolveTie } from "@/services/eventService";
import { Event, UserProfile } from "@/services/types";

// Import custom Presentation components
import HeroCard from "./HeroCard";
import PendingVotesCard from "./PendingVotesCard";
import UpcomingCard from "./UpcomingCard";
import HistoryCard from "./HistoryCard";
import { isPastEvent } from "@/lib/dateUtils";

export default function DashboardClient() {
  const { user } = useAuth();
  const [pendingVotes, setPendingVotes] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dbUser, setDbUser] = useState<UserProfile | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // Subscriptions to User profile & User list
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribeProfile = subscribeToUserProfile(user.uid, (profile) => {
      setDbUser(profile);
    });

    const unsubscribeUsers = subscribeToAllUsers((users) => {
      setUsersList(users);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeUsers();
    };
  }, [user]);

  // Subscriptions to Events
  useEffect(() => {
    if (!user?.email) return;

    const unsubscribePending = subscribeToPendingEvents(user.email, (events) => {
      setPendingVotes(events);
    });

    const unsubscribeAll = subscribeToAllEvents((events) => {
      setAllEvents(events);
      setLoadingData(false);
    });

    return () => {
      unsubscribePending();
      unsubscribeAll();
    };
  }, [user]);

  const handleResolveTie = async (eventoId: string, fecha: string) => {
    const key = `${eventoId}-${fecha}`;
    setResolvingId(key);
    try {
      await resolveTie(eventoId, fecha);
      alert("¡Empate resuelto con éxito! La notificación ha sido enviada a todos los participantes.");
    } catch (err: unknown) {
      console.error("Error resolving tie:", err);
      const msg = err instanceof Error ? err.message : "Error al resolver el empate.";
      alert(msg);
    } finally {
      setResolvingId(null);
    }
  };

  const pastEvents = allEvents.filter((ev) => isPastEvent(ev.fecha_elegida, ev.estado));
  const futureEvents = allEvents.filter((ev) => {
    if (isPastEvent(ev.fecha_elegida, ev.estado)) return false;
    if (ev.estado === "empate") return false;
    if (ev.estado === "abierto") {
      const isPending = ev.votantes_pendientes?.includes(user?.email || "");
      return !isPending;
    }
    return true;
  });
  const tiedEvents = allEvents.filter((ev) => ev.creador_uid === user?.uid && ev.estado === "empate");

  if (loadingData) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
          <p className="text-xs font-semibold tracking-wider text-zinc-500 animate-pulse uppercase">
            Cargando datos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Hero / Acción Principal */}
      <HeroCard name={dbUser?.nombre || user?.displayName || user?.email || "Usuario"} />

      {/* Buzón de Notificaciones */}
      <PendingVotesCard
        pendingVotes={pendingVotes}
        tiedEvents={tiedEvents}
        onResolveTie={handleResolveTie}
        resolvingId={resolvingId}
      />

      {/* Bacanales Próximas */}
      <UpcomingCard futureEvents={futureEvents} />

      {/* Histórico Revelado */}
      <HistoryCard pastEvents={pastEvents} usersList={usersList} />
    </div>
  );
}
