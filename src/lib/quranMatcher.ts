import type { Mark } from "./quran-data";

/**
 * Word-by-word matcher between a Whisper transcript and the target Ayah (Uthmani script).
 *
 * Pipeline: normalize → tokenize → align words (edit-distance DP) → classify each aligned pair.
 * Whisper normally returns plain, un-voweled Arabic, so diacritics are only judged when the
 * transcript actually contains some; otherwise a word whose consonant skeleton matches is CORRECT.
 */

export type WordStatus = "CORRECT" | "WARNING" | "ERROR";
export type WordIssue = "exact" | "diacritic" | "spelling" | "wrong" | "missing" | "extra";

export interface WordResult {
  /** The word as spoken (transcript token). For a missing word there is nothing spoken, so this is the target word. */
  word: string;
  status: WordStatus;
  /** The target (Uthmani) word this result is judged against. Undefined only for extra spoken words. */
  expectedWord?: string;
  /** Why the status was given. */
  kind: WordIssue;
  /** Index into the flat target token list (`ayat.flatMap(a => a.split(" "))`). Undefined for extra words. */
  targetIndex?: number;
}

export interface MatchResult {
  /** Results in recitation order: target words, with extra spoken words inserted where they were heard. */
  results: WordResult[];
  /** One status per flat target token, so it can be rendered over the Ayah text. Non-word tokens (waqf signs) are CORRECT. */
  targetStatuses: WordStatus[];
  counts: { correct: number; warning: number; error: number; extra: number };
  /** 0–100: correct words count 1, warnings 0.5, errors 0. */
  score: number;
}

// ───────────────────────── Normalization ─────────────────────────

/** Tashkeel, Quranic annotation marks, tatweel and invisible formatting characters. */
const STRIP_RE = /[ؐ-ًؚ-ٰٟۖ-ۭـ​-‏࣓-ࣿ]/g;

/**
 * Normalizes Arabic text for comparison:
 * removes harakat/tanween/shadda/sukun and Quranic marks; أ إ آ ٱ → ا; ى → ي; ة → ه;
 * plus hamza seats (ؤ → و, ئ → ي, standalone ء dropped) so Uthmani "ٱلْقُرْءَانَ" equals "القرآن".
 * Anything that is not an Arabic letter (digits, punctuation, verse numbers) is removed.
 *
 * @param daggerAlef treat the superscript alef (ٰ) as a real alef, e.g. "ٱلْعَٰلَمِينَ" → "العالمين".
 */
export function normalizeArabic(text: string, { daggerAlef = false }: { daggerAlef?: boolean } = {}): string {
  let out = text.normalize("NFC");
  // Uthmani writes some long ā on a waw (e.g. الصلوٰة); standard spelling is الصلاة.
  if (daggerAlef) out = out.replace(/وٰ/g, "ا").replace(/ٰ/g,"ا");
  return out
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/ی/g, "ي")
    .replace(/ء/g, "")
    .replace(STRIP_RE, "")
    .replace(/[^ء-ي]/g, "");
}

const looseKey = (normalized: string) => normalized.replace(/ا/g, "");
const HARAKAT_RE = /[ً-ّ]/; // fatha…shadda (sukun excluded: transcripts rarely carry it)

/** Per base letter, the sorted vowel/shadda marks written on it. Length equals normalizeArabic(word).length. */
function diacriticProfile(word: string): string[] {
  const profile: string[] = [];
  for (const ch of word.normalize("NFC")) {
    if (/[ً-ّ]/.test(ch)) {
      if (profile.length) profile[profile.length - 1] += ch;
    } else if (normalizeArabic(ch)) {
      profile.push("");
    }
  }
  return profile.map(marks => [...marks].sort().join(""));
}

/**
 * True when the spoken word carries a vowel/shadda that contradicts the target.
 * Letters the transcript left unmarked and the last letter (which changes when the reciter stops) are not judged.
 */
function diacriticsDeviate(target: string, spoken: string): boolean {
  if (!HARAKAT_RE.test(spoken)) return false;
  const t = diacriticProfile(target);
  const s = diacriticProfile(spoken);
  if (t.length !== s.length) return false;
  for (let i = 0; i < t.length - 1; i++) if (s[i] && s[i] !== t[i]) return true;
  return false;
}

// ───────────────────────── Phonetic edit distance ─────────────────────────

const CONFUSABLE_GROUPS = ["سصث", "زذظ", "دض", "تط", "كق", "حه", "عا", "غخ", "اوي"];
const SUB_COST = (() => {
  const map = new Map<string, number>();
  for (const group of CONFUSABLE_GROUPS) for (const a of group) for (const b of group) if (a !== b) map.set(a + b, 0.4);
  return map;
})();
const indelCost = (ch: string) => (ch === "ا" || ch === "و" || ch === "ي" ? 0.5 : 1);

/** Levenshtein distance where look-alike / sound-alike letters and weak letters are cheap to confuse. */
export function phoneticDistance(a: string, b: string): number {
  const prev: number[] = [0];
  for (let j = 1; j <= b.length; j++) prev[j] = prev[j - 1]! + indelCost(b[j - 1]!);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0]!;
    prev[0] = diagonal + indelCost(a[i - 1]!);
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j]!;
      const sub = a[i - 1] === b[j - 1] ? 0 : (SUB_COST.get(a[i - 1]! + b[j - 1]!) ?? 1);
      prev[j] = Math.min(diagonal + sub, up + indelCost(a[i - 1]!), prev[j - 1]! + indelCost(b[j - 1]!));
      diagonal = up;
    }
  }
  return prev[b.length]!;
}

// ───────────────────────── Word comparison ─────────────────────────

interface Comparison { status: WordStatus; kind: WordIssue; cost: number }

const WRONG_COST = 1.5; // below insert+delete (2) so a wrong word aligns as a substitution, above any near-match

/**
 * Stage 4 hook (src/lib/userAdaptation.ts registers it): the user's voice profile.
 *  - `accepts(target, spoken)`: both normalized; true when the user taught the app that this is how
 *    Whisper hears them say this word (accent, recognizer quirk) → CORRECT.
 *  - `tolerance`: scales the near-match limits (strict 0.6 · normal 1 · lenient 1.5).
 * Kept as a registration so the matcher stays pure and free of storage imports.
 */
export type MatcherAdaptation = { accepts?: (target: string, spoken: string) => boolean; tolerance?: number };
let adaptation: MatcherAdaptation = {};
export function setMatcherAdaptation(next: MatcherAdaptation) { adaptation = next; }
export const getMatcherAdaptation = (): MatcherAdaptation => adaptation;

export function compareWords(target: string, spoken: string): Comparison {
  const t = normalizeArabic(target);
  const tAlt = normalizeArabic(target, { daggerAlef: true });
  const s = normalizeArabic(spoken);
  const hasDagger = target.includes("ٰ");

  const sameLetters = (kind: "exact"): Comparison =>
    diacriticsDeviate(target, spoken) ? { status: "WARNING", kind: "diacritic", cost: 0.3 } : { status: "CORRECT", kind, cost: 0 };

  if (s === t || s === tAlt) return sameLetters("exact");
  // Uthmani drops written alefs that standard spelling keeps (and vice versa): only the long vowel differs.
  if (looseKey(s) === looseKey(tAlt)) return hasDagger ? sameLetters("exact") : { status: "WARNING", kind: "spelling", cost: 0.4 };

  if (s && adaptation.accepts && (adaptation.accepts(t, s) || adaptation.accepts(tAlt, s))) return { status: "CORRECT", kind: "exact", cost: 0.05 };

  const f = Math.min(2, Math.max(0.3, adaptation.tolerance ?? 1));
  const distance = Math.min(phoneticDistance(s, t), phoneticDistance(s, tAlt));
  const longest = Math.max(s.length, tAlt.length, 1);
  if (distance <= 1.2 * f && distance / longest <= 0.34 * f) return { status: "WARNING", kind: "spelling", cost: 0.4 + distance * 0.2 };
  return { status: "ERROR", kind: "wrong", cost: WRONG_COST };
}

// ───────────────────────── Alignment ─────────────────────────

type Op = { type: "pair"; t: number; s: number } | { type: "missing"; t: number } | { type: "extra"; s: number };

function align(targets: string[], spoken: string[]): { ops: Op[]; pairs: Map<string, Comparison> } {
  const n = targets.length;
  const m = spoken.length;
  const pairs = new Map<string, Comparison>();
  const pair = (i: number, j: number) => {
    const key = `${i}:${j}`;
    let c = pairs.get(key);
    if (!c) pairs.set(key, (c = compareWords(targets[i]!, spoken[j]!)));
    return c;
  };
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i]![0] = i;
  for (let j = 1; j <= m; j++) dp[0]![j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i]![j] = Math.min(dp[i - 1]![j - 1]! + pair(i - 1, j - 1).cost, dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1);
    }
  }
  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(dp[i]![j]! - (dp[i - 1]![j - 1]! + pair(i - 1, j - 1).cost)) < 1e-9) { ops.push({ type: "pair", t: i - 1, s: j - 1 }); i--; j--; }
    else if (i > 0 && Math.abs(dp[i]![j]! - (dp[i - 1]![j]! + 1)) < 1e-9) { ops.push({ type: "missing", t: i - 1 }); i--; }
    else { ops.push({ type: "extra", s: j - 1 }); j--; }
  }
  return { ops: ops.reverse(), pairs };
}

// ───────────────────────── Public API ─────────────────────────

/**
 * Compares a transcript with the target Ayah text (one string, or one string per Ayah).
 * Words are split on spaces exactly like the UI does, so `targetIndex` lines up with the rendered words.
 */
export function matchRecitation(transcript: string, target: string | readonly string[]): MatchResult {
  const flat = (typeof target === "string" ? [target] : target).flatMap(ayah => ayah.split(" "));
  // Tokens that normalize to nothing (waqf signs like ۖ, verse numbers) are not words and never judged.
  const targetTokens = flat.map((word, index) => ({ word, index })).filter(x => normalizeArabic(x.word));
  const spokenTokens = transcript.split(/\s+/).filter(x => normalizeArabic(x));

  const { ops, pairs } = align(targetTokens.map(x => x.word), spokenTokens);
  const targetStatuses: WordStatus[] = flat.map(() => "CORRECT");
  const results: WordResult[] = [];

  for (const op of ops) {
    if (op.type === "extra") {
      results.push({ word: spokenTokens[op.s]!, status: "ERROR", kind: "extra" });
      continue;
    }
    const { word: expectedWord, index: targetIndex } = targetTokens[op.t]!;
    if (op.type === "missing") {
      results.push({ word: expectedWord, expectedWord, status: "ERROR", kind: "missing", targetIndex });
      targetStatuses[targetIndex] = "ERROR";
    } else {
      const { status, kind } = pairs.get(`${op.t}:${op.s}`)!;
      results.push({ word: spokenTokens[op.s]!, expectedWord, status, kind, targetIndex });
      targetStatuses[targetIndex] = status;
    }
  }

  const count = (status: WordStatus) => results.filter(r => r.status === status && r.kind !== "extra").length;
  const counts = { correct: count("CORRECT"), warning: count("WARNING"), error: count("ERROR"), extra: results.filter(r => r.kind === "extra").length };
  const score = targetTokens.length ? Math.round(((counts.correct + counts.warning * 0.5) / targetTokens.length) * 100) : 0;
  return { results, targetStatuses, counts, score };
}

/** Maps matcher statuses onto the UI's existing colour marks (green / red / orange). */
export const statusToMark = (status: WordStatus): Mark => (status === "CORRECT" ? "ok" : status === "WARNING" ? "tashkeel" : "missing");

// ───────────────────────── Live matching ─────────────────────────

export type LiveStatus = WordStatus | "PENDING";

export interface LiveMatch {
  /** One entry per flat target token. Words the reciter has not reached yet are PENDING instead of missing. */
  statuses: LiveStatus[];
  /** Flat index of the word expected next (== number of tokens when the whole text has been recited). */
  cursor: number;
  counts: { correct: number; warning: number; error: number; extra: number };
  /** Words recited so far (correct + warning). */
  recited: number;
  total: number;
  /** 0–100 over the words judged so far (reached by the cursor), not over the whole text. */
  accuracy: number;
  done: boolean;
  /** Per flat target token: what was heard for it (judged words only; null if missing or not reached). */
  heard: (string | null)[];
}

/**
 * Incremental variant for streaming transcripts. The partial transcript is aligned against the whole target,
 * but only words up to the last one the reciter actually reached are judged: earlier unmatched words count as
 * skipped (ERROR), later ones stay PENDING.
 */
export function matchLive(transcript: string, target: string | readonly string[]): LiveMatch {
  const flat = (typeof target === "string" ? [target] : target).flatMap(ayah => ayah.split(" "));
  const isWord = flat.map(word => normalizeArabic(word) !== "");
  const total = isWord.filter(Boolean).length;
  const full = matchRecitation(transcript, target);

  let last = -1;
  for (const r of full.results) if (r.targetIndex !== undefined && r.kind !== "missing") last = Math.max(last, r.targetIndex);

  const statuses: LiveStatus[] = flat.map((_, i) => (i <= last ? full.targetStatuses[i] ?? "PENDING" : "PENDING"));
  const counts = { correct: 0, warning: 0, error: 0, extra: full.counts.extra };
  statuses.forEach((status, i) => {
    if (!isWord[i]) return;
    if (status === "CORRECT") counts.correct++;
    else if (status === "WARNING") counts.warning++;
    else if (status === "ERROR") counts.error++;
  });
  const judged = counts.correct + counts.warning + counts.error;
  const accuracy = judged ? Math.round(((counts.correct + counts.warning * 0.5) / judged) * 100) : 0;
  let cursor = flat.length;
  for (let i = last + 1; i < flat.length; i++) if (isWord[i]) { cursor = i; break; }
  const heard: (string | null)[] = flat.map(() => null);
  for (const r of full.results) if (r.targetIndex !== undefined && r.kind !== "missing" && r.targetIndex <= last) heard[r.targetIndex] = r.word;
  return { statuses, cursor, counts, recited: counts.correct + counts.warning, total, accuracy, done: last >= 0 && cursor >= flat.length, heard };
}
