import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { deferLiveMistakes, tokenVerses } from "@/lib/liveMistakes";
import { diagnoseWord } from "@/lib/tajweedAnalyzer";
import { parseTajweedVerse } from "@/lib/tajweedColors";
import { cleanSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { TAFSIRS } from "@/lib/quranContent";
import type { LiveStatus } from "@/lib/quranMatcher";

describe("v38 · no premature red while reciting", () => {
  const verses = tokenVerses(["a b c", "d e", "f g h"]);
  it("maps tokens to verses", () => expect(verses).toEqual([0, 0, 0, 1, 1, 2, 2, 2]));
  it("mistakes of the verse being recited stay neutral, finished verses show them", () => {
    const st: LiveStatus[] = ["CORRECT", "ERROR", "CORRECT", "WARNING", "ERROR", "PENDING", "PENDING", "PENDING"];
    // cursor in verse 1 (token 4): verse 0 finished, verse 1 still being recited
    expect(deferLiveMistakes(st, verses, 4)).toEqual(["CORRECT", "ERROR", "CORRECT", "PENDING", "PENDING", "PENDING", "PENDING", "PENDING"]);
    // cursor moved into verse 2: verse 1 is final now
    expect(deferLiveMistakes(st, verses, 5)).toEqual(st);
    // everything recited
    expect(deferLiveMistakes(st, verses, 8)).toEqual(st);
  });
  it("green shows at once", () => {
    const st: LiveStatus[] = ["CORRECT", "CORRECT", "PENDING", "PENDING", "PENDING", "PENDING", "PENDING", "PENDING"];
    expect(deferLiveMistakes(st, verses, 2)).toEqual(st);
  });
});

describe("v38 · what went wrong in a word (from the phonemes)", () => {
  it("skipped word", () => expect(diagnoseWord("لَاا", null)).toEqual(["missing"]));
  it("madd too short", () => expect(diagnoseWord("ررَحِۦۦۦۦم", "ررَحِۦۦم")).toContain("madd"));
  it("ghunnah missing", () => expect(diagnoseWord("ءِننننَ", "ءِنَ")).toContain("ghunnah"));
  it("ikhfa read clearly", () => expect(diagnoseWord("يُںںںفِقُۥۥۥۥن", "يُنفِقُۥۥۥۥن")).toContain("ikhfa"));
  it("qalqalah missing", () => expect(diagnoseWord("لفَلَقڇ", "لفَلَق")).toContain("qalqalah"));
  it("heavy letter read light", () => expect(diagnoseWord("صصِرَااطَ", "سسِرَااطَ")).toContain("tafkheem"));
  it("only vowels differ", () => expect(diagnoseWord("لَم", "لِم")).toEqual(["harakat"]));
  it("other letters", () => expect(diagnoseWord("كِتَاابُ", "مَسجِدُ")).toEqual(["letters"]));
});

describe("v38 · Tajweed colours", () => {
  it("splits Quran.com's tajweed text into the Mushaf's words (rule spanning two words, hizb mark, verse end)", () => {
    const v = parseTajweedVerse("ذ<tajweed class=madda_normal>َٲ</tajweed>لِكَ <tajweed class=ham_wasl>ٱ</tajweed>لْكِتَ<tajweed class=madda_normal>ـٰ</tajweed>بُ هُ<tajweed class=idgham_wo_ghunnah>دًى ل</tajweed>ِّلْمُتَّقِينَ <span class=end>٢</span>");
    expect(v).toHaveLength(4);
    expect(v[0]).toEqual([{ text: "ذ" }, { text: "َٲ", cls: "madda_normal" }, { text: "لِكَ" }]);
    expect(v[2]).toEqual([{ text: "هُ" }, { text: "دًى", cls: "idgham_wo_ghunnah" }]);
    expect(v[3]![0]).toEqual({ text: "ل", cls: "idgham_wo_ghunnah" });
    const h = parseTajweedVerse("۞ إِنَّ ٱللَّهَ <span class=end>٢٦</span>");
    expect(h).toHaveLength(2);
    expect(h[0]!.map((x) => x.text).join("")).toBe("۞ إِنَّ");
  });
  it("matches the Mushaf word counts of Al-Fatiha", () => {
    const words = (JSON.parse(readFileSync("public/mushaf/words.json", "utf8")) as { surahs: string[][][] }).surahs;
    const v = parseTajweedVerse("<tajweed class=ham_wasl>ٱ</tajweed>لْحَمْدُ لِلَّهِ رَبِّ <tajweed class=ham_wasl>ٱ</tajweed>لْعَـٰلَم<tajweed class=madda_permissible>ِي</tajweed>نَ <span class=end>٢</span>");
    expect(v.length).toBe(words[0]![1]!.length);
  });
});

describe("v38 · settings and German meanings", () => {
  it("defaults and cleaning", () => {
    expect(DEFAULT_SETTINGS.mushafStyle).toBe("madinah");
    expect(DEFAULT_SETTINGS.tajweedColors).toBe(false);
    const c = cleanSettings({ ...DEFAULT_SETTINGS, mushafStyle: "warsh" as never, quranFontSize: 99, tajweedColors: "yes" as never });
    expect(c.mushafStyle).toBe("madinah");
    expect(c.quranFontSize).toBe(28);
    expect(c.tajweedColors).toBe(false);
  });
  it("offers Bubenheim under German, marked as meanings (no copyrighted tafsir)", () => {
    const de = TAFSIRS.filter((t) => t.language === "de");
    expect(de.map((t) => t.id)).toEqual(["de-bubenheim-meanings"]);
    expect(de[0]!.meanings).toBe(true);
    expect(JSON.stringify(TAFSIRS)).not.toMatch(/ilm/i);
  });
});
