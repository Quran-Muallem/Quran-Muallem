/**
 * v56 «Surah / Ayah identification window» at the start of every recitation.
 *
 * The screen may be open on al-Baqarah while the reader starts «عَمَّ يَتَسَاءَلُونَ» from memory. The matcher
 * judges those words against al-Baqarah at once, and instant correction would interrupt before the verse
 * locator (ayahLocator.ts, all 114 surahs, ≈ 4–5 words needed, an opening basmala is skipped) could even
 * decide. So each new recitation starts in a silent identification phase:
 *  - no red / orange is shown, nothing is announced, no vibration (green shows as usual);
 *  - meanwhile the locator compares the opening words with the open surah AND the whole Quran; a hit
 *    elsewhere switches the view and re-judges the words already said there (→ green);
 *  - the phase ends («lock-in») once the reader is on track in the passage now shown (≥ 5 words recited,
 *    ≥ 60 % accurate) — after a switch that is the detected surah — or, as a fallback, once enough was said
 *    for the locator to have decided (≥ 3.5 s and ≈ 9–10 words) without any other place in the Quran fitting,
 *    and only if the open passage fits at least a little (≥ 40 %); words that fit nothing here wait for the
 *    locator up to ≈ 25 words (IDENTIFY_MAX_CHARS).
 *  - words said during the phase are never announced afterwards: correction starts from the lock-in on.
 *  - a switch found later (after the lock-in) opens a new window for the new passage (`restart`).
 *    (They keep their real colour in the result after the stop.)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { MIN_CHARS, transcriptCore, type LocatorKind } from "@/lib/ayahLocator";
import type { LiveMatch, LiveStatus } from "@/lib/quranMatcher";

/** Shortest identification window (the spec's ≈ 3–3.5 s). */
export const IDENTIFY_MIN_MS = 3500;
/** Core characters after which the locator has had its chance (≈ 9–10 words: an opening basmala + the locator minimum). */
export const IDENTIFY_FALLBACK_CHARS = MIN_CHARS + 34; // incl. an opening basmala (≈ 23) + the locator minimum
/** So much said without a place found anywhere: stop waiting even if the clock says otherwise. */
export const IDENTIFY_MAX_CHARS = 160;
/** The fallback needs some evidence that the open passage is what is being recited. */
export const IDENTIFY_FALLBACK_ACCURACY = 40;

/** On track in the passage shown: ≥ 5 words recited (more than a basmala — on al-Fātiḥah the basmala is
 *  verse 1 and would otherwise lock in before the real surah is heard) and ≥ 60 % accurate. */
export const LOCK_IN_WORDS = 5;
export const onTrack = (m: Pick<LiveMatch, "recited" | "accuracy">) => m.recited >= LOCK_IN_WORDS && m.accuracy >= 60;

/** Is the identification window over? (pure, see the file comment) */
export function identificationOver({ elapsedMs, coreChars, match }: { elapsedMs: number; coreChars: number; match: Pick<LiveMatch, "recited" | "accuracy"> }): boolean {
  if (onTrack(match)) return true;
  if (coreChars >= IDENTIFY_MAX_CHARS) return true;
  // fallback to the open passage: only if it fits at least a little — words that do not fit it at all
  // belong to another place the locator has not pinned down yet (noisy opening): keep waiting.
  return elapsedMs >= IDENTIFY_MIN_MS && coreChars >= IDENTIFY_FALLBACK_CHARS && match.recited >= 1 && match.accuracy >= IDENTIFY_FALLBACK_ACCURACY;
}

const bad = (st: LiveStatus | undefined) => st === "ERROR" || st === "WARNING";

/** Display / announcement statuses: everything red / orange stays neutral while identifying, and so do the
 *  words said before the lock-in (`graceTokens` = matcher cursor at the lock-in). */
export function holdStartup(statuses: readonly LiveStatus[], identifying: boolean, graceTokens: number): LiveStatus[] {
  if (!identifying && graceTokens <= 0) return statuses as LiveStatus[];
  return statuses.map((st, i) => (bad(st) && (identifying || i < graceTokens) ? "PENDING" : st));
}

/**
 * Tracks the identification window of the current recitation. `resetGrace` must be called whenever the
 * token indices change meaning (page turn, jump, correction lock) — the grace then no longer applies.
 */
export function useStartupIdentification({ listening, match, transcript, kind }: { listening: boolean; match: LiveMatch; transcript: string; kind: LocatorKind }) {
  const [identifying, setIdentifying] = useState(false);
  const [graceTokens, setGraceTokens] = useState(0);
  const startedAt = useRef(0);
  /** Core characters already in the transcript when the window (re)started: counted for the fallback only
   *  from there on (after a late switch the transcript is already long). -1 = take it at the next check. */
  const charsAtStart = useRef(0);
  const [tick, setTick] = useState(0);
  // a new recitation → identification phase
  useEffect(() => {
    if (!listening) { setIdentifying(false); return; }
    startedAt.current = performance.now();
    charsAtStart.current = 0;
    setIdentifying(true);
    setGraceTokens(0);
    const id = window.setTimeout(() => setTick((t) => t + 1), IDENTIFY_MIN_MS + 50); // re-check after the minimum time
    return () => window.clearTimeout(id);
  }, [listening]);
  const latest = useRef(match);
  latest.current = match;
  useEffect(() => {
    if (!identifying || !listening) return;
    const all = transcript ? transcriptCore(kind, transcript).codes.length : 0;
    if (charsAtStart.current < 0) charsAtStart.current = all;
    const coreChars = Math.max(0, all - charsAtStart.current);
    if (!identificationOver({ elapsedMs: performance.now() - startedAt.current, coreChars, match })) return;
    setIdentifying(false);
    setGraceTokens(match.cursor);
  }, [identifying, listening, transcript, kind, match, tick]);
  const resetGrace = useCallback(() => setGraceTokens(0), []);
  /** The view switched to the surah / verse found by the locator: a new silent window for that passage
   *  (also when the switch came after the lock-in — words already said there are never announced). */
  const restart = useCallback(() => {
    startedAt.current = performance.now();
    charsAtStart.current = -1;
    setGraceTokens(0);
    setIdentifying(true);
    window.setTimeout(() => setTick((t) => t + 1), IDENTIFY_MIN_MS + 50);
  }, []);
  return { identifying, graceTokens, resetGrace, restart };
}
