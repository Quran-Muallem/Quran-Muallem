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
 *  - the word colours of every verse ever recited (IndexedDB, `src/lib/wordColors.ts`): they stay on
 *    every page and survive page turns, tab switches, the memorization toggle, verse taps and restarts;
 *    a verse's colours are replaced only when that verse is recited again;
 *  - the passage recited last (`activeRange`), so the other view opens exactly there.
 *
 * The snapshots are plain mutable fields (writing them never re-renders the app); the session, the
 * word colours and the active range are signals that components subscribe to.
 */
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { createSignal, idb } from "@/lib/storage";
import { applyRecitation, extendRange, parseColors, rangeOf, serializeColors, type ActiveRange, type RecitedWord, type WordColorMap } from "@/lib/wordColors";
import type { LiveStatus } from "@/lib/quranMatcher";
import { completeSurah, recordWords, type BadgeEarned, type RecitationMode, type WordResult } from "@/lib/badges";
import { celebrateSurah } from "@/lib/surahCompletion";
export { wordDone } from "@/lib/surahCompletion";

export type { RecitationMode, WordResult } from "@/lib/badges";
export type { ActiveRange, RecitedWord, WordColorMap } from "@/lib/wordColors";

const COLORS_KEY = "recitation.wordColors.v1";
const RANGE_KEY = "recitation.activeRange.v1";

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
  /** The jump request the view was opened for (search can request the same verse again). */
  jumpId: number;
  page: number;
  mode: "RECITATION_MODE" | "MEMORIZATION_MODE";
  selected: string | null;
  hints: string[];
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
  /** Verses recited in this session (first surah), across automatic page turns. */
  range: { surah: number; from: number; to: number } | null;
};

const EMPTY_SESSION: SessionStats = { active: false, correct: 0, near: 0, wrong: 0, pages: 0, surahsDone: [], range: null };

export type RecitationStore = ReturnType<typeof createRecitationStore>;

export function createRecitationStore({ persist = true }: { persist?: boolean } = {}) {
  const session = createSignal<SessionStats>(EMPTY_SESSION);
  const colors = createSignal<WordColorMap>(new Map());
  const activeRange = createSignal<ActiveRange | null>(null);
  // Load the saved colours once; a recitation that ends before loading finishes is merged on top.
  let loaded: Promise<void> = Promise.resolve();
  let pending: RecitedWord[][] = [];
  let ready = !persist;
  let writing: Promise<void> = Promise.resolve();
  const save = () => {
    if (!persist) return;
    const data = serializeColors(colors.get()), range = activeRange.get();
    writing = writing.then(() => idb.set(COLORS_KEY, data)).then(() => idb.set(RANGE_KEY, range)).catch(() => {});
  };
  if (persist && typeof window !== "undefined") {
    loaded = Promise.all([idb.get<unknown>(COLORS_KEY), idb.get<ActiveRange | null>(RANGE_KEY)]).then(([c, r]) => {
      let map: WordColorMap = parseColors(c);
      for (const words of pending) map = applyRecitation(map, words);
      colors.set(map);
      if (!activeRange.get() && r && typeof r.surah === "number") activeRange.set(r);
      if (pending.length) save();
    }).catch(() => {}).finally(() => { ready = true; pending = []; });
  }
  const store = {
    mushaf: null as MushafSnapshot | null,
    practice: null as PracticeSnapshot | null,
    session,
    /** Word colours of every recited verse ("surah:ayah:word"). */
    colors,
    /** The passage recited last, in either view (null: none yet). */
    activeRange,
    /** Resolves once the saved colours are loaded (tests, first render). */
    whenLoaded: () => loaded,
    /**
     * A recitation (or one page of it) ended: the recited verses get their new colours (verses not
     * reached keep theirs) and become the active range for both views. `continues`: a part of the
     * Mushaf's running session (startSession → page turns → stop), whose range keeps growing.
     */
    commitWords(words: readonly RecitedWord[], mode: ActiveRange["mode"], view: ActiveRange["view"], { continues = false }: { continues?: boolean } = {}) {
      const list = [...words];
      if (!ready) pending.push(list);
      colors.set(applyRecitation(colors.get(), list));
      const part = rangeOf(list);
      if (part) {
        const s = session.get();
        // The Mushaf's multi-page session grows its range; a Recite passage is a range of its own.
        const range = continues ? extendRange(s.range, part) : part;
        session.set({ ...s, range });
        activeRange.set({ ...range, mode, view, at: Date.now() });
      }
      save();
    },
    /** Forget every colour (tests; "delete all data" removes the database itself). */
    clearColors() { colors.set(new Map()); activeRange.set(null); save(); },
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

/** Word colours of every recited verse (re-renders when a recitation is saved). */
export function useWordColors(): WordColorMap {
  const store = useRecitationStore();
  return useSyncExternalStore(store.colors.subscribe, store.colors.get, store.colors.get);
}

/** The passage recited last in either view. */
export function useActiveRange(): ActiveRange | null {
  const store = useRecitationStore();
  return useSyncExternalStore(store.activeRange.subscribe, store.activeRange.get, store.activeRange.get);
}
