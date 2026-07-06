import { Event } from "./types";

/**
 * Realiza el escrutinio de los votos recibidos en un evento y determina el resultado.
 * Excluye explícitamente el voto del creador del evento y detecta empates.
 */
export function calculateWinner(event: Event): {
  winner: string | null;
  isTie: boolean;
  winningDates: string[];
} {
  const propuestas = event.fechas_propuestas || [];
  const countMap: Record<string, number> = {};
  
  propuestas.forEach((fecha) => {
    countMap[fecha] = 0;
  });

  if (event.votos) {
    event.votos.forEach((voto) => {
      // Excluir explícitamente el voto del creador
      if (voto.email === event.creador_email) return;
      
      voto.fechas_elegidas.forEach((fecha) => {
        if (fecha in countMap) {
          countMap[fecha] += 1;
        }
      });
    });
  }

  let maxVotes = -1;
  let winningDates: string[] = [];

  propuestas.forEach((fecha) => {
    const votes = countMap[fecha];
    if (votes > maxVotes) {
      maxVotes = votes;
      winningDates = [fecha];
    } else if (votes === maxVotes) {
      winningDates.push(fecha);
    }
  });

  const isTie = winningDates.length > 1 || winningDates.length === 0;
  const winner = !isTie ? winningDates[0] : null;

  return {
    winner,
    isTie,
    winningDates,
  };
}
