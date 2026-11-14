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
  it("every entry has all three cards in ar/de/en/fr", () => {
    for (const e of KIDS_TAFSIR) for (const k of ["title", "say", "story", "deed"] as const) for (const l of ["ar", "de", "en", "fr"] as const) expect(e[k][l].length).toBeGreaterThan(0);
  });
});

import { PROPHETS, QURAN_STORIES } from "@/lib/stories";
import { pauseAfter, storySentences, voiceScore } from "@/lib/storyVoice";
describe("v49 stories & storyteller voice", () => {
  it("every story is complete in ar/de/en/fr", () => {
    expect(PROPHETS).toHaveLength(19);
    expect(QURAN_STORIES).toHaveLength(6);
    for (const s of [...PROPHETS, ...QURAN_STORIES]) for (const l of ["ar", "de", "en", "fr"] as const) {
      expect(s.name[l] && s.era[l] && s.lesson[l]).toBeTruthy();
      for (const c of s.chapters) expect(c.title[l] && c.text[l]).toBeTruthy();
    }
  });
  it("splits sentences and pauses longer after questions", () => {
    expect(storySentences("Er kam. Wer ist stärker als wir? Gut!")).toEqual(["Er kam.", "Wer ist stärker als wir?", "Gut!"]);
    expect(storySentences("من أشد منا قوة؟ قال هود.")).toEqual(["من أشد منا قوة؟", "قال هود."]);
    expect(pauseAfter("Wer?")).toBe(700);
    expect(pauseAfter("Er kam.")).toBeGreaterThanOrEqual(350);
    expect(pauseAfter("Er kam.")).toBeLessThanOrEqual(500);
  });
  it("prefers natural / neural voices", () => {
    const robot = voiceScore({ name: "eSpeak German", lang: "de-DE" }, "de");
    const neural = voiceScore({ name: "Microsoft Katja Online (Natural)", lang: "de-DE" }, "de");
    const net = voiceScore({ name: "de-de-x-deb-network", lang: "de-DE" }, "de");
    expect(neural).toBeGreaterThan(robot);
    expect(net).toBeGreaterThan(robot);
    expect(voiceScore({ name: "Amélie", lang: "fr-CA" }, "de")).toBe(-1);
  });
});
