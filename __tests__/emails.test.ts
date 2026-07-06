import {
  getNewEventEmailHtml,
  getWinnerEmailHtml,
  getTieEmailHtml,
  getVerificationEmailHtml,
} from "../lib/emailTemplates";

describe("Email Templates", () => {
  const dummyBaseUrl = "https://lunes-bacanal-test.example.com";
  const dummyLogoUrl = `${dummyBaseUrl}/logo.jpg`;
  const dummyVotingUrl = `${dummyBaseUrl}/votar/test-event`;

  // Regular expression to check for emojis
  const emojiRegex = /[\uD800-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g;

  describe("Convocatoria Email (getNewEventEmailHtml)", () => {
    it("should generate HTML without emojis and exclamations", () => {
      const html = getNewEventEmailHtml(dummyBaseUrl, dummyLogoUrl, dummyVotingUrl);

      expect(html).not.toMatch(emojiRegex);
      expect(html).not.toContain("!");
      expect(html).not.toContain("¡");
    });

    it("should link the correct absolute logo and voting URL", () => {
      const html = getNewEventEmailHtml(dummyBaseUrl, dummyLogoUrl, dummyVotingUrl);

      expect(html).toContain(`src="${dummyLogoUrl}"`);
      expect(html).toContain(`href="${dummyVotingUrl}"`);
    });
  });

  describe("Winner Email (getWinnerEmailHtml)", () => {
    const dummyAttendees = [
      { nombre: "Zacarías Flores", photoURL: null },
      { nombre: "Adrián Rodero", photoURL: "https://example.com/avatar.jpg" },
      { nombre: "Carlos Gómez", photoURL: null },
    ];
    const winnerDate = "2026-07-13";

    it("should generate HTML without emojis and exclamations", () => {
      const { html } = getWinnerEmailHtml(dummyBaseUrl, dummyLogoUrl, winnerDate, dummyAttendees);

      expect(html).not.toMatch(emojiRegex);
      expect(html).not.toContain("!");
      expect(html).not.toContain("¡");
    });

    it("should contain the absolute logo and winner date details", () => {
      const { html } = getWinnerEmailHtml(dummyBaseUrl, dummyLogoUrl, winnerDate, dummyAttendees);

      expect(html).toContain(`src="${dummyLogoUrl}"`);
      expect(html).toContain("Lunes 13"); // Colloquial date
    });

    it("should list attendees names", () => {
      const { html } = getWinnerEmailHtml(dummyBaseUrl, dummyLogoUrl, winnerDate, dummyAttendees);

      expect(html).toContain("Adrián Rodero");
      expect(html).toContain("Carlos Gómez");
      expect(html).toContain("Zacarías Flores");
    });
  });

  describe("Tie Email (getTieEmailHtml)", () => {
    it("should generate HTML without emojis and exclamations", () => {
      const html = getTieEmailHtml(dummyBaseUrl, dummyLogoUrl);

      expect(html).not.toMatch(emojiRegex);
      expect(html).not.toContain("!");
      expect(html).not.toContain("¡");
    });

    it("should contain absolute logo and link to base URL", () => {
      const html = getTieEmailHtml(dummyBaseUrl, dummyLogoUrl);

      expect(html).toContain(`src="${dummyLogoUrl}"`);
      expect(html).toContain(`href="${dummyBaseUrl}"`);
    });
  });

  describe("Verification Email (getVerificationEmailHtml)", () => {
    it("should generate HTML without emojis and exclamations", () => {
      const html = getVerificationEmailHtml(dummyLogoUrl, dummyVotingUrl);

      expect(html).not.toMatch(emojiRegex);
      expect(html).not.toContain("!");
      expect(html).not.toContain("¡");
    });

    it("should contain absolute logo and link to verification URL", () => {
      const html = getVerificationEmailHtml(dummyLogoUrl, dummyVotingUrl);

      expect(html).toContain(`src="${dummyLogoUrl}"`);
      expect(html).toContain(`href="${dummyVotingUrl}"`);
    });
  });
});
