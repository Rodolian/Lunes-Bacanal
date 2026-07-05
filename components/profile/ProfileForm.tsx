"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUserProfile, updateUserProfile } from "@/services/userService";
import { UserProfile } from "@/services/types";
import { resizeAndCompressImage } from "@/lib/image";
import { updateProfile } from "firebase/auth";
import Link from "next/link";

export default function ProfileForm() {
  const { user } = useAuth();
  const [nombre, setNombre] = useState("");
  const [dbUser, setDbUser] = useState<UserProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [updatingName, setUpdatingName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    return subscribeToUserProfile(user.uid, (profile) => {
      if (profile) {
        setDbUser(profile);
        if (profile.nombre) {
          setNombre(profile.nombre);
        }
      }
    });
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecciona un archivo de imagen válido.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen original es demasiado grande. Por favor, selecciona una de menos de 5 MB.");
      return;
    }

    if (!user) {
      setError("Debes iniciar sesión para actualizar tu perfil.");
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      // Redimensionar y comprimir usando la API de Canvas (extraída a lib/image)
      const compressedBase64 = await resizeAndCompressImage(file, 300, 0.7);

      // 1. Actualizar el documento de Firestore
      await updateUserProfile(user.uid, {
        photoURL: compressedBase64,
      });

      // 2. Intentar actualizar el perfil de Auth
      try {
        await updateProfile(user, { photoURL: compressedBase64 });
      } catch (authErr) {
        console.warn("Auth update profile photoURL failed:", authErr);
      }

      setSuccess("Foto de perfil actualizada con éxito.");
    } catch (err: unknown) {
      console.error("Image upload error:", err);
      const errMsg = err instanceof Error ? err.message : "Error al procesar la imagen.";
      setError(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!nombre.trim()) {
      setError("El nombre de usuario es obligatorio.");
      return;
    }

    if (!user) return;

    setUpdatingName(true);

    try {
      // 1. Actualizar Auth
      await updateProfile(user, { displayName: nombre });

      // 2. Actualizar Firestore
      await updateUserProfile(user.uid, {
        nombre: nombre,
      });

      setSuccess("Nombre de usuario actualizado con éxito.");
    } catch (err: unknown) {
      console.error("Name update error:", err);
      const errMsg = err instanceof Error ? err.message : "Error al actualizar el nombre.";
      setError(errMsg);
    } finally {
      setUpdatingName(false);
    }
  };

  const getInitials = () => {
    if (dbUser?.nombre) {
      return dbUser.nombre.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "?";
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-xl space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Mi Perfil
        </h1>
        <p className="text-xs text-zinc-400">
          Personaliza tu avatar y tu información
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 text-left whitespace-pre-line">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative group">
          <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-850 flex items-center justify-center text-3xl font-bold text-zinc-400 group-hover:border-indigo-500 transition-colors shadow-xl">
            {dbUser?.photoURL ? (
              <img
                src={dbUser.photoURL}
                alt="Foto de perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{getInitials()}</span>
            )}
          </div>

          <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-semibold text-white">
            {uploading ? "Cargando..." : "Cambiar Foto"}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {uploading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 animate-pulse">
            <div className="h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-transparent"></div>
            Procesando imagen...
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-zinc-500">Correo Electrónico</p>
          <p className="text-sm font-semibold text-zinc-300">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleUpdateName} className="space-y-4 pt-4 border-t border-zinc-850 text-left">
        <div>
          <label htmlFor="editNombre" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Nombre de Usuario
          </label>
          <input
            id="editNombre"
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-white placeholder-zinc-550 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            placeholder="Escribe tu nombre"
          />
        </div>

        <button
          type="submit"
          disabled={updatingName}
          className="flex w-full items-center justify-center rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/10"
        >
          {updatingName ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            "Guardar Cambios"
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-zinc-850 flex flex-col gap-3">
        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:bg-zinc-950"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
