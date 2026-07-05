import React from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarPlus } from "lucide-react";

interface HeroCardProps {
  name: string;
}

export default function HeroCard({ name }: HeroCardProps) {
  return (
    <Card className="md:col-span-3 border-zinc-800 bg-zinc-900/20 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center text-center p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Hola, {name}
          </h2>
        </div>
        <Link
          href="/crear-evento"
          className={buttonVariants({
            variant: "default",
            size: "lg",
            className:
              "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10",
          })}
        >
          <CalendarPlus className="h-5 w-5" />
          Proponer Lunes de Bacanal
        </Link>
      </CardContent>
    </Card>
  );
}
