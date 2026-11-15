/**
 * Auto-detect the recited verse anywhere in the Quran (all 114 surahs), so the Mushaf can jump to it.
 *
 * Works on the live output of either engine:
 *  - Zipformer: phonemes (no word boundaries) — indexed against the canonical Hafs phonemes of every
 *    word (public/models/quran_phonemes.json);
 *  - Whisper / browser recognizer: Arabic text — indexed against the Mushaf words, normalized.
 *
 * Both sides become one "core" character stream (diacritic forms unified, runs of equal letters
 * collapsed — madd / shadda / ghunna length does not matter). Lookup:
 *   1. a window of ≥ 5 recited words' worth of characters (MIN_CHARS … WINDOW) is cut from the transcript
 *      (several start offsets, so an isti'ādha / basmala at the start is skipped);
 *   2. its 5-character shingles vote, through a hashed index of the whole Quran, for alignment starts;
 *   3. the best candidates are verified with a free-start/free-end edit distance;
 *   4. a hit counts only with similarity ≥ THRESHOLD (0.85) and no other place in the Quran nearly as good
 *      (repeated phrases such as «فبأي آلاء ربكما تكذبان» wait for more words). The basmala alone never
 *      counts (it opens every surah).
 */
import { core } from "@/lib/quranAlignment";
import { normalizeArabic } from "@/lib/quranMatcher";

export const THRESHOLD = 0.85;
/** Walking back from a confident hit (same surah, right before it) may accept a noisier opening. */
export const EXTEND_THRESHOLD = 0.6;
/** A hit this close (core characters) to the end of its verse snaps to the next verse. */
const SNAP = 6;
/** Characters needed before a lookup (≈ 4–5 words of phonemes / letters). */
export const MIN_CHARS = 26;
const WINDOW = 40;
const K = 5;
const BUCKETS = 1 << 20;
const MAX_BUCKET_WALK = 600;

export type LocatorKind = "phonemes" | "text";
export type LocatorIndex = {
  kind: LocatorKind;
  chars: Uint16Array;
  /** Global word number (0-based) owning each character. */
  owner: Int32Array;
  /** Per global word: surah, ayah, word (1-based). */
  surah: Uint8Array; ayah: Uint16Array; word: Uint16Array;
  head: Int32Array; next: Int32Array;
};
export type Located = { surah: number; ayah: number; word: number; score: number; /** index in the transcript (raw characters / words) where the matched part starts */ startRaw: number };

const hash = (a: ArrayLike<number>, i: number) => {
  let h = 0;
  for (let k = 0; k < K; k++) h = (Math.imul(h, 31) + a[i + k]!) | 0;
  return (h >>> 0) & (BUCKETS - 1);
};

/** Text side: letters only, normalized like the matcher, no spaces, runs collapsed. */
const textCore = (s: string) => core(normalizeArabic(s).replace(/[^ء-ي]/g, ""));

/** Builds the index from per-word strings `words[surah-1][ayah-1][word-1]` (phonemes or Mushaf words). */
export function buildLocatorIndex(kind: LocatorKind, words: readonly (readonly (readonly string[])[])[]): LocatorIndex {
  const chars: number[] = [], owner: number[] = [], su: number[] = [], ay: number[] = [], wo: number[] = [];
  let g = 0, prev = -1;
  words.forEach((verses, s) => verses.forEach((ws, a) => ws.forEach((w, i) => {
    const c = kind === "phonemes" ? core(w) : textCore(w);
    su.push(s + 1); ay.push(a + 1); wo.push(i + 1);
    for (const ch of c) {
      const code = ch.charCodeAt(0);
      if (code === prev) continue; // collapse across word boundaries too (the transcript has none)
      chars.push(code); owner.push(g); prev = code;
    }
    g++;
  })));
  const n = chars.length;
  const head = new Int32Array(BUCKETS).fill(-1), next = new Int32Array(n).fill(-1);
  const arr = Uint16Array.from(chars);
  for (let i = n - K; i >= 0; i--) { const h = hash(arr, i); next[i] = head[h]!; head[h] = i; }
  return { kind, chars: arr, owner: Int32Array.from(owner), surah: Uint8Array.from(su), ayah: Uint16Array.from(ay), word: Uint16Array.from(wo), head, next };
}

/** Transcript → core characters with, for each, its raw position (phonemes: char index; text: word index). */
export function transcriptCore(kind: LocatorKind, transcript: string): { codes: number[]; raw: number[] } {
  const codes: number[] = [], raw: number[] = [];
  let prev = -1;
  const push = (ch: string, r: number) => { const c = ch.charCodeAt(0); if (c !== prev) { codes.push(c); raw.push(r); prev = c; } };
  if (kind === "phonemes") {
    const s = [...transcript];
    let idx = 0;
    for (const ch of s) { if (!/\s/.test(ch)) for (const c of core(ch)) push(c, idx); idx += ch.length; }
  } else {
    transcript.trim().split(/\s+/).forEach((w, wi) => { for (const c of textCore(w)) push(c, wi); });
  }
  return { codes, raw };
}

/** Free-start, free-end edit distance of `q` against `t`; returns cost and where in `t` the match starts. */
function align(q: readonly number[], t: ArrayLike<number>, from: number, to: number): { cost: number; start: number } {
  const m = to - from;
  let prevRow = new Float32Array(m + 1), prevOrig = new Int32Array(m + 1);
  for (let j = 0; j <= m; j++) { prevRow[j] = 0; prevOrig[j] = j; }
  for (let i = 1; i <= q.length; i++) {
    const row = new Float32Array(m + 1), orig = new Int32Array(m + 1);
    row[0] = i; orig[0] = 0;
    for (let j = 1; j <= m; j++) {
      const sub = prevRow[j - 1]! + (q[i - 1] === t[from + j - 1] ? 0 : 1);
      const del = prevRow[j]! + 1, ins = row[j - 1]! + 1;
      if (sub <= del && sub <= ins) { row[j] = sub; orig[j] = prevOrig[j - 1]!; }
      else if (del <= ins) { row[j] = del; orig[j] = prevOrig[j]!; }
      else { row[j] = ins; orig[j] = orig[j - 1]!; }
    }
    prevRow = row; prevOrig = orig;
  }
  let best = Infinity, start = 0;
  for (let j = 0; j <= m; j++) if (prevRow[j]! < best) { best = prevRow[j]!; start = prevOrig[j]!; }
  return { cost: best, start: from + start };
}

/** One window: candidates by shingle votes, verified; null when weak or ambiguous. */
function locateWindow(ix: LocatorIndex, q: readonly number[]): { pos: number; score: number } | null {
  const votes = new Map<number, number>();
  for (let i = 0; i + K <= q.length; i++) {
    let p = ix.head[hash(q, i)]!, walked = 0;
    while (p >= 0 && walked++ < MAX_BUCKET_WALK) {
      const key = Math.round((p - i) / 4);
      votes.set(key, (votes.get(key) ?? 0) + 1);
      p = ix.next[p]!;
    }
  }
  const top = [...votes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).filter(([, v]) => v >= 2);
  const scored: { pos: number; score: number }[] = [];
  for (const [key] of top) {
    const from = Math.max(0, key * 4 - 8), to = Math.min(ix.chars.length, key * 4 + q.length + 12);
    const r = align(q, ix.chars, from, to);
    scored.push({ pos: r.start, score: 1 - r.cost / q.length });
  }
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < THRESHOLD) return null;
  // Another place nearly as good → not unique yet.
  if (scored.some((o) => Math.abs(o.pos - best.pos) > q.length / 2 && o.score >= best.score - 0.06)) return null;
  return best;
}

/**
 * Locates the recited passage. Tries windows starting at the beginning of the transcript (and a little
 * later, to skip an isti'ādha or a basmala), returns the earliest confident, unique hit.
 */
export function locateRecitation(ix: LocatorIndex, transcript: string): Located | null {
  const { codes, raw } = transcriptCore(ix.kind, transcript);
  if (codes.length < MIN_CHARS) return null;
  for (let off = 0; off + MIN_CHARS <= codes.length && off <= 72; off += 8) {
    const q = codes.slice(off, off + WINDOW);
    const hit = locateWindow(ix, q);
    if (!hit) continue;
    // v56: a hit on the last few characters of a verse is the start of the next one (an isti'ādha / basmala
    // before it was absorbed as noise).
    let hp = Math.min(hit.pos, ix.owner.length - 1);
    const g0 = ix.owner[hp]!;
    const inBasmala = (ix.surah[g0] === 1 && ix.ayah[g0] === 1) || (ix.surah[g0] === 27 && ix.ayah[g0] === 30 && ix.word[g0]! >= 4);
    if (!inBasmala) { let j = hp; while (j < ix.owner.length && j - hp <= SNAP && ix.surah[ix.owner[j]!] === ix.surah[g0] && ix.ayah[ix.owner[j]!] === ix.ayah[g0]) j++;
      if (j < ix.owner.length && j - hp <= SNAP) hp = j; }
    hit.pos = hp;
    const g = ix.owner[hp]!;
    const s = ix.surah[g]!, a = ix.ayah[g]!;
    // The basmala alone says nothing (it is recited before every surah): keep looking after it. v56: that
    // includes the basmala inside an-Naml 27:30 («…وَإِنَّهُۥ بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ», words 5–8) — a
    // basmala before An-Naba was taken for it.
    if (s === 1 && a === 1) continue;
    if (s === 27 && a === 30 && ix.word[g]! >= 4) continue;
    // v56: the first confident window may start a verse or two late (a noisy opening, e.g. «عَمَّ يَتَسَاءَلُونَ»
    // heard as «عَمممَاايَااتَااسَااااءَلُون»). Walk back over the transcript before it: as long as the earlier
    // words still fit the text just before the hit in the same surah (≥ EXTEND_THRESHOLD), the start moves back.
    let pos = hit.pos, o = off;
    const back = (step: number): boolean => {
      const o2 = Math.max(0, o - step);
      const q2 = codes.slice(o2, o2 + WINDOW);
      const from = Math.max(0, pos - (o - o2) - 14), to = Math.min(ix.chars.length, pos + WINDOW);
      const r = align(q2, ix.chars, from, to);
      const g2 = ix.owner[Math.min(r.start, ix.owner.length - 1)]!;
      // the text must really move back with the transcript (not absorb an isti'ādha / basmala as noise)
      if (1 - r.cost / q2.length < EXTEND_THRESHOLD || pos - r.start < Math.ceil((o - o2) * 0.75) || ix.surah[g2] !== s) return false;
      pos = r.start; o = o2;
      return true;
    };
    while (o > 0 && (back(8) || back(4) || back(2) || back(1))) { /* walk back */ }
    const g3 = ix.owner[Math.min(pos, ix.owner.length - 1)]!;
    return { surah: s, ayah: ix.ayah[g3]!, word: ix.word[g3]!, score: hit.score, startRaw: raw[o]! };
  }
  return null;
}

/* ───────────── shared, lazily built indexes ───────────── */

const built = new Map<LocatorKind, Promise<LocatorIndex>>();
/** Builds (once) the index for an engine from its per-word source. */
export function locatorIndex(kind: LocatorKind, source: () => Promise<readonly (readonly (readonly string[])[])[]>): Promise<LocatorIndex> {
  let p = built.get(kind);
  if (!p) {
    p = source().then((w) => new Promise<LocatorIndex>((resolve) => setTimeout(() => resolve(buildLocatorIndex(kind, w)), 0)));
    p.catch(() => built.delete(kind));
    built.set(kind, p);
  }
  return p;
}
