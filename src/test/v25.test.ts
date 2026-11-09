import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCountdown } from "@/lib/useNextPrayer";
import { nextPrayer, type DayTimes } from "@/lib/PrayerTimesEngine";
import { ayahUrls } from "@/lib/reciterManager";
import { sessionTexts } from "@/lib/audioPlayback";
import { translate } from "@/lib/i18n";

describe("next prayer countdown", () => {
  it("formats the time left", () => {
    expect(formatCountdown(48 * 60_000 + 12_000)).toBe("-00:48:12");
    expect(formatCountdown(3 * 3600_000 + 5_000)).toBe("-03:00:05");
    expect(formatCountdown(-5)).toBe("-00:00:00");
  });
  it("moves on to tomorrow's Fajr after Isha", () => {
    const d = (h: number) => { const x = new Date(2026, 10, 9, h, 0); return x; };
    const today: DayTimes = { fajr: d(5), sunrise: d(7), dhuhr: d(12), asr: d(14), maghrib: d(16), isha: d(18) };
    const tomorrow: DayTimes = { ...today, fajr: new Date(2026, 10, 10, 5, 1) };
    expect(nextPrayer(today, tomorrow, d(17))?.name).toBe("isha");
    expect(nextPrayer(today, tomorrow, new Date(2026, 10, 9, 19))?.at.getDate()).toBe(10);
  });
});

describe("audio sources", () => {
  it("has fallbacks for verse audio (everyayah → mirror → Quran.com CDN)", () => {
    const u = ayahUrls("alafasy", 1, 1);
    expect(u[0]).toContain("everyayah.com");
    expect(u.some((x) => x.includes("quranicaudio.com"))).toBe(true);
    expect(u.at(-1)).toBe("https://verses.quran.com/Alafasy/mp3/001001.mp3");
    expect(ayahUrls("maher", 1, 1)).toHaveLength(1);
  });
  it("lock screen: title = surah, artist = «بصوت الشيخ …»", () => {
    expect(sessionTexts((k) => translate("ar", k), { language: "ar", surahArabic: "الفاتحة", surahSimple: "Al-Fatihah", reciterArabic: "مشاري العفاسي", reciterEnglish: "Mishary Alafasy" }))
      .toEqual({ title: "سورة الفاتحة", artist: "بصوت الشيخ مشاري العفاسي" });
  });
});

describe("surah downloads", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it("retries a failed request and stores the surah even without Cache Storage (IndexedDB fallback)", async () => {
    vi.stubGlobal("caches", undefined);
    const body = new Uint8Array(2048).fill(7);
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls++;
      if (calls === 1) throw new TypeError("network down");
      return new Response(body, { status: 200, headers: { "Content-Length": String(body.length) } });
    }));
    const hub = await import("@/lib/recitersHub");
    const r = hub.getHubReciter(102)!, m = r.moshaf[0]!;
    await hub.downloadSurahFile(r, m, 108);
    expect(calls).toBe(2);
    expect(hub.surahDownloadState(hub.moshafKey(r, m), 108)).toMatchObject({ status: "complete", bytes: 2048 });
    expect(hub.moshafDownloadState(r, m).done).toBe(1);
    expect(await hub.surahPlayUrl(r, m, 108)).toMatch(/^blob:/);
  });
});
