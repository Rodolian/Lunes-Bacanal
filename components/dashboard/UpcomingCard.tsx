import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VenetianMask } from "lucide-react";
import { Event } from "@/services/types";
import { cn } from "@/lib/utils";

interface UpcomingCardProps {
  futureEvents: Event[];
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

export default function UpcomingCard({ futureEvents }: UpcomingCardProps) {
  const upcomingEvents = futureEvents;

  const getEventStats = (event: Event) => {
    const propuestas = event.fechas_propuestas || [];
    const countMap: Record<string, number> = {};
    propuestas.forEach((f) => {
      countMap[f] = 0;
    });

    let totalValidos = 0;
    if (event.votos) {
      event.votos.forEach((voto) => {
        if (voto.email === event.creador_email) return;
        totalValidos++;
        voto.fechas_elegidas.forEach((f) => {
          if (f in countMap) {
            countMap[f]++;
          }
        });
      });
    }

    return { countMap, totalValidos };
  };

  return (
    <Card className="md:col-span-1 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-zinc-900/50 pb-4">
        <VenetianMask className="h-5 w-5 text-emerald-500" />
        <div>
          <CardTitle className="text-lg font-bold text-zinc-100">Bacanales Próximas</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Eventos programados a celebrarse pronto
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {upcomingEvents.length > 0 ? (
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {upcomingEvents.map((ev) => (
              <div
                key={ev.id}
                className={cn(
                  "relative rounded-lg p-4 space-y-3 shadow-inner border transition-all",
                  ev.estado === "cerrado"
                    ? "border-emerald-500/10 bg-emerald-500/5"
                    : "border-amber-500/15 bg-amber-500/5"
                )}
              >
                <div
                  className={cn(
                    "absolute top-0 right-0 text-[9px] uppercase font-bold px-2 py-0.5 rounded-bl-lg",
                    ev.estado === "cerrado"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-amber-500/15 text-amber-400"
                  )}
                >
                  {ev.estado === "cerrado" ? "Programado" : "En Votación"}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {ev.estado === "cerrado" ? "Fecha del Bacanal" : "Estado del Evento"}
                  </p>
                  <p
                    className={cn(
                      "text-base font-extrabold",
                      ev.estado === "cerrado" ? "text-emerald-400" : "text-amber-400"
                    )}
                  >
                    {ev.estado === "cerrado" && ev.fecha_elegida
                      ? formatVoteDate(ev.fecha_elegida)
                      : "Esperando votos..."}
                  </p>
                </div>

                {/* Progress bars for voting details */}
                {ev.estado === "abierto" && (
                  <div className="pt-2 border-t border-zinc-800/60 space-y-2">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">
                      Progreso de votos
                    </p>
                    {(() => {
                      const { countMap, totalValidos } = getEventStats(ev);
                      return (ev.fechas_propuestas || []).map((fecha) => {
                        const count = countMap[fecha] || 0;
                        const pct = totalValidos > 0 ? (count / totalValidos) * 100 : 0;
                        return (
                          <div key={fecha} className="grid grid-cols-[70px_1fr_45px] items-center gap-2 text-[10px]">
                            <span className="text-zinc-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                              {formatVoteDate(fecha)}
                            </span>
                            <div className="h-1.5 w-full rounded-full bg-zinc-950/60 border border-zinc-800/40 overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                              />
                            </div>
                            <span className="font-bold text-zinc-300 text-right whitespace-nowrap">
                              {count} {count === 1 ? "voto" : "votos"}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-800 space-y-1 text-xs text-zinc-400">
                  {ev.estado === "abierto" && ev.fecha_tope && (
                    <p>Cierre de votación: <span className="text-zinc-300 font-semibold">{ev.fecha_tope}</span></p>
                  )}
                  <p>Motivo: <span className="text-zinc-300 font-semibold">{"[Reservado - Secreto]"}</span></p>
                  {ev.estado === "abierto" && (
                    <p>Pendientes: <span className="text-zinc-300 font-semibold">{(ev.votantes_pendientes || []).length} usuarios</span></p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-1">
            <p className="text-sm font-medium text-zinc-400">Ninguna próxima</p>
            <p className="text-xs text-zinc-500">No hay bacanales programadas de inmediato</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
