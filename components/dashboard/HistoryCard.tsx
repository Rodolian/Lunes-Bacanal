import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PartyPopper } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Event, UserProfile } from "@/services/types";

interface HistoryCardProps {
  pastEvents: Event[];
  usersList: UserProfile[];
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

export default function HistoryCard({ pastEvents, usersList }: HistoryCardProps) {
  const getCreatorUser = (creadorUid?: string) => {
    if (!creadorUid) return null;
    return usersList.find((u) => u.uid === creadorUid) || null;
  };

  return (
    <Card className="md:col-span-3 border-zinc-800 bg-zinc-900/10 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-zinc-900/50 pb-4">
        <PartyPopper className="h-5 w-5 text-amber-500" />
        <div>
          <CardTitle className="text-lg font-bold text-zinc-100">Histórico</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Bacanales pasadas
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {pastEvents.length > 0 ? (
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
                  className="relative rounded-lg border border-zinc-800/80 bg-zinc-950/20 p-5 space-y-3 hover:border-zinc-700 transition-all"
                >
                  <div className="absolute top-0 right-0 bg-amber-500/15 text-amber-400 text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-bl-lg">
                    Revelado
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-400">
                      Fecha del Bacanal: <span className="text-zinc-350 font-semibold">{ev.fecha_elegida ? formatVoteDate(ev.fecha_elegida) : ""}</span>
                    </p>
                    
                    <div className="flex items-start gap-2.5">
                      <PartyPopper className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-zinc-100 leading-tight">
                          {ev.motivo}
                        </p>
                        
                        <div className="flex items-center gap-1.5 mt-2.5">
                          <Avatar className="h-5 w-5 border border-zinc-850">
                            <AvatarImage src={creatorUser?.photoURL || undefined} />
                            <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-400 font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] text-zinc-400">
                            Organizado por <span className="text-zinc-300 font-medium">{creatorName}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <p className="text-sm font-medium text-zinc-450">El baúl está vacío</p>
            <p className="text-xs text-zinc-500">Aún no se han completado y revelado bacanales</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
