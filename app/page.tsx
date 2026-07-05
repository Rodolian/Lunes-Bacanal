import React from "react";
import Header from "@/components/Header";
import DashboardClient from "@/components/dashboard/DashboardClient";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-[family-name:var(--font-geist-sans)]">
        <Header />

        {/* Main Content */}
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-6 space-y-8 my-6 z-10">
          <DashboardClient />
        </main>
      </div>
    </ProtectedRoute>
  );
}
