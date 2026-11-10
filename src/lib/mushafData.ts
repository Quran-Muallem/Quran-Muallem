/**
 * Madani Mushaf page layout, bundled with the app (public/mushaf/*.json), so the Quran is
 * readable page by page exactly like the printed Mushaf — 604 pages, 15 lines, same line breaks —
 * and fully offline.
 *
 * Data: QPC V2 layout (1421 H Madinah print) from github.com/zonetecde/mushaf-layout, which derives it
 * from Quran.com; Uthmani Hafs text per word. Regenerate with scripts/build-mushaf-data.py.
 */

export const TOTAL_PAGES = 604;

/** [0, surah] header · [1] basmala · [2, segments] text line */
export type RawLine = [0, number] | [1] | [2, Segment[]];
/** [surah, ayah, fromWord, toWord, endsVerse]; fromWord = 0 → only the verse-end marker on this line */
export type Segment = [number, number, number, number, 0 | 1];

export type PageLine =
  | { type: "header"; surah: number }
  | { type: "basmala"; surah: number }
  | { type: "text"; segments: { surah: number; ayah: number; from: number; to: number; endsVerse: boolean }[] };

type Layout = { v: 1; juz: [number, number][]; pages: RawLine[][] };
type Words = { v: 1; surahs: string[][][] };

export type Mushaf = {
  page(n: number): PageLine[];
  /** Page on which a verse begins. */
  pageOf(surah: number, ayah: number): number;
  /** First page of a surah (where its header is). */
  surahStartPage(surah: number): number;
  juzOfPage(n: number): number;
  juzStartPage(juz: number): number;
  /** First verse of a juz (1–30): [surah, ayah]. */
  juzStartVerse(juz: number): [number, number];
  /** Uthmani words of a verse (1-based word index = array index + 1). */
  words(surah: number, ayah: number): string[];
  versesCount(surah: number): number;
  /** Verses with their words on a page, in reading order. */
  pageVerses(n: number): PageVerse[];
};

export type PageVerse = { surah: number; ayah: number; words: number[]; endsOnPage: boolean; startsOnPage: boolean };

const base = (): string => {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const b = env?.["BASE_URL"] ?? "/";
  return b.endsWith("/") ? b : `${b}/`;
};

let loading: Promise<Mushaf> | null = null;

/** Loads the bundled Mushaf data once (≈ 350 KB gzipped). */
export function loadMushaf(): Promise<Mushaf> {
  loading ??= Promise.all([
    fetch(`${base()}mushaf/layout.json`).then((r) => { if (!r.ok) throw new Error(`layout ${r.status}`); return r.json() as Promise<Layout>; }),
    fetch(`${base()}mushaf/words.json`).then((r) => { if (!r.ok) throw new Error(`words ${r.status}`); return r.json() as Promise<Words>; }),
  ]).then(([layout, words]) => buildMushaf(layout, words));
  loading.catch(() => { loading = null; });
  return loading;
}

export function buildMushaf(layout: Layout, data: Words): Mushaf {
  const verseStart = new Map<string, number>();
  const surahStart: number[] = [];
  const pages: PageLine[][] = layout.pages.map((raw, i) => {
    const n = i + 1;
    let currentSurah = 0;
    return raw.map((line): PageLine => {
      if (line[0] === 0) { currentSurah = line[1]; surahStart[line[1]] ??= n; return { type: "header", surah: line[1] }; }
      if (line[0] === 1) return { type: "basmala", surah: currentSurah };
      return {
        type: "text",
        segments: line[1].map(([surah, ayah, from, to, end]) => {
          const k = `${surah}:${ayah}`;
          if (from > 0 && !verseStart.has(k)) verseStart.set(k, n);
          return { surah, ayah, from, to, endsVerse: end === 1 };
        }),
      };
    });
  });
  const juzPages = layout.juz.map(([s, a]) => verseStart.get(`${s}:${a}`) ?? 1);
  const clampPage = (n: number) => Math.min(TOTAL_PAGES, Math.max(1, Math.round(n) || 1));

  return {
    page: (n) => pages[clampPage(n) - 1] ?? [],
    pageOf: (s, a) => verseStart.get(`${s}:${a}`) ?? surahStart[s] ?? 1,
    surahStartPage: (s) => surahStart[s] ?? 1,
    juzOfPage: (n) => { let j = 1; juzPages.forEach((p, i) => { if (p <= n) j = i + 1; }); return j; },
    juzStartPage: (j) => juzPages[j - 1] ?? 1,
    juzStartVerse: (j) => (layout.juz[j - 1] ?? [1, 1]) as [number, number],
    words: (s, a) => data.surahs[s - 1]?.[a - 1] ?? [],
    versesCount: (s) => data.surahs[s - 1]?.length ?? 0,
    pageVerses: (n) => {
      const out: PageVerse[] = [];
      for (const line of pages[clampPage(n) - 1] ?? []) {
        if (line.type !== "text") continue;
        for (const seg of line.segments) {
          let v = out.at(-1);
          if (!v || v.surah !== seg.surah || v.ayah !== seg.ayah) {
            v = { surah: seg.surah, ayah: seg.ayah, words: [], endsOnPage: false, startsOnPage: seg.from === 1 };
            out.push(v);
          }
          for (let w = seg.from; w >= 1 && w <= seg.to; w++) v.words.push(w);
          if (seg.endsVerse) v.endsOnPage = true;
        }
      }
      return out;
    },
  };
}

/** Text of a verse as one string (words joined by spaces), or null if the data is not loaded. */
export async function verseText(surah: number, ayah: number): Promise<string | null> {
  try { return (await loadMushaf()).words(surah, ayah).join(" ") || null; } catch { return null; }
}
