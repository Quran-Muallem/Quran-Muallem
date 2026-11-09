import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildLocatorIndex, locateRecitation } from "@/lib/ayahLocator";

const phon = JSON.parse(readFileSync("public/models/quran_phonemes.json", "utf8")) as { surahs: string[][][] };
const mushaf = JSON.parse(readFileSync("public/mushaf/words.json", "utf8")) as { surahs: string[][][] };
const P = buildLocatorIndex("phonemes", phon.surahs);
const T = buildLocatorIndex("text", mushaf.surahs);
const ph = (s: number, a: number, from = 0, n = 99) => phon.surahs[s - 1]![a - 1]!.slice(from, from + n).join("");
const tx = (s: number, a: number, from = 0, n = 99) => mushaf.surahs[s - 1]![a - 1]!.slice(from, from + n).join(" ");
/** Some recognition noise: every 9th phoneme dropped. */
const noisy = (s: string) => [...s].filter((_, i) => i % 9 !== 4).join("");

describe("auto-detect the recited verse (all 114 surahs)", () => {
  it("phonemes: Al-Kahf 18:1 from page 1, after an isti'adha and the basmala", () => {
    const istiadha = "ءَعُوذُبِللَااهِمِنَششَيطَاانِررَجِۦۦۦۦم";
    const r = locateRecitation(P, istiadha + ph(1, 1) + noisy(ph(18, 1) + ph(18, 2)));
    expect(r).toMatchObject({ surah: 18, ayah: 1 });
    expect(r!.score).toBeGreaterThanOrEqual(0.85);
  });
  it("phonemes: starting in the middle of a surah (Yasin 36:12)", () => {
    expect(locateRecitation(P, noisy(ph(36, 12)))).toMatchObject({ surah: 36, ayah: 12 });
  });
  it("text (Whisper / browser): Al-Mulk 67:1 without diacritics", () => {
    const plain = tx(67, 1).normalize("NFD").replace(/[ً-ٰٟۖ-ۭ]/g, "");
    expect(locateRecitation(T, plain)).toMatchObject({ surah: 67, ayah: 1 });
  });
  it("waits on too little or repeated text", () => {
    expect(locateRecitation(P, ph(18, 1, 0, 2))).toBeNull();
    // «فبأي آلاء ربكما تكذبان» is in Ar-Rahman 31 times
    expect(locateRecitation(P, ph(55, 13))).toBeNull();
    // basmala alone
    expect(locateRecitation(P, ph(1, 1))).toBeNull();
  });
  it("gives the transcript position where the matched passage starts", () => {
    const pre = "ءَعُوذُبِللَااهِمِنَششَيطَاانِررَجِۦۦۦۦم";
    const r = locateRecitation(P, pre + ph(18, 1))!;
    expect(r.startRaw).toBeGreaterThan(20);
  });
});
