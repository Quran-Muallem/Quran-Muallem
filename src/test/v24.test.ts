import { describe, expect, it } from "vitest";
import { HUB_RECITERS, getHubReciter, moshafSurahs, searchReciters, surahRemote, verseAt } from "@/lib/recitersHub";
import { PLAN_DAYS, idOf } from "@/lib/prayerNotifications";
import { NOTIFY_PRAYERS } from "@/lib/PrayerTimesEngine";

describe("reciters library", () => {
  it("has the 86 requested Sheikhs with their riwayat", () => {
    expect(HUB_RECITERS).toHaveLength(86);
    expect(new Set(HUB_RECITERS.map((r) => r.id)).size).toBe(86);
    expect(HUB_RECITERS[0]!.ar).toBe("عبدالرحمن السديس");
    expect(HUB_RECITERS.at(-1)!.ar).toBe("مشاري العفاسي");
    const riwayat = new Set(HUB_RECITERS.flatMap((r) => r.moshaf.map((m) => m.ar)));
    for (const want of ["حفص عن عاصم - مرتل", "قالون عن نافع - مرتل", "ورش عن نافع - مرتل", "شعبة عن عاصم - مرتل", "ابن جماز عن أبي جعفر - مرتل", "هشام عن ابي عامر - مرتل", "خلف عن حمزة - مرتل", "السوسي عن أبي عمرو - مرتل", "البزي عن ابن كثير - مرتل", "قراءة يعقوب الحضرمي بروايتي رويس وروح - مرتل", "حفص عن عاصم - المصحف المعلم", "حفص عن عاصم - المصحف المجود"])
      expect([...riwayat].some((r) => r.replace(/\s+/g, " ").startsWith(want.replace(/ - مرتل$/, ""))), want).toBe(true);
    expect(getHubReciter(265)!.moshaf.length).toBe(13); // Ahmad Deeban: the ten qira'at
  });
  it("builds mp3quran.net surah URLs", () => {
    const m = getHubReciter(102)!.moshaf.find((x) => x.ar.includes("مرتل"))!;
    expect(surahRemote(m, 2)).toMatch(/^https:\/\/(server\d+|cdn)\.mp3quran\.net\/.+\/002\.mp3$/);
    expect(moshafSurahs(m)).toHaveLength(114);
  });
  it("searches by Arabic (any hamza / spacing) or Latin name and by riwaya", () => {
    expect(searchReciters(HUB_RECITERS, "المعيقلي").map((r) => r.id)).toEqual([102]);
    expect(searchReciters(HUB_RECITERS, "عبد الباسط")[0]!.id).toBe(51);
    expect(searchReciters(HUB_RECITERS, "minshawi")[0]!.id).toBe(112);
    expect(searchReciters(HUB_RECITERS, "ورش").length).toBeGreaterThanOrEqual(4);
  });
  it("finds the verse playing from mp3quran.net timing", () => {
    const t = [{ ayah: 1, start: 7820, end: 13780 }, { ayah: 2, start: 13780, end: 20620 }];
    expect(verseAt(t, 1000)).toBeNull();
    expect(verseAt(t, 8000)).toBe(1);
    expect(verseAt(t, 15000)).toBe(2);
  });
});

describe("adhan plan", () => {
  it("plans 7 days with unique ids (35 ≤ iOS' 64 pending)", () => {
    const ids = Array.from({ length: PLAN_DAYS }, (_, d) => NOTIFY_PRAYERS.map((p) => idOf(d, p))).flat();
    expect(PLAN_DAYS).toBe(7);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeLessThanOrEqual(64);
  });
});
