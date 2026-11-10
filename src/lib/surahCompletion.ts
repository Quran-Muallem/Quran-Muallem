/**
 * Surah completion while reciting: the last word of a surah has been judged (the reciter reached it)
 * → the microphone stops, a success vibration and a soft chime.
 */
import type { LiveStatus } from "@/lib/quranMatcher";
import { successHaptic } from "@/lib/haptics";
import { playCompletionChime } from "@/lib/chime";
import { getSettings } from "@/lib/settings";
import { normalizeArabic } from "@/lib/quranMatcher";
import type { RecitationMode, WordResult } from "@/lib/badges";

/** A word counts as completed when it was judged correct or almost correct — and, from memory, without the hint. */
export const wordDone = (status: LiveStatus | undefined, mode: RecitationMode, hinted: boolean) =>
  (status === "CORRECT" || status === "WARNING") && !(mode === "MEMORIZATION" && hinted);

/**
 * Recite screen → Mushaf words: one result per Mushaf word of the passage (flat tokens are
 * `ayat.map(text).join(" ").split(" ")`, the matcher's token list). When a verse's text is the Mushaf's,
 * words are numbered like the Mushaf (a word printed with a waqf sign is one word, judged by its first
 * token); otherwise every real word token (no waqf signs) is one word.
 */
export function practiceWordResults(surah: number, ayat: readonly { number: number; text: string }[], statuses: readonly LiveStatus[],
  mushafWords: ((s: number, a: number) => readonly string[]) | null, mode: RecitationMode, hints: ReadonlySet<number>): WordResult[] {
  const out: WordResult[] = [];
  let t = 0;
  for (const a of ayat) {
    const tokens = a.text.split(" ");
    const mw = mushafWords?.(surah, a.number);
    if (mw && mw.length && mw.join(" ") === a.text) {
      mw.forEach((w, k) => {
        out.push({ surah, ayah: a.number, word: k + 1, total: mw.length, done: wordDone(statuses[t], mode, hints.has(t)) });
        t += w.split(" ").length;
      });
    } else {
      const real = tokens.map((tok, k) => ({ k: t + k, real: !!normalizeArabic(tok) })).filter((x) => x.real);
      real.forEach((x, n) => out.push({ surah, ayah: a.number, word: n + 1, total: real.length, done: wordDone(statuses[x.k], mode, hints.has(x.k)) }));
      t += tokens.length;
    }
  }
  return out;
}

/** Word keys are "surah:ayah:word". */
export type WordKeyStr = string;

/**
 * For each surah whose last word is among `keys`: index of that last word (`end`) and of the surah's
 * first word among `keys` (`start`). `versesCount(s)` = ayahs of surah s, `wordCount(s, a)` = words of
 * that ayah (Mushaf numbering).
 */
export function surahEndIndices(keys: readonly WordKeyStr[], versesCount: (s: number) => number, wordCount: (s: number, a: number) => number): Map<number, { start: number; end: number }> {
  const out = new Map<number, { start: number; end: number }>();
  const first = new Map<number, number>();
  keys.forEach((k, i) => {
    const [s, a, w] = k.split(":").map(Number);
    if (!s || !a || !w) return;
    if (!first.has(s)) first.set(s, i);
    if (a === versesCount(s) && w === wordCount(s, a)) out.set(s, { start: first.get(s) ?? i, end: i });
  });
  return out;
}

/** A word counts as reached once it is judged (correct, almost, or skipped because later words came). */
export const isReached = (st: LiveStatus | undefined) => st !== undefined && st !== "PENDING";
const isSaid = (st: LiveStatus | undefined) => st === "CORRECT" || st === "WARNING";

/**
 * The first surah (in recitation order) that was recited to its end, or null: its last word was said
 * (correct or almost) and most of its words here were said — so a single matching word far ahead
 * (e.g. "أحد" heard at the start of al-Ikhlāṣ also ends it) never stops the recitation early.
 * `statusOf(i)` = live status of key i. Surahs in `done` are skipped (each surah completes once).
 */
export function finishedSurah(ends: Map<number, { start: number; end: number }>, statusOf: (i: number) => LiveStatus | undefined,
  done: ReadonlySet<number> = new Set(), minShare = 0.6): number | null {
  let best: { s: number; i: number } | null = null;
  for (const [s, { start, end }] of ends) {
    if (done.has(s) || !isSaid(statusOf(end)) || (best && end > best.i)) continue;
    let said = 0;
    for (let i = start; i <= end; i++) if (isSaid(statusOf(i))) said++;
    if (said >= minShare * (end - start + 1)) best = { s, i: end };
  }
  return best?.s ?? null;
}

/** The last word of the text was said and most of the text was said (the Recite screen's passage). */
export function passageFinished(statuses: readonly LiveStatus[], last: number, minShare = 0.6): boolean {
  if (last < 0 || !isSaid(statuses[last])) return false;
  let said = 0;
  for (let i = 0; i <= last; i++) if (isSaid(statuses[i])) said++;
  return said >= minShare * (last + 1);
}

/**
 * Mushaf page while recording: may the next page slide in? The last word has been reached and judged (also
 * when it was said wrongly — before v26 a mispronounced last word or a page with many red words left the
 * reader stuck on "page finished – tap the microphone"), and a fair part of the page was really said, so a
 * single stray word that makes the matcher jump to the end still does not flip the page.
 */
export function pageReadyToTurn(statuses: readonly LiveStatus[], last: number, minShare = 0.35): boolean {
  if (last < 0) return false;
  const end = statuses[last];
  if (end == null || end === "PENDING") return false;
  let said = 0;
  for (let i = 0; i <= last; i++) if (isSaid(statuses[i])) said++;
  return said >= minShare * (last + 1);
}

/** Counts of judged words (PENDING ignored). */
export function tally(statuses: readonly LiveStatus[]): { correct: number; near: number; wrong: number } {
  let correct = 0, near = 0, wrong = 0;
  for (const s of statuses) { if (s === "CORRECT") correct++; else if (s === "WARNING") near++; else if (s === "ERROR") wrong++; }
  return { correct, near, wrong };
}

/** Success feedback: vibration + chime. Never throws, never blocks the caller. */
export function celebrateSurah(): void {
  if (!getSettings().completionSound) return;
  void successHaptic().catch(() => {});
  void playCompletionChime().catch(() => {});
}
