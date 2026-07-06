import { updateUserProfile, fetchAllUsers } from "../../services/userService";
import { updateDoc, getDocs } from "firebase/firestore";

// Mock Firebase Auth
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
}));

// Mock Firebase Firestore SDK
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  onSnapshot: jest.fn(),
}));

// Mock local Firebase instance
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

describe("userService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateUserProfile", () => {
    it("should call updateDoc on users collection", async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await updateUserProfile("user-123", { nombre: "Adrián Rodero" });

      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe("fetchAllUsers", () => {
    it("should fetch all user documents and format them", async () => {
      const mockDocs = [
        { id: "u1", data: () => ({ email: "u1@test.com", nombre: "U1" }) },
        { id: "u2", data: () => ({ email: "u2@test.com", nombre: "U2" }) },
      ];
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockDocs,
      });

      const users = await fetchAllUsers();

      expect(getDocs).toHaveBeenCalled();
      expect(users).toHaveLength(2);
      expect(users[0]).toEqual({ uid: "u1", email: "u1@test.com", nombre: "U1" });
      expect(users[1]).toEqual({ uid: "u2", email: "u2@test.com", nombre: "U2" });
    });
  });
});
