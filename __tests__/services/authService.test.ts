import { registerWithEmail, loginWithEmail, logoutUser } from "../../services/authService";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { setDoc } from "firebase/firestore";

// Mock Firebase Auth SDK
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendEmailVerification: jest.fn(),
  updateProfile: jest.fn(),
}));

// Mock Firebase Firestore SDK
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

// Mock local Firebase instance
jest.mock("@/lib/firebase", () => ({
  auth: {},
  db: {},
}));

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerWithEmail", () => {
    it("should create user, update auth profile, set firestore document and send verification email", async () => {
      const mockUser = {
        uid: "user-123",
        email: "test@example.com",
      };
      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: mockUser,
      });
      (sendEmailVerification as jest.Mock).mockResolvedValue(undefined);
      (updateProfile as jest.Mock).mockResolvedValue(undefined);
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      await registerWithEmail("test@example.com", "password123", "Adrián");

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        "test@example.com",
        "password123"
      );
      expect(updateProfile).toHaveBeenCalledWith(mockUser, { displayName: "Adrián" });
      expect(setDoc).toHaveBeenCalled();
      expect(sendEmailVerification).toHaveBeenCalledWith(mockUser);
    });
  });

  describe("loginWithEmail", () => {
    it("should log in with email and password", async () => {
      (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: { uid: "user-123" },
      });

      await loginWithEmail("test@example.com", "password123");

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        "test@example.com",
        "password123"
      );
    });
  });

  describe("logoutUser", () => {
    it("should sign out the user", async () => {
      (signOut as jest.Mock).mockResolvedValue(undefined);

      await logoutUser();

      expect(signOut).toHaveBeenCalled();
    });
  });
});
