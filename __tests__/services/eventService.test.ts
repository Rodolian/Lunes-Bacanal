import { createEvent, submitVote, resolveTie } from "../../services/eventService";
import { addDoc, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";

// Mock Firebase Auth
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
}));

// Mock Firebase Firestore SDK
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  arrayRemove: jest.fn((val) => ({ type: "arrayRemove", value: val })),
  arrayUnion: jest.fn((val) => ({ type: "arrayUnion", value: val })),
}));

// Mock local Firebase instance
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

describe("eventService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    });
  });

  describe("createEvent", () => {
    it("should call addDoc on events collection and return doc ID", async () => {
      (addDoc as jest.Mock).mockResolvedValue({ id: "event-123" });

      const newEventId = await createEvent({
        motivo: "Niños",
        fechas_propuestas: ["2026-07-13"],
        fecha_tope: "2026-07-12",
        creador_uid: "creator-uid",
        creador_email: "creator@test.com",
        votantes_pendientes: ["voter@test.com"],
        estado: "abierto",
      });

      expect(addDoc).toHaveBeenCalled();
      expect(newEventId).toBe("event-123");
    });
  });

  describe("submitVote", () => {
    it("should register a vote and remove the voter from pending using arrayRemove and arrayUnion", async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await submitVote("event-123", "voter@test.com", ["2026-07-13"]);

      expect(updateDoc).toHaveBeenCalled();
      expect(arrayRemove).toHaveBeenCalledWith("voter@test.com");
      expect(arrayUnion).toHaveBeenCalledWith({
        email: "voter@test.com",
        fechas_elegidas: ["2026-07-13"],
      });
    });

    it("should register a blank vote when date array is empty (No puedo ningún día)", async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await submitVote("event-123", "voter@test.com", []);

      expect(updateDoc).toHaveBeenCalled();
      expect(arrayRemove).toHaveBeenCalledWith("voter@test.com");
      expect(arrayUnion).toHaveBeenCalledWith({
        email: "voter@test.com",
        fechas_elegidas: [], // Blank vote representation
      });
    });
  });

  describe("resolveTie", () => {
    it("should trigger POST call to resolver-empate endpoint", async () => {
      await resolveTie("event-123", "2026-07-13");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/resolver-empate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ eventoId: "event-123", fecha_elegida: "2026-07-13" }),
        })
      );
    });
  });
});
