import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  Unsubscribe,
} from "firebase/firestore";
import { Event } from "@/services/types";
import { calculateWinner } from "@/services/resolutionService";
import { fetchAllUsers } from "@/services/userService";

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
  let payload: Record<string, unknown> = {
    eventoId: eventId,
    fecha_elegida: date,
  };

  try {
    const docRef = doc(db, "events", eventId);
    const docSnap = await getDoc(docRef);
    if (docSnap && typeof docSnap.exists === "function" && docSnap.exists()) {
      const ev = { id: docSnap.id, ...docSnap.data() } as Event;
      await updateDoc(docRef, {
        estado: "cerrado",
        fecha_elegida: date,
      });

      const usersList = await fetchAllUsers();
      const attendeesEmails = (ev.votos || [])
        .filter((voto) => voto.fechas_elegidas.includes(date))
        .map((voto) => voto.email);

      const confirmedAttendees = usersList
        .filter((u) => u.email && (attendeesEmails.includes(u.email) || u.uid === ev.creador_uid))
        .map((u) => ({
          nombre: u.nombre || "Usuario Anónimo",
          photoURL: u.photoURL || null,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      const allEmails = usersList
        .map((u) => u.email)
        .filter((email): email is string => typeof email === "string");

      const winnerTipo = ev.opciones_tipo?.[date] || "cena";

      payload = {
        eventoId: eventId,
        fecha_elegida: date,
        resolvedByClient: true,
        confirmedAttendees,
        allEmails,
        winnerTipo,
      };
    }
  } catch (clientErr) {
    console.error("Client-side tie resolution fallback to server:", clientErr);
  }

  const response = await fetch("/api/resolver-empate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error al resolver el empate.");
  }
}

/**
 * Comprueba si un evento ya tiene todos los votos (o ha vencido su fecha límite),
 * actualiza su estado en Firestore desde el cliente autenticado y dispara el envío
 * del correo de resolución en el servidor.
 */
export async function checkAndResolveEvent(
  evento: Event,
  voterEmail?: string,
  selectedDates?: string[]
): Promise<boolean> {
  const ev: Event = {
    ...evento,
    votos: [...(evento.votos || [])],
    votantes_pendientes: [...(evento.votantes_pendientes || [])],
  };

  if (voterEmail) {
    const yaVoto = ev.votos?.some((v) => v.email === voterEmail);
    if (!yaVoto && selectedDates !== undefined) {
      ev.votos?.push({ email: voterEmail, fechas_elegidas: selectedDates });
    }
    ev.votantes_pendientes = (ev.votantes_pendientes || []).filter(
      (email) => email !== voterEmail
    );
  }

  if (ev.estado === "cerrado" || ev.estado === "empate") {
    return false;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const isDeadlineReached = ev.fecha_tope ? ev.fecha_tope <= todayStr : false;
  const everyoneHasVoted =
    !ev.votantes_pendientes || ev.votantes_pendientes.length === 0;

  if (!everyoneHasVoted && !isDeadlineReached) {
    return false;
  }

  const { winner, isTie, winningDates } = calculateWinner(ev);
  const eventDocRef = doc(db, "events", ev.id);

  const usersList = await fetchAllUsers();
  const creatorUser = usersList.find((u) => u.uid === ev.creador_uid);
  const creatorEmail = creatorUser?.email || ev.creador_email;

  let confirmedAttendees: { nombre: string; photoURL: string | null }[] = [];
  if (winner) {
    const attendeesEmails = (ev.votos || [])
      .filter((voto) => voto.fechas_elegidas.includes(winner))
      .map((voto) => voto.email);

    confirmedAttendees = usersList
      .filter(
        (u) =>
          u.email &&
          (attendeesEmails.includes(u.email) || u.uid === ev.creador_uid)
      )
      .map((u) => ({
        nombre: u.nombre || "Usuario Anónimo",
        photoURL: u.photoURL || null,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  const allEmails = usersList
    .map((u) => u.email)
    .filter((e): e is string => typeof e === "string");

  const winnerTipo = winner ? ev.opciones_tipo?.[winner] || "cena" : "cena";

  const res = await fetch("/api/comprobar-resolucion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventoId: ev.id,
      resolvedByClient: true,
      winner,
      isTie,
      winnerTipo,
      confirmedAttendees,
      allEmails,
      creatorEmail,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Error al enviar correo de resolución.");
  }

  if (winner) {
    await updateDoc(eventDocRef, {
      estado: "cerrado",
      fecha_elegida: winner,
    });
  } else {
    await updateDoc(eventDocRef, {
      estado: "empate",
      fechas_empatadas: winningDates,
    });
  }

  return true;
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

