import { calculateWinner } from "../services/resolutionService";
import { Event } from "../services/types";

describe("Resolution service", () => {
  const baseEvent: Event = {
    id: "event-1",
    motivo: "Niños",
    fechas_propuestas: ["2026-07-13", "2026-07-20", "2026-07-27"],
    creador_uid: "creator-uid",
    creador_email: "creator@example.com",
    votantes_pendientes: [],
    estado: "abierto",
    created_at: new Date().toISOString(),
  };

  it("should determine an absolute winner with single highest voted date", () => {
    const event: Event = {
      ...baseEvent,
      votos: [
        { email: "user1@example.com", fechas_elegidas: ["2026-07-13"] },
        { email: "user2@example.com", fechas_elegidas: ["2026-07-13", "2026-07-20"] },
        { email: "user3@example.com", fechas_elegidas: ["2026-07-20"] },
        { email: "user4@example.com", fechas_elegidas: ["2026-07-13"] },
      ],
    };

    const result = calculateWinner(event);
    expect(result.winner).toBe("2026-07-13"); // 2026-07-13 has 3 votes, 2026-07-20 has 2 votes
    expect(result.isTie).toBe(false);
    expect(result.winningDates).toEqual(["2026-07-13"]);
  });

  it("should determine a tie if multiple dates share maximum votes", () => {
    const event: Event = {
      ...baseEvent,
      votos: [
        { email: "user1@example.com", fechas_elegidas: ["2026-07-13"] },
        { email: "user2@example.com", fechas_elegidas: ["2026-07-20"] },
      ],
    };

    const result = calculateWinner(event);
    expect(result.winner).toBeNull();
    expect(result.isTie).toBe(true);
    expect(result.winningDates).toEqual(["2026-07-13", "2026-07-20"]);
  });

  it("should exclude the creator's votes from counting", () => {
    const event: Event = {
      ...baseEvent,
      votos: [
        { email: "creator@example.com", fechas_elegidas: ["2026-07-27", "2026-07-20"] }, // Creator votes
        { email: "user1@example.com", fechas_elegidas: ["2026-07-13"] },
      ],
    };

    const result = calculateWinner(event);
    expect(result.winner).toBe("2026-07-13"); // Creator votes are excluded, so 2026-07-13 wins with 1 vote
    expect(result.isTie).toBe(false);
    expect(result.winningDates).toEqual(["2026-07-13"]);
  });

  it("should correctly handle blank votes (no puedo ningún día)", () => {
    const event: Event = {
      ...baseEvent,
      votos: [
        { email: "user1@example.com", fechas_elegidas: ["2026-07-13"] },
        { email: "user2@example.com", fechas_elegidas: [] }, // Blank vote
      ],
    };

    const result = calculateWinner(event);
    expect(result.winner).toBe("2026-07-13"); // Blank vote does not affect A's win
    expect(result.isTie).toBe(false);
    expect(result.winningDates).toEqual(["2026-07-13"]);
  });
});
