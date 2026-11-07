import { afterEach, describe, expect, it, vi } from "vitest";
import { SURAH_META, ayahMarker, getSurahAyahs, stripBasmalah, toArabicDigits, BASMALAH } from "@/lib/quranService";

describe("quranService", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ships metadata for 114 surahs / 6236 verses", () => {
    expect(SURAH_META).toHaveLength(114);
    expect(SURAH_META.reduce((s, m) => s + m.versesCount, 0)).toBe(6236);
    expect(SURAH_META[8]?.bismillahPre).toBe(false);
    expect(SURAH_META[1]?.revelationPlace).toBe("madinah");
  });
  it("formats Eastern Arabic verse markers", () => {
    expect(toArabicDigits(286)).toBe("٢٨٦");
    expect(ayahMarker(12)).toBe("﴿١٢﴾");
  });
  it("strips a prefixed Basmalah (alquran.cloud) but keeps other text", () => {
    expect(stripBasmalah(`${BASMALAH} قُلْ هُوَ ٱللَّهُ أَحَدٌ`)).toBe("قُلْ هُوَ ٱللَّهُ أَحَدٌ");
    expect(stripBasmalah("بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ٱلٓمٓ")).toBe("ٱلٓمٓ");
    expect(stripBasmalah("قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ")).toBe("قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ");
  });
  it("loads from Quran.com and falls back to bundled text when offline", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("chapter_number=113")) {
        return new Response(JSON.stringify({ verses: Array.from({ length: 5 }, (_, i) => ({ verse_key: `113:${i + 1}`, text_uthmani: `آية ${i + 1}` })) }));
      }
      throw new TypeError("offline");
    }));
    const falaq = await getSurahAyahs(113);
    expect(falaq.source).toBe("quran.com");
    expect(falaq.ayahs).toHaveLength(5);
    const fatiha = await getSurahAyahs(1);
    expect(fatiha.source).toBe("bundled");
    await expect(getSurahAyahs(2)).rejects.toThrow();
  });
});
