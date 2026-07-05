import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { VenetianMask } from "lucide-react";
import { Event } from "@/services/types";

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
  const upcomingEvents = futureEvents.filter((ev) => ev.estado === "cerrado");

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
                className="relative rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-4 space-y-3 shadow-inner"
              >
                <div className="absolute top-0 right-0 bg-emerald-500/15 text-emerald-400 text-[9px] uppercase font-bold px-2 py-0.5 rounded-bl-lg">
                  Programado
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Fecha del Bacanal</p>
                  <p className="text-base font-extrabold text-emerald-400">
                    {ev.fecha_elegida ? formatVoteDate(ev.fecha_elegida) : ""}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-900 space-y-1 text-xs text-zinc-400">
                  <p>Motivo: <span className="text-zinc-300 font-semibold">[Reservado - Secreto]</span></p>
                  <p>Creador: <span className="text-zinc-300 font-semibold">[Anónimo]</span></p>
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
