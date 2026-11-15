import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildLocatorIndex, locateRecitation, transcriptCore } from "@/lib/ayahLocator";
import { holdStartup, identificationOver, IDENTIFY_FALLBACK_CHARS, IDENTIFY_MAX_CHARS, IDENTIFY_MIN_MS } from "@/lib/recitationStartup";
import { matchLivePhonemes } from "@/lib/quranAlignment";

const phon = JSON.parse(readFileSync("public/models/quran_phonemes.json", "utf8")) as { surahs: string[][][] };
const P = buildLocatorIndex("phonemes", phon.surahs);
const ph = (s: number, a: number) => phon.surahs[s - 1]![a - 1]!.join("");

describe("v56 identification window at the start of a recitation", () => {
  it("An-Naba opening (after the basmala) is located while al-Baqarah is open", () => {
    const said = ph(1, 1) + ph(78, 1) + ph(78, 2);
    expect(locateRecitation(P, said)).toMatchObject({ surah: 78, ayah: 1 });
  });

  it("a noisy real opening (Husary, Zipformer) still starts at An-Naba 78:1, not 78:3", () => {
    const heard = "بِسمِللَااهِررَحمَاانِررَحِۦۦۦۦمعَممممَاايَااتَااسَااااءَلُۥۥۥۥنءَبَءِلعَظِۦۦۦۦمءَللَذِۦۦهُمفِۦۦفُۥۥۥۥنكَللَااسَيَعلَمُۥۥۥۥنثُ";
    // too noisy for a confident place yet …
    expect(locateRecitation(P, heard)).toBeNull();
    // … the reader goes on (78:5–7); the hit comes later, the start is still 78:1 (walked back)
    expect(locateRecitation(P, heard + ph(78, 5).slice(2) + ph(78, 6) + ph(78, 7))).toMatchObject({ surah: 78, ayah: 1 });
  });

  it("a basmala alone is never taken for an-Naml 27:30 (which contains it)", () => {
    expect(locateRecitation(P, ph(1, 1))).toBeNull();
    expect(locateRecitation(P, ph(1, 1) + ph(78, 1).slice(0, 3))).toBeNull();
    expect(locateRecitation(P, ph(27, 29).slice(-12) + ph(27, 30))).not.toMatchObject({ surah: 27, ayah: 31 });
    // the real 27:30 is still found
    expect(locateRecitation(P, ph(27, 30))).toMatchObject({ surah: 27, ayah: 30 });
  });

  it("the window stays open while the opening words do not fit the open surah", () => {
    const said = ph(78, 1);
    const coreChars = transcriptCore("phonemes", said).codes.length;
    // judged against al-Baqarah: nothing on track
    expect(identificationOver({ elapsedMs: 1500, coreChars, match: { recited: 0, accuracy: 0 } })).toBe(false);
    expect(identificationOver({ elapsedMs: 5000, coreChars: IDENTIFY_FALLBACK_CHARS - 1, match: { recited: 0, accuracy: 0 } })).toBe(false);
  });

  it("locks in as soon as the reader is on track in the passage shown", () => {
    expect(identificationOver({ elapsedMs: 900, coreChars: 20, match: { recited: 5, accuracy: 90 } })).toBe(true);
    // a basmala alone (4 words, e.g. al-Fātiḥah open) is not enough
    expect(identificationOver({ elapsedMs: 900, coreChars: 20, match: { recited: 4, accuracy: 100 } })).toBe(false);
  });

  it("falls back to the open passage once the locator had its chance", () => {
    expect(identificationOver({ elapsedMs: IDENTIFY_MIN_MS, coreChars: IDENTIFY_FALLBACK_CHARS, match: { recited: 2, accuracy: 50 } })).toBe(true);
    expect(identificationOver({ elapsedMs: IDENTIFY_MIN_MS - 1, coreChars: IDENTIFY_FALLBACK_CHARS, match: { recited: 2, accuracy: 50 } })).toBe(false);
  });

  it("words that fit the open surah not at all keep waiting for the locator (no false correction)", () => {
    // An-Naba said with al-Baqarah open: «1 / 36 • 20 %»
    expect(identificationOver({ elapsedMs: 8000, coreChars: IDENTIFY_FALLBACK_CHARS + 30, match: { recited: 1, accuracy: 20 } })).toBe(false);
    expect(identificationOver({ elapsedMs: 8000, coreChars: IDENTIFY_MAX_CHARS, match: { recited: 1, accuracy: 20 } })).toBe(true);
  });

  it("no red while identifying, and the opening words are never announced after the lock-in", () => {
    const st = ["CORRECT", "ERROR", "WARNING", "ERROR", "PENDING"] as const;
    expect(holdStartup([...st], true, 0)).toEqual(["CORRECT", "PENDING", "PENDING", "PENDING", "PENDING"]);
    expect(holdStartup([...st], false, 2)).toEqual(["CORRECT", "PENDING", "WARNING", "ERROR", "PENDING"]);
    expect(holdStartup([...st], false, 0)).toEqual([...st]);
  });

  it("al-Baqarah judged on An-Naba words is not on track (so no false lock-in)", () => {
    const mushaf = JSON.parse(readFileSync("public/mushaf/words.json", "utf8")) as { surahs: string[][][] };
    const targets = [mushaf.surahs[1]![0]!.join(" "), mushaf.surahs[1]![1]!.join(" ")];
    const m = matchLivePhonemes(ph(78, 1) + ph(78, 2), targets, phon.surahs[1]!.slice(0, 2).flat(), { final: false });
    expect(m.recited >= 3 && m.accuracy >= 60).toBe(false);
  });
});
