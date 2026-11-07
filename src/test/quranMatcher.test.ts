import { describe, expect, it } from "vitest";
import { compareWords, matchLive, matchRecitation, normalizeArabic, statusToMark } from "@/lib/quranMatcher";

const FATIHA_2 = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ";

describe("normalizeArabic", () => {
  it("removes tashkeel and dagger alef", () => expect(normalizeArabic("ٱلرَّحْمَٰنِ ٱلرَّحِيمِ")).toBe("الرحمنالرحيم"));
  it("unifies alefs, ya and taa marbuta", () => {
    expect(normalizeArabic("أإآٱ")).toBe("اااا");
    expect(normalizeArabic("هدى")).toBe("هدي");
    expect(normalizeArabic("رحمة")).toBe("رحمه");
  });
  it("makes Uthmani and standard spelling of Quran equal", () => expect(normalizeArabic("ٱلْقُرْءَانَ")).toBe(normalizeArabic("القرآن")));
  it("drops digits, punctuation and verse marks", () => expect(normalizeArabic("الله، ۝١")).toBe("الله"));
});

describe("matchRecitation", () => {
  it("marks an un-voweled correct transcript fully correct", () => {
    const r = matchRecitation("الحمد لله رب العالمين", FATIHA_2);
    expect(r.targetStatuses).toEqual(["CORRECT", "CORRECT", "CORRECT", "CORRECT"]);
    expect(r.score).toBe(100);
  });
  it("flags a missing word", () => {
    const r = matchRecitation("الحمد لله العالمين", FATIHA_2);
    expect(r.targetStatuses).toEqual(["CORRECT", "CORRECT", "ERROR", "CORRECT"]);
    expect(r.results.find(x => x.kind === "missing")?.expectedWord).toBe("رَبِّ");
  });
  it("flags an extra spoken word", () => {
    const r = matchRecitation("الحمد لله يا رب العالمين", FATIHA_2);
    expect(r.counts.extra).toBe(1);
    expect(r.targetStatuses.every(s => s === "CORRECT")).toBe(true);
  });
  it("flags a wrong word as ERROR", () => {
    const r = matchRecitation("الحمد لله كتاب العالمين", FATIHA_2);
    expect(r.targetStatuses[2]).toBe("ERROR");
  });
  it("warns on a vowel that contradicts the target", () => {
    expect(compareWords("رَبِّ", "رُبِّ")).toMatchObject({ status: "WARNING", kind: "diacritic" });
  });
  it("accepts standard spelling of waw-carried alef words", () => {
    expect(compareWords("ٱلصَّلَوٰةَ", "الصلاة").status).toBe("CORRECT");
    expect(compareWords("ٱلْحَيَوٰةَ", "الحياة").status).toBe("CORRECT");
  });
  it("warns on a sound-alike letter", () => expect(compareWords("ٱلصِّرَٰطَ", "السراط").status).toBe("WARNING"));
  it("flags swapped words", () => {
    const r = matchRecitation("الحمد رب لله العالمين", FATIHA_2);
    expect(r.targetStatuses).toContain("ERROR");
  });
  it("ignores waqf signs in the target and keeps indices aligned", () => {
    const r = matchRecitation("طباقا ما ترى", "طِبَاقًا ۖ مَّا تَرَىٰ");
    expect(r.targetStatuses).toEqual(["CORRECT", "CORRECT", "CORRECT", "CORRECT"]);
  });
  it("scores an empty transcript as zero", () => expect(matchRecitation("", FATIHA_2).score).toBe(0));
  it("maps statuses onto UI marks", () => expect([statusToMark("CORRECT"), statusToMark("WARNING"), statusToMark("ERROR")]).toEqual(["ok", "tashkeel", "missing"]));
});

describe("matchLive", () => {
  it("leaves unreached words pending and puts the cursor on the next word", () => {
    const r = matchLive("الحمد لله", FATIHA_2);
    expect(r.statuses).toEqual(["CORRECT", "CORRECT", "PENDING", "PENDING"]);
    expect(r.cursor).toBe(2);
    expect(r.recited).toBe(2);
    expect(r.accuracy).toBe(100);
    expect(r.done).toBe(false);
  });
  it("starts at word 0 with an empty transcript", () => {
    const r = matchLive("", FATIHA_2);
    expect(r.cursor).toBe(0);
    expect(r.statuses.every(s => s === "PENDING")).toBe(true);
  });
  it("marks a skipped word red once a later word was reached", () => {
    const r = matchLive("الحمد رب", FATIHA_2);
    expect(r.statuses).toEqual(["CORRECT", "ERROR", "CORRECT", "PENDING"]);
    expect(r.accuracy).toBe(67);
  });
  it("is done after the whole text", () => {
    const r = matchLive("الحمد لله رب العالمين", FATIHA_2);
    expect(r.done).toBe(true);
    expect(r.cursor).toBe(4);
  });
  it("skips waqf signs when placing the cursor", () => {
    const r = matchLive("طباقا", "طِبَاقًا ۖ مَّا تَرَىٰ");
    expect(r.cursor).toBe(2);
    expect(r.total).toBe(3);
  });
});
