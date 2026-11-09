import { describe, expect, it } from "vitest";
import { PRAYERS, ZERO_OFFSETS, applyOffsets, calculateLocal, clampOffset, defaultMethod, nextPrayer, parseClock, type DayTimes } from "@/lib/PrayerTimesEngine";

const mins = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60000);
const valid = (t: DayTimes) => PRAYERS.every((p) => t[p] instanceof Date && !Number.isNaN(t[p].getTime()));

describe("prayer times (on-device, adhan)", () => {
  it("are in order and complete (Berlin, MWL)", () => {
    const t = calculateLocal(52.52, 13.405, new Date(2026, 10, 9, 12), "MWL", "shafi");
    expect(valid(t)).toBe(true);
    for (let i = 1; i < PRAYERS.length; i++) expect(t[PRAYERS[i]!].getTime()).toBeGreaterThan(t[PRAYERS[i - 1]!].getTime());
  });

  it("Umm al-Qura: Isha 90 minutes after Maghrib (outside Ramadan)", () => {
    const t = calculateLocal(21.4225, 39.8262, new Date(2026, 10, 9, 12), "UmmAlQura", "shafi");
    expect(mins(t.maghrib, t.isha)).toBe(90);
  });

  it("Hanafi Asr is later than the standard Asr", () => {
    const d = new Date(2026, 5, 1, 12);
    expect(calculateLocal(41.01, 28.97, d, "Diyanet", "hanafi").asr.getTime()).toBeGreaterThan(calculateLocal(41.01, 28.97, d, "Diyanet", "shafi").asr.getTime());
  });

  it("high latitude in summer still gives Fajr and Isha (Hamburg, Oslo)", () => {
    expect(valid(calculateLocal(53.55, 9.99, new Date(2026, 5, 21, 12), "MWL", "shafi"))).toBe(true);
    expect(valid(calculateLocal(59.91, 10.75, new Date(2026, 5, 21, 12), "Kemenag", "shafi"))).toBe(true);
  });

  it("applies manual offsets, clamped to ±15 min", () => {
    const t = calculateLocal(52.52, 13.405, new Date(2026, 10, 9, 12), "MWL", "shafi");
    const o = applyOffsets(t, { ...ZERO_OFFSETS, fajr: 3, isha: -40 });
    expect(mins(t.fajr, o.fajr)).toBe(3);
    expect(mins(t.isha, o.isha)).toBe(-15);
    expect(clampOffset(99)).toBe(15);
  });

  it("parses Aladhan times and finds the next prayer", () => {
    const day = new Date(2026, 10, 9);
    expect(parseClock("05:12 (CET)", day)?.getHours()).toBe(5);
    expect(parseClock("--", day)).toBeNull();
    const t = calculateLocal(52.52, 13.405, new Date(2026, 10, 9, 12), "MWL", "shafi");
    const tomorrow = calculateLocal(52.52, 13.405, new Date(2026, 10, 10, 12), "MWL", "shafi");
    expect(nextPrayer(t, tomorrow, new Date(t.dhuhr.getTime() + 60000))?.name).toBe("asr");
    expect(nextPrayer(t, tomorrow, new Date(t.isha.getTime() + 60000))).toEqual({ name: "fajr", at: tomorrow.fajr });
    expect(nextPrayer(t, tomorrow, new Date(t.fajr.getTime() + 60000))?.name).toBe("dhuhr"); // sunrise is not a prayer
  });

  it("picks a default method by language", () => {
    expect(defaultMethod("ar")).toBe("UmmAlQura");
    expect(defaultMethod("tr")).toBe("Diyanet");
    expect(defaultMethod("id")).toBe("Kemenag");
    expect(defaultMethod("de")).toBe("MWL");
  });
});
