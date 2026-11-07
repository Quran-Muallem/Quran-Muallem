import { describe, expect, it } from "vitest";
import { matchLive } from "@/lib/quranMatcher";
import { ayahResults } from "@/lib/practiceResults";

const ayat = [
  { number: 1, text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" },
  { number: 2, text: "ٱللَّهُ ٱلصَّمَدُ" },
  { number: 3, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
];

describe("ayahResults", () => {
  it("scores finished verses and skips the one stopped in the middle", () => {
    const m = matchLive("قل هو الله احد الله الصمد لم", ayat.map((a) => a.text));
    const r = ayahResults(ayat, m.statuses, m.done);
    expect(r.map((x) => x.ayahId)).toEqual([1, 2]);
    expect(r[0]?.accuracy).toBe(100);
  });
  it("counts skipped words of passed verses as mistakes", () => {
    const m = matchLive("قل هو احد الله الصمد", ayat.map((a) => a.text));
    const r = ayahResults(ayat, m.statuses, m.done);
    expect(r[0]?.accuracy).toBe(75);
  });
  it("returns nothing before anything was recited", () => {
    const m = matchLive("", ayat.map((a) => a.text));
    expect(ayahResults(ayat, m.statuses, m.done)).toEqual([]);
  });
});

import { capToSpokenWords } from "@/lib/use-transcribing-recorder";
describe("capToSpokenWords", () => {
  const fatiha = "بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين اياك نعبد واياك نستعين اهدنا الصراط المستقيم صراط الذين انعمت عليهم غير المغضوب عليهم ولا الضالين";
  it("cuts a live result that is longer than what could have been recited", () => {
    // ~5 s of voice after four verses: a whole Al-Fatiha (29 words) is impossible
    expect(capToSpokenWords(fatiha, 5, 2.2, 2).split(" ")).toHaveLength(13);
  });
  it("keeps results that fit the speaking time", () => {
    expect(capToSpokenWords(fatiha, 30, 4, 4)).toBe(fatiha);
  });
});
