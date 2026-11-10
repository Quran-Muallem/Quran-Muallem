/**
 * v38: mistakes are shown only once a verse is finished.
 *
 * While the reader recites, the matcher may mark a word red / orange the moment the cursor passes it — in
 * the middle of a breath, during a pause, before the reader corrected himself, or because the recognizer
 * was briefly unsure. That premature red was distracting (test video v38). Now, while the microphone is on,
 * a red / orange word stays neutral as long as its verse is the one being recited (or a later one); the
 * verse's final colours appear when the reader moves on to the next verse, and everything is shown after
 * the stop. Green (correct) words show at once.
 */
import type { LiveStatus } from "@/lib/quranMatcher";

/** Verse index of every matcher token: `targets` are verses, tokens are `targets.join(" ").split(" ")`. */
export function tokenVerses(targets: readonly string[]): number[] {
  const out: number[] = [];
  targets.forEach((t, v) => { for (let i = 0, n = t.split(" ").length; i < n; i++) out.push(v); });
  return out;
}

const bad = (st: LiveStatus | undefined) => st === "ERROR" || st === "WARNING";

/**
 * Live statuses for display: red / orange of the verse at the cursor and after it → "PENDING" (neutral).
 * `cursor` is the matcher's position (first token not reached yet); past the end every verse is finished.
 */
export function deferLiveMistakes(statuses: readonly LiveStatus[], verseOf: readonly number[], cursor: number): LiveStatus[] {
  if (cursor >= verseOf.length) return [...statuses];
  const current = verseOf[Math.max(0, cursor)] ?? Infinity;
  return statuses.map((st, i) => (bad(st) && (verseOf[i] ?? Infinity) >= current ? "PENDING" : st));
}
