import { describe, expect, it } from "vitest";
import { foldSurahName, searchSurahs } from "@/lib/goTo";
import { accuracyOf, groupBySurah, type RecordingMeta } from "@/lib/audioStorage";

describe("surah search (Go To)", () => {
  it("finds surahs by Arabic name with or without article / diacritics / سورة", () => {
    expect(searchSurahs("البقرة")[0]).toBe(2);
    expect(searchSurahs("بقره")[0]).toBe(2);
    expect(searchSurahs("سورة الكهف")[0]).toBe(18);
    expect(searchSurahs("يس")[0]).toBe(36);
  });
  it("finds surahs by transliteration and number", () => {
    expect(searchSurahs("baqara")[0]).toBe(2);
    expect(searchSurahs("Al-Kahf")[0]).toBe(18);
    expect(searchSurahs("mulk")[0]).toBe(67);
    expect(searchSurahs("١١٤")).toEqual([114]);
    expect(searchSurahs("115")).toEqual([]);
  });
  it("folds names", () => {
    expect(foldSurahName("Al-Ma'un")).toBe("maun");
    expect(foldSurahName("الْمَاعُون")).toBe(foldSurahName("الماعون"));
  });
});

describe("recording sessions", () => {
  const r = (id: string, surah: number, from: number, to: number, accuracy?: number, at = "2026-01-01T00:00:00Z"): RecordingMeta =>
    ({ id, surah, fromAyah: from, toAyah: to, createdAt: at, seconds: 5, mime: "audio/webm", bytes: 10, accuracy });
  it("computes accuracy (orange counts half)", () => {
    expect(accuracyOf({ correct: 8, near: 2, wrong: 0 })).toBe(90);
    expect(accuracyOf({ correct: 0, near: 0, wrong: 0 })).toBeNull();
  });
  it("groups by surah with best and attempts", () => {
    const g = groupBySurah([r("a", 2, 1, 12, 70), r("b", 107, 1, 5, 95), r("c", 2, 13, 20, 82, "2026-02-01T00:00:00Z"), r("d", 107, 1, 7)]);
    expect(g.map((x) => x.surah)).toEqual([2, 107]);
    expect(g[0]).toMatchObject({ best: 82, attempts: 2 });
    expect(g[0]!.sessions[0]!.id).toBe("c");
    expect(g[1]).toMatchObject({ best: 95, attempts: 2 });
  });
});

import { nextVerse, previousVerse } from "@/lib/usePagePlayer";
import { sessionTexts } from "@/lib/audioPlayback";
import { ADHKAR_CATEGORIES, adhkarCategory, refWords } from "@/lib/adhkar";
import { nextMode } from "@/lib/PrayerTimesEngine";
import { translate } from "@/lib/i18n";
import { readFileSync } from "node:fs";

describe("continuous playback order", () => {
  it("goes verse after verse and on into the next surah", () => {
    expect(nextVerse({ surah: 1, ayah: 6 })).toEqual({ surah: 1, ayah: 7 });
    expect(nextVerse({ surah: 1, ayah: 7 })).toEqual({ surah: 2, ayah: 1 });
    expect(nextVerse({ surah: 114, ayah: 6 })).toBeNull();
    expect(previousVerse({ surah: 2, ayah: 1 })).toEqual({ surah: 1, ayah: 7 });
    expect(previousVerse({ surah: 1, ayah: 1 })).toBeNull();
  });
  it("names the lock-screen player in the app language", () => {
    const o = { surahArabic: "البقرة", surahSimple: "Al-Baqarah", ayah: 12, reciterArabic: "ماهر المعيقلي", reciterEnglish: "Maher Al-Muaiqly" };
    expect(sessionTexts((k) => translate("ar", k), { ...o, language: "ar" })).toEqual({ title: "سورة البقرة · الآية ١٢", artist: "بصوت الشيخ ماهر المعيقلي" });
    expect(sessionTexts((k) => translate("en", k), { ...o, language: "en" }).artist).toBe("Recited by Sheikh Maher Al-Muaiqly");
  });
});

describe("duas", () => {
  const words = JSON.parse(readFileSync("public/mushaf/words.json", "utf8")) as { surahs: string[][][] };
  const dua = adhkarCategory("dua");
  it("is a category with Quran and Sunnah duas", () => {
    expect(ADHKAR_CATEGORIES).toContain("dua");
    expect(dua.items.length).toBeGreaterThanOrEqual(40);
    expect(dua.items.filter((d) => d.group === "quran").length).toBeGreaterThanOrEqual(15);
    for (const d of dua.items) expect(d.sourceAr && d.sourceEn && (d.text || d.quran)).toBeTruthy();
  });
  it("starts partial verses at the supplication (word ranges are valid)", () => {
    for (const d of dua.items) for (const r of d.quran ?? []) {
      const w = words.surahs[r.surah - 1]![r.from - 1]!;
      expect(r.fromWord ?? 1).toBeLessThanOrEqual(w.length);
      const first = refWords(r, r.from, w)[0]!.replace(/[ً-ٰٟۖ-ۭ]/g, "");
      expect(first, `${d.id}`).toMatch(/^(ربن|رب|ر?بنا|لا|سبح|اللهم|رب)/u);
    }
  });
});

describe("adhan mode toggle", () => {
  it("cycles adhan → vibrate → off → adhan", () => {
    expect(nextMode("adhan")).toBe("vibrate");
    expect(nextMode("vibrate")).toBe("off");
    expect(nextMode("off")).toBe("adhan");
  });
});

describe("v24: surah names in other languages", () => {
  it("finds surahs by German / English / French meaning", () => {
    expect(searchSurahs("Die Kuh")[0]).toBe(2);
    expect(searchSurahs("kuh")[0]).toBe(2);
    expect(searchSurahs("Höhle")[0]).toBe(18);
    expect(searchSurahs("The Cave")[0]).toBe(18);
    expect(searchSurahs("vache")[0]).toBe(2);
  });
});
