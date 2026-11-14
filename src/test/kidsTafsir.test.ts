import { describe, expect, it } from "vitest";
import { KIDS_TAFSIR, kidsTafsirFor } from "@/lib/kidsTafsir";

describe("kids tafsir lookup (v46 ayah tap)", () => {
  it("finds surah-level entries for any verse", () => {
    expect(kidsTafsirFor(112, 3)?.surah).toBe(112);
    expect(kidsTafsirFor(1, 7)?.surah).toBe(1);
  });
  it("Ayat al-Kursi only for 2:255", () => {
    expect(kidsTafsirFor(2, 255)?.id).toBe("kursi");
    expect(kidsTafsirFor(2, 254)).toBeNull();
  });
  it("al-Kahf stories by verse range", () => {
    expect(kidsTafsirFor(18, 10)?.ayah).toBe(9);
    expect(kidsTafsirFor(18, 70)?.ayah).toBe(60);
    expect(kidsTafsirFor(18, 1)).toBeNull();
  });
  it("every entry has all three cards in ar/de/en", () => {
    for (const e of KIDS_TAFSIR) for (const k of ["title", "say", "story", "deed"] as const) for (const l of ["ar", "de", "en"] as const) expect(e[k][l].length).toBeGreaterThan(0);
  });
});
