/**
 * Surah badges for the whole app (Mushaf and Recite screen alike).
 *
 *  - Silver: every word of the whole surah completed in READING mode (text visible).
 *  - Gold:   every word of the whole surah completed in MEMORIZATION mode (from memory, no word hint).
 *
 * A badge is checked only when the alignment engine completed the surah's LAST word in that mode
 * (`completeSurah`, called through `RecitationContext.finishSurah`). There is no timer, no
 * "page open long enough" and no accuracy shortcut. The rules live in `src/lib/badges.ts` (tested).
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import {
  badgeCounts, completeSurah, initBadges, onBadgeEarned, recentBadges, recordWords, surahBadgeProgress, useBadges,
  type BadgeEarned, type BadgeState, type RecitationMode, type WordResult,
} from "@/lib/badges";

export type BadgeApi = {
  state: BadgeState;
  counts: ReturnType<typeof badgeCounts>;
  recent: BadgeEarned[];
  progress: (surah: number) => ReturnType<typeof surahBadgeProgress>;
  recordWords: (mode: RecitationMode, words: readonly WordResult[]) => Promise<void>;
  completeSurah: (mode: RecitationMode, surah: number, words: readonly WordResult[]) => Promise<BadgeEarned | null>;
  onEarned: (listener: (earned: BadgeEarned[]) => void) => () => void;
};

const BadgeContext = createContext<BadgeApi | null>(null);

export function BadgeProvider({ children }: { children: ReactNode }) {
  const state = useBadges();
  useEffect(() => { void initBadges(); }, []);
  const value = useMemo<BadgeApi>(() => ({
    state,
    counts: badgeCounts(state),
    recent: recentBadges(state),
    progress: (surah) => surahBadgeProgress(state, surah),
    recordWords,
    completeSurah,
    onEarned: onBadgeEarned,
  }), [state]);
  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

/** Badge state and actions; works without a provider too (falls back to the shared store). */
export function useBadgeContext(): BadgeApi {
  const ctx = useContext(BadgeContext);
  const state = useBadges();
  return ctx ?? {
    state, counts: badgeCounts(state), recent: recentBadges(state), progress: (s) => surahBadgeProgress(state, s),
    recordWords, completeSurah, onEarned: onBadgeEarned,
  };
}
