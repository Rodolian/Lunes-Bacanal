"use client";

import React, { useState } from "react";
import { loginWithEmail } from "@/services/authService";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await loginWithEmail(email, password);
      router.push("/");
    } catch (err: unknown) {
      console.error("Login error:", err);
      const firebaseError = err as { code?: string };
      switch (firebaseError.code) {
        case "auth/invalid-email":
          setError("El formato del correo electrónico no es válido.");
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Correo electrónico o contraseña incorrectos.");
          break;
        case "auth/too-many-requests":
          setError("Demasiados intentos fallidos. Por favor, inténtalo más tarde.");
          break;
        default:
          setError("Ocurrió un error inesperado al iniciar sesión. Inténtalo de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Bienvenido de nuevo
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Ingresa a tu cuenta para continuar
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
            Correo Electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white placeholder-zinc-550 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            placeholder="tu@ejemplo.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white placeholder-zinc-550 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            "Iniciar Sesión"
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-400">
        ¿No tienes una cuenta?{" "}
        <Link
          href="/registro"
          className="font-medium text-indigo-400 transition-colors hover:text-indigo-300 hover:underline"
        >
          Regístrate aquí
        </Link>
      </div>
    </div>
  );
}
