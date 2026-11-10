import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ibtidaForms, judgeWithTajweed, tafkheemSlip, waqfForms } from "@/lib/tajweedAnalyzer";
import { matchLivePhonemes } from "@/lib/quranAlignment";

const ph = JSON.parse(readFileSync("public/models/quran_phonemes.json", "utf8")).surahs as string[][][];
const words = JSON.parse(readFileSync("public/mushaf/words.json", "utf8")).surahs as string[][][];
const verse = (s: number, a: number) => ({ text: words[s - 1]![a - 1]!.join(" "), refs: ph[s - 1]![a - 1]!, mushaf: words[s - 1]![a - 1]! });
// matchLivePhonemes needs one ref per flat token (a Mushaf word with a space inside has null for its 2nd token)
const refsFor = (v: ReturnType<typeof verse>) => v.mushaf.flatMap((w, i) => w.split(" ").map((_, k) => (k === 0 ? v.refs[i]! : null)));

describe("v35 A · stopping on sukūn (waqf) is not a mistake", () => {
  it("final vowel dropped, tanwīn, tāʾ marbūṭah, ṣilah", () => {
    expect(waqfForms("لكِتَاابُ", "ٱلْكِتَـٰبُ")).toContain("لكِتَااب");
    expect(waqfForms("صصَلَااتَ", "ٱلصَّلَوٰةَ")).toContain("صصَلَااه");
    expect(waqfForms("للَهُۥۥ", "لَّهُۥ")).toContain("للَه");
  });
  it("2:2 stopped after «الكتاب» mid-verse → all words green", () => {
    const v = verse(2, 2);
    const rec = v.refs[0]! + "لكِتَااب" + "ءَلكِتَاابُ" + v.refs.slice(2).join(""); // stop, then start again with «ءَلكتاب»
    const m = matchLivePhonemes(rec, v.text, refsFor(v), { final: true });
    expect(m.counts.error).toBe(0);
    expect(m.counts.warning).toBe(0);
  });
});

describe("v35 B · starting again (ibtidāʾ) and repeating after a breath stop", () => {
  it("hamzat al-waṣl is pronounced at a start", () => {
    expect(ibtidaForms("لحَمدُ", "ٱلْحَمْدُ")).toContain("ءَلحَمدُ");
    expect(ibtidaForms("هدِنَ", "ٱهْدِنَا")).toContain("ءِهدِنَ");
  });
  it("1:2 «الحمد لله رب | رب العالمين»: the repeated word is not an error", () => {
    const v = verse(1, 2);
    const [a, b, c, d] = v.refs as [string, string, string, string];
    const rec = a + b + c + c + d; // «رب» said twice after a breath
    const m = matchLivePhonemes(rec, v.text, refsFor(v), { final: true });
    expect(m.counts.error).toBe(0);
  });
  it("2:255 repeating a phrase of two words after a stop", () => {
    const v = verse(2, 255);
    const r = v.refs;
    const rec = r.slice(0, 6).join("") + r.slice(4, 6).join("") + r.slice(6, 10).join("");
    const m = matchLivePhonemes(rec, v.mushaf.slice(0, 10).join(" "), refsFor({ ...v, mushaf: v.mushaf.slice(0, 10), refs: r.slice(0, 10) }), { final: true });
    expect(m.counts.error).toBe(0);
  });
  it("a really wrong word stays wrong", () => {
    expect(judgeWithTajweed("لكِتَاابُ", "مَسجِدُ", { word: "ٱلْكِتَـٰبُ" }).status).toBe("ERROR");
  });
});

describe("v35 C · heavy / light letters", () => {
  it("names a heavy letter read light", () => {
    expect(tafkheemSlip("صصِرَااطَ", "سسِرَااطَ")).toEqual({ expected: "ص", heard: "س", heavyReadLight: true });
    expect(tafkheemSlip("صصِرَااطَ", "صصِرَاات")).toBeNull(); // two differences
    expect(tafkheemSlip("قُل", "كُل")).toEqual({ expected: "ق", heard: "ك", heavyReadLight: true });
  });
  it("swapping a heavy letter is still judged a mistake", () => {
    expect(judgeWithTajweed("صصِرَااطَ", "سسِرَااتَ", { word: "ٱلصِّرَٰطَ" }).status).not.toBe("CORRECT");
  });
});
