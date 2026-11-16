import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  if (!auth) throw new Error("Firebase Auth no está configurado.");
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  return credential.user;
}

export async function registerWithEmail(
  email: string,
  pass: string,
  nombre: string
): Promise<User> {
  if (!auth) throw new Error("Firebase Auth no está configurado.");
  if (!db) throw new Error("Firestore no está configurado.");

  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  const registeredUser = credential.user;

  // Actualizar el perfil en Firebase Auth
  await updateProfile(registeredUser, { displayName: nombre });

  // Crear el documento de perfil en la colección 'users' (antes 'usuarios')
  await setDoc(doc(db, "users", registeredUser.uid), {
    email: registeredUser.email,
    nombre: nombre,
    photoURL: null,
  });

  // Enviar correo de verificación de forma asíncrona desde nuestro propio SMTP
  fetch("/api/enviar-verificacion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: registeredUser.email }),
  }).catch((err) =>
    console.error("Error triggering verification email:", err)
  );

  return registeredUser;
}

export async function logoutUser(): Promise<void> {
  if (!auth) throw new Error("Firebase Auth no está configurado.");
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  const response = await fetch("/api/recuperar-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (
      errorData.code === "auth/user-not-found" ||
      errorData.code === "auth/invalid-email"
    ) {
      const error = new Error(
        errorData.error || "No se pudo enviar el correo de recuperación."
      ) as Error & { code?: string };
      error.code = errorData.code;
      throw error;
    }

    // Fallback al SDK cliente de Firebase Auth si falla el endpoint del servidor
    if (auth) {
      await sendPasswordResetEmail(auth, email.trim());
      return;
    }

    const error = new Error(
      errorData.error || "No se pudo enviar el correo de recuperación."
    ) as Error & { code?: string };
    throw error;
  }
}
