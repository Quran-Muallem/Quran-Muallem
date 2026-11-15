/**
 * «Ayah Correction Lock» (v55) with Waqf / Ayah-start re-alignment (v56).
 *
 * After an instant correction (the Sheikh said the mistaken word k of verse N) the reciter, following the
 * etiquette of tilāwa, either repeats the word itself, or restarts from the last waqf sign before it, or from
 * the beginning of the verse — and then reads on.
 *
 * The speech after the correction is therefore matched against the WHOLE verse N (so any of those restart
 * points aligns by itself), with these rules:
 *  - words before k are never judged again as mistakes: a word recited cleanly turns green (also one that was
 *    red), every other word keeps the colour it had — so re-reading the run-up never interrupts again;
 *  - from k on the words are judged normally, but while locked only words actually recited (green / orange)
 *    count: words of the NEXT verse said too early can neither be reached nor turn this verse red;
 *  - once the last word of verse N is recited the lock is released and the following verses join the same
 *    segment (same transcript — nothing already said is lost).
 * Words of earlier verses stay as they were (frozen). The combined result has the usual `LiveMatch` shape.
 */
import { normalizeArabic, type LiveMatch, type LiveStatus } from "@/lib/quranMatcher";

export type CorrectionLock = {
  /** Flat token index of the mistaken word. */
  k: number;
  /** Index of its verse in `targets`, the flat index of that verse's first and last token. */
  verse: number;
  verseStart: number;
  verseEnd: number;
  locked: boolean;
  /** Statuses / heard words of every token before k, as they were when the correction started. */
  frozen: LiveStatus[];
  frozenHeard: (string | null)[];
};

/** Waqf signs (ۖ ۗ ۘ ۙ ۚ ۛ — incl. the small lām-alif «لا» ۙ) after which a reciter may restart. */
const WAQF = /[ۖ-ۛ]/;

function verseStarts(targets: readonly string[]): number[] {
  const out: number[] = [];
  let o = 0;
  for (const t of targets) { out.push(o); o += t.split(" ").length; }
  out.push(o);
  return out;
}

/** Valid restart points for a mistake at flat token `k`: verse start, first word after the last waqf sign
 *  before `k` (if any), and `k` itself — ascending, without duplicates. */
export function restartAnchors(targets: readonly string[], k: number): number[] {
  const starts = verseStarts(targets);
  let v = 0;
  while (v + 1 < targets.length && starts[v + 1]! <= k) v++;
  const flat = targets.flatMap((t) => t.split(" "));
  const anchors = new Set<number>([starts[v]!]);
  for (let i = k - 1; i >= starts[v]!; i--) {
    if (WAQF.test(flat[i]!)) { if (i + 1 <= k) anchors.add(i + 1); break; }
  }
  anchors.add(k);
  return [...anchors].sort((a, b) => a - b);
}

/** Starts a lock at token `k` from the current (combined) match. */
export function startLock(match: LiveMatch, targets: readonly string[], k: number): CorrectionLock | null {
  const starts = verseStarts(targets);
  const total = starts[starts.length - 1]!;
  if (k < 0 || k >= total) return null;
  let verse = 0;
  while (verse + 1 < targets.length && starts[verse + 1]! <= k) verse++;
  return {
    k, verse, verseStart: starts[verse]!, verseEnd: starts[verse + 1]! - 1, locked: true,
    frozen: match.statuses.slice(0, k), frozenHeard: match.heard.slice(0, k),
  };
}

/** What the matcher sees while the lock is active: the whole verse (so every restart point aligns) plus the
 *  next verse as look-ahead — the recogniser only confirms a verse's last word once the following words come,
 *  so without it the lock could never be released. The look-ahead is never judged while locked. */
export function lockSegment(targets: readonly string[], refs: readonly (string | null)[] | null | undefined, lock: CorrectionLock) {
  const segTargets = lock.locked ? targets.slice(lock.verse, lock.verse + 2) : targets.slice(lock.verse);
  const lookEnd = lock.verse + 1 < targets.length ? lock.verseEnd + 1 + targets[lock.verse + 1]!.split(" ").length : lock.verseEnd + 1;
  const segRefs = refs ? refs.slice(lock.verseStart, lock.locked ? lookEnd : undefined) : null;
  return { targets: segTargets, refs: segRefs };
}

const good = (st: LiveStatus | undefined) => st === "CORRECT" || st === "WARNING";

/** The locked verse is complete once its last word was recited (green / orange). */
export function lockComplete(seg: LiveMatch | null | undefined, lock: CorrectionLock | null | undefined): boolean {
  if (!seg || !lock) return false;
  const last = lock.verseEnd - lock.verseStart;
  if (good(seg.statuses[last])) return true;
  // recogniser finished (mic stopped) on the verse's last word
  return seg.done && last === seg.statuses.length - 1;
}

/** Frozen prefix + segment result → one match over the whole passage. */
export function combineLock(targets: readonly string[], lock: CorrectionLock, seg: LiveMatch): LiveMatch {
  const flat = targets.flatMap((t) => t.split(" "));
  const n = flat.length;
  const { k, verseStart: vs, verseEnd: ve } = lock;
  const rel = (i: number) => i - vs;
  const statuses: LiveStatus[] = new Array<LiveStatus>(n).fill("PENDING");
  const heard: (string | null)[] = new Array<string | null>(n).fill(null);
  // last recited word at/after k (while locked nothing after it is judged)
  let lastGood = -1;
  for (let i = k; i <= ve && i < vs + seg.statuses.length; i++) if (good(seg.statuses[rel(i)])) lastGood = i;
  // last recited word anywhere in the segment: where the reciter is now (restart from the verse start / waqf)
  let lastAny = -1;
  for (let i = vs; i <= ve && i < vs + seg.statuses.length; i++) if (good(seg.statuses[rel(i)])) lastAny = i;
  for (let i = 0; i < n; i++) {
    if (i < vs) { statuses[i] = lock.frozen[i] ?? "PENDING"; heard[i] = lock.frozenHeard[i] ?? null; continue; }
    const st = seg.statuses[rel(i)];
    const hd = seg.heard[rel(i)] ?? null;
    if (i < k) {
      // run-up to the corrected word: only improvements count (red → green), never a new mistake
      if (good(st)) { statuses[i] = st!; heard[i] = hd; } else { statuses[i] = lock.frozen[i] ?? "PENDING"; heard[i] = lock.frozenHeard[i] ?? null; }
      continue;
    }
    if (lock.locked && (i > ve || i > lastGood)) continue; // not reached yet: neutral
    if (st) { statuses[i] = st; heard[i] = hd; }
  }
  const counts = { correct: 0, warning: 0, error: 0, extra: seg.counts.extra };
  statuses.forEach((st, i) => {
    if (!normalizeArabic(flat[i]!)) return;
    if (st === "CORRECT") counts.correct++; else if (st === "WARNING") counts.warning++; else if (st === "ERROR") counts.error++;
  });
  const judged = counts.correct + counts.warning + counts.error;
  const total = flat.filter((w) => normalizeArabic(w)).length;
  const complete = lock.locked && lockComplete(seg, lock);
  let cursor: number;
  if (complete) cursor = ve + 1;
  else if (lock.locked) cursor = lastAny >= 0 ? Math.min(lastAny + 1, ve + 1) : k; // follows the reciter
  else cursor = vs + seg.cursor;
  return {
    statuses, cursor: Math.min(cursor, n), counts, recited: counts.correct + counts.warning, total,
    accuracy: judged ? Math.round(((counts.correct + counts.warning * 0.5) / judged) * 100) : 0,
    done: !lock.locked && seg.done, heard,
    inProgress: seg.inProgress ? { token: vs + seg.inProgress.token, coverage: seg.inProgress.coverage } : null,
  };
}

/** Pause before the next correction can be announced after the Sheikh finished (breathing room). */
export const CORRECTION_GRACE_MS = 1800;
