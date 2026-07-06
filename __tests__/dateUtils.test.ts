import { isPastEvent, formatVoteDate } from "../lib/dateUtils";

describe("Date utilities", () => {
  describe("formatVoteDate", () => {
    it("should format YYYY-MM-DD into a Spanish weekday and day number", () => {
      // 2026-07-13 is a Monday
      expect(formatVoteDate("2026-07-13")).toBe("Lunes 13 de Julio");
      // 2026-07-14 is a Tuesday
      expect(formatVoteDate("2026-07-14")).toBe("Martes 14 de Julio");
    });

    it("should fallback to original string if format is invalid", () => {
      expect(formatVoteDate("not-a-date")).toBe("not-a-date");
    });
  });

  describe("isPastEvent", () => {
    it("should return false if event is not closed (estado !== cerrado)", () => {
      expect(isPastEvent("2026-07-13", "abierto")).toBe(false);
      expect(isPastEvent("2026-07-13", "empate")).toBe(false);
    });

    it("should return false if winner date is not specified", () => {
      expect(isPastEvent(undefined, "cerrado")).toBe(false);
    });

    it("should return false if winner date is today or tomorrow (active grace period)", () => {
      const today = new Date();
      const formatStr = (d: Date) => d.toISOString().split("T")[0];
      
      // Winner date is today
      expect(isPastEvent(formatStr(today), "cerrado")).toBe(false);

      // Winner date is tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      expect(isPastEvent(formatStr(tomorrow), "cerrado")).toBe(false);
    });

    it("should return true if winner date was 2 days ago (expired grace period)", () => {
      const today = new Date();
      const formatStr = (d: Date) => d.toISOString().split("T")[0];
      
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);
      expect(isPastEvent(formatStr(twoDaysAgo), "cerrado")).toBe(true);
    });
  });
});
