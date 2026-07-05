"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import Link from "next/link";

interface UsuarioFirestore {
  email?: string;
  nombre?: string;
  photoURL?: string | null;
}

export default function PerfilPage() {
  const { user } = useAuth();
  const [nombre, setNombre] = useState("");
  const [dbUser, setDbUser] = useState<UsuarioFirestore | null>(null);
  const [uploading, setUploading] = useState(false);
  const [updatingName, setUpdatingName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Subscribe to user Firestore document in real-time
  useEffect(() => {
    if (!db || !user?.uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "usuarios", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDbUser(data);
          if (data.nombre) {
            setNombre(data.nombre);
          }
        }
      },
      (err) => {
        console.error("Error subscribing to user doc:", err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 300;
          const width = img.width;
          const height = img.height;

          let sx = 0;
          let sy = 0;
          let sWidth = width;
          let sHeight = height;

          if (width > height) {
            sWidth = height;
            sx = (width - height) / 2;
          } else {
            sHeight = width;
            sy = (height - width) / 2;
          }

          canvas.width = size;
          canvas.height = size;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No se pudo obtener el contexto 2D del canvas."));
            return;
          }

          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);

          // Export as JPEG with 70% quality
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Error al cargar la imagen."));
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo."));
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecciona un archivo de imagen válido.");
      return;
    }

    // Limit original file size to 5MB to avoid memory lockups
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
      if (!db) {
        throw new Error("La base de datos de Firestore no está configurada.");
      }

      // Compress and resize using HTML5 Canvas API (300x300, 70% JPEG quality)
      const compressedBase64 = await compressImage(file);

      // 1. Update Firestore User Document with Base64 String
      const userDocRef = doc(db, "usuarios", user.uid);
      await updateDoc(userDocRef, {
        photoURL: compressedBase64,
      });

      // 2. Try to update Auth profile photoURL as a backup
      try {
        await updateProfile(user, { photoURL: compressedBase64 });
      } catch (authErr) {
        console.warn("Auth update profile photoURL failed (likely size limits):", authErr);
      }

      setSuccess("¡Foto de perfil comprimida y actualizada con éxito!");
    } catch (err: unknown) {
      console.error("Image processing/upload error:", err);
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
      if (!db) {
        throw new Error("La base de datos de Firestore no está configurada.");
      }

      // 1. Update Auth Profile
      await updateProfile(user, { displayName: nombre });

      // 2. Update Firestore
      const userDocRef = doc(db, "usuarios", user.uid);
      await updateDoc(userDocRef, {
        nombre: nombre,
      });

      setSuccess("¡Nombre de usuario actualizado con éxito!");
    } catch (err: unknown) {
      console.error("Name update error:", err);
      const errMsg = err instanceof Error ? err.message : "Error al actualizar el nombre. Inténtalo de nuevo.";
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
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-[family-name:var(--font-geist-sans)]">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/30 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
              L
            </div>
            <span className="font-bold tracking-tight text-white">Lunes Bacanal</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-6 my-10">
        {/* Decorative Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-600/5 blur-[150px]"></div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Mi Perfil
            </h1>
            <p className="text-xs text-slate-400">
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

          {/* Profile Picture Display & Edit */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative group">
              <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-850 flex items-center justify-center text-3xl font-bold text-slate-400 group-hover:border-indigo-500 transition-colors shadow-xl">
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

              {/* Upload Overlay */}
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
              <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
                <div className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent"></div>
                Procesando imagen...
              </div>
            )}

            <div className="text-center">
              <p className="text-xs text-slate-500">Correo Electrónico</p>
              <p className="text-sm font-semibold text-slate-350">{user?.email}</p>
            </div>
          </div>

          {/* Edit Name Form */}
          <form onSubmit={handleUpdateName} className="space-y-4 pt-4 border-t border-slate-800 text-left">
            <div>
              <label htmlFor="editNombre" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Nombre de Usuario
              </label>
              <input
                id="editNombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
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

          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            <Link
              href="/"
              className="flex w-full items-center justify-center rounded-lg bg-slate-900 border border-slate-800 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:bg-slate-950"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/20 py-6 text-center text-sm text-slate-500 mt-auto">
        &copy; {new Date().getFullYear()} Lunes Bacanal. Todos los derechos reservados.
      </footer>
    </div>
  );
}
