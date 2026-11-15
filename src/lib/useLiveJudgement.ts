/**
 * v56.3: the one live judgement core shared by every recitation view (Mushaf and Kids Mushaf through
 * `useRecitation`, Tasmīʿ in `PracticeScreen`). It used to be copied line for line into both places.
 *
 *   transcript ─▶ matcher (phonemes: quranAlignment / text: quranMatcher)
 *              ─▶ Ayah Correction Lock (correctionLock.ts: segment → combine → release at the verse end)
 *              ─▶ Surah / Ayah identification window (recitationStartup.ts)
 *              ─▶ live colours (liveMistakes.ts: instant correction or «only once the verse is finished»)
 *
 * The views keep what is theirs: recording, page turns / passage switches, corrections UI, hints, stars.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { matchLive, type LiveMatch, type LiveStatus } from "@/lib/quranMatcher";
import { matchLivePhonemes } from "@/lib/quranAlignment";
import { combineLock, lockComplete, lockSegment, type CorrectionLock } from "@/lib/correctionLock";
import { deferLiveMistakes, instantLiveMistakes, tokenVerses } from "@/lib/liveMistakes";
import { holdStartup, useStartupIdentification } from "@/lib/recitationStartup";
import { useVoiceProfile } from "@/lib/userAdaptation";

export type LiveJudgement = {
  /** The judged passage (with the correction lock applied). */
  match: LiveMatch;
  /** The locked segment's own match (null without a lock). */
  segMatch: LiveMatch | null;
  lock: CorrectionLock | null;
  setLock: (l: CorrectionLock | null) => void;
  /** What the page shows while reciting (mistakes held back as the settings say); after the stop = match. */
  liveStatuses: LiveStatus[];
  /** Silent identification window at the start (recitationStartup.ts). */
  ident: ReturnType<typeof useStartupIdentification>;
};

export function useLiveJudgement({ targets, refs, transcript, phonemeText, final, listening, instant }: {
  /** One string per verse of the passage. */
  targets: readonly string[];
  /** Canonical phonemes per flat token (phoneme engine), or null for the text matcher. */
  refs: readonly (string | null)[] | null | undefined;
  /** What was said (already cut at a page turn / jump). */
  transcript: string;
  /** The transcript is a phoneme stream (Zipformer) rather than text (Whisper). */
  phonemeText: boolean;
  /** The recording has ended: the matcher may judge the last word without waiting for more. */
  final: boolean;
  listening: boolean;
  /** Settings «تصحيح فوري»: red as soon as the reciter moves past a word. */
  instant: boolean;
}): LiveJudgement {
  // Re-judged when the voice profile changes (a word added to it turns green at once).
  const profile = useVoiceProfile();
  const [lock, setLock] = useState<CorrectionLock | null>(null);
  const run = useCallback((tg: readonly string[], rf: readonly (string | null)[] | null | undefined) => (phonemeText && rf
    ? matchLivePhonemes(transcript, tg, rf, { final })
    : matchLive(transcript, tg)), [transcript, phonemeText, final]);
  const segMatch = useMemo(() => {
    if (!lock) return null;
    const seg = lockSegment(targets, refs, lock);
    return run(seg.targets, seg.refs);
  }, [lock, targets, refs, run, profile]); // eslint-disable-line react-hooks/exhaustive-deps
  const match = useMemo(() => (lock && segMatch ? combineLock(targets, lock, segMatch) : run(targets, refs)),
    [lock, segMatch, targets, refs, run, profile]); // eslint-disable-line react-hooks/exhaustive-deps
  // The last word of the locked verse was matched → release: the following verses join the same segment.
  useEffect(() => { if (lock?.locked && lockComplete(segMatch, lock)) setLock({ ...lock, locked: false }); }, [lock, segMatch]);
  // v38: while reciting, red / orange appear only once their verse is finished (see liveMistakes.ts).
  const verseOf = useMemo(() => tokenVerses(targets), [targets]);
  const ident = useStartupIdentification({ listening, match, transcript, kind: phonemeText ? "phonemes" : "text" });
  const liveStatuses = useMemo(() => (!listening ? match.statuses
    : holdStartup(instant ? instantLiveMistakes(match.statuses, match.cursor) : deferLiveMistakes(match.statuses, verseOf, match.cursor), ident.identifying, ident.graceTokens)),
    [listening, match.statuses, match.cursor, verseOf, instant, ident.identifying, ident.graceTokens]);
  return { match, segMatch, lock, setLock, liveStatuses, ident };
}
