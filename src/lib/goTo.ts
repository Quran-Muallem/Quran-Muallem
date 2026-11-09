import { TOTAL_PAGES } from "@/lib/mushafData";
import { SURAH_META, getSurahMeta } from "@/lib/quranService";
import translatedNames from "@/data/surahNamesTranslated.json";

/** Meaning of every surah name per language (German, English, French …), for the name search. */
const NAMES_BY_LANG = (translatedNames as { names: Record<string, string[]> }).names;
const TRANSLATED: string[][] = Object.values(NAMES_BY_LANG);
/** Meaning of a surah name in the app language («Die Kuh»), if there is one. */
export const surahMeaning = (surah: number, language: string): string | undefined => NAMES_BY_LANG[language === "sq" ? "en" : language]?.[surah - 1];

export type GoToTarget = { page: number } | { surah: number; ayah: number };

/** Western digits for typed Arabic-Indic / Persian digits. */
export const latinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0));

/**
 * Understands a quick jump typed in one field: "293" / "p 293" / "page 293" → page; "17:111", "17 111",
 * "17/111" → surah 17, verse 111. Returns null when it is not a valid page / verse.
 */
export function parseGoTo(input: string): GoToTarget | null {
  const s = latinDigits(input).trim().toLowerCase();
  const verse = s.match(/^(\d{1,3})\s*[:/.,\s-]\s*(\d{1,3})$/);
  if (verse) {
    const surah = Number(verse[1]), ayah = Number(verse[2]);
    const meta = getSurahMeta(surah);
    return meta && ayah >= 1 && ayah <= meta.versesCount ? { surah, ayah } : null;
  }
  const page = s.match(/^(?:[^\d\s]+\s*)?(\d{1,3})$/);
  if (page) { const p = Number(page[1]); return p >= 1 && p <= TOTAL_PAGES ? { page: p } : null; }
  return null;
}

/** Folds a name for matching: Arabic without diacritics / tatweel / alef forms / "ال" and "سورة"; Latin without accents, apostrophes, hyphens and "al-"-type articles. */
export function foldSurahName(s: string): string {
  const ar = s
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
    .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/^\s*سوره\s+/, "").replace(/(^|\s)ال/g, "$1");
  return ar.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/^\s*(surah|sura|sure|sourate|surat|sourah|suresi)\s+/, "")
    .replace(/^(die|der|das|the|la|le|les|el|los|las|l)(?=\s|')/, "")
    .replace(/['’`ʿʾ\-\s]+/g, "")
    .replace(/^(al|an|ar|as|ash|at|ad|adh|az|ali)(?=[a-z]{3,})/, "");
}

/**
 * Surah suggestions for a typed name or number (Arabic or transliterated, any vowels / article):
 * exact number first, then names starting with the text, then names containing it. At most `limit`.
 */
export function searchSurahs(query: string, limit = 8): number[] {
  const q = latinDigits(query).trim();
  if (!q) return [];
  if (/^\d{1,3}$/.test(q)) { const n = Number(q); return n >= 1 && n <= 114 ? [n] : []; }
  const f = foldSurahName(q);
  if (!f) return [];
  const starts: number[] = [], contains: number[] = [];
  for (const m of SURAH_META) {
    const names = [foldSurahName(m.nameArabic), foldSurahName(m.nameSimple), ...TRANSLATED.map((l) => foldSurahName(l[m.id - 1] ?? ""))].filter(Boolean);
    if (names.some((n) => n.startsWith(f))) starts.push(m.id);
    else if (names.some((n) => n.includes(f))) contains.push(m.id);
  }
  return [...starts, ...contains].slice(0, limit);
}
