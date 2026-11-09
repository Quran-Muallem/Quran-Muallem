/**
 * Offline Quran search over the bundled Mushaf: surah by name or number, a verse ("2:255",
 * "Al-Baqarah 255", "البقرة ٢٥٥", "Ayah 255") and Arabic words anywhere in the Uthmani text.
 * Arabic matching ignores diacritics, hamza and alef spellings (الصلاة finds ٱلصَّلَوٰةَ).
 */
import { normalizeArabic } from "@/lib/quranMatcher";
import { SURAH_META, type SurahMeta } from "@/lib/quranService";

export type SearchWords = { versesCount(surah: number): number; words(surah: number, ayah: number): string[] };

export type SearchResult =
  | { kind: "surah"; surah: number }
  | { kind: "verse"; surah: number; ayah: number }
  | { kind: "text"; surah: number; ayah: number; words: number[] };

export type SearchOutcome = { results: SearchResult[]; more: boolean };

export const MAX_TEXT_RESULTS = 60;
const ARABIC = /[؀-ۿ]/;
const VERSE_WORDS = /^(?:ayah|aya|ayat|ayet|ayeti|ajet|ajeti|vers|verse|vers[eo]t|versículo|verset|stih|ayat|آية|اية|الآية|الاية|آيه|آيت|аят|আয়াত)\.?$/i;

/** Eastern Arabic / Persian digits → ASCII. */
export const asciiDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0));

/** Arabic letters only, without alef / hamza seats: a spelling-tolerant skeleton. */
export const skeleton = (word: string) => normalizeArabic(word, { daggerAlef: true }).replace(/ا/g, "");

const latinKey = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "")
  .replace(/^(al|an|ar|as|at|ad|adh|ash|az)(?=[a-z]{3})/, "").replace(/(.)\1+/g, "$1").replace(/h$/, "");
const arabicKey = (s: string) => skeleton(s).replace(/^ل/, "");

/** Surahs whose name matches (start of the name first, then anywhere). */
export function findSurahs(query: string): SurahMeta[] {
  const q = query.trim();
  if (!q) return [];
  const isAr = ARABIC.test(q);
  const key = isAr ? arabicKey(q) : latinKey(q);
  if (!key) return [];
  const name = (m: SurahMeta) => (isAr ? arabicKey(m.nameArabic) : latinKey(m.nameSimple));
  const starts = SURAH_META.filter((m) => name(m).startsWith(key));
  const inside = SURAH_META.filter((m) => !starts.includes(m) && name(m).includes(key));
  return [...starts, ...inside];
}

let index: { surah: number; ayah: number; words: string[] }[] | null = null;
let indexOf: SearchWords | null = null;
function textIndex(data: SearchWords) {
  if (index && indexOf === data) return index;
  const out: { surah: number; ayah: number; words: string[] }[] = [];
  for (let s = 1; s <= 114; s++) for (let a = 1; a <= data.versesCount(s); a++) out.push({ surah: s, ayah: a, words: data.words(s, a).map(skeleton) });
  index = out; indexOf = data;
  return out;
}

/** Verses containing the Arabic words of `query` in this order (each query word is a prefix of a verse word, the last may be partial). */
export function searchText(data: SearchWords, query: string, limit = MAX_TEXT_RESULTS): SearchOutcome {
  const q = asciiDigits(query).split(/\s+/).map(skeleton).filter(Boolean);
  if (!q.length || q.join("").length < 2) return { results: [], more: false };
  const results: SearchResult[] = [];
  for (const v of textIndex(data)) {
    const hits: number[] = [];
    for (let i = 0; i + q.length <= v.words.length; i++) {
      let ok = true;
      for (let j = 0; j < q.length && ok; j++) {
        const w = v.words[i + j] ?? "";
        // Words in the middle of a phrase must match whole; the first may carry a prefix (و، ف، ب، ل، ال).
        ok = j === q.length - 1 ? (j === 0 ? w.includes(q[j]!) : w.startsWith(q[j]!)) : j === 0 ? w.endsWith(q[j]!) : w === q[j];
      }
      if (ok) for (let j = 0; j < q.length; j++) hits.push(i + j + 1);
    }
    if (hits.length) {
      if (results.length >= limit) return { results, more: true };
      results.push({ kind: "text", surah: v.surah, ayah: v.ayah, words: [...new Set(hits)] });
    }
  }
  return { results, more: false };
}

/** Everything a query can mean: surah(s), verse(s) and verses containing its words. */
export function search(data: SearchWords | null, raw: string): SearchOutcome {
  const query = asciiDigits(raw).trim().replace(/\s+/g, " ");
  if (!query) return { results: [], more: false };
  const out: SearchResult[] = [];
  const verse = (surah: number, ayah: number) => {
    const m = SURAH_META[surah - 1];
    if (m && ayah >= 1 && ayah <= m.versesCount) out.push({ kind: "verse", surah, ayah });
  };

  // "2:255", "2 255", "2.255"
  let m = /^(\d{1,3})\s*[:.\s،,/-]\s*(\d{1,3})$/.exec(query);
  if (m) { verse(+m[1]!, +m[2]!); return { results: out, more: false }; }
  // "Ayah 255" / "آية 255": that verse number in every surah long enough
  m = /^(\S+)\s*(\d{1,3})$/.exec(query);
  if (m && VERSE_WORDS.test(m[1]!)) {
    for (const s of SURAH_META) if (s.versesCount >= +m[2]!) out.push({ kind: "verse", surah: s.id, ayah: +m[2]! });
    return { results: out, more: false };
  }
  // "12" → surah 12
  if (/^\d{1,3}$/.test(query)) {
    const n = +query;
    if (n >= 1 && n <= 114) out.push({ kind: "surah", surah: n });
    return { results: out, more: false };
  }
  // "Al-Baqarah 255" / "البقرة 255"
  m = /^(.*\D)\s*(\d{1,3})$/.exec(query);
  if (m) {
    for (const s of findSurahs(m[1]!).slice(0, 5)) verse(s.id, +m[2]!);
    if (out.length) return { results: out, more: false };
  }
  // Surah names, then (Arabic) words in the text
  for (const s of findSurahs(query).slice(0, 8)) out.push({ kind: "surah", surah: s.id });
  if (data && ARABIC.test(query)) {
    const text = searchText(data, query);
    return { results: [...out, ...text.results], more: text.more };
  }
  return { results: out, more: false };
}
