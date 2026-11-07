import { describe, expect, it } from "vitest";
import { KHATMA_PAGES, dailyPages, khatmaStats, logPages, logUpTo, newKhatma, planDays, toggleJuz, undoLast, type PageIndex } from "@/lib/khatmaStorage";
import { WEEKDAY_LETTERS, getStats, mondayOf, emptyProgress } from "@/lib/progressStorage";

// Simple stand-in for the Mushaf: 20 pages per juz (the last one 24), one surah per 10 pages.
const index: PageIndex = {
  juzOfPage: Array.from({ length: KHATMA_PAGES }, (_, i) => Math.min(30, Math.floor(i / 20) + 1)),
  surahsOfPage: Array.from({ length: KHATMA_PAGES }, (_, i) => [Math.min(61, Math.floor(i / 10) + 1)]),
};

describe("Khatma", () => {
  it("turns goals into pages per day and days", () => {
    expect(dailyPages({ type: "days", days: 30 })).toBe(21);
    expect(planDays({ type: "days", days: 30 })).toBe(30);
    expect(dailyPages({ type: "juz", perDay: 1 })).toBe(20);
    expect(planDays({ type: "pages", perDay: 2 })).toBe(302);
  });

  it("logs today's portion in Mushaf order, tracks juz and surahs, and can undo", () => {
    let k = newKhatma("tilawa", { type: "days", days: 30 }, "2026-11-01");
    k = logPages(k, undefined, "2026-11-01");
    let s = khatmaStats(k, index, "2026-11-01");
    expect(s.pagesDone).toBe(21);
    expect(s.today).toBe(21);
    expect(s.juzDone).toBe(1);
    expect(s.surahsDone).toBe(2);
    expect(s.nextPage).toBe(22);
    expect(s.ahead).toBe(0);
    k = undoLast(k, "2026-11-01");
    expect(khatmaStats(k, index, "2026-11-01").pagesDone).toBe(0);
  });

  it("knows when the reader is behind or ahead of the plan", () => {
    let k = newKhatma("tilawa", { type: "pages", perDay: 10 }, "2026-11-01");
    k = logUpTo(k, 15, "2026-11-01");
    expect(khatmaStats(k, index, "2026-11-03").ahead).toBe(15 - 30);
    k = logUpTo(k, 40, "2026-11-03");
    expect(khatmaStats(k, index, "2026-11-03").ahead).toBe(10);
  });

  it("marks a whole juz, and completes the khatma on the last page", () => {
    let k = newKhatma("hifz", { type: "pages", perDay: 1 }, "2026-01-01");
    k = toggleJuz(k, 30, index, "2026-01-02");
    expect(khatmaStats(k, index, "2026-01-02").juz[29]).toBe(1);
    k = toggleJuz(k, 30, index, "2026-01-02");
    expect(khatmaStats(k, index, "2026-01-02").juz[29]).toBe(0);
    k = logUpTo(k, KHATMA_PAGES, "2026-06-01");
    expect(k.completedAt).toBe("2026-06-01");
    expect(khatmaStats(k, index, "2026-06-01").nextPage).toBe(null);
  });
});

describe("Week starts on Monday", () => {
  it("labels and dates", () => {
    expect(WEEKDAY_LETTERS.en.join("")).toBe("MTWTFSS");
    expect(WEEKDAY_LETTERS.ar.join("")).toBe("نثرخجسح");
    expect(mondayOf("2026-11-07")).toBe("2026-11-02"); // Saturday → Monday
    expect(mondayOf("2026-11-08")).toBe("2026-11-02"); // Sunday belongs to the same week
    expect(mondayOf("2026-11-09")).toBe("2026-11-09");
    const week = getStats(emptyProgress(), "2026-11-07").week;
    expect(week.map((d) => d.date)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(week[5]!.today).toBe(true);
    expect(week[6]!.future).toBe(true);
  });
});

import { wordFeatures } from "@/lib/wordTajweed";
import { normalizeSegments } from "@/lib/audioPlayback";

describe("Word popover helpers", () => {
  it("reads Tajweed features from the Uthmani marks of one word", () => {
    expect(wordFeatures("ٱلرَّحْمَـٰنِ").sort()).toEqual(["daggerAlif", "shadda", "wasl"]);
    expect(wordFeatures("إِنَّ")).toEqual(["ghunna"]);
    expect(wordFeatures("يَقْطَعُونَ")).toEqual(["qalqalah"]);
    expect(wordFeatures("\u0671\u0644\u0636\u0651\u064e\u0627\u0653\u0644\u0651\u0650\u064a\u0646\u064e")).toContain("maddLong"); // 1:7 as in the bundled Mushaf
    expect(wordFeatures("مِنۢ")).toContain("iqlab");
  });
  it("accepts both Quran.com segment formats", () => {
    expect(normalizeSegments([[0, 1, 0, 600], [1, 2, 600, 1500]])).toEqual([[1, 0, 600], [2, 600, 1500]]);
    expect(normalizeSegments([[1, 0, 600], [2, 600, 600]])).toEqual([[1, 0, 600]]);
    expect(normalizeSegments("x")).toEqual([]);
  });
});
