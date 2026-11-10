import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Bookmark, ChevronDown, Loader2, RefreshCw, Settings } from "lucide-react";
import { MushafPage, type WordKey } from "@/components/mushaf/MushafPage";
import { ReciteBar, type BarMode } from "@/components/mushaf/ReciteBar";
import { ReciterSelectModal } from "@/components/ReciterSelectModal";
import { SheikhControls } from "@/components/ReciterPill";
import { AyahActionMenu, type AyahAction } from "@/components/mushaf/AyahActionMenu";
import { GoToModal, type GoToTarget } from "@/components/mushaf/GoToModal";
import { TafsirModal, type AyahInfoTab } from "@/components/TafsirModal";
import { useKeepAwake } from "@/lib/wakeLock";
import { BurgerButton, MushafMenu, type AppTab } from "@/components/mushaf/MushafMenu";
import { GOLD_B } from "@/components/mushaf/MushafOrnaments";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import type { StudyTarget } from "@/components/Dashboard";
import { TOTAL_PAGES, loadMushaf, type Mushaf } from "@/lib/mushafData";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { useRecitation } from "@/lib/useRecitation";
import { loadQuranPhonemes, phonemeRefs, usePhonemeLexicon } from "@/lib/quranAlignment";
import { locateRecitation, locatorIndex } from "@/lib/ayahLocator";
import { useWhisperModel } from "@/lib/whisper";
import { usePagePlayer } from "@/lib/usePagePlayer";
import { getReciter } from "@/lib/reciterManager";
import { recordAttempt, setLastPosition, useProgress, verseStatus } from "@/lib/progressStorage";
import { ayahResults } from "@/lib/practiceResults";
import { accuracyOf, covers, recordingForVerse, saveRecording, useRecordings } from "@/lib/audioStorage";
import { RecitationPlayerBar } from "@/components/RecitationPlayerBar";
import type { KeptAudio } from "@/lib/use-transcribing-recorder";
import { getSettings, updateSettings, useSettings } from "@/lib/settings";
import type { LiveMatch, LiveStatus } from "@/lib/quranMatcher";
import { useI18n } from "@/lib/i18n";
import { VoiceWordFix, type WordFix } from "@/components/VoiceWordFix";
import { SessionReview, type ReviewItem } from "@/components/SessionReview";
import { unifiedMode, useRecitationStore, useSessionStats, useWordColors, wordDone, type RecitedWord, type WordResult } from "@/context/RecitationContext";
import { colorsFor, mergeLive, reachedVerses } from "@/lib/wordColors";
import { finishedSurah, pageReadyToTurn, surahEndIndices, tally } from "@/lib/surahCompletion";
import { hizbOfPage, noteRecentRead, toggleBookmark, useBookmarks } from "@/lib/mushafNav";
import { cn } from "@/lib/utils";
import { MIN_EMPTY_PART_SECONDS, SURAH_END_SILENCE_MS, addToOpen, mainPart, recordingParts, type OpenParts, type RecordingPart } from "@/lib/recordingParts";
import { setMicActive } from "@/lib/recordingActivity";
import { useTajweedWords } from "@/lib/tajweedColors";

function useMushaf() {
  const [state, setState] = useState<{ data: Mushaf | null; error: boolean }>({ data: null, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    loadMushaf().then((data) => alive && setState({ data, error: false })).catch(() => alive && setState({ data: null, error: true }));
    return () => { alive = false; };
  }, [attempt]);
  return { ...state, retry: () => setAttempt((a) => a + 1) };
}

/**
 * Mushaf al-Madina reader, page by page like the printed book (604 pages, 15 lines, original line breaks).
 * Swipe or tap the arrows to turn pages. Recite on the page itself: Recitation colours the words,
 * Memorization hides them until recited correctly. The selected Sheikh can read the page aloud.
 */
export function MushafReader({ surahId, focusAyah, focusMode, mark, jumpId = 0, onPractice, onNavigate, onSettings, onInvite, onSearch }: {
  surahId: number;
  focusAyah?: number | undefined;
  /** Mode to open in (from the passage last recited on the Recite screen). */
  focusMode?: BarMode | undefined;
  /** Words to mark on the page (search result). */
  mark?: readonly string[] | undefined;
  /** Changes on every new jump request (the same verse can be requested again, e.g. from search). */
  jumpId?: number;
  onSearch?: () => void;
  onSurahChange?: (id: number) => void;
  onPractice?: (target: StudyTarget) => void;
  /** Full-screen Mushaf: the app navigation lives in the burger menu. */
  onNavigate?: (tab: AppTab) => void;
  onSettings?: () => void;
  onInvite?: () => void;
}) {
  const { t, language } = useI18n();
  const { data: mushaf, error, retry } = useMushaf();
  const settings = useSettings();
  const model = useWhisperModel();
  const progress = useProgress();
  const recordings = useRecordings();
  const bookmarks = useBookmarks();
  // Back from another tab with the same target → the view continues where it was (RecitationContext).
  const store = useRecitationStore();
  const session = useSessionStats();
  const snap = useRef(store.mushaf && store.mushaf.surahId === surahId && store.mushaf.focusAyah === focusAyah && store.mushaf.jumpId === jumpId ? store.mushaf : null);
  /** Saved colours of every verse ever recited: they stay on every page (RecitationContext, IndexedDB). */
  const colors = useWordColors();
  const [page, setPage] = useState(snap.current?.page ?? 1);
  const [mode, setMode] = useState<BarMode>(snap.current?.mode ?? "RECITATION_MODE");
  const [selected, setSelected] = useState<string | null>(snap.current?.selected ?? null);
  /** Live colours are shown from the microphone start until the recitation is saved to `colors`. */
  const [liveShown, setLiveShown] = useState(false);
  const [marked, setMarked] = useState<Set<WordKey> | null>(() => (mark?.length && !snap.current ? new Set(mark) : null));
  /** A surah whose last word was just reached (message in the bar). */
  const [completed, setCompleted] = useState<number | null>(null);
  const [reciterOpen, setReciterOpen] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  /** Verse menu (listen · translation · tafsir · mark for practice) at the tapped point. */
  const [verseMenu, setVerseMenu] = useState<{ surah: number; ayah: number; at: { x: number; y: number } } | null>(null);
  /** Translation / Tafsir sheet. */
  const [info, setInfo] = useState<{ surah: number; ayah: number; tab: AyahInfoTab } | null>(null);
  const [goToOpen, setGoToOpen] = useState(false);
  /** Start of a practice range marked from the verse menu. */
  const [markedFrom, setMarkedFrom] = useState<{ surah: number; ayah: number } | null>(null);
  // The screen stays on while the Mushaf is open (reading, reciting, listening).
  useKeepAwake(true);
  /** Stage 4: a word marked wrong that the user tapped — offer "Add to my voice profile". */
  const [wordFix, setWordFix] = useState<WordFix | null>(null);
  /** v38: review of the session's mistakes after the stop (and the last one, to open it again). */
  const [review, setReview] = useState<{ items: ReviewItem[]; stats: { correct: number; near: number; wrong: number } } | null>(null);
  const [reviewReady, setReviewReady] = useState<typeof review>(null);
  /** Mistakes and totals of the running session, across automatic page turns. */
  const sessionReview = useRef<{ items: ReviewItem[]; stats: { correct: number; near: number; wrong: number } }>({ items: [], stats: { correct: 0, near: 0, wrong: 0 } });
  /** Verses («s:a») whose saved colours are hidden after «إعادة» until they are recited again (v38). */
  const [cleared, setCleared] = useState<ReadonlySet<string>>(() => new Set());
  /** «أعد الآية» / «أعد التلاوة»: start the microphone once the view has settled. */
  const [retryAt, setRetryAt] = useState<number | null>(null);
  /** Words revealed with the hint button (memorization). */
  const [hints, setHints] = useState<Set<WordKey>>(() => new Set(snap.current?.hints ?? []));
  const hintsRef = useRef(hints);
  hintsRef.current = hints;
  // The page fills exactly the space between the top row and the floating control bar: no scrolling.
  // Measured live (bar height changes with the "my recording" row, safe areas, rotation, keyboard).
  const pageArea = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(0);
  const [textHeight, setTextHeight] = useState<number | undefined>(undefined);
  const fit = useCallback(() => {
    const area = pageArea.current;
    if (!area) return;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const bar = document.querySelector<HTMLElement>("[data-recite-bar]");
    const bottom = bar ? bar.getBoundingClientRect().top - PAGE_GAP_PX : vh - PAGE_GAP_PX;
    const top = area.getBoundingClientRect().top;
    // Everything of the page that is not the 15 lines: running head, frame, page number.
    const frame = area.firstElementChild as HTMLElement | null;
    const text = area.querySelector<HTMLElement>("[data-mushaf-text]");
    const chrome = frame && text ? frame.getBoundingClientRect().height - text.getBoundingClientRect().height : FRAME_PX;
    const next = Math.max(MIN_TEXT_PX, Math.floor(bottom - top - chrome));
    setTextHeight((cur) => (cur !== undefined && Math.abs(cur - next) < 2 ? cur : next));
  }, []);
  useLayoutEffect(() => {
    fit();
    const vv = window.visualViewport;
    window.addEventListener("resize", fit);
    vv?.addEventListener("resize", fit);
    return () => { window.removeEventListener("resize", fit); vv?.removeEventListener("resize", fit); };
  });

  // Jump to the requested surah / verse.
  // Keyed by target (not a "first run" flag): React StrictMode runs effects twice on mount.
  const jumped = useRef(snap.current ? `${surahId}:${focusAyah}:${jumpId}` : "");
  useEffect(() => {
    if (!mushaf) return;
    const key = `${surahId}:${focusAyah}:${jumpId}`;
    if (jumped.current === key) return;
    jumped.current = key;
    setPage(focusAyah ? mushaf.pageOf(surahId, focusAyah) : mushaf.surahStartPage(surahId));
    setSelected(focusAyah ? `${surahId}:${focusAyah}` : null);
    if (focusMode) setMode(focusMode);
    setMarked(mark?.length ? new Set(mark) : null);
  }, [mushaf, surahId, focusAyah, jumpId]); // eslint-disable-line react-hooks/exhaustive-deps

  const verses = useMemo(() => (mushaf ? mushaf.pageVerses(page) : []), [mushaf, page]);
  // v38 «ألوان أحكام التجويد» (Quran.com's tajweed text, per surah, cached offline).
  const tajweed = useTajweedWords(settings.tajweedColors && !!mushaf, verses, (s, a) => mushaf?.words(s, a).length ?? -1);

  // Remember the page ("continue where you left off").
  useEffect(() => {
    if (!verses.length) return;
    const first = verses.find((v) => v.startsOnPage) ?? verses[0]!;
    const timer = setTimeout(() => { void setLastPosition(first.surah, first.ayah, "READING"); void noteRecentRead(first.surah, first.ayah, page); }, 700);
    return () => clearTimeout(timer);
  }, [verses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Badges are earned only by reciting (see completeSurah) — never by keeping a page open.

  /* ---------------- recitation on the page ---------------- */
  const startIdx = useMemo(() => {
    if (!selected) return 0;
    const i = verses.findIndex((v) => `${v.surah}:${v.ayah}` === selected);
    return i < 0 ? 0 : i;
  }, [selected, verses]);
  const practice = useMemo(() => verses.slice(startIdx), [verses, startIdx]);
  const targets = useMemo(() => practice.map((v) => v.words.map((w) => mushaf?.words(v.surah, v.ayah)[w - 1] ?? "").join(" ")), [practice, mushaf]);
  const keys = useMemo(() => practice.flatMap((v) => v.words.map((w) => `${v.surah}:${v.ayah}:${w}`)), [practice]);
  // The matchers work on `targets.join(" ").split(" ")` tokens. A Mushaf word can hold a space (a word
  // with its waqf sign, "رَيْبَ ۛ", or two words printed together), so keys and tokens are mapped
  // explicitly: tokenOfKey[k] = first token of key k, keyOfToken[t] = key owning token t.
  const { tokenOfKey, keyOfToken } = useMemo(() => {
    const tk: number[] = [], kt: number[] = [];
    let t = 0;
    practice.forEach((v) => v.words.forEach((w) => {
      tk.push(t);
      const n = (mushaf?.words(v.surah, v.ayah)[w - 1] ?? "").split(" ").length;
      for (let i = 0; i < n; i++) kt.push(tk.length - 1);
      t += n;
    }));
    return { tokenOfKey: tk, keyOfToken: kt };
  }, [practice, mushaf]);
  const lexicon = usePhonemeLexicon();
  // Canonical Hafs phonemes per token (Zipformer engine), when its data is loaded.
  const refs = useMemo(() => (lexicon && mushaf
    ? practice.flatMap((v) => phonemeRefs(lexicon, v.surah, v.ayah, v.words.map((w) => mushaf.words(v.surah, v.ayah)[w - 1] ?? ""), v.words))
    : null), [lexicon, mushaf, practice]);

  /** Each practised Mushaf word with whether it was completed — the shared engine's input for badges. */
  const wordResults = useCallback((statuses: readonly LiveStatus[]): WordResult[] => {
    if (!mushaf) return [];
    const um = unifiedMode(mode);
    return keys.map((k, i) => {
      const [surah, ayah, word] = k.split(":").map(Number) as [number, number, number];
      return { surah, ayah, word, total: mushaf.words(surah, ayah).length, done: wordDone(statuses[tokenOfKey[i] ?? -1], um, hintsRef.current.has(k)) };
    });
  }, [mushaf, mode, keys, tokenOfKey]);
  const onSessionEnd = useCallback((m: LiveMatch) => {
    let offset = 0, total = 0;
    const groups = new Map<number, { ayat: { number: number; text: string }[]; statuses: LiveStatus[] }>();
    practice.forEach((v, i) => {
      const n = v.words.length;
      const from = tokenOfKey[offset] ?? keyOfToken.length, to = tokenOfKey[offset + n] ?? keyOfToken.length;
      const g = groups.get(v.surah) ?? { ayat: [], statuses: [] };
      g.ayat.push({ number: v.ayah, text: targets[i] ?? "" });
      g.statuses.push(...m.statuses.slice(from, to).map((st, j): LiveStatus => (st === "CORRECT" && hints.has(keys[keyOfToken[from + j] ?? -1] ?? "") ? "WARNING" : st)));
      groups.set(v.surah, g);
      offset += n;
    });
    let range: { surah: number; fromAyah: number; toAyah: number } | null = null;
    for (const [surah, g] of groups) {
      const results = ayahResults(g.ayat, g.statuses, m.done);
      if (results.length) { total += results.length; void recordAttempt({ surahId: surah, mode, results }); }
      if (!range && results.length) range = { surah, fromAyah: Math.min(...results.map((r) => r.ayahId)), toAyah: Math.max(...results.map((r) => r.ayahId)) };
    }
    setSaved(total || null);
    // Word colours of the recited verses → saved for every page and both views (replaces only those verses).
    const recited: RecitedWord[] = keys.map((k, i) => {
      const tk = tokenOfKey[i] ?? -1;
      const st = m.statuses[tk] ?? "PENDING";
      return { key: k, status: st === "CORRECT" && hintsRef.current.has(k) ? "WARNING" : st, heard: m.heard[tk] ?? null };
    });
    store.commitWords(recited, mode, "mushaf", { continues: true });
    const judgedVerses = new Set(recited.filter((r) => r.status !== "PENDING").map((r) => r.key.slice(0, r.key.lastIndexOf(":"))));
    if (judgedVerses.size) setCleared((c) => (c.size ? new Set([...c].filter((v) => !judgedVerses.has(v))) : c));
    // v38: the session's red / orange words for the review after the stop.
    {
      const acc = sessionReview.current;
      keys.forEach((k, i) => {
        const tk = tokenOfKey[i] ?? -1;
        const st = recited[i]?.status;
        if (st !== "ERROR" && st !== "WARNING") return;
        const [s2, a2, w2] = k.split(":").map(Number) as [number, number, number];
        acc.items.push({ key: k, word: mushaf?.words(s2, a2)[w2 - 1] ?? "", heard: m.heard[tk] ?? null, expected: rec.engine === "phonemes" ? refs?.[tk] ?? null : null, status: st });
      });
      const tl = tally(recited.map((r) => r.status));
      acc.stats = { correct: acc.stats.correct + tl.correct, near: acc.stats.near + tl.near, wrong: acc.stats.wrong + tl.wrong };
    }
    if (!pageTurn.current) setLiveShown(false);
    // Running totals of the continuous session (across automatic page turns).
    store.addPart(tally(m.statuses), pageTurn.current);
    store.recordWords(unifiedMode(mode), wordResults(m.statuses));
    const turned = pageTurn.current;
    pageTurn.current = false;
    // v30: one recording per surah. A page turn only collects this page's verses into the open part of
    // their surah (the recording goes on, nothing is cut); the stop saves what is open.
    void range;
    if (turned) collect(m);
    else {
      collect(m); flush("final");
      const acc = sessionReview.current;
      const r = acc.items.length && getSettings().errorDetection ? { items: [...acc.items], stats: acc.stats } : null;
      setReview(r); setReviewReady(r);
    }
  }, [practice, targets, mode, hints, keys, tokenOfKey, keyOfToken, store, wordResults]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------- recordings: one per surah (across pages) ---------------- */
  /** Verses of this page already collected into an open part. */
  const savedVerses = useRef(new Set<string>());
  /** Recited verses per surah not saved yet (collected across page turns). */
  const openParts = useRef<OpenParts>(new Map());
  const judged = (m: LiveMatch) => keys.map((key, i) => ({ key, status: m.statuses[tokenOfKey[i] ?? -1] }));
  const keep = (part: RecordingPart, kept: KeptAudio) => {
    if (!getSettings().saveRecordings) return;
    void saveRecording({
      surah: part.surah, fromAyah: part.fromAyah, toAyah: part.toAyah, ...kept,
      accuracy: part.accuracy ?? undefined, mode: mode === "MEMORIZATION_MODE" ? "memorization" : "reading",
    });
  };
  /** This page's judged verses (not collected yet) go into the open part of their surah. */
  const collect = (m: LiveMatch, only?: (surah: number) => boolean) => {
    const parts = recordingParts(judged(m), savedVerses.current).filter((p) => !only || only(p.surah));
    for (const p of parts) for (const v of p.verses) savedVerses.current.add(v);
    openParts.current = addToOpen(openParts.current, parts);
  };
  /**
   * Saves the open parts as recordings: "cut" while recording (a surah ended, or the reader moved on to the
   * next surah — the microphone goes on), "final" after the stop. `only` picks the surahs to save.
   */
  const flush = (how: "cut" | "final", only?: (surah: number) => boolean) => {
    const parts = [...openParts.current.values()].filter((p) => !only || only(p.surah));
    for (const p of parts) openParts.current.delete(p.surah);
    const take = how === "cut" ? cutRef.current : takeAudioRef.current;
    void take?.().then((kept) => {
      if (!kept) return;
      const part = mainPart(parts);
      if (part) { keep(part, kept); return; }
      // Nothing recognised in this part: keep it under the start verse only when something was said for a while.
      const first = practice[0];
      if (how === "final" && first && kept.seconds >= MIN_EMPTY_PART_SECONDS && !savedAny.current) keep({ surah: first.surah, fromAyah: first.ayah, toAyah: first.ayah, verses: [], words: 0, accuracy: null }, kept);
    });
    if (parts.length) savedAny.current = true;
  };
  const savedAny = useRef(false);

  const takeAudioRef = useRef<(() => Promise<KeptAudio | null>) | null>(null);
  const cutRef = useRef<(() => Promise<KeptAudio | null>) | null>(null);
  const pageTurn = useRef(false);
  const rec = useRecitation(targets, { onSessionEnd, phonemeRefs: refs });
  takeAudioRef.current = rec.takeAudio;
  cutRef.current = rec.cut;
  const { reset } = rec;
  // An automatic page turn keeps the microphone running (see below); any other change starts afresh.
  const autoTurn = useRef(false);
  const viewKey = useRef(`${page}|${mode}|${startIdx}`);
  useEffect(() => {
    const key = `${page}|${mode}|${startIdx}`;
    if (viewKey.current === key) return; // unchanged (first render, StrictMode re-run): keep what was restored
    // Colours are not touched here: they are saved per verse and stay (memorization toggle, verse tap,
    // page turn). Hints belong to the page they were given on; search marks only show on their own page.
    const pageChanged = Number(viewKey.current.split("|")[0]) !== page;
    viewKey.current = key;
    setSaved(null); setWordFix(null);
    if (pageChanged) { setHints(new Set()); savedVerses.current = new Set(); }
    if (autoTurn.current) { autoTurn.current = false; return; }
    reset();
  }, [page, mode, startIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  /**
   * v38 «إعادة»: start again from scratch on this page — the running recitation is dropped (nothing saved),
   * timer and score go back to 0, the page shows no colours (saved colours of its verses are hidden until
   * they are recited again), hints and messages are cleared. The view stays where it is.
   */
  const resetSession = () => {
    player.pause();
    reset();
    setLiveShown(false); setSaved(null); setWordFix(null); setReview(null); setReviewReady(null); setCompleted(null);
    setHints(new Set());
    setCleared(new Set(verses.map((v) => `${v.surah}:${v.ayah}`)));
    sessionReview.current = { items: [], stats: { correct: 0, near: 0, wrong: 0 } };
    openParts.current = new Map(); savedVerses.current = new Set();
    store.startSession(); store.endSession();
  };
  // «أعد الآية» / «أعد التلاوة»: once the view has settled on the verse (its reset ran), the microphone starts.
  useEffect(() => {
    if (retryAt == null || rec.listening) return;
    const id = setTimeout(() => { setRetryAt(null); rec.toggle(); }, 150);
    return () => clearTimeout(id);
  }, [retryAt, page, startIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  // Microphone on: a new session (an automatic page turn keeps the microphone on, so it continues).
  const doneSurahs = useRef(new Set<number>());
  useEffect(() => {
    if (rec.listening) { sessionReview.current = { items: [], stats: { correct: 0, near: 0, wrong: 0 } }; setReview(null); setWordFix(null); setMarked(null); setLiveShown(true); setCompleted(null); doneSurahs.current = new Set(); savedVerses.current = new Set(); openParts.current = new Map(); savedAny.current = false; store.startSession(); }
    else store.endSession();
    setMicActive(rec.listening);
  }, [rec.listening]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setMicActive(false), []);
  // The reader went on from one surah into the next on this page without the end being detected: the
  // earlier surah's part is cut off as soon as words of the next surah are judged.
  useEffect(() => {
    if (!rec.listening) return;
    // The open parts (earlier pages) and this page's verses: a second surah → the earlier one is done.
    const here = recordingParts(judged(rec.match), savedVerses.current);
    const surahs = new Set([...openParts.current.keys(), ...here.map((p) => p.surah)]);
    if (surahs.size < 2) return;
    const last = here.length ? here[here.length - 1]!.surah : Math.max(...surahs);
    collect(rec.match, (s2) => s2 !== last);
    flush("cut", (s2) => s2 !== last);
  }, [rec.listening, rec.match.statuses]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = rec.listening || rec.match.recited > 0;
  const pageKeys = useMemo(() => verses.flatMap((v) => v.words.map((w) => `${v.surah}:${v.ayah}:${w}`)), [verses]);
  const showPast = settings.showPastMistakes, detectErrors = settings.errorDetection;
  const statuses = useMemo(() => {
    const showLive = rec.listening || rec.processing || liveShown;
    // «تظليل الأخطاء الماضية» off: saved red / orange of earlier recitations are not shown.
    const saved = () => {
      const m0 = colorsFor(colors, pageKeys);
      if (!showPast) for (const [k, st] of m0) if (st === "ERROR" || st === "WARNING") m0.delete(k);
      if (cleared.size) for (const k of [...m0.keys()]) if (cleared.has(k.slice(0, k.lastIndexOf(":")))) m0.delete(k); // after «إعادة»
      return m0;
    };
    // «كشف الأخطاء» off: no word is marked red / orange at all.
    const plain = (m0: Map<string, LiveStatus>) => { if (!detectErrors) for (const [k, st] of m0) if (st === "ERROR" || st === "WARNING") m0.delete(k); return m0; };
    if (!showLive) return plain(saved());
    // While reciting: live colours for the verses reached (a new recitation replaces their colours),
    // the saved colours for every other verse of the page (before the start verse, not reached yet).
    // v38: while reciting, mistakes of the verse being recited stay neutral until the verse is finished.
    const live = keys.map((_, i) => rec.liveStatuses[tokenOfKey[i] ?? -1] ?? "PENDING");
    const reached = reachedVerses(keys, live, rec.listening ? keyOfToken[rec.match.cursor] ?? 0 : -1);
    const map = saved();
    for (const [k, st] of mergeLive(colors, keys, live, reached)) map.set(k, st);
    for (const k of keys) if (reached.has(k.slice(0, k.lastIndexOf(":"))) && map.get(k) === "PENDING") map.delete(k);
    return plain(map);
  }, [rec.listening, rec.processing, liveShown, colors, pageKeys, keys, tokenOfKey, keyOfToken, rec.liveStatuses, rec.match.cursor, showPast, detectErrors, cleared]);
  // Remember the view for the next visit of this tab (the colours themselves live in RecitationContext).
  useEffect(() => {
    store.mushaf = { surahId, focusAyah, jumpId, page, mode, selected, hints: [...hints] };
  }, [store, surahId, focusAyah, jumpId, page, mode, selected, hints]);

  /* ---------------- surah completed ---------------- */
  // The reciter reached the last word of a surah → success vibration, soft chime (recording continues).
  const surahEnds = useMemo(() => (mushaf ? surahEndIndices(keys, mushaf.versesCount, (s, a) => mushaf.words(s, a).length) : new Map<number, { start: number; end: number }>()), [keys, mushaf]);
  useEffect(() => {
    if (!rec.listening) return;
    const s = finishedSurah(surahEnds, (i) => rec.match.statuses[tokenOfKey[i] ?? -1], doneSurahs.current);
    if (s == null) return;
    doneSurahs.current.add(s);
    setCompleted(s);
    // v29: the microphone stays on for a moment. The finished surah becomes its own recording now; if the
    // reader goes on into the next surah the recording simply continues, otherwise it stops by itself after
    // 2 s of silence. The completion sound and badges come only once the microphone is off.
    collect(rec.match, (s2) => s2 === s);
    flush("cut", (s2) => s2 === s);
    void store.finishSurah(unifiedMode(mode), s, wordResults(rec.match.statuses));
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => {
      silenceTimer.current = null;
      if (!listeningRef.current) return;
      if (getSettings().autoStopSurahEnd && voicedLastRef.current(SURAH_END_SILENCE_MS / 1000 - 0.2) < 0.3) toggleRef.current();
    }, SURAH_END_SILENCE_MS);
  }, [rec.listening, rec.match.statuses, surahEnds]); // eslint-disable-line react-hooks/exhaustive-deps
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningRef = useRef(rec.listening);
  listeningRef.current = rec.listening;
  const voicedLastRef = useRef(rec.voicedLast);
  voicedLastRef.current = rec.voicedLast;
  const toggleRef = useRef(rec.toggle);
  toggleRef.current = rec.toggle;
  useEffect(() => { if (!rec.listening && silenceTimer.current) { clearTimeout(silenceTimer.current); silenceTimer.current = null; } }, [rec.listening]);
  // The "surah completed" line shows for a moment while the recording goes on.
  useEffect(() => {
    if (completed == null || !rec.listening) return;
    const id = setTimeout(() => setCompleted(null), 5000);
    return () => clearTimeout(id);
  }, [completed, rec.listening]);
  // «الآيات المخفية»: with the setting on, the first word of every verse stays visible as a cue.
  const firstWordCue = settings.hiddenFirstWord;
  const hidden = useMemo(() => (mode === "MEMORIZATION_MODE" ? new Set(keys.filter((k) => !hints.has(k) && !(firstWordCue && k.endsWith(":1")))) : undefined), [mode, keys, hints, firstWordCue]);

  /* ---------------- one-tap hint: reveal exactly one more word, no limit ---------------- */
  const cursorIdx = keyOfToken[rec.match.cursor] ?? keys.length;
  const cursorKey = keys[cursorIdx] ?? null;
  const nextHint = () => {
    let j = cursorIdx;
    while (j < keys.length && (hints.has(keys[j]!) || rec.match.statuses[tokenOfKey[j] ?? -1] === "CORRECT")) j++;
    return keys[j] ?? null;
  };
  const giveHint = () => {
    const k = nextHint();
    if (k) setHints((cur) => new Set(cur).add(k));
  };
  const cursor = rec.listening ? cursorKey : null;

  /* ---------------- audio ---------------- */
  const turn = useCallback((delta: number) => setPage((p) => Math.min(TOTAL_PAGES, Math.max(1, p + delta))), []);

  /* ---------------- automatic page turn ---------------- */
  // While reciting, the last word of the page reached → this page's attempt is saved and the next page
  // slides in; recording and recognition continue without a break (the new page is judged on what is
  // said from now on). After a recitation has ended, the "next page" button stays manual.
  const latestMatch = useRef(rec.match);
  latestMatch.current = rec.match;
  // "Reached" alone is not enough: a single word heard far ahead can make the matcher jump to the
  // page's last word (marking everything before it red). Turn only when the last word was said and
  // most of the page was said — otherwise one stray word would flip page after page.
  const pageComplete = useMemo(() => rec.match.done && pageReadyToTurn(keys.map((_, i) => rec.match.statuses[tokenOfKey[i] ?? -1] ?? "PENDING"), keys.length - 1),
    [rec.match.done, rec.match.statuses, keys, tokenOfKey]);
  // The end of the page is reached → next page (0.7 s). If the matcher reached the end without enough of
  // the page said (e.g. a stray word), wait a little longer, then turn as well: the recording never stops
  // on its own at a page end — only the reader stops it (or the last page / a finished surah).
  useEffect(() => {
    if (!rec.listening || !rec.match.done || page >= TOTAL_PAGES) return;
    const timer = setTimeout(() => {
      pageTurn.current = true;
      onSessionEnd(latestMatch.current);
      autoTurn.current = true;
      rec.rebase(); rec.forgetMistakes();
      setSelected(null);
      turn(1);
    }, pageComplete ? 700 : 4000);
    return () => clearTimeout(timer);
  }, [rec.listening, rec.match.done, pageComplete, page]); // eslint-disable-line react-hooks/exhaustive-deps
  /* ---------------- auto-detect the recited verse anywhere in the Quran ---------------- */
  // Recording started on any page (e.g. page 1) but the reader recites Al-Kahf from memory: as soon as
  // ≥ 5 words are heard and they match one place in the whole Quran with ≥ 85 % similarity (and no other
  // place nearly as well), the Mushaf jumps there, the recitation is judged from that verse on (the
  // microphone stays on) and a small badge says what was recognised. While the reader is on track on the
  // current page nothing is looked up.
  const [detected, setDetected] = useState<{ surah: number; ayah: number } | null>(null);
  const locateAfter = useRef(0);
  const liveRef = useRef({ transcript: rec.transcript, kind: rec.transcriptKind, practice, match: rec.match, page });
  liveRef.current = { transcript: rec.transcript, kind: rec.transcriptKind, practice, match: rec.match, page };
  useEffect(() => { if (rec.listening) locateAfter.current = 0; }, [rec.listening]);
  useEffect(() => {
    if (!rec.listening || !mushaf || !rec.transcript) return;
    const m = rec.match;
    if (m.recited >= 3 && m.accuracy >= 60) return; // on track here
    const timer = setTimeout(() => {
      if (Date.now() < locateAfter.current) return;
      const kind = rec.transcriptKind;
      const source = kind === "phonemes"
        ? () => loadQuranPhonemes().then((l) => l.surahs)
        : async () => Array.from({ length: 114 }, (_, si) => Array.from({ length: mushaf.versesCount(si + 1) }, (_, ai) => mushaf.words(si + 1, ai + 1)));
      void locatorIndex(kind, source).then((ix) => {
        const live = liveRef.current;
        if (live.kind !== kind || (live.match.recited >= 3 && live.match.accuracy >= 60)) return;
        const hit = locateRecitation(ix, live.transcript);
        if (!hit) return;
        const first = live.practice[0];
        const target = mushaf.pageOf(hit.surah, hit.ayah);
        const same = target === live.page && first?.surah === hit.surah && first.ayah === hit.ayah;
        if (same && hit.startRaw === 0) return; // already judged from there
        locateAfter.current = Date.now() + 3000;
        if (!same) {
          autoTurn.current = true; // keep the microphone and the recording through the view change
          setPage(target);
          setSelected(`${hit.surah}:${hit.ayah}`);
          setDetected({ surah: hit.surah, ayah: hit.ayah });
        }
        rec.rebaseBy(hit.startRaw); // e.g. skip the isti'ādha / basmala said before the verse
        rec.forgetMistakes();
      }).catch(() => {});
    }, 450);
    return () => clearTimeout(timer);
  }, [rec.transcript, rec.listening]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!detected) return;
    const id = setTimeout(() => setDetected(null), 4000);
    return () => clearTimeout(id);
  }, [detected]);

  const player = usePagePlayer({
    reciterId: settings.reciterId,
    verses: useMemo(() => verses.map((v) => ({ surah: v.surah, ayah: v.ayah })), [verses]),
    onFollow: useCallback((v: { surah: number; ayah: number }) => { if (mushaf) setPage(mushaf.pageOf(v.surah, v.ayah)); }, [mushaf]),
  });
  const playingKey = player.current ? `${player.current.surah}:${player.current.ayah}` : null;

  /* ---------------- page turning ---------------- */
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "SELECT") return;
      if (e.key === "ArrowLeft") turn(1);
      if (e.key === "ArrowRight") turn(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [page]);

  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const reciter = getReciter(settings.reciterId);
  // The user's own recording for where the recitation starts (selected verse or top of the page).
  const startVerse = practice[0];
  const mine = startVerse ? recordingForVerse(recordings, startVerse.surah, startVerse.ayah) : null;
  const showMine = rec.listening || !!mine;
  const firstSurah = verses[0]?.surah ?? surahId;
  const juz = mushaf?.juzOfPage(page) ?? 1;
  const hizb = mushaf ? hizbOfPage(mushaf, page) : 1;
  const bookmarked = bookmarks.some((b) => b.page === page);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-sm text-emerald-100/80">
        <p>{t("mushafLoadFailed")}</p>
        <button type="button" onClick={retry} className="flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-emerald-950"><RefreshCw className="h-4 w-4" />{t("retry")}</button>
      </div>
    );
  }
  if (!mushaf) return <p className="flex items-center justify-center gap-2 py-24 text-sm text-emerald-100/70"><Loader2 className="h-4 w-4 animate-spin" />{t("loadingSurah")}</p>;

  const surahName = (s: number) => { const m = getSurahMeta(s); return m ? (language === "ar" ? m.nameArabic : m.nameSimple) : String(s); };
  const live = tally(rec.match.statuses);
  const pageHasColours = statuses.size > 0;
  const sessionLine = t("sessionStats").replace("{c}", num(session.correct + live.correct)).replace("{w}", num(session.wrong + live.wrong)).replace("{p}", num(session.pages + 1));
  const status = rec.error ? <span className="text-red-200">{t(rec.error)}</span>
    : model.status === "loading" && rec.useWhisper ? `${t("modelLoading")} · ${num(model.progress)}%`
    : rec.processing ? t("transcribing")
    : completed ? t("surahComplete").replace("{name}", surahName(completed))
    : active && session.pages > 0 ? sessionLine
    : saved ? `${t("attemptSaved")} · ${num(saved)} ${t("verses")}`
    : rec.listening && rec.match.done && page >= TOTAL_PAGES ? t("doneTapStop")
    : rec.listening && pageComplete ? t("pageTurning")
    : active ? `${num(rec.match.accuracy)}% · ${num(rec.match.recited)}/${num(rec.match.total)}`
    : selected ? `${t("startsAt")} ${num(Number(selected.split(":")[1]))}`
    : t(mode === "MEMORIZATION_MODE" ? "pageHintHifz" : "pageHintRecite");

  return (
    // Bottom padding = the floating bar: when everything fits there is nothing to scroll; on a phone in
    // landscape (15 lines can't fit) the page scrolls and its end is never hidden behind the bar.
    <div style={{ paddingBottom: barH + PAGE_GAP_PX }}>
      {/* v29 header bar (like Tarteel): menu · «سورة المطففين | صفحة ٥٨٩ | جزء ٣٠ | حزب ٥٩» with bookmark ·
          search · settings · Sheikh. Tapping the surah / page opens the «اذهب إلى» sheet. */}
      <div className="mb-1 flex items-center gap-1.5" dir="rtl" data-mushaf-header="">
        <BurgerButton onClick={() => setMenuOpen(true)} label={t("menu")} />
        {/* v30 own design: a gold medallion with the surah name (tap → «اذهب إلى»), page · juz · hizb as small
            seals under it; the tools sit together in one capsule. */}
        <button type="button" onClick={() => setGoToOpen(true)} aria-label={t("goTo")} title={t("goTo")} data-mushaf-header-open=""
          className="group relative min-w-0 flex-1 rounded-2xl px-2 py-1.5 text-center"
          style={{ background: `radial-gradient(120% 140% at 50% 0%, ${alpha(GOLD, 0.22)}, transparent 60%), ${alpha("var(--mf-page-deep)", 0.9)}`, boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.55)}, 0 4px 14px -8px rgba(0,0,0,.6)` }}>
          {/* v33: clearly tappable — the surah name with an arrow opens «اذهب إلى» */}
          <span className="flex items-center justify-center gap-1">
            <span className="font-arabic text-[1.05rem] leading-snug" style={{ color: GOLD_B }}>سورة {getSurahMeta(firstSurah)?.nameArabic}</span>
            <ChevronDown className="h-4 w-4 shrink-0 transition group-active:translate-y-0.5" style={{ color: GOLD_LIGHT }} aria-hidden="true" data-mushaf-header-chevron="" />
          </span>
        </button>
        <div className="flex shrink-0 items-center rounded-2xl px-0.5" style={{ background: alpha("var(--mf-page-deep)", 0.9), boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.45)}` }}>
          <button type="button" onClick={() => { const v = verses.find((x) => x.startsOnPage) ?? verses[0]; void toggleBookmark({ page, surah: v?.surah ?? firstSurah, ayah: v?.ayah ?? 1 }); }}
            aria-label={t(bookmarked ? "bookmarkRemove" : "bookmarkAdd")} aria-pressed={bookmarked} data-mushaf-bookmark={bookmarked ? "on" : "off"}
            className="flex h-10 w-8 items-center justify-center text-amber-200">
            <Bookmark className={cn("h-[1.1rem] w-[1.1rem]", bookmarked && "fill-current text-amber-300")} aria-hidden="true" />
          </button>
          {onSettings && (
            <button type="button" onClick={onSettings} aria-label={t("settingsTitle")} data-mushaf-settings="" className="flex h-10 w-8 items-center justify-center text-amber-200">
              <Settings className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
            </button>
          )}
        </div>
        {/* Sheikh: play / pause and reciter, always at the top */}
        <SheikhControls compact reciterId={reciter.id} playing={player.playing} loading={player.loading} failed={player.failed}
          onToggle={() => { if (rec.listening) return; player.toggle(); }} onReciter={() => setReciterOpen(true)} />
      </div>
      {/* page · juz · hizb on their own line, readable */}
      <button type="button" onClick={() => setGoToOpen(true)} className="mb-1 flex w-full items-center justify-center gap-1.5" dir={language === "ar" || language === "ur" ? "rtl" : "ltr"}
        data-mushaf-header-info={`${t("hdrPage")} ${num(page)} | ${t("hdrJuz")} ${num(juz)} | ${t("hdrHizb")} ${num(hizb)}`} aria-label={t("goTo")}>
        {([["hdrPage", page], ["hdrJuz", juz], ["hdrHizb", hizb]] as const).map(([k, v]) => (
          <span key={k} className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs text-emerald-50" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.45)}`, background: "rgba(0,0,0,.25)" }}>
            {t(k)} <b className="font-semibold" style={{ color: GOLD_LIGHT }}>{num(v)}</b>
          </span>
        ))}
      </button>

      {/* «تم التعرف على سورة الكهف - الآية ١» — after an automatic jump to the recited verse */}
      {detected && (
        <div role="status" aria-live="polite" data-auto-detected={`${detected.surah}:${detected.ayah}`}
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-top-2"
          style={{ top: "calc(env(safe-area-inset-top) + 64px)" }}>
          <span className="rounded-full px-4 py-2 text-sm font-semibold text-emerald-950 shadow-xl" style={{ background: GOLD_GRADIENT }}>
            {t("autoDetected").replace("{surah}", surahName(detected.surah)).replace("{ayah}", num(detected.ayah))}
          </span>
        </div>
      )}

      {/* the page — swipe right for the next page (Arabic books open to the left) */}
      <div ref={pageArea} className="touch-pan-y select-none"
        onTouchStart={(e) => { const p = e.touches[0]; if (p) touch.current = { x: p.clientX, y: p.clientY }; }}
        onTouchEnd={(e) => {
          const s = touch.current, p = e.changedTouches[0];
          touch.current = null;
          if (!s || !p) return;
          const dx = p.clientX - s.x, dy = p.clientY - s.y;
          if (Math.abs(dx) > 60 && Math.abs(dy) < 50) turn(dx > 0 ? 1 : -1);
        }}>
        <div key={page} className="animate-in fade-in duration-300">
          <MushafPage mushaf={mushaf} page={page} maxTextHeight={textHeight} tajweed={settings.tajweedColors ? tajweed : undefined}
            flow={settings.mushafStyle === "clean" ? { fontSize: settings.quranFontSize } : undefined} statuses={statuses} hidden={hidden} hinted={hints} cursor={cursor} marked={marked ?? undefined}
            highlight={playingKey ?? (rec.listening ? null : selected)}
            verseStatus={(s, a) => verseStatus(progress, s, a)}
            recorded={(s, a) => recordings.some((r) => covers(r, s, a))}
            onWordTap={rec.listening ? undefined : (k) => {
              const i = keys.indexOf(k);
              const t = i >= 0 ? tokenOfKey[i] ?? -1 : -1;
              const heard = (t >= 0 ? rec.match.heard[t] : null) ?? colors.get(k)?.heard ?? null;
              const [s, a, w] = k.split(":").map(Number);
              const word = mushaf.words(s!, a!)[w! - 1] ?? "";
              const phonemes = rec.engine === "phonemes" ? refs?.[t] ?? undefined : undefined;
              const st = statuses.get(k);
              setWordFix(word ? { id: k, word, heard: heard ?? null, surah: s, ayah: a, phonemes, status: st === "WARNING" ? "WARNING" : "ERROR" } : null);
            }}
            onVerseTap={(s, a, at) => { if (rec.listening) return; setSelected(`${s}:${a}`); setVerseMenu({ surah: s, ayah: a, at }); }} />
        </div>
      </div>

      <ReciteBar docked mode={mode} onMode={(m) => { setMode(m); }} listening={rec.listening} busy={rec.processing}
        hint={mode === "MEMORIZATION_MODE" ? { onClick: giveHint, used: hints.size, disabled: !nextHint() } : undefined}
        onMic={() => { player.pause(); rec.toggle(); }} getLevel={rec.getLevel} status={rec.paused ? t("recitePausedStatus") : status}
        paused={rec.paused} onPause={rec.canPause ? () => { if (rec.paused) rec.resume(); else { rec.pause(); } } : undefined}
        onHeight={setBarH}
        onReset={rec.listening || liveShown || rec.match.recited > 0 || saved != null || reviewReady != null || pageHasColours ? resetSession : undefined}
        onReview={!rec.listening && !review && reviewReady ? () => setReview(reviewReady) : undefined} reviewCount={reviewReady?.items.length ?? 0}
        extra={showMine || wordFix ? (
          <div className="space-y-1.5">
            {wordFix && <VoiceWordFix fix={wordFix} onClose={() => setWordFix(null)} />}
            {showMine && (
              <RecitationPlayerBar compact showRecord={false} recording={rec.listening} elapsed={rec.elapsed} onRecord={rec.toggle}
                saved={mine} canKeep={rec.useWhisper} />
            )}
          </div>
        ) : undefined}
        nextPage={rec.match.done && !rec.listening && page < TOTAL_PAGES ? () => { setSelected(null); turn(1); } : undefined} />

      {review && !rec.listening && (
        <SessionReview items={review.items} stats={review.stats} onClose={() => setReview(null)}
          onRetryVerse={(s2, a2) => { setReview(null); setPage(mushaf.pageOf(s2, a2)); setSelected(`${s2}:${a2}`); setRetryAt(Date.now()); }}
          onRetryAll={() => {
            const first = review.items[0]?.key.split(":").map(Number);
            setReview(null); resetSession();
            if (first) { setPage(mushaf.pageOf(first[0]!, first[1]!)); }
            setRetryAt(Date.now());
          }}
          onDetails={(it) => {
            setReview(null);
            const [s2, a2] = it.key.split(":").map(Number);
            setWordFix({ id: it.key, word: it.word, heard: it.heard, surah: s2, ayah: a2, phonemes: it.expected ?? undefined, status: it.status });
          }} />
      )}
      <MushafMenu open={menuOpen} onClose={() => setMenuOpen(false)} page={page} surah={firstSurah} juz={juz}
        onPage={(p) => { setSelected(null); setPage(Math.min(TOTAL_PAGES, Math.max(1, p))); }}
        onSurah={(s2) => { setPage(mushaf.surahStartPage(s2)); setSelected(`${s2}:1`); }}
        onJuz={(j) => { setSelected(null); setPage(mushaf.juzStartPage(j)); }}
        onNavigate={(tab) => onNavigate?.(tab)} onSettings={() => onSettings?.()} onInvite={() => onInvite?.()} onSearch={onSearch} onGoTo={() => setGoToOpen(true)} />

      {verseMenu && (
        <AyahActionMenu surah={verseMenu.surah} ayah={verseMenu.ayah} at={verseMenu.at}
          markedFrom={markedFrom && markedFrom.surah === verseMenu.surah ? markedFrom.ayah : null}
          onClose={() => setVerseMenu(null)}
          onAction={(action: AyahAction) => {
            const { surah: s2, ayah: a2 } = verseMenu;
            setVerseMenu(null);
            if (action === "listen") player.playFrom({ surah: s2, ayah: a2 });
            else if (action === "translation" || action === "tafsir") setInfo({ surah: s2, ayah: a2, tab: action });
            else if (action === "mark") { setMarkedFrom({ surah: s2, ayah: a2 }); setSelected(`${s2}:${a2}`); }
            else if (action === "practiceRange" && markedFrom) { onPractice?.({ surahId: s2, fromAyah: markedFrom.ayah, toAyah: a2, mode }); setMarkedFrom(null); }
          }} />
      )}
      <TafsirModal open={!!info} surah={info?.surah ?? 1} ayah={info?.ayah ?? 1} tab={info?.tab ?? "translation"}
        onClose={() => setInfo(null)} onAyah={(a2) => setInfo((cur) => (cur ? { ...cur, ayah: a2 } : cur))} />
      <GoToModal open={goToOpen} page={page} surah={firstSurah} mushaf={mushaf} onClose={() => setGoToOpen(false)}
        onGo={(g: GoToTarget) => {
          if ("page" in g) { setSelected(null); setPage(g.page); }
          else { setPage(mushaf.pageOf(g.surah, g.ayah)); setSelected(`${g.surah}:${g.ayah}`); }
        }} />

      <ReciterSelectModal open={reciterOpen} onOpenChange={setReciterOpen} selectedId={settings.reciterId} surah={firstSurah}
        onSelect={(id) => { void updateSettings({ reciterId: id }); }} />
    </div>
  );
}

/** Space kept between the page and the floating control bar. */
const PAGE_GAP_PX = 6;
/** Fallback for the page's running head, frame and page number before the first measurement. */
const FRAME_PX = 78;
/** Below this the lines would be unreadable; the font size also has its own minimum. */
const MIN_TEXT_PX = 180;
const chip = "rounded-full border border-amber-300/50 bg-black/25 px-3 py-1 text-amber-100 hover:bg-black/40";

export default MushafReader;
