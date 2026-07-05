import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  Unsubscribe,
} from "firebase/firestore";
import { Event } from "@/services/types";

/**
 * Se suscribe en tiempo real a los eventos donde el usuario tiene una votación pendiente.
 */
export function subscribeToPendingEvents(
  email: string,
  callback: (events: Event[]) => void
): Unsubscribe {
  const qPending = query(
    collection(db, "events"),
    where("votantes_pendientes", "array-contains", email)
  );

  return onSnapshot(qPending, (snapshot) => {
    const events = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Event[];
    callback(events);
  });
}

/**
 * Se suscribe en tiempo real a todos los eventos registrados en Firestore para el histórico.
 */
export function subscribeToAllEvents(
  callback: (events: Event[]) => void
): Unsubscribe {
  const qAll = query(collection(db, "events"));

  return onSnapshot(qAll, (snapshot) => {
    const events = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Event[];
    callback(events);
  });
}

/**
 * Crea una nueva solicitud de Lunes de Bacanal en la colección 'events'.
 */
export async function createEvent(eventData: Omit<Event, "id">): Promise<string> {
  const collRef = collection(db, "events");
  const docRef = await addDoc(collRef, eventData);
  return docRef.id;
}

/**
 * Llama a la API del servidor para resolver manualmente un empate.
 */
export async function resolveTie(eventId: string, date: string): Promise<void> {
  const response = await fetch("/api/resolver-empate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ eventoId: eventId, fecha_elegida: date }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error al resolver el empate.");
  }
}

/**
 * Se suscribe en tiempo real a un evento específico por su ID.
 */
export function subscribeToEvent(
  eventId: string,
  callback: (event: Event | null) => void
): Unsubscribe {
  const docRef = doc(db, "events", eventId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Event);
    } else {
      callback(null);
    }
  });
}

/**
 * Registra un voto del usuario (correo) y sus fechas seleccionadas en el evento,
 * y lo saca de la lista de votantes pendientes de forma atómica.
 */
export async function submitVote(
  eventId: string,
  email: string,
  selectedDates: string[]
): Promise<void> {
  const docRef = doc(db, "events", eventId);
  await updateDoc(docRef, {
    votantes_pendientes: arrayRemove(email),
    votos: arrayUnion({
      email,
      fechas_elegidas: selectedDates,
    }),
  });
}

