import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BellRing, ArrowRight } from "lucide-react";
import { Event } from "@/services/types";

interface PendingVotesCardProps {
  pendingVotes: Event[];
  tiedEvents: Event[];
  onResolveTie: (eventId: string, date: string) => void;
  resolvingId: string | null;
}

export default function PendingVotesCard({
  pendingVotes,
  tiedEvents,
  onResolveTie,
  resolvingId,
}: PendingVotesCardProps) {
  const hasNotifications = pendingVotes.length > 0 || tiedEvents.length > 0;

  return (
    <Card className="md:col-span-2 border-zinc-800 bg-zinc-900/10 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-zinc-900/50 pb-4">
        <div className="relative">
          <BellRing className="h-5 w-5 text-indigo-500" />
          {hasNotifications && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
          )}
        </div>
        <div>
          <CardTitle className="text-lg font-bold text-zinc-100">Buzón de Notificaciones</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Alertas de votaciones y empates que requieren tu atención
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Empates first */}
        {tiedEvents.length > 0 && (
          <div className="space-y-4">
            {tiedEvents.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-3"
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-red-400">¡Votación en Empate!</h4>
                  <p className="text-xs text-zinc-300">
                    Como organizador de esta bacanal, debes desempatar eligiendo una de las fechas más votadas:
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ev.fechas_empatadas?.map((fecha) => {
                    const isResolving = resolvingId === `${ev.id}-${fecha}`;
                    return (
                      <button
                        key={fecha}
                        onClick={() => onResolveTie(ev.id, fecha)}
                        disabled={resolvingId !== null}
                        className="rounded bg-red-950/60 hover:bg-red-900 border border-red-800 text-xs font-semibold px-3 py-1.5 text-red-200 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        {isResolving ? "Resolviendo..." : fecha}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending Votes */}
        {pendingVotes.length > 0 && (
          <div className="space-y-3">
            {pendingVotes.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 hover:border-amber-500/30 transition-colors"
              >
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-amber-200">Tienes una votación pendiente</h4>
                  <p className="text-[11px] text-zinc-400">
                    Fecha límite para votar: <span className="text-amber-400 font-semibold">{ev.fecha_tope}</span>
                  </p>
                </div>
                <Link
                  href={`/votar/${ev.id}`}
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                    className:
                      "text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 font-medium flex items-center gap-1.5 cursor-pointer text-xs border border-amber-500/20 bg-amber-950/20",
                  })}
                >
                  Votar
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}

        {!hasNotifications && (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <p className="text-sm font-medium text-zinc-400">Todo en orden por aquí</p>
            <p className="text-xs text-zinc-500">No tienes votaciones ni empates pendientes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
