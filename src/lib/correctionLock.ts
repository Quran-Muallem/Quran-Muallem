/**
 * v55 «Ayah Correction Lock».
 *
 * After an instant correction (the Sheikh said the mistaken word k of verse N) the reciter repeats the word and
 * reads on. Matching that new speech against the WHOLE remaining passage made the matcher jump into verse N+1
 * and mark every word of verse N it had not heard yet as skipped (red).
 *
 * Now the speech after the correction is matched against a segment that starts AT the mistaken word:
 *  - locked:   only the rest of verse N (words k … end of N) — nothing beyond can be reached or turn red;
 *  - released: once the last word of verse N is matched, the segment grows to the following verses — with the
 *              same transcript, so nothing already said is lost.
 * Words before k keep their judged colours (frozen). The combined result has the usual `LiveMatch` shape.
 */
import { normalizeArabic, type LiveMatch, type LiveStatus } from "@/lib/quranMatcher";

export type CorrectionLock = {
  /** Flat token index of the mistaken word (start of the segment). */
  k: number;
  /** Index of its verse in `targets`, and the flat index of that verse's last token. */
  verse: number;
  verseEnd: number;
  locked: boolean;
  frozen: LiveStatus[];
  frozenHeard: (string | null)[];
};

function verseStarts(targets: readonly string[]): number[] {
  const out: number[] = [];
  let o = 0;
  for (const t of targets) { out.push(o); o += t.split(" ").length; }
  out.push(o);
  return out;
}

/** Starts a lock at token `k` from the current (combined) match. */
export function startLock(match: LiveMatch, targets: readonly string[], k: number): CorrectionLock | null {
  const starts = verseStarts(targets);
  const total = starts[starts.length - 1]!;
  if (k < 0 || k >= total) return null;
  let verse = 0;
  while (verse + 1 < targets.length && starts[verse + 1]! <= k) verse++;
  return {
    k, verse, verseEnd: starts[verse + 1]! - 1, locked: true,
    frozen: match.statuses.slice(0, k), frozenHeard: match.heard.slice(0, k),
  };
}

/** What the matcher judges while the lock is active. */
export function lockSegment(targets: readonly string[], refs: readonly (string | null)[] | null | undefined, lock: CorrectionLock) {
  const starts = verseStarts(targets);
  const rest = targets[lock.verse]!.split(" ").slice(lock.k - starts[lock.verse]!).join(" ");
  const segTargets = lock.locked ? [rest] : [rest, ...targets.slice(lock.verse + 1)];
  const segRefs = refs ? refs.slice(lock.k, lock.locked ? lock.verseEnd + 1 : undefined) : null;
  return { targets: segTargets, refs: segRefs };
}

const good = (st: LiveStatus | undefined) => st === "CORRECT" || st === "WARNING";

/** While locked, only words actually recited (green / orange) count: anything after the last of them stays
 *  neutral — words of the NEXT verse said too early must not turn this verse red. */
function lockedView(seg: LiveMatch): { statuses: LiveStatus[]; heard: (string | null)[]; last: number } {
  let last = -1;
  seg.statuses.forEach((st, i) => { if (good(st)) last = i; });
  return {
    statuses: seg.statuses.map((st, i) => (i <= last ? st : "PENDING")),
    heard: seg.heard.map((h, i) => (i <= last ? h : null)),
    last,
  };
}

/** The locked verse is complete once its last word was recited (green / orange). */
export function lockComplete(seg: LiveMatch | null | undefined): boolean {
  if (!seg || !seg.statuses.length) return false;
  return good(seg.statuses[seg.statuses.length - 1]);
}

/** Frozen prefix + segment result → one match over the whole passage. */
export function combineLock(targets: readonly string[], lock: CorrectionLock, seg0: LiveMatch): LiveMatch {
  let seg = seg0;
  if (lock.locked) {
    const v = lockedView(seg0);
    const complete = lockComplete(seg0);
    seg = { ...seg0, statuses: v.statuses, heard: v.heard, cursor: complete ? seg0.statuses.length : v.last + 1, done: complete };
  }
  const flat = targets.flatMap((t) => t.split(" "));
  const n = flat.length;
  const pad = (a: LiveStatus[]) => [...lock.frozen, ...a, ...Array<LiveStatus>(Math.max(0, n - lock.k - a.length)).fill("PENDING")].slice(0, n);
  const statuses = pad(seg.statuses);
  const heard = [...lock.frozenHeard, ...seg.heard, ...Array<string | null>(Math.max(0, n - lock.k - seg.heard.length)).fill(null)].slice(0, n);
  const counts = { correct: 0, warning: 0, error: 0, extra: seg.counts.extra };
  statuses.forEach((st, i) => {
    if (!normalizeArabic(flat[i]!)) return;
    if (st === "CORRECT") counts.correct++; else if (st === "WARNING") counts.warning++; else if (st === "ERROR") counts.error++;
  });
  const judged = counts.correct + counts.warning + counts.error;
  const total = flat.filter((w) => normalizeArabic(w)).length;
  let cursor = lock.k + seg.cursor;
  if (lock.locked && seg.done) cursor = lock.verseEnd + 1;
  return {
    statuses, cursor: Math.min(cursor, n), counts, recited: counts.correct + counts.warning, total,
    accuracy: judged ? Math.round(((counts.correct + counts.warning * 0.5) / judged) * 100) : 0,
    done: !lock.locked && seg.done, heard,
    inProgress: seg.inProgress ? { token: lock.k + seg.inProgress.token, coverage: seg.inProgress.coverage } : null,
  };
}

/** Pause before the next correction can be announced after the Sheikh finished (breathing room). */
export const CORRECTION_GRACE_MS = 1800;
