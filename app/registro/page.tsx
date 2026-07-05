"use client";

import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegistroPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("El nombre de usuario es obligatorio.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setSubmitting(true);

    if (!auth) {
      setError("El servicio de autenticación de Firebase no está configurado.");
      setSubmitting(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const registeredUser = userCredential.user;
      
      // Update Auth Profile
      await updateProfile(registeredUser, { displayName: nombre });
      
      if (db) {
        await setDoc(doc(db, "usuarios", registeredUser.uid), {
          email: registeredUser.email,
          nombre: nombre,
          photoURL: null,
        });
      }

      // Send verification email (non-blocking, helps with spam filters)
      sendEmailVerification(registeredUser).catch((err) =>
        console.error("Error sending verification email:", err)
      );

      router.push("/");
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const firebaseError = err as { code?: string };
      // User-friendly error messages
      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          setError("El correo electrónico ya está registrado por otro usuario.");
          break;
        case "auth/invalid-email":
          setError("El formato del correo electrónico no es válido.");
          break;
        case "auth/weak-password":
          setError("La contraseña elegida es muy débil. Usa al menos 6 caracteres.");
          break;
        default:
          setError("Ocurrió un error inesperado al registrar el usuario. Inténtalo de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-[family-name:var(--font-geist-sans)]">
      {/* Decorative Background Glows */}
      <div className="absolute top-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-violet-600/10 blur-[120px]"></div>
      <div className="absolute bottom-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-600/10 blur-[120px]"></div>

      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Crea tu cuenta
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Regístrate para comenzar a usar la aplicación
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label
              htmlFor="nombre"
              className="block text-sm font-medium text-slate-300"
            >
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Tu Nombre"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-300"
            >
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="tu@ejemplo.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-300"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-300"
            >
              Confirmar Contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
              "Registrarse"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300 hover:underline"
          >
            Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
