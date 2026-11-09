/**
 * Persistent word colours: the result of the last recitation of every verse, word by word
 * ("surah:ayah:word" → CORRECT / WARNING / ERROR, plus what was heard). Kept in IndexedDB so the
 * colours stay on every page, after turning pages, switching tabs, toggling memorization, tapping a
 * verse and restarting the app. A verse's colours are replaced only when that verse is recited again.
 *
 * Word numbers are the Mushaf's (as in `mushafData.words`), the same in the Mushaf and Recite views.
 */
import type { LiveStatus } from "@/lib/quranMatcher";

export type JudgedStatus = Extract<LiveStatus, "CORRECT" | "WARNING" | "ERROR">;
export type WordColor = { st: JudgedStatus; heard?: string | null | undefined };
/** "surah:ayah:word" → colour. Immutable: every change makes a new map. */
export type WordColorMap = ReadonlyMap<string, WordColor>;
/** One recited word: key "surah:ayah:word", its final status and what was heard. */
export type RecitedWord = { key: string; status: LiveStatus; heard?: string | null | undefined };

export const isJudged = (s: LiveStatus | undefined): s is JudgedStatus => s === "CORRECT" || s === "WARNING" || s === "ERROR";
const verseOf = (key: string) => key.slice(0, key.lastIndexOf(":"));

/**
 * The verses that were actually recited in `words` (at least one word judged). Words of a verse the
 * reciter never reached stay PENDING and leave that verse's earlier colours untouched.
 */
export function recitedVerses(words: readonly RecitedWord[]): Set<string> {
  const out = new Set<string>();
  for (const w of words) if (isJudged(w.status)) out.add(verseOf(w.key));
  return out;
}

/**
 * Applies one recitation: every verse with a judged word is replaced as a whole by its new colours
 * (words not reached in such a verse become uncoloured); other verses keep their colours.
 * Returns the same map when nothing was recited.
 */
export function applyRecitation(map: WordColorMap, words: readonly RecitedWord[]): WordColorMap {
  const verses = recitedVerses(words);
  if (!verses.size) return map;
  const next = new Map<string, WordColor>();
  for (const [k, v] of map) if (!verses.has(verseOf(k))) next.set(k, v);
  for (const w of words) {
    if (!isJudged(w.status) || !verses.has(verseOf(w.key))) continue;
    next.set(w.key, w.heard ? { st: w.status, heard: w.heard } : { st: w.status });
  }
  return next;
}

/** Colours of the given word keys (for a page or a passage); keys without a colour are left out. */
export function colorsFor(map: WordColorMap, keys: Iterable<string>): Map<string, LiveStatus> {
  const out = new Map<string, LiveStatus>();
  for (const k of keys) { const c = map.get(k); if (c) out.set(k, c.st); }
  return out;
}

/**
 * Colours shown while a recitation is running: the live status for the words of every verse the
 * reciter has reached (a new recitation of a verse replaces its old colours as it goes), the saved
 * colour everywhere else (verses not reached yet, other pages).
 */
export function mergeLive(map: WordColorMap, keys: readonly string[], live: readonly LiveStatus[], liveVerses: ReadonlySet<string>): Map<string, LiveStatus> {
  const out = new Map<string, LiveStatus>();
  keys.forEach((k, i) => {
    if (liveVerses.has(verseOf(k))) out.set(k, live[i] ?? "PENDING");
    else { const c = map.get(k); if (c) out.set(k, c.st); }
  });
  return out;
}

/** Verses reached so far in a live recitation: every verse up to the furthest judged word or the cursor. */
export function reachedVerses(keys: readonly string[], live: readonly LiveStatus[], cursorIndex: number): Set<string> {
  let last = Math.min(cursorIndex, keys.length - 1);
  live.forEach((s, i) => { if (isJudged(s) && i > last) last = i; });
  const out = new Set<string>();
  // The first verse counts as reached as soon as the recitation starts (the cursor sits on it).
  for (let i = 0; i <= last && i < keys.length; i++) out.add(verseOf(keys[i]!));
  return out;
}

/* ---------- serialisation (compact: [key, status letter, heard?]) ---------- */

const CODE: Record<JudgedStatus, string> = { CORRECT: "c", WARNING: "w", ERROR: "e" };
const DECODE: Record<string, JudgedStatus> = { c: "CORRECT", w: "WARNING", e: "ERROR" };
export type StoredColors = [string, string, string?][];

export function serializeColors(map: WordColorMap): StoredColors {
  return [...map].map(([k, v]) => (v.heard ? [k, CODE[v.st], v.heard] : [k, CODE[v.st]]));
}

export function parseColors(raw: unknown): Map<string, WordColor> {
  const out = new Map<string, WordColor>();
  if (!Array.isArray(raw)) return out;
  for (const row of raw) {
    if (!Array.isArray(row) || typeof row[0] !== "string" || !/^\d+:\d+:\d+$/.test(row[0])) continue;
    const st = DECODE[String(row[1])];
    if (!st) continue;
    out.set(row[0], typeof row[2] === "string" && row[2] ? { st, heard: row[2] } : { st });
  }
  return out;
}

/* ---------- the passage last recited (shared by the Mushaf and Recite views) ---------- */

export type ActiveRange = { surah: number; from: number; to: number; mode: "RECITATION_MODE" | "MEMORIZATION_MODE"; view: "mushaf" | "practice"; at: number };

/** The range covered by recited words of one surah (the first surah recited), or null. */
export function rangeOf(words: readonly RecitedWord[]): { surah: number; from: number; to: number } | null {
  let surah = 0, from = Infinity, to = -Infinity;
  for (const w of words) {
    if (!isJudged(w.status)) continue;
    const [s, a] = w.key.split(":").map(Number) as [number, number];
    if (!surah) surah = s;
    if (s !== surah) continue;
    from = Math.min(from, a); to = Math.max(to, a);
  }
  return surah ? { surah, from, to } : null;
}

/** Extends a session's range with the next part (an automatic page turn) of the same surah. */
export function extendRange(cur: { surah: number; from: number; to: number } | null, next: { surah: number; from: number; to: number }) {
  if (!cur || cur.surah !== next.surah) return next;
  return { surah: cur.surah, from: Math.min(cur.from, next.from), to: Math.max(cur.to, next.to) };
}

/**
 * Word key of every token of a passage on the Recite screen (verse texts split at spaces). A Mushaf
 * word can hold a space (a word with its waqf sign); its first token carries the key, the others
 * get null. Without the Mushaf words, every token with letters counts as one word.
 */
export function passageTokenKeys(surah: number, ayat: readonly { number: number; text: string }[],
  mushafWords: ((s: number, a: number) => readonly string[]) | null, hasLetters: (token: string) => boolean): (string | null)[] {
  const out: (string | null)[] = [];
  for (const a of ayat) {
    const tokens = a.text.split(" ");
    const mw = mushafWords?.(surah, a.number);
    if (mw && mw.length && mw.join(" ") === a.text) {
      mw.forEach((w, k) => { const n = w.split(" ").length; out.push(`${surah}:${a.number}:${k + 1}`); for (let j = 1; j < n; j++) out.push(null); });
    } else {
      let n = 0;
      for (const tok of tokens) out.push(hasLetters(tok) ? `${surah}:${a.number}:${++n}` : null);
    }
  }
  return out;
}
