import React from "react";
import Header from "@/components/Header";
import CreateEventForm from "@/components/event/CreateEventForm";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function CrearEventoPage() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-[family-name:var(--font-geist-sans)]">
        {/* CSS Injection for gold Mondays in Flatpickr */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .flatpickr-day.is-monday {
              background-color: #ffd700 !important;
              color: #000000 !important;
              font-weight: bold !important;
              border-color: #ffd700 !important;
            }
            .flatpickr-day.is-monday:hover, 
            .flatpickr-day.is-monday:focus {
              background-color: #e5c100 !important;
              border-color: #e5c100 !important;
              color: #000000 !important;
            }
            .proposals-calendar-wrapper .flatpickr-day.selected,
            .proposals-calendar-wrapper .flatpickr-day.selected.is-monday,
            .proposals-calendar-wrapper .flatpickr-day.selected:hover,
            .proposals-calendar-wrapper .flatpickr-day.selected:focus {
              background-color: #ec4899 !important;
              color: #000000 !important;
              border-color: #ec4899 !important;
              font-weight: bold !important;
            }
            .flatpickr-days .flatpickr-day:nth-child(n+36) {
              display: none !important;
            }
            .flatpickr-calendar.inline {
              margin: 0 auto;
              background: #0f172a !important;
              border: 1px solid #1e293b !important;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
            }
          `,
          }}
        />

        <Header />

        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center p-6 my-10 relative">
          {/* Decorative Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-600/5 blur-[150px]"></div>

          <CreateEventForm />
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800 bg-zinc-900/20 py-6 text-center text-sm text-zinc-500 mt-auto">
          &copy; {new Date().getFullYear()} Lunes Bacanal. Todos los derechos reservados.
        </footer>
      </div>
    </ProtectedRoute>
  );
}
