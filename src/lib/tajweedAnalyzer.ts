/**
 * Tajweed analyzer (v35) — rules the recitation check must respect when it compares what was heard
 * (phonemes of the on-device recognizer) with the canonical phonemes of a word.
 *
 *  A. الوقف بالسكون (stopping on a word, mid-verse or at its end): the reader drops the final short vowel /
 *     tanwīn (السكون العارض), tanwīn al-fatḥ becomes a long alif, tāʾ marbūṭah becomes hāʾ, the ṣilah of the
 *     hāʾ al-kināyah falls away. Such a stop form is NOT a mistake (`waqfForms`).
 *  B. الابتداء (starting again after a stop): a word with hamzat al-waṣl (ٱ) is started with a hamzah —
 *     «ءَ» before the article, «ءِ»/«ءُ» before a verb / noun (`ibtidaForms`); and الوقف الاضطراري / الابتداء
 *     الحسن: after a breath stop the reader may go back and repeat one to three words before going on. The
 *     repeated words are not counted as errors (`judgeWithTajweed`, «repeat»).
 *  C. الحروف المفخمة والمرققة: a heavy letter read light (or the reverse) — ص/س, ط/ت, ض/د, ظ/ذ/ز, ق/ك, غ/خ
 *     vs ع/ح … — is a real mistake; `tafkheemSlip` names it so the feedback can say which letter.
 *
 * What the recognizer can NOT tell (and this module therefore does not pretend to judge): the degree of
 * tafkhīm (its five levels), rāʾ / lām al-jalālah heavy or light, or where exactly the reader paused —
 * the recognizer returns letters, not formants or timings. Those rules are taught in the Tajweed guide.
 */
import { judgeWord, core, type WordJudgement } from "@/lib/quranAlignment";

const SHORT = new Set(["َ", "ُ", "ِ"]);
const MADD_SIGNS = /[ۥۦ]+$/;
/** Uthmani marks after the last letter (to read a Mushaf word's ending). */
const TRAILING_MARKS = /[ً-ٰٟۖ-ۭ\s]+$/;

/** The letters of a Mushaf word without the marks after its last letter, and those marks. */
function ending(word: string): { last: string; marks: string } {
  const w = word.replace(/[ۖ-ۭ\s]+$/u, "");
  const m = TRAILING_MARKS.exec(w);
  const marks = m ? m[0] : "";
  const stem = m ? w.slice(0, -marks.length) : w;
  return { last: stem.slice(-1), marks };
}

/**
 * Stop forms of a word (phonemes), given its Mushaf spelling: final short vowel dropped; tanwīn al-fatḥ →
 * long alif; tanwīn ḍamm / kasr dropped with its nūn; tāʾ marbūṭah → hāʾ; ṣilah of the hāʾ dropped.
 */
export function waqfForms(phonemes: string, word = ""): string[] {
  const out = new Set<string>();
  const { last, marks } = ending(word);
  let p = phonemes;
  // Tanwīn: the recognizer writes it as vowel + نـ at the end.
  if (/ً/.test(marks) || (last === "ا" || last === "ى") && /ً/.test(word.slice(-4))) {
    if (/َن$/.test(p)) out.add(p.slice(0, -1) + "اا");
  }
  if (/[ٌٍ]/.test(marks) && /[ُِ]ن$/.test(p)) out.add(p.slice(0, -2));
  // Ṣilah of hāʾ al-kināyah (لَهُۥ → لَه).
  if (MADD_SIGNS.test(p) && /ه[ُِ][ۥۦ]+$/.test(p)) out.add(p.replace(/[ُِ][ۥۦ]+$/, ""));
  // Final short vowel → sukūn.
  if (SHORT.has(p.slice(-1))) {
    p = p.slice(0, -1);
    out.add(p);
    // Tāʾ marbūṭah: ت at the end becomes ه on a stop.
    if (last === "ة" && p.endsWith("ت")) out.add(p.slice(0, -1) + "ه");
  }
  out.delete(phonemes);
  return [...out];
}

/** Start forms after a stop: hamzat al-waṣl is pronounced (ءَ for the article, ءِ / ءُ otherwise). */
export function ibtidaForms(phonemes: string, word = ""): string[] {
  const w = word.trim();
  if (!w.startsWith("ٱ")) return [];
  if (phonemes.startsWith("ء")) return [];
  if (/^ٱل/.test(w)) return ["ءَ" + phonemes, "ءَل" + phonemes];
  return ["ءِ" + phonemes, "ءُ" + phonemes];
}

/** Heavy letter ↔ the light letter it is most often confused with (the recognizer can tell these apart). */
export const HEAVY_LIGHT: readonly [string, string][] = [["ص", "س"], ["ط", "ت"], ["ض", "د"], ["ظ", "ذ"], ["ظ", "ز"], ["ق", "ك"], ["غ", "ع"], ["خ", "ح"], ["خ", "ه"]];
export const HEAVY_LETTERS = "خصضغطقظ";

/** If the only difference is a heavy letter read light (or the reverse): which one, else null. */
export function tafkheemSlip(expected: string, heard: string): { expected: string; heard: string; heavyReadLight: boolean } | null {
  const e = [...core(expected)], h = [...core(heard)];
  if (e.length !== h.length) return null;
  let slip: { expected: string; heard: string; heavyReadLight: boolean } | null = null;
  for (let i = 0; i < e.length; i++) {
    if (e[i] === h[i]) continue;
    const pair = HEAVY_LIGHT.find(([hv, lt]) => (hv === e[i] && lt === h[i]) || (lt === e[i] && hv === h[i]));
    if (!pair || slip) return null;
    slip = { expected: e[i]!, heard: h[i]!, heavyReadLight: pair[0] === e[i] };
  }
  return slip;
}

export type TajweedReason = "waqf" | "ibtida" | "repeat" | null;
export type TajweedJudgement = WordJudgement & { reason: TajweedReason };

const RANK = { CORRECT: 2, WARNING: 1, ERROR: 0 } as const;
const better = (a: WordJudgement, b: WordJudgement) => RANK[a.status] > RANK[b.status] || (RANK[a.status] === RANK[b.status] && a.core < b.core);

/** Does `a` sound like `b` (a repeated chunk)? Core letters within 25 %. */
function sameChunk(a: string, b: string): boolean {
  const ca = core(a), cb = core(b);
  if (!ca || !cb) return false;
  const d = editDistance([...ca], [...cb]);
  return d <= Math.max(1, Math.floor(0.25 * Math.max(ca.length, cb.length)));
}
function editDistance(a: readonly string[], b: readonly string[]): number {
  const D = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = D[0]!; D[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = D[j]!; D[j] = Math.min(t + 1, D[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
  }
  return D[b.length]!;
}

export type WordContext = {
  /** The word in Mushaf spelling (for tanwīn / tāʾ marbūṭah / hamzat al-waṣl). */
  word?: string | undefined;
  /** Canonical phonemes of the up to three words before it (oldest first). */
  previous?: readonly string[] | undefined;
  /** The next Mushaf word (a stop before a hamzat al-waṣl word leaves a «ءَ» at the end of what was heard). */
  next?: string | undefined;
};

/**
 * Judges a word like `judgeWord`, but accepts the Tajweed-correct ways of stopping and starting:
 * the stop form of the word, the start form after a stop, a repeated word or phrase after a breath stop.
 */
export function judgeWithTajweed(expected: string, heard: string, ctx: WordContext = {}, tolerance = 1): TajweedJudgement {
  const plain = judgeWord(expected, heard, tolerance);
  if (plain.status === "CORRECT" || !heard) return { ...plain, reason: null };
  let best: TajweedJudgement = { ...plain, reason: null };
  const consider = (exp: string, h: string, reason: TajweedReason) => {
    if (!h) return;
    const j = judgeWord(exp, h, tolerance);
    if (better(j, best)) best = { ...j, reason };
  };
  const word = ctx.word ?? "";
  const stops = waqfForms(expected, word);
  const starts = ibtidaForms(expected, word);
  const forms: [string, TajweedReason][] = [
    ...stops.map((f): [string, TajweedReason] => [f, "waqf"]),
    ...starts.map((f): [string, TajweedReason] => [f, "ibtida"]),
    ...starts.flatMap((s) => waqfForms(s, word).map((f): [string, TajweedReason] => [f, "waqf"])),
  ];
  // A stop before a word with hamzat al-waṣl: the «ءَ / ءِ» heard belongs to the next word's start.
  const heards = [heard];
  if (ctx.next?.trim().startsWith("ٱ") && /ء[َُِ]?$/.test(heard)) heards.push(heard.replace(/ء[َُِ]?$/, ""));
  for (const h of heards) {
    if (h !== heard) consider(expected, h, "ibtida");
    for (const [f, r] of forms) consider(f, h, r);
  }
  if ((best as TajweedJudgement).status === "CORRECT") return best;

  // الابتداء الحسن: after a stop the reader repeated the last word(s). The repeated chunk may sit before the
  // word (repeat of the previous words) or after it (the word and its predecessors once more).
  if (heard.length > core(expected).length + 1) {
    const prev = ctx.previous ?? [];
    const before: string[] = [], after: string[] = [expected];
    for (let k = 1; k <= Math.min(3, prev.length); k++) before.push(prev.slice(-k).join(""));
    for (let k = 1; k <= Math.min(3, prev.length); k++) after.push(prev.slice(-k).join("") + expected);
    const own = [expected, ...stops];
    const chars = [...heard];
    for (let i = 2; i <= chars.length - 2; i++) {
      const a = chars.slice(0, i).join(""), b = chars.slice(i).join("");
      // [repeat of earlier words][this word]
      if (before.some((c) => sameChunk(a, c) || ibtidaForms(c, "ٱل").some((x) => sameChunk(a, x)))) for (const o of own) consider(o, b, "repeat");
      // [this word, maybe stopped][repeat of it / of the phrase ending with it]
      if (after.some((c) => sameChunk(b, c) || sameChunk(b, "ءَ" + c) || sameChunk(b, "ءِ" + c))) for (const o of own) consider(o, a, "repeat");
      if ((best as TajweedJudgement).status === "CORRECT") break;
    }
  }
  return best;
}

/* ------------------------------------------------------------------------------------------------------ */
/* v38 · what went wrong in a word (for the review after the recitation)                                   */
/* ------------------------------------------------------------------------------------------------------ */

/**
 * Kinds of mistake the phonemes can show. The canonical phonemes write a madd as a run of ا / ۥ / ۦ (2 = natural,
 * 4–6 = long), ghunnah of a stressed nūn / mīm as a run of ن / م, ikhfāʾ as a run of ں (nūn) / ۾ (mīm), qalqalah
 * as ڇ after the letter and shaddah as a doubled letter — so these are compared, not guessed.
 */
export type TajweedIssue = "missing" | "madd" | "ghunnah" | "ikhfa" | "qalqalah" | "tafkheem" | "shadda" | "harakat" | "letters";

const runs = (s: string, re: RegExp) => [...s.matchAll(re)].map((m) => m[0].length);
const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const VOWELS = /[َُِ]/g;
const stripVowels = (s: string) => s.replace(VOWELS, "");

/** The mistakes visible in the phonemes of a word (`expected` canonical, `heard` from the recognizer). */
export function diagnoseWord(expected: string | null | undefined, heard: string | null | undefined): TajweedIssue[] {
  if (!heard) return ["missing"];
  if (!expected) return ["letters"];
  // A different word (most consonants differ): the letters are the problem, not a Tajweed detail.
  const cons = (x: string) => [...stripVowels(core(x)).replace(/[اۥۦڇ]/g, "")];
  const ce = cons(expected), ch = cons(heard);
  if (editDistance(ce, ch) > Math.max(1, Math.floor(0.4 * Math.max(ce.length, ch.length)))) return ["letters"];
  const out = new Set<TajweedIssue>();
  // Madd: total length of the long-vowel runs (a natural madd is 2, a long one 4–6).
  const eM = runs(expected, /[اۥۦ]{2,}/g), hM = runs(heard, /[اۥۦ]{2,}/g);
  if (eM.length && Math.abs(total(eM) - total(hM)) >= 2) out.add("madd");
  // Ghunnah of a stressed nūn / mīm (ننن / ممم, also in idghām with ghunnah).
  const eG = runs(expected, /ن{3,}|م{3,}/g), hG = runs(heard, /ن{3,}|م{3,}/g);
  if (eG.length && total(hG) < total(eG) - 1) out.add("ghunnah");
  // Ikhfāʾ / iqlāb: the hidden nūn / mīm (ں / ۾) read as a clear one.
  const eI = (expected.match(/[ں۾]/g) ?? []).length, hI = (heard.match(/[ں۾]/g) ?? []).length;
  if (eI && hI < eI - 1) out.add("ikhfa");
  // Qalqalah.
  if ((expected.match(/ڇ/g) ?? []).length > (heard.match(/ڇ/g) ?? []).length) out.add("qalqalah");
  // Heavy ↔ light letter.
  if (tafkheemSlip(expected, heard)) out.add("tafkheem");
  // Shaddah: a doubled letter (not a madd or ghunnah run) heard single.
  const doubles = (s: string) => runs(s.replace(/[اۥۦ]+|ن{3,}|م{3,}|[ں۾]+/g, ""), /(.)\1/g).length;
  if (doubles(expected) > doubles(heard)) out.add("shadda");
  if (!out.size) {
    // Same consonants, other vowels → the ḥarakāt; otherwise letters are wrong / missing.
    const sameLetters = stripVowels(core(expected)) === stripVowels(core(heard));
    out.add(sameLetters ? "harakat" : "letters");
  }
  return [...out];
}
