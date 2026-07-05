import { db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { UserProfile } from "@/services/types";

/**
 * Se suscribe en tiempo real al documento de perfil del usuario en Firestore.
 */
export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  const docRef = doc(db, "users", uid);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
    } else {
      callback(null);
    }
  });
}

/**
 * Actualiza la información del perfil del usuario (nombre y/o foto de perfil).
 */
export async function updateUserProfile(
  uid: string,
  profileData: Partial<UserProfile>
): Promise<void> {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, profileData);
}

/**
 * Se suscribe en tiempo real a la lista de todos los usuarios de la aplicación.
 */
export function subscribeToAllUsers(
  callback: (users: UserProfile[]) => void
): Unsubscribe {
  const collRef = collection(db, "users");
  return onSnapshot(collRef, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({
      uid: docSnap.id,
      ...docSnap.data(),
    })) as UserProfile[];
    callback(list);
  });
}

/**
 * Recupera de una sola vez la lista de todos los usuarios registrados en Firestore.
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  const collRef = collection(db, "users");
  const snapshot = await getDocs(collRef);
  return snapshot.docs.map((docSnap) => ({
    uid: docSnap.id,
    ...docSnap.data(),
  })) as UserProfile[];
}
