/**
 * Hadith library: Sahih al-Bukhari and Sahih Muslim (fawazahmed0/hadith-api on jsDelivr — public, free,
 * no key). A book is downloaded once per language (a few MB) and then kept on the device (IndexedDB), so
 * browsing and search work offline afterwards. Arabic is always available; the app language where the
 * collection has it, otherwise English.
 */
import { idb } from "@/lib/storage";
import type { Language } from "@/i18n";

const CDN = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";

export type BookId = "bukhari" | "muslim";
export const BOOKS: { id: BookId; ar: string; en: string }[] = [
  { id: "bukhari", ar: "صحيح البخاري", en: "Sahih al-Bukhari" },
  { id: "muslim", ar: "صحيح مسلم", en: "Sahih Muslim" },
];

/** Hadith-API language prefixes per app language (where the collections are translated). */
const EDITION_LANG: Partial<Record<Language, string>> = { ar: "ara", en: "eng", tr: "tur", ur: "urd", id: "ind", bn: "ben", ru: "rus", fr: "fra" };
export const hadithLanguage = (language: Language): string => EDITION_LANG[language] ?? "eng";
export const editionName = (book: BookId, lang: string) => `${lang}-${book}`;

export type Hadith = { n: number; text: string; book: number; inBook: number; grades: string[] };
export type HadithBook = { id: BookId; lang: string; sections: { n: number; title: string; first: number; last: number }[]; hadiths: Hadith[] };

type RawEdition = {
  metadata?: { sections?: Record<string, string>; section_details?: Record<string, { hadithnumber_first?: number; hadithnumber_last?: number }> };
  hadiths?: { hadithnumber: number; text: string; grades?: { grade?: string }[]; reference?: { book?: number; hadith?: number } }[];
};

/** Normalizes the API's edition JSON (also used by the tests). */
export function parseEdition(id: BookId, lang: string, raw: RawEdition): HadithBook {
  const titles = raw.metadata?.sections ?? {};
  const details = raw.metadata?.section_details ?? {};
  const sections = Object.entries(titles)
    .map(([k, title]) => ({ n: Number(k), title: String(title ?? "").trim(), first: details[k]?.hadithnumber_first ?? 0, last: details[k]?.hadithnumber_last ?? 0 }))
    .filter((s) => s.n >= 0 && s.title)
    .sort((a, b) => a.n - b.n);
  const hadiths = (raw.hadiths ?? [])
    .filter((h) => h && typeof h.text === "string" && h.text.trim())
    .map((h) => ({ n: h.hadithnumber, text: h.text.trim(), book: h.reference?.book ?? 0, inBook: h.reference?.hadith ?? 0, grades: (h.grades ?? []).map((g) => g.grade ?? "").filter(Boolean) }));
  return { id, lang, sections, hadiths };
}

const memory = new Map<string, Promise<HadithBook>>();

/** A whole book in one language (device cache first; `onProgress` reports the download in bytes). */
export function loadBook(id: BookId, lang: string, onProgress?: (loaded: number) => void): Promise<HadithBook> {
  const key = `qm.hadith.${editionName(id, lang)}.v1`;
  let p = memory.get(key);
  if (!p) {
    p = (async () => {
      const cached = await idb.get<HadithBook>(key);
      if (cached?.hadiths?.length) return cached;
      if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("offline");
      const raw = await fetchWithProgress(`${CDN}/${editionName(id, lang)}.min.json`, onProgress)
        .catch(() => fetchWithProgress(`${CDN}/${editionName(id, lang)}.json`, onProgress));
      const book = parseEdition(id, lang, raw as RawEdition);
      if (!book.hadiths.length) throw new Error("empty");
      await idb.set(key, book);
      return book;
    })();
    memory.set(key, p);
    p.catch(() => memory.delete(key));
  }
  return p;
}

export async function isBookStored(id: BookId, lang: string): Promise<boolean> {
  return !!(await idb.get<HadithBook>(`qm.hadith.${editionName(id, lang)}.v1`))?.hadiths?.length;
}

async function fetchWithProgress(url: string, onProgress?: (loaded: number) => void): Promise<unknown> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (!r.body || !onProgress) return r.json();
  const reader = r.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); loaded += value.length; onProgress(loaded);
  }
  const all = new Uint8Array(loaded);
  let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  return JSON.parse(new TextDecoder().decode(all));
}

/* ───────────── search ───────────── */

/** Lower-case, no Arabic diacritics / tatweel, unified alef / ya / ta marbuta: matching ignores them. */
export function foldText(s: string): string {
  return s.toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/\s+/g, " ").trim();
}

/** The narrator line ("Narrated Abu Huraira:", "حَدَّثَنَا …", "Rapporté par …") — the text's opening. */
export function narratorOf(text: string): string {
  const m = text.match(/^\s*((?:Narrated|It was narrated|Rapporté|Diriwayatkan|Rivayet|Передал|রাবি|روایت)[^:.\n]{0,80})[:.]/i);
  if (m) return m[1]!.trim();
  return text.split(/[:،,.\n]/)[0]!.slice(0, 80).trim();
}

export type HadithHit = { book: BookId; hadith: Hadith };
export type SearchScope = "all" | "narrator";

/**
 * All words of the query must occur (any order); `scope: "narrator"` searches only the narrator line.
 * Results keep book order; at most `limit`.
 */
export function searchHadith(books: HadithBook[], query: string, scope: SearchScope = "all", limit = 60): HadithHit[] {
  const words = foldText(query).split(" ").filter((w) => w.length > 1);
  const asNumber = /^\d+$/.test(query.trim()) ? Number(query.trim()) : null;
  if (!words.length && asNumber == null) return [];
  const out: HadithHit[] = [];
  for (const b of books) {
    for (const h of b.hadiths) {
      if (asNumber != null) { if (h.n === asNumber) out.push({ book: b.id, hadith: h }); continue; }
      const hay = foldText(scope === "narrator" ? narratorOf(h.text) : h.text);
      if (words.every((w) => hay.includes(w))) { out.push({ book: b.id, hadith: h }); if (out.length >= limit) return out; }
    }
  }
  return out;
}
