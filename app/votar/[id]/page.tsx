import React from "react";
import Header from "@/components/Header";
import VoteForm from "@/components/event/VoteForm";
import ProtectedRoute from "@/components/ProtectedRoute";

interface PageProps {
  params: {
    id: string;
  };
}

export default function VotarPage({ params }: PageProps) {
  const id = params.id;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-[family-name:var(--font-geist-sans)]">
        <Header />

        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center p-6 my-10 relative">
          {/* Decorative Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-600/5 blur-[150px]"></div>

          <VoteForm eventId={id} />
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800 bg-zinc-900/20 py-6 text-center text-sm text-zinc-500 mt-auto">
          &copy; {new Date().getFullYear()} Lunes Bacanal. Todos los derechos reservados.
        </footer>
      </div>
    </ProtectedRoute>
  );
}
