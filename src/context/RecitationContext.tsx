/**
 * Global recitation state, kept above the tabs so nothing is lost when switching between the Mushaf
 * and the Recite screen (each tab's view is re-mounted on every switch):
 *
 *  - the Mushaf view: page, mode, start verse, word states (colours) and hints of the last recitation;
 *  - the Recite screen: the transcript of the last recitation of a passage (its word states are
 *    re-derived from it) and its hints;
 *  - the running session: correct / almost / wrong words and pages over a continuous multi-page
 *    recitation (automatic page turns keep adding to it) and the surahs completed in it.
 *
 * The snapshots are plain mutable fields (writing them never re-renders the app); the session is a
 * signal that components subscribe to.
 */
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { createSignal } from "@/lib/storage";
import type { LiveStatus } from "@/lib/quranMatcher";
import { completeSurah, recordWords, type BadgeEarned, type RecitationMode, type WordResult } from "@/lib/badges";
import { celebrateSurah } from "@/lib/surahCompletion";
export { wordDone } from "@/lib/surahCompletion";

export type { RecitationMode, WordResult } from "@/lib/badges";

/**
 * The two modes, the same in both views: READING = "Recitation" in the Mushaf and "Reading along"
 * on the Recite screen (text visible); MEMORIZATION = "Memorization" / "From memory" (text hidden).
 * The views keep their internal names (RECITATION_MODE / MEMORIZATION_MODE); this maps them.
 */
export const unifiedMode = (m: "RECITATION_MODE" | "MEMORIZATION_MODE"): RecitationMode => (m === "MEMORIZATION_MODE" ? "MEMORIZATION" : "READING");


export type MushafSnapshot = {
  /** The surah / verse the reader was opened for — a new target means a fresh view. */
  surahId: number;
  focusAyah: number | undefined;
  page: number;
  mode: "RECITATION_MODE" | "MEMORIZATION_MODE";
  selected: string | null;
  hints: string[];
  /** Word key → status of the last recitation on `page` (null: nothing recited there). */
  statuses: [string, LiveStatus][] | null;
};

export type PracticeSnapshot = {
  /** surah:from-to:mode */
  key: string;
  transcript: string;
  kind: "phonemes" | "text";
  hints: number[];
};

export type SessionStats = {
  active: boolean;
  correct: number;
  near: number;
  wrong: number;
  /** Pages finished by an automatic page turn in this session. */
  pages: number;
  surahsDone: number[];
};

const EMPTY_SESSION: SessionStats = { active: false, correct: 0, near: 0, wrong: 0, pages: 0, surahsDone: [] };

export type RecitationStore = ReturnType<typeof createRecitationStore>;

export function createRecitationStore() {
  const session = createSignal<SessionStats>(EMPTY_SESSION);
  const store = {
    mushaf: null as MushafSnapshot | null,
    practice: null as PracticeSnapshot | null,
    session,
    /** A new recitation starts (microphone on, not an automatic page turn). */
    startSession() { session.set({ ...EMPTY_SESSION, active: true }); },
    /** One page (or the final part) of the running session was judged. */
    addPart(t: { correct: number; near: number; wrong: number }, pageTurn: boolean) {
      const s = session.get();
      session.set({ ...s, correct: s.correct + t.correct, near: s.near + t.near, wrong: s.wrong + t.wrong, pages: s.pages + (pageTurn ? 1 : 0) });
    },
    surahDone(surah: number) {
      const s = session.get();
      if (!s.surahsDone.includes(surah)) session.set({ ...s, surahsDone: [...s.surahsDone, surah] });
    },
    endSession() { const s = session.get(); if (s.active) session.set({ ...s, active: false }); },
    /** End of a session part (stop or page turn): the completed words count towards the badges. */
    recordWords(mode: RecitationMode, words: readonly WordResult[]) { void recordWords(mode, words); },
    /**
     * The last word of a surah was completed (strict end check done by the view). Both views call
     * this: success vibration + chime, then the silver (READING) or gold (MEMORIZATION) badge if
     * every word of the surah has now been completed in that mode.
     */
    finishSurah(mode: RecitationMode, surah: number, words: readonly WordResult[]): Promise<BadgeEarned | null> {
      store.surahDone(surah);
      celebrateSurah();
      return completeSurah(mode, surah, words);
    },
  };
  return store;
}

/** One store for the whole app (also used outside React, e.g. by tests). */
export const recitationStore = createRecitationStore();
const RecitationContext = createContext<RecitationStore>(recitationStore);

export function RecitationProvider({ children, store }: { children: ReactNode; store?: RecitationStore }) {
  const value = useMemo(() => store ?? recitationStore, [store]);
  return <RecitationContext.Provider value={value}>{children}</RecitationContext.Provider>;
}

export const useRecitationStore = () => useContext(RecitationContext);

export function useSessionStats(): SessionStats {
  const store = useRecitationStore();
  return useSyncExternalStore(store.session.subscribe, store.session.get, store.session.get);
}
