import { describe, it, expect } from "vitest";
import { slugify, formatCurrency, formatRelative } from "@/lib/utils";

describe("Utils", () => {
  describe("slugify", () => {
    it("converts French company names to slugs", () => {
      expect(slugify("Boulangerie Pâtisserie Martin")).toBe("boulangerie-patisserie-martin");
      expect(slugify("Cabinet d'Avocats Légrand & Fils")).toBe("cabinet-davocats-legrand-fils");
      expect(slugify("  Spaces  Everywhere  ")).toBe("spaces-everywhere");
    });

    it("truncates to 63 chars", () => {
      const long = "a".repeat(100);
      expect(slugify(long).length).toBeLessThanOrEqual(63);
    });
  });

  describe("formatCurrency", () => {
    it("formats cents to EUR", () => {
      const result = formatCurrency(99000);
      expect(result).toContain("990");
      expect(result).toContain("€");
    });
  });

  describe("formatRelative", () => {
    it("returns 'À l'instant' for recent dates", () => {
      expect(formatRelative(new Date())).toBe("À l'instant");
    });

    it("returns minutes ago for recent dates", () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
      expect(formatRelative(fiveMinAgo)).toBe("Il y a 5 min");
    });
  });
});
