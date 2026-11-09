import { describe, expect, it } from "vitest";
import {
  ADHKAR, ADHKAR_CATEGORIES, adhkarCategory, categoryProgress, forToday, increment, resetCategory, suggestedCategory, type AdhkarDay,
} from "@/lib/adhkar";
import { SURAH_META } from "@/lib/quranService";

const day = (date: string, counts: Record<string, number> = {}): AdhkarDay => ({ version: 1, date, counts });

describe("adhkar data", () => {
  it("has the five categories (incl. duas) with valid, unique entries", () => {
    expect(ADHKAR.map((c) => c.id)).toEqual(ADHKAR_CATEGORIES);
    const ids = ADHKAR.flatMap((c) => c.items.map((d) => d.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of ADHKAR) {
      expect(c.items.length).toBeGreaterThanOrEqual(8);
      for (const d of c.items) {
        expect(Number.isInteger(d.count) && d.count >= 1 && d.count <= 100).toBe(true);
        expect(!!d.text || !!d.quran?.length).toBe(true);
        expect(d.sourceAr.length).toBeGreaterThan(3);
        expect(d.sourceEn.length).toBeGreaterThan(3);
        if (d.text) expect(d.text).toMatch(/^[؀-ۿﷺ\s،.]+$/);
        for (const r of d.quran ?? []) {
          const meta = SURAH_META[r.surah - 1];
          expect(meta).toBeTruthy();
          expect(r.from >= 1 && r.from <= r.to && r.to <= (meta?.versesCount ?? 0)).toBe(true);
        }
      }
    }
  });

  it("includes the well-known counts", () => {
    const prayer = adhkarCategory("prayer").items;
    expect(prayer.filter((d) => d.count === 33)).toHaveLength(3);
    expect(adhkarCategory("sleep").items.find((d) => d.id === "s-allahuakbar")?.count).toBe(34);
    expect(adhkarCategory("morning").items.find((d) => d.id === "m-subhan-100")?.count).toBe(100);
  });
});

describe("adhkar counter", () => {
  const cat = adhkarCategory("prayer");
  const subhan = cat.items.find((d) => d.id === "p-subhanallah")!;

  it("counts up to the target and not beyond", () => {
    let d = day("2026-11-05");
    for (let i = 0; i < 40; i++) d = increment(d, subhan, "2026-11-05");
    expect(d.counts["p-subhanallah"]).toBe(33);
    expect(categoryProgress(d, cat, "2026-11-05").done).toBe(1);
  });

  it("starts fresh on a new day", () => {
    const d = day("2026-11-04", { "p-subhanallah": 33 });
    expect(forToday(d, "2026-11-05").counts).toEqual({});
    expect(categoryProgress(d, cat, "2026-11-05").done).toBe(0);
    expect(increment(d, subhan, "2026-11-05").counts).toEqual({ "p-subhanallah": 1 });
  });

  it("resets only the chosen category", () => {
    const d = day("2026-11-05", { "p-subhanallah": 10, "m-subhan-100": 5 });
    expect(resetCategory(d, cat, "2026-11-05").counts).toEqual({ "m-subhan-100": 5 });
  });

  it("suggests a category by time of day", () => {
    expect(suggestedCategory(new Date("2026-11-05T06:30:00"))).toBe("morning");
    expect(suggestedCategory(new Date("2026-11-05T13:00:00"))).toBe("prayer");
    expect(suggestedCategory(new Date("2026-11-05T17:00:00"))).toBe("evening");
    expect(suggestedCategory(new Date("2026-11-05T22:30:00"))).toBe("sleep");
  });
});
