import { afterEach, describe, expect, it, vi } from "vitest";
import { ADHAN_VOICES, adhanFileFor, channelFor, getVoice, isAvailable } from "@/data/adhanVoices";
import { DEFAULT_PRAYER_SETTINGS, modeOf, voiceOf } from "@/lib/PrayerTimesEngine";
import { HADITH_ARABIC_TITLES } from "@/data/hadithArabicTitles";
import { TAFSIRS, TRANSLATIONS, downloadTranslation, getTafsir, isDownloaded, languageOrder, loadTranslation } from "@/lib/quranContent";
import { SURAH_META } from "@/lib/quranService";

describe("Adhan voices and modes", () => {
  it("Fajr always gets a recording with «الصلاة خير من النوم» and every referenced file exists", async () => {
    const { existsSync } = await import("node:fs");
    for (const v of ADHAN_VOICES) for (const f of [v.file, v.fajrFile]) if (f) { expect(existsSync(`public/adhan/${f}.mp3`)).toBe(true); expect(existsSync(`public/adhan/ios/${f}.caf`)).toBe(true); }
    for (const v of ADHAN_VOICES.filter(isAvailable)) expect(adhanFileFor(v.id, true)).toBe(v.fajrFile ?? "madinah_fajr");
    expect(adhanFileFor("madinah", false)).toBe("madinah");
    expect(adhanFileFor("alafasy", true)).toBe("alafasy_fajr"); // Fajr-only voice
    // a voice without recording (or Fajr-only, for other prayers) falls back to the default voice
    expect(adhanFileFor("alafasy", false)).toBe("madinah");
    expect(adhanFileFor("makkah", true)).toBe("madinah_fajr");
    expect(isAvailable(getVoice("alafasy"))).toBe(false);
    expect(channelFor("madinah")).toBe("adhan_madinah_v1");
  });

  it("per-prayer modes and voices (old 'true' = full Adhan)", () => {
    const s = { ...DEFAULT_PRAYER_SETTINGS, notify: { fajr: "vibrate" as const, isha: true as unknown as "adhan" }, voice: "madinah", prayerVoices: { maghrib: "makkah" } };
    expect(DEFAULT_PRAYER_SETTINGS.voice).toBe("madinah");
    expect(modeOf(s, "fajr")).toBe("vibrate");
    expect(modeOf(s, "isha")).toBe("adhan");
    expect(modeOf(s, "asr")).toBe("off");
    expect(voiceOf(s, "maghrib")).toBe("makkah");
    expect(voiceOf(s, "dhuhr")).toBe("madinah");
  });
});

describe("hadith Arabic titles", () => {
  it("has every book of al-Bukhari and Muslim in Arabic", () => {
    expect(Object.keys(HADITH_ARABIC_TITLES.bukhari)).toHaveLength(97);
    expect(Object.keys(HADITH_ARABIC_TITLES.muslim)).toHaveLength(57);
    expect(HADITH_ARABIC_TITLES.muslim[1]).toBe("كتاب الإيمان");
    expect(HADITH_ARABIC_TITLES.muslim[2]).toBe("كتاب الطهارة");
    expect(HADITH_ARABIC_TITLES.muslim[3]).toBe("كتاب الحيض");
    expect(HADITH_ARABIC_TITLES.bukhari[1]).toBe("كتاب بدء الوحي");
    for (const t of [...Object.values(HADITH_ARABIC_TITLES.bukhari), ...Object.values(HADITH_ARABIC_TITLES.muslim)]) expect(/[A-Za-z]/.test(t)).toBe(false);
  });
});

describe("translation & tafsir catalogue", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("groups by language, app language first", () => {
    expect(languageOrder("de").slice(0, 3)).toEqual(["de", "ar", "en"]);
    expect(languageOrder("ar").slice(0, 2)).toEqual(["ar", "en"]);
    const ar = TAFSIRS.filter((t) => t.language === "ar").map((t) => t.id);
    for (const id of ["ik-ar", "ar-saadi", "ar-qurtubi", "ar-baghawi", "ar-wasit", "ar-tabari", "ar-muyassar"]) expect(ar).toContain(id);
    expect(new Set(TAFSIRS.map((t) => t.id)).size).toBe(TAFSIRS.length);
    expect(new Set(TRANSLATIONS.map((t) => t.id)).size).toBe(TRANSLATIONS.length);
    expect(getTafsir("ar-saadi", "de").option.id).toBe("ar-saadi");
    expect(getTafsir(undefined, "de")).toMatchObject({ fallback: true, option: { id: "ik-en" } });
  });

  it("downloads a whole translation in one request and reads it back offline", async () => {
    const surahs = SURAH_META.map((m) => ({ number: m.id, ayahs: Array.from({ length: m.versesCount }, (_, i) => ({ numberInSurah: i + 1, text: `T${m.id}:${i + 1}` })) }));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { surahs } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    let last = 0;
    await downloadTranslation(TRANSLATIONS.find((t) => t.id === "de-aburida")!, (d) => { last = d; });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(last).toBe(114);
    expect(await isDownloaded("tr", "de-aburida")).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect((await loadTranslation("de-aburida", "de", 2))[254]).toBe("T2:255");
  });
});
