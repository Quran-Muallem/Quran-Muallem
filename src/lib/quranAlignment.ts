/**
 * Stage 3 — phoneme alignment against the Hafs text (used with the Zipformer phoneme engine).
 *
 * The recognizer outputs phonemes of what was actually said (no language model). Every Mushaf word has
 * its canonical Hafs phonemes (public/models/quran_phonemes.json, built by scripts/build-phonemes.mjs from
 * Quran-Lab's phonemized Quran). Both are aligned with a weighted edit distance (Levenshtein, the discrete
 * form of DTW), then every word is judged:
 *
 *   MATCHED     (CORRECT)  the word's phonemes were said; only lengths may differ slightly
 *   NEAR        (WARNING)  the consonants/vowels are right but madd, ghunna or shadda length is off,
 *                          or one small slip — shown amber
 *   WRONG_WORD  (ERROR)    different or missing phonemes
 *   PENDING                not reached yet
 *
 * The result has the same shape as `matchLive` (src/lib/quranMatcher.ts), so the Mushaf, the Tasmīʿ
 * screen and Hifz mode (words appear only once recited correctly) work unchanged.
 */
import { useSyncExternalStore } from "react";
import { assetUrl } from "@/lib/assets";
import { createSignal } from "@/lib/storage";
import { getMatcherAdaptation, normalizeArabic, type LiveMatch, type LiveStatus } from "./quranMatcher";

/** The names used in the engine specification. */
export type WordState = "MATCHED" | "WRONG_WORD" | "PENDING";
export const wordState = (s: LiveStatus): WordState => (s === "PENDING" ? "PENDING" : s === "ERROR" ? "WRONG_WORD" : "MATCHED");

/* ───────────── canonical phonemes ───────────── */

export type PhonemeLexicon = { surahs: string[][][] };
const lexicon = createSignal<PhonemeLexicon | null>(null);
let loading: Promise<PhonemeLexicon> | null = null;

export function loadQuranPhonemes(): Promise<PhonemeLexicon> {
  loading ??= fetch(new URL(assetUrl("models/quran_phonemes.json"), location.href).href)
    .then((r) => { if (!r.ok) throw new Error("quran_phonemes.json missing"); return r.json() as Promise<PhonemeLexicon>; })
    .then((d) => { if (!Array.isArray(d.surahs) || d.surahs.length !== 114) throw new Error("quran_phonemes.json invalid"); lexicon.set(d); return d; });
  loading.catch(() => { loading = null; });
  return loading;
}
export function usePhonemeLexicon(): PhonemeLexicon | null {
  return useSyncExternalStore(lexicon.subscribe, lexicon.get, lexicon.get);
}
export const setPhonemeLexicon = (l: PhonemeLexicon | null) => lexicon.set(l);

/**
 * Canonical phonemes per flat token of `words.join(" ").split(" ")` — the token list the matchers use.
 * `mushafWords` are the Mushaf words of the verse being recited (all or a part, `wordNumbers` 1-based).
 * A Mushaf "word" with a space inside (a word plus a waqf sign, or two words printed together) gets its
 * phonemes on the first token; the other tokens are null (they follow the first token's result).
 */
export function phonemeRefs(lex: PhonemeLexicon, surah: number, ayah: number, mushafWords: readonly string[], wordNumbers?: readonly number[]): (string | null)[] {
  const ph = lex.surahs[surah - 1]?.[ayah - 1] ?? [];
  const nums = wordNumbers ?? mushafWords.map((_, i) => i + 1);
  const out: (string | null)[] = [];
  nums.forEach((w, k) => {
    const tokens = (mushafWords[wordNumbers ? k : w - 1] ?? "").split(" ");
    tokens.forEach((_, t) => out.push(t === 0 ? ph[w - 1] ?? null : null));
  });
  return out;
}

/* ───────────── alignment ───────────── */

/** Letters the recognizer may write in two ways (ikhfāʾ nūn/mīm, small madd letters). */
const SAME: Record<string, string> = { "ں": "ن", "۾": "م", "ۥ": "و", "ۦ": "ي", "ٲ": "ا" };
const base = (c: string) => SAME[c] ?? c;
const VOWELS = new Set(["َ", "ُ", "ِ"]);
/** Collapse every run of equal letters: what is left ignores madd / ghunna / shadda length. */
export const core = (s: string) => [...s].map(base).filter((c, i, a) => c !== a[i - 1]).join("");

function subCost(a: string, b: string) {
  if (a === b) return 0;
  if (base(a) === base(b)) return 0.3;
  if (VOWELS.has(a) && VOWELS.has(b)) return 0.8;
  return 1;
}

function editDistance(a: readonly string[], b: readonly string[]): number {
  const D = new Float32Array(b.length + 1).map((_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = D[0]!; D[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = D[j]!;
      D[j] = Math.min(t + 1, D[j - 1]! + 1, prev + subCost(a[i - 1]!, b[j - 1]!));
      prev = t;
    }
  }
  return D[b.length]!;
}

export type WordJudgement = { status: "CORRECT" | "WARNING" | "ERROR"; core: number; full: number };

/** Judges one word: canonical phonemes vs the phonemes aligned to it. `tolerance` from the voice profile. */
export function judgeWord(expected: string, heard: string, tolerance = 1): WordJudgement {
  const e = [...expected], h = [...heard];
  const full = editDistance(e, h);
  const ce = [...core(expected)], ch = [...core(heard)];
  const c = editDistance(ce, ch);
  const adapt = getMatcherAdaptation();
  if (heard && adapt.accepts?.(expected, heard)) return { status: "CORRECT", core: c, full };
  const f = Math.min(2, Math.max(0.3, tolerance));
  if (c === 0) return { status: full <= 2 * f ? "CORRECT" : "WARNING", core: c, full };
  if (c <= Math.max(1, 0.2 * ce.length) * f && ce.length >= 3) return { status: "WARNING", core: c, full };
  if (c / Math.max(1, ce.length) <= 0.12 * f) return { status: "WARNING", core: c, full };
  return { status: "ERROR", core: c, full };
}

/**
 * Aligns the recognized phonemes with the target words and judges every word.
 * `target` and `refs`: as for `matchLive` — verse strings, and per flat token its canonical phonemes
 * (`phonemeRefs`). `final`: the recitation has ended (the last word is judged even if incomplete).
 */
export function matchLivePhonemes(recognized: string, target: string | readonly string[], refs: readonly (string | null)[], { final = false } = {}): LiveMatch {
  const flat = (typeof target === "string" ? [target] : target).flatMap((a) => a.split(" "));
  const isWord = flat.map((w) => normalizeArabic(w) !== "");
  const total = isWord.filter(Boolean).length;
  const tolerance = getMatcherAdaptation().tolerance ?? 1;

  // Canonical sequence with the owning token of every character.
  const can: string[] = [], owner: number[] = [];
  refs.forEach((p, t) => { if (p && isWord[t]) for (const c of p) { can.push(c); owner.push(t); } });
  const rec = [...recognized.replace(/\s+/g, "")];
  const n = rec.length, m = can.length;

  // DP (rec rows × can cols). Extra repeated letters (a longer madd) and dropped repeats are cheap;
  // leaving out a whole word is one step (so the neighbours keep their own phonemes).
  const W = m + 1;
  const D = new Float32Array((n + 1) * W);
  const B = new Uint8Array((n + 1) * W); // 0 diag, 1 up (extra recognized), 2 left (missing canonical), 3 skipped word
  const wordStart = new Int32Array(m + 1).fill(-1); // at the column ending a word: the column where it starts
  for (let j = 1; j <= m; j++) if (owner[j] !== owner[j - 1]) { let k = j - 1; while (k > 0 && owner[k - 1] === owner[j - 1]) k--; wordStart[j] = k; }
  const SKIP = 1.6;
  const skip = (i: number, j: number) => {
    const k = wordStart[j]!;
    if (k >= 0 && D[i * W + k]! + SKIP < D[i * W + j]!) { D[i * W + j] = D[i * W + k]! + SKIP; B[i * W + j] = 3; }
  };
  for (let j = 1; j <= m; j++) { D[j] = D[j - 1]! + (can[j - 1] === can[j - 2] ? 0.4 : 1); B[j] = 2; skip(0, j); }
  for (let i = 1; i <= n; i++) {
    const r = rec[i - 1]!, rPrev = rec[i - 2];
    D[i * W] = D[(i - 1) * W]! + 1; B[i * W] = 1;
    for (let j = 1; j <= m; j++) {
      const c = can[j - 1]!;
      const d = D[(i - 1) * W + j - 1]! + subCost(c, r);
      const u = D[(i - 1) * W + j]! + (r === rPrev ? 0.4 : 1);
      const l = D[i * W + j - 1]! + (c === can[j - 2] ? 0.4 : 1);
      if (d <= u && d <= l) { D[i * W + j] = d; B[i * W + j] = 0; } else if (u <= l) { D[i * W + j] = u; B[i * W + j] = 1; } else { D[i * W + j] = l; B[i * W + j] = 2; }
      skip(i, j);
    }
  }
  // The recitation may stop anywhere: the rest of the text is free (not reached yet).
  let end = 0;
  if (n > 0) { let best = Infinity; for (let j = 0; j <= m; j++) { const v = D[n * W + j]!; if (v <= best) { best = v; end = j; } } }

  // Backtrack: what was heard for every token.
  const heardChars: string[][] = flat.map(() => []);
  for (let i = n, j = end; i > 0 || j > 0;) {
    const b = i === 0 ? 2 : j === 0 ? 1 : B[i * W + j]!;
    if (b === 0) { heardChars[owner[j - 1]!]!.unshift(rec[i - 1]!); i--; j--; }
    else if (b === 1) { const t = owner[j > 0 ? j - 1 : 0]; if (t !== undefined) heardChars[t]!.unshift(rec[i - 1]!); i--; }
    else if (b === 3) j = wordStart[j]!;
    else j--;
  }

  // Which tokens were reached: those with canonical characters before `end`.
  const lastToken = end > 0 ? owner[end - 1]! : -1;
  const lastComplete = end >= m || (end > 0 && owner[end] !== owner[end - 1]);
  const statuses: LiveStatus[] = flat.map(() => "PENDING");
  const heard: (string | null)[] = flat.map(() => null);
  let prevStatus: LiveStatus = "PENDING";
  flat.forEach((_, t) => {
    if (!isWord[t]) { statuses[t] = t <= lastToken ? "CORRECT" : "PENDING"; return; }
    const exp = refs[t];
    if (!exp) { statuses[t] = t <= lastToken ? prevStatus : "PENDING"; return; } // shares the previous token's phonemes
    if (t > lastToken) return;
    // The word being spoken right now is judged only once it is complete (or the recitation ended).
    if (t === lastToken && !lastComplete && !final) return;
    const h = heardChars[t]!.join("");
    const j = judgeWord(exp, h, tolerance);
    statuses[t] = h ? j.status : "ERROR";
    heard[t] = h || null;
    prevStatus = statuses[t]!;
  });

  const counts = { correct: 0, warning: 0, error: 0, extra: 0 };
  statuses.forEach((s, i) => {
    if (!isWord[i]) return;
    if (s === "CORRECT") counts.correct++; else if (s === "WARNING") counts.warning++; else if (s === "ERROR") counts.error++;
  });
  let lastJudged = -1;
  statuses.forEach((s, i) => { if (s !== "PENDING") lastJudged = i; });
  let cursor = flat.length;
  for (let i = lastJudged + 1; i < flat.length; i++) if (isWord[i]) { cursor = i; break; }
  const judged = counts.correct + counts.warning + counts.error;
  const accuracy = judged ? Math.round(((counts.correct + counts.warning * 0.5) / judged) * 100) : 0;
  return { statuses, cursor, counts, recited: counts.correct + counts.warning, total, accuracy, done: lastJudged >= 0 && cursor >= flat.length, heard };
}
