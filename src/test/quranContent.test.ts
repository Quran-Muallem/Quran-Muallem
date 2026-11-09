import { describe, expect, it } from "vitest";
import { TRANSLATIONS, cleanText, getTranslation, tafsirFor, tafsirTextOf, translationsFor } from "@/lib/quranContent";
import { ayahRemoteUrl } from "@/lib/reciterManager";
import { parseGoTo } from "@/lib/goTo";
import { LANGUAGES } from "@/i18n";

describe("translations & Tafsir Ibn Kathir", () => {
  it("offers a translation for every app language", () => {
    for (const { code } of LANGUAGES) expect(translationsFor(code).length).toBeGreaterThan(0);
    expect(translationsFor("de").map((t) => t.id)).toEqual(["de-bubenheim", "de-rwwad", "de-aburida", "de-zaidan"]);
    expect(getTranslation("pt-elhayek", "de").language).toBe("pt"); // any language may be chosen
    expect(translationsFor("ar")[0]?.language).toBe("en");
    expect(getTranslation("nope", "ur").id).toBe("ur-jalandhari");
    expect(new Set(TRANSLATIONS.map((t) => t.id)).size).toBe(TRANSLATIONS.length);
  });

  it("Ibn Kathir in the language, English where no free edition exists", () => {
    expect(tafsirFor("ar")).toMatchObject({ fallback: false, option: { id: "ik-ar" } });
    expect(tafsirFor("ur").fallback).toBe(false);
    expect(tafsirFor("tr").fallback).toBe(false);
    expect(tafsirFor("de")).toMatchObject({ fallback: true, option: { id: "ik-en" } });
    expect(tafsirFor("bs").fallback).toBe(true);
  });

  it("cleans footnotes and HTML", () => {
    expect(cleanText("Praise be to Allah<sup foot_note=\"1\">1</sup>, Lord of the worlds")).toBe("Praise be to Allah, Lord of the worlds");
    expect(cleanText("<p>One</p><p>Two &amp; three</p>")).toBe("One\n\nTwo & three");
    expect(tafsirTextOf({ surah: 2, ayah: 3, text: "<h2>T</h2>x" })).toBe("T\n\nx");
    expect(tafsirTextOf({ tafsir: { text: "inner" } })).toBe("inner");
    expect(tafsirTextOf({ text: "" })).toBe("");
  });
});

describe("go to & audio helpers", () => {
  it("understands pages and verses", () => {
    expect(parseGoTo("293")).toEqual({ page: 293 });
    expect(parseGoTo("Seite 293")).toEqual({ page: 293 });
    expect(parseGoTo("٢٩٣")).toEqual({ page: 293 });
    expect(parseGoTo("17:111")).toEqual({ surah: 17, ayah: 111 });
    expect(parseGoTo("17 111")).toEqual({ surah: 17, ayah: 111 });
    expect(parseGoTo("17:112")).toBeNull();
    expect(parseGoTo("605")).toBeNull();
  });

  it("downloads the per-verse MP3 the player streams", () => {
    expect(ayahRemoteUrl("alafasy", 2, 255)).toBe("https://everyayah.com/data/Alafasy_128kbps/002255.mp3");
  });
});
