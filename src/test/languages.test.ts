import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { LANGUAGES, WEEKDAY_LETTERS, isLanguage, isRtl, localeFor } from "@/i18n";
import { copy } from "@/lib/i18n";
import { cleanSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { createRecitationStore } from "@/context/RecitationContext";
import { finishedSurah, isReached, passageFinished, surahEndIndices, tally } from "@/lib/surahCompletion";

const dir = `${__dirname}/../i18n/locales`;
const placeholders = (s: string) => (s.match(/\{[a-z]+\}/g) ?? []).sort().join(",");

describe("Languages", () => {
  it("lists 13 languages with native names; Arabic and Urdu are right-to-left", () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(["ar", "en", "de", "fr", "tr", "ur", "id", "ms", "es", "ru", "bn", "sq", "bs"]);
    expect(LANGUAGES.filter((l) => isRtl(l.code)).map((l) => l.code)).toEqual(["ar", "ur"]);
    expect(localeFor("de")).toBe("de");
    expect(isLanguage("de")).toBe(true);
    expect(isLanguage("xx")).toBe(false);
  });

  it("every dictionary has every text, with the same placeholders", () => {
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBe(11);
    for (const f of files) {
      const dict = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as Record<string, string>;
      for (const [key, [, en]] of Object.entries(copy)) {
        expect(dict[key], `${f}: ${key}`).toBeTruthy();
        expect(placeholders(dict[key]!), `${f}: ${key}`).toBe(placeholders(en));
      }
      expect(Object.keys(dict).filter((k) => !(k in copy))).toEqual([]);
    }
  });

  it("has seven weekday letters for every language", () => {
    for (const l of LANGUAGES) expect(WEEKDAY_LETTERS[l.code]).toHaveLength(7);
  });

  it("keeps a saved language and repairs an unknown one", () => {
    expect(cleanSettings({ ...DEFAULT_SETTINGS, language: "tr" }).language).toBe("tr");
    expect(cleanSettings({ ...DEFAULT_SETTINGS, language: "klingon" as never }).language).toBe(DEFAULT_SETTINGS.language);
  });
});

describe("Surah completion", () => {
  // Surah 112 (4 ayahs) and the start of 113, as on a Mushaf page.
  const words: Record<string, number> = { "112:1": 4, "112:2": 2, "112:3": 4, "112:4": 5, "113:1": 4 };
  const keys = Object.entries(words).flatMap(([sa, n]) => Array.from({ length: n }, (_, i) => `${sa}:${i + 1}`));
  const ends = surahEndIndices(keys, (s) => (s === 112 ? 4 : 5), (s, a) => words[`${s}:${a}`] ?? 0);

  it("finds the last word of each surah that ends on the page", () => {
    expect([...ends]).toEqual([[112, { start: 0, end: 14 }]]); // 113 does not end here
  });

  it("is complete once the reciter reached the last word", () => {
    const st = keys.map((_, i) => (i < 14 ? "CORRECT" : "PENDING") as const);
    expect(finishedSurah(ends, (i) => st[i])).toBe(null);
    const done = keys.map((_, i) => (i <= 14 ? (i === 14 ? "WARNING" : "CORRECT") : "PENDING") as const);
    expect(finishedSurah(ends, (i) => done[i])).toBe(112);
    expect(finishedSurah(ends, (i) => done[i], new Set([112]))).toBe(null);
    expect(isReached("ERROR")).toBe(true);
    // "أحد" heard right at the start also matches the surah's last word: not a completion.
    const jump = keys.map((_, i) => (i < 2 || i === 14 ? "CORRECT" : i < 14 ? "ERROR" : "PENDING") as const);
    expect(finishedSurah(ends, (i) => jump[i])).toBe(null);
    expect(passageFinished(jump.slice(0, 15), 14)).toBe(false);
    expect(passageFinished(done.slice(0, 15), 14)).toBe(true);
    expect(isReached("PENDING")).toBe(false);
  });

  it("counts judged words", () => {
    expect(tally(["CORRECT", "CORRECT", "WARNING", "ERROR", "PENDING"])).toEqual({ correct: 2, near: 1, wrong: 1 });
  });
});

describe("RecitationContext store", () => {
  it("adds up a continuous session over automatic page turns", () => {
    const s = createRecitationStore();
    s.startSession();
    s.addPart({ correct: 40, near: 2, wrong: 1 }, true);
    s.addPart({ correct: 30, near: 0, wrong: 3 }, true);
    s.addPart({ correct: 5, near: 1, wrong: 0 }, false);
    s.surahDone(2); s.surahDone(2);
    s.endSession();
    expect(s.session.get()).toEqual({ active: false, correct: 75, near: 3, wrong: 4, pages: 2, surahsDone: [2], range: null });
    s.startSession();
    expect(s.session.get().correct).toBe(0);
  });

  it("keeps view snapshots across re-mounts", () => {
    const s = createRecitationStore();
    s.mushaf = { surahId: 1, focusAyah: undefined, page: 3, mode: "RECITATION_MODE", selected: null, hints: [], statuses: [["2:6:1", "CORRECT"]] };
    expect(s.mushaf.page).toBe(3);
  });
});
