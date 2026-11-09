import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2, Milestone, RefreshCw } from "lucide-react";
import { MushafPage, type WordKey } from "@/components/mushaf/MushafPage";
import { ReciteBar, type BarMode } from "@/components/mushaf/ReciteBar";
import { ReciterSelectModal } from "@/components/ReciterSelectModal";
import { SheikhControls } from "@/components/ReciterPill";
import { AyahActionMenu, type AyahAction } from "@/components/mushaf/AyahActionMenu";
import { GoToModal, type GoToTarget } from "@/components/mushaf/GoToModal";
import { TafsirModal, type AyahInfoTab } from "@/components/TafsirModal";
import { useKeepAwake } from "@/lib/wakeLock";
import { BurgerButton, MushafMenu, SearchButton, type AppTab } from "@/components/mushaf/MushafMenu";
import { GOLD_B } from "@/components/mushaf/MushafOrnaments";
import { GOLD_LIGHT, alpha } from "@/components/ornaments";
import type { StudyTarget } from "@/components/Dashboard";
import { TOTAL_PAGES, loadMushaf, type Mushaf } from "@/lib/mushafData";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { useRecitation } from "@/lib/useRecitation";
import { phonemeRefs, usePhonemeLexicon } from "@/lib/quranAlignment";
import { useWhisperModel } from "@/lib/whisper";
import { usePagePlayer } from "@/lib/usePagePlayer";
import { getReciter } from "@/lib/reciterManager";
import { recordAttempt, setLastPosition, useProgress, verseStatus } from "@/lib/progressStorage";
import { ayahResults } from "@/lib/practiceResults";
import { accuracyOf, covers, recordingForVerse, saveRecording, useRecordings } from "@/lib/audioStorage";
import { RecitationPlayerBar } from "@/components/RecitationPlayerBar";
import type { KeptAudio } from "@/lib/use-transcribing-recorder";
import { updateSettings, useSettings } from "@/lib/settings";
import type { LiveMatch, LiveStatus } from "@/lib/quranMatcher";
import { useI18n } from "@/lib/i18n";
import { VoiceWordFix, type WordFix } from "@/components/VoiceWordFix";
import { unifiedMode, useRecitationStore, useSessionStats, useWordColors, wordDone, type RecitedWord, type WordResult } from "@/context/RecitationContext";
import { colorsFor, mergeLive, reachedVerses } from "@/lib/wordColors";
import { finishedSurah, pageReadyToTurn, surahEndIndices, tally } from "@/lib/surahCompletion";

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

  // Remember the page ("continue where you left off").
  useEffect(() => {
    if (!verses.length) return;
    const first = verses.find((v) => v.startsOnPage) ?? verses[0]!;
    const timer = setTimeout(() => void setLastPosition(first.surah, first.ayah, "READING"), 700);
    return () => clearTimeout(timer);
  }, [verses]);

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
    if (!pageTurn.current) setLiveShown(false);
    // Running totals of the continuous session (across automatic page turns).
    store.addPart(tally(m.statuses), pageTurn.current);
    store.recordWords(unifiedMode(mode), wordResults(m.statuses));
    pageTurn.current = false;
    // Keep the recording on the device for the verses actually recited (or the start verse).
    const first = practice[0];
    const where = range ?? (first ? { surah: first.surah, fromAyah: first.ayah, toAyah: first.ayah } : null);
    if (where) void takeAudioRef.current?.().then((kept) => { if (kept) void saveRecording({ ...where, ...kept, accuracy: accuracyOf(tally(m.statuses)) ?? undefined, mode: mode === "MEMORIZATION_MODE" ? "memorization" : "reading" }); });
  }, [practice, targets, mode, hints, keys, tokenOfKey, keyOfToken, store, wordResults]);

  const takeAudioRef = useRef<(() => Promise<KeptAudio | null>) | null>(null);
  const pageTurn = useRef(false);
  const rec = useRecitation(targets, { onSessionEnd, phonemeRefs: refs });
  takeAudioRef.current = rec.takeAudio;
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
    if (pageChanged) setHints(new Set());
    if (autoTurn.current) { autoTurn.current = false; return; }
    reset();
  }, [page, mode, startIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  // Microphone on: a new session (an automatic page turn keeps the microphone on, so it continues).
  const doneSurahs = useRef(new Set<number>());
  useEffect(() => {
    if (rec.listening) { setWordFix(null); setMarked(null); setLiveShown(true); setCompleted(null); doneSurahs.current = new Set(); store.startSession(); }
    else store.endSession();
  }, [rec.listening]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = rec.listening || rec.match.recited > 0;
  const pageKeys = useMemo(() => verses.flatMap((v) => v.words.map((w) => `${v.surah}:${v.ayah}:${w}`)), [verses]);
  const statuses = useMemo(() => {
    const showLive = rec.listening || rec.processing || liveShown;
    if (!showLive) return colorsFor(colors, pageKeys);
    // While reciting: live colours for the verses reached (a new recitation replaces their colours),
    // the saved colours for every other verse of the page (before the start verse, not reached yet).
    const live = keys.map((_, i) => rec.match.statuses[tokenOfKey[i] ?? -1] ?? "PENDING");
    const reached = reachedVerses(keys, live, rec.listening ? keyOfToken[rec.match.cursor] ?? 0 : -1);
    const map = colorsFor(colors, pageKeys);
    for (const [k, st] of mergeLive(colors, keys, live, reached)) map.set(k, st);
    for (const k of keys) if (reached.has(k.slice(0, k.lastIndexOf(":"))) && map.get(k) === "PENDING") map.delete(k);
    return map;
  }, [rec.listening, rec.processing, liveShown, colors, pageKeys, keys, tokenOfKey, keyOfToken, rec.match.statuses, rec.match.cursor]);
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
    // v26: the microphone stays on — the recording goes on into the next surah / page until the reader
    // stops it (before, every finished surah switched it off, e.g. after each short surah of Juz' 'Amma).
    // Same engine call as the Recite screen: vibration + chime, then silver/gold if the whole surah is done.
    void store.finishSurah(unifiedMode(mode), s, wordResults(rec.match.statuses));
  }, [rec.listening, rec.match.statuses, surahEnds]); // eslint-disable-line react-hooks/exhaustive-deps
  // The "surah completed" line shows for a moment while the recording goes on.
  useEffect(() => {
    if (completed == null || !rec.listening) return;
    const id = setTimeout(() => setCompleted(null), 5000);
    return () => clearTimeout(id);
  }, [completed, rec.listening]);
  const hidden = useMemo(() => (mode === "MEMORIZATION_MODE" ? new Set(keys.filter((k) => !hints.has(k))) : undefined), [mode, keys, hints]);

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
      {/* slim top row: burger menu (top right) · where am I */}
      <div className="mb-1 flex items-center gap-1.5" dir="rtl">
        <BurgerButton onClick={() => setMenuOpen(true)} label={t("menu")} />
        <button type="button" onClick={() => setGoToOpen(true)} aria-label={t("goTo")} title={t("goTo")}
          className="min-w-0 flex-1 truncate rounded-xl px-1 py-1 text-center font-arabic text-sm" style={{ color: GOLD_B }}>
          سُورَةُ {getSurahMeta(firstSurah)?.nameArabic} · {num(page)}
        </button>
        <button type="button" onClick={() => setGoToOpen(true)} aria-label={t("goTo")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-amber-200"
          style={{ background: alpha("var(--mf-page-deep)", 0.85), boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}>
          <Milestone className="h-5 w-5" aria-hidden="true" />
        </button>
        {onSearch && <SearchButton onClick={onSearch} label={t("searchTitle")} />}
        {/* Sheikh: play / pause and reciter, always at the top */}
        <SheikhControls compact reciterId={reciter.id} playing={player.playing} loading={player.loading} failed={player.failed}
          onToggle={() => { if (rec.listening) return; player.toggle(); }} onReciter={() => setReciterOpen(true)} />
      </div>

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
          <MushafPage mushaf={mushaf} page={page} maxTextHeight={textHeight} statuses={statuses} hidden={hidden} hinted={hints} cursor={cursor} marked={marked ?? undefined}
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

      <MushafMenu open={menuOpen} onClose={() => setMenuOpen(false)} page={page} surah={firstSurah} juz={juz}
        onPage={(p) => { setSelected(null); setPage(Math.min(TOTAL_PAGES, Math.max(1, p))); }}
        onSurah={(s2) => { setPage(mushaf.surahStartPage(s2)); setSelected(`${s2}:1`); }}
        onJuz={(j) => { setSelected(null); setPage(mushaf.juzStartPage(j)); }}
        onNavigate={(tab) => onNavigate?.(tab)} onSettings={() => onSettings?.()} onInvite={() => onInvite?.()} onSearch={onSearch} />

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
      <GoToModal open={goToOpen} page={page} surah={firstSurah} onClose={() => setGoToOpen(false)}
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
