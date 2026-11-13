/**
 * Salat Mode (وضع الصلاة, v42) — a silent, respectful companion during prayer (e.g. Qiyām al-Layl).
 *
 * Before the prayer: the Sheikh whose voice prompts (with a voice test), the silence delay (2–6 s), the
 * prompt length (a few words / the whole verse) and the prompt volume. During the prayer: a pitch-black
 * screen kept awake, one dim status line, the rakʿah number and «إنهاء الصلاة».
 *
 * Logic: SalatPrayerTracker (src/lib/SalatPrayerTracker.ts). Recognition: the same on-device engine as the
 * Mushaf (useRecitation, Zipformer phonemes or Whisper text), nothing is recorded or kept. The recited
 * surah is located anywhere in the Quran (ayahLocator) after al-Fātiḥah. Prompts play the chosen Sheikh's
 * verse audio cut to the words (Quran.com word timings; offline: the verse file, cut proportionally),
 * faded in softly; recognition pauses while a prompt plays so the prompt is not taken for the reader.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Play, Square, Volume2, X } from "lucide-react";
import { useI18n, type CopyKey } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useKeepAwake } from "@/lib/wakeLock";
import { useRecitation } from "@/lib/useRecitation";
import { loadQuranPhonemes, phonemeRefs, usePhonemeLexicon } from "@/lib/quranAlignment";
import { locateRecitation, locatorIndex, type LocatorKind } from "@/lib/ayahLocator";
import { loadMushaf, type Mushaf } from "@/lib/mushafData";
import { RECITERS, getAyahAudioUrl, getReciter } from "@/lib/reciterManager";
import { verseTimings, stopSheikhAudio, stopWordAudio } from "@/lib/audioPlayback";
import { getSurahMeta } from "@/lib/quranService";
import {
  DEFAULT_SALAT_CONFIG, SILENCE_RANGE_MS, SalatPrayerTracker, promptSpan, salatVerse, trailingErrors,
  type PromptMode, type SalatEvent, type SalatState, type SalatVerse,
} from "@/lib/SalatPrayerTracker";

/** Sheikhs with verse audio and word timings (prompts of a few words need the timings). */
export const SALAT_RECITERS = RECITERS.filter((r) => r.quranComId != null);
const STORE_KEY = "hifz.salat.v1";
type SalatPrefs = { reciterId: string; silenceMs: number; promptMode: PromptMode; volume: number };

function loadPrefs(globalReciter: string): SalatPrefs {
  const fallback: SalatPrefs = {
    reciterId: SALAT_RECITERS.some((r) => r.id === globalReciter) ? globalReciter : "alafasy",
    silenceMs: DEFAULT_SALAT_CONFIG.silenceMs, promptMode: DEFAULT_SALAT_CONFIG.promptMode, volume: 0.45,
  };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null") as Partial<SalatPrefs> | null;
    if (!raw) return fallback;
    return {
      reciterId: SALAT_RECITERS.some((r) => r.id === raw.reciterId) ? raw.reciterId! : fallback.reciterId,
      silenceMs: Math.min(SILENCE_RANGE_MS[1], Math.max(SILENCE_RANGE_MS[0], Number(raw.silenceMs) || fallback.silenceMs)),
      promptMode: raw.promptMode === "ayah" ? "ayah" : "words",
      volume: Math.min(1, Math.max(0.05, Number(raw.volume) || fallback.volume)),
    };
  } catch { return fallback; }
}
const savePrefs = (p: SalatPrefs) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch { /* private mode */ } };

/* ───────────── soft prompt player ───────────── */

let promptEl: HTMLAudioElement | null = null;
let promptTimers: ReturnType<typeof setTimeout>[] = [];
function stopPrompt() {
  promptTimers.forEach(clearTimeout); promptTimers = [];
  promptEl?.pause();
}

/**
 * Plays words `fromWord`–`toWord` of a verse in the Sheikh's voice, fading in to `volume`. Resolves when it
 * has finished (or failed). Word timings from Quran.com; without them (offline) the verse file is cut in
 * proportion to the word count.
 */
async function playPrompt(o: { reciterId: string; surah: number; ayah: number; fromWord: number; toWord: number; words: number; volume: number }): Promise<void> {
  stopPrompt(); stopWordAudio(); stopSheikhAudio();
  const reciter = getReciter(o.reciterId);
  let url: string | null = null, fromMs = 0, toMs: number | null = null;
  const timed = reciter.quranComId != null ? await verseTimings(reciter.quranComId, o.surah, o.ayah, true) : null;
  if (timed) {
    const seg = (w: number) => timed.segments.find(([pos]) => pos === w) ?? (timed.segments[0]?.[0] === 0 ? timed.segments.find(([pos]) => pos === w - 1) : undefined);
    const a = seg(o.fromWord), b = seg(o.toWord);
    if (a) { url = timed.url; fromMs = a[1]; toMs = b ? b[2] : null; }
  }
  const proportional = !url;
  if (!url) url = await getAyahAudioUrl(o.reciterId, o.surah, o.ayah);
  promptEl ??= new Audio();
  const el = promptEl;
  el.src = url;
  el.preload = "auto";
  el.volume = 0;
  await new Promise<void>((resolve, reject) => {
    if (el.readyState >= 1) return resolve();
    const ok = () => { off(); resolve(); }, bad = () => { off(); reject(new Error("audio")); };
    const off = () => { el.removeEventListener("loadedmetadata", ok); el.removeEventListener("error", bad); };
    el.addEventListener("loadedmetadata", ok); el.addEventListener("error", bad); el.load();
  });
  if (proportional && Number.isFinite(el.duration) && el.duration > 0 && o.words > 0) {
    const per = (el.duration * 1000) / o.words;
    fromMs = Math.max(0, (o.fromWord - 1) * per - 120);
    toMs = o.toWord >= o.words ? null : o.toWord * per + 150;
  }
  el.currentTime = fromMs / 1000;
  (window as unknown as { __salatPrompt?: unknown }).__salatPrompt = { url, fromMs, toMs, words: [o.surah, o.ayah, o.fromWord, o.toWord] };
  await el.play();
  // Fade in over 600 ms (Android / desktop; iOS keeps its own volume).
  const steps = 12;
  for (let i = 1; i <= steps; i++) promptTimers.push(setTimeout(() => { el.volume = Math.min(1, (o.volume * i) / steps); }, (600 * i) / steps));
  await new Promise<void>((resolve) => {
    const done = () => { el.removeEventListener("ended", done); el.removeEventListener("pause", done); resolve(); };
    el.addEventListener("ended", done); el.addEventListener("pause", done);
    if (toMs != null) {
      const len = Math.max(300, toMs - fromMs + 60);
      // Fade out over the last 250 ms, then stop.
      promptTimers.push(setTimeout(() => { const v = el.volume; for (let i = 1; i <= 5; i++) promptTimers.push(setTimeout(() => { el.volume = Math.max(0, v * (1 - i / 5)); }, 50 * i)); }, Math.max(0, len - 250)));
      promptTimers.push(setTimeout(() => el.pause(), len));
    }
  });
}

/* ───────────── view ───────────── */

const STATUS: Record<SalatState, CopyKey> = {
  IDLE: "salatReady", RECITING_FATIHA: "salatWaitFatiha", ACTIVE_SURAH_TRACKING: "salatTracking", IN_RUKU_OR_SUJUD: "salatRuku",
};
const WINDOW = 20;

export function SalatModeView({ onClose }: { onClose: () => void }) {
  const { t, language } = useI18n();
  const settings = useSettings();
  const [prefs, setPrefsState] = useState<SalatPrefs>(() => loadPrefs(settings.reciterId));
  const setPrefs = (p: Partial<SalatPrefs>) => setPrefsState((cur) => { const n = { ...cur, ...p }; savePrefs(n); return n; });
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<{ state: SalatState; rakah: number }>({ state: "IDLE", rakah: 0 });
  const [verses, setVerses] = useState<SalatVerse[]>([]);
  const [prompting, setPrompting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [mushaf, setMushaf] = useState<Mushaf | null>(null);
  const lexicon = usePhonemeLexicon();
  useKeepAwake(running);

  useEffect(() => { void loadMushaf().then(setMushaf).catch(() => {}); void loadQuranPhonemes().catch(() => {}); }, []);
  useEffect(() => () => { stopPrompt(); }, []);

  // Targets: al-Fātiḥah while it is recited / between rakʿāt (never judged), the located passage after it.
  const fatiha = useMemo(() => (mushaf ? Array.from({ length: 7 }, (_, i) => salatVerse(1, i + 1, mushaf.words(1, i + 1))) : []), [mushaf]);
  const active = phase.state === "ACTIVE_SURAH_TRACKING" && verses.length ? verses : fatiha;
  const targets = useMemo(() => active.map((v) => v.words.join(" ")), [active]);
  const tokens = useMemo(() => targets.flatMap((s) => s.split(" ")), [targets]);
  const refs = useMemo(() => (lexicon ? active.flatMap((v) => phonemeRefs(lexicon, v.surah, v.ayah, v.words as string[])) : null), [lexicon, active]);
  const rec = useRecitation(targets, { phonemeRefs: refs, forceLive: true, keepAudio: false });

  const tracker = useRef(new SalatPrayerTracker({ silenceMs: prefs.silenceMs, promptMode: prefs.promptMode }));
  useEffect(() => { tracker.current.setConfig({ silenceMs: prefs.silenceMs, promptMode: prefs.promptMode }); }, [prefs.silenceMs, prefs.promptMode]);

  const live = useRef({ rec, verses, tokens, prefs, mushaf, prompting });
  live.current = { rec, verses, tokens, prefs, mushaf, prompting };
  /** Transcript seen right before a rebase: ignored until the rebased transcript arrives. */
  const stale = useRef<string | null>(null);

  const versesFrom = useCallback((m: Mushaf, surah: number, ayah: number, count = WINDOW) => {
    const last = Math.min(m.versesCount(surah), ayah + count - 1);
    const out: SalatVerse[] = [];
    for (let a = ayah; a <= last; a++) out.push(salatVerse(surah, a, m.words(surah, a)));
    return out;
  }, []);

  const apply = useCallback((events: SalatEvent[]) => {
    for (const e of events) {
      if (e.type === "state") {
        setPhase({ state: e.state, rakah: e.rakah });
        if (e.state !== "ACTIVE_SURAH_TRACKING") setVerses([]);
        if (e.state === "IN_RUKU_OR_SUJUD") { stopPrompt(); }
      } else if (e.type === "rebase") {
        stale.current = live.current.rec.transcript;
        if (e.pos > 0) live.current.rec.rebaseBy(e.pos);
        live.current.rec.forgetMistakes();
      } else if (e.type === "prompt") {
        void prompt(e.token, e.reason, e.mode);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const prompt = useCallback(async (token: number, reason: "stall" | "mistake", mode: PromptMode) => {
    const { verses: vs, prefs: p, rec: r } = live.current;
    const span = promptSpan(vs, token, mode, reason);
    if (!span) return;
    setPrompting(true);
    if (r.canPause) r.pause();
    try {
      await playPrompt({ reciterId: p.reciterId, surah: span.surah, ayah: span.ayah, fromWord: span.fromWord, toWord: span.toWord, words: vs.find((v) => v.surah === span.surah && v.ayah === span.ayah)?.words.length ?? 1, volume: p.volume });
    } catch { /* offline and not downloaded: stay silent */ }
    if (r.canPause && tracker.current.state !== "IDLE") live.current.rec.resume();
    setPrompting(false);
  }, []);

  // Test hook (e2e): what the engine heard and how it was judged.
  useEffect(() => { (window as unknown as { __salat?: unknown }).__salat = { kind: rec.transcriptKind, transcript: rec.transcript, cursor: rec.match.cursor, recited: rec.match.recited, state: tracker.current.state, located: tracker.current.located }; });

  // Transcript → phase changes.
  useEffect(() => {
    if (!running || !rec.listening) return;
    if (stale.current !== null) { if (rec.transcript === stale.current) return; stale.current = null; }
    apply(tracker.current.onTranscript(rec.transcriptKind, rec.transcript, Date.now(), { tokens, cursor: rec.match.cursor }));
  }, [rec.transcript, running]); // eslint-disable-line react-hooks/exhaustive-deps

  // Locate the recited passage: after al-Fātiḥah (and as a safety net while it is still "on").
  const locating = useRef(false);
  useEffect(() => {
    if (!running || !rec.listening || !mushaf || !rec.transcript || stale.current !== null) return;
    const st = tracker.current.state;
    if (st !== "ACTIVE_SURAH_TRACKING" && st !== "RECITING_FATIHA") return;
    if (st === "ACTIVE_SURAH_TRACKING" && tracker.current.located && trailingErrors(rec.match.statuses, rec.match.cursor) < 4) return;
    const timer = setTimeout(() => {
      if (locating.current) return;
      locating.current = true;
      const kind: LocatorKind = rec.transcriptKind;
      const source = kind === "phonemes"
        ? () => loadQuranPhonemes().then((l) => l.surahs)
        : async () => Array.from({ length: 114 }, (_, si) => Array.from({ length: mushaf.versesCount(si + 1) }, (_, ai) => mushaf.words(si + 1, ai + 1)));
      void locatorIndex(kind, source).then((ix) => {
        const r = live.current.rec;
        if (r.transcriptKind !== kind || stale.current !== null) return;
        const found = locateRecitation(ix, r.transcript);
        (window as unknown as { __salatHits?: unknown[] }).__salatHits?.push({ hit: found, transcript: r.transcript });
        if (!found || found.surah === 1) return;
        // A window that starts on a verse's LAST word is a leftover sound before the next verse: take that one.
        const hit = { ...found };
        if (found.word >= mushaf.words(found.surah, found.ayah).length) {
          if (found.ayah < mushaf.versesCount(found.surah)) hit.ayah = found.ayah + 1;
          else if (found.surah < 114) { hit.surah = found.surah + 1; hit.ayah = 1; }
        }
        const now = Date.now();
        const tr = tracker.current;
        if (tr.state === "RECITING_FATIHA") apply(tr.fatihaPassed(now, 0));
        if (tr.state !== "ACTIVE_SURAH_TRACKING") return;
        if (tr.located && tr.located.surah === hit.surah && Math.abs(tr.located.ayah - hit.ayah) < WINDOW && hit.startRaw === 0) return;
        tr.onLocated({ surah: hit.surah, ayah: hit.ayah }, now);
        setVerses(versesFrom(mushaf, hit.surah, hit.ayah));
        stale.current = r.transcript;
        if (hit.startRaw > 0) r.rebaseBy(hit.startRaw);
        r.forgetMistakes();
      }).catch(() => {}).finally(() => { locating.current = false; });
    }, 450);
    return () => clearTimeout(timer);
  }, [rec.transcript, running, mushaf]); // eslint-disable-line react-hooks/exhaustive-deps

  // Slide the window on: when the reader nears its end, the next verses join the targets.
  useEffect(() => {
    if (!mushaf || !verses.length || phase.state !== "ACTIVE_SURAH_TRACKING") return;
    const last = verses[verses.length - 1]!;
    const tail = verses.slice(-3).reduce((n, v) => n + v.tokenWord.length, 0);
    if (rec.match.cursor < tokens.length - tail || last.ayah >= mushaf.versesCount(last.surah) || verses.length > 60) return;
    setVerses((cur) => [...cur, ...versesFrom(mushaf, last.surah, last.ayah + 1)]);
  }, [rec.match.cursor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clock: silence → prompts.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const { rec: r, prefs: p, prompting: busy } = live.current;
      if (!r.listening || r.paused && !busy) return;
      apply(tracker.current.tick({ now: Date.now(), match: r.match, voiced: r.voicedLast(p.silenceMs / 1000), prompting: busy }));
    }, 250);
    return () => clearInterval(id);
  }, [running, apply]);

  // The recording ends by itself at its size limit (≈ 12 min): start a new one, the prayer goes on.
  const userStop = useRef(false);
  useEffect(() => {
    if (!running || rec.listening || rec.processing || userStop.current) return;
    const id = setTimeout(() => {
      if (live.current.rec.listening || userStop.current) return;
      tracker.current.restartTranscript(Date.now());
      const { verses: vs, rec: r, mushaf: m } = live.current;
      if (m && vs.length && tracker.current.located) {
        // Judge again from the verse being recited.
        let tok = r.match.cursor;
        const at = vs.find((v) => { if (tok < v.tokenWord.length) return true; tok -= v.tokenWord.length; return false; }) ?? vs[vs.length - 1]!;
        setVerses(versesFrom(m, at.surah, at.ayah));
      }
      stale.current = null;
      r.toggle();
    }, 600);
    return () => clearTimeout(id);
  }, [rec.listening, rec.processing, running]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    stopPrompt(); stopSheikhAudio();
    userStop.current = false;
    stale.current = null;
    tracker.current = new SalatPrayerTracker({ silenceMs: prefs.silenceMs, promptMode: prefs.promptMode });
    apply(tracker.current.start(Date.now()));
    setRunning(true);
    if (!rec.listening) rec.toggle();
  };
  const end = () => {
    userStop.current = true;
    stopPrompt();
    apply(tracker.current.stop());
    setRunning(false);
    if (rec.listening) rec.reset();
    setVerses([]);
  };
  useEffect(() => () => { userStop.current = true; }, []);

  const preview = async () => {
    if (previewing) { stopPrompt(); setPreviewing(false); return; }
    setPreviewing(true);
    try { await playPrompt({ reciterId: prefs.reciterId, surah: 1, ayah: 2, fromWord: 1, toWord: 3, words: 4, volume: prefs.volume }); } catch { /* offline */ }
    setPreviewing(false);
  };

  const ar = language === "ar";
  const reciterName = (id: string) => { const r = getReciter(id); return ar ? r.nameArabic : r.nameEnglish; };
  const located = phase.state === "ACTIVE_SURAH_TRACKING" && verses[0] ? getSurahMeta(verses[0].surah) : null;

  /* ── during the prayer ── */
  if (running) {
    const dot = phase.state === "IN_RUKU_OR_SUJUD" ? "#7c5a12" : phase.state === "ACTIVE_SURAH_TRACKING" ? "#0f5f45" : "#3b4b44";
    return (
      <div className="fixed inset-0 z-[70] flex select-none flex-col items-center justify-between bg-black px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]" data-salat="running" data-salat-state={phase.state}>
        <p className="text-xs tracking-widest text-neutral-700" data-salat-rakah={phase.rakah}>{t("salatRakah").replace("{n}", (ar ? phase.rakah.toLocaleString("ar-EG") : String(phase.rakah)))}</p>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="h-2.5 w-2.5 rounded-full transition-colors duration-700" style={{ background: dot, boxShadow: `0 0 18px ${dot}` }} aria-hidden="true" />
          <p className={`${ar ? "font-arabic text-2xl" : "text-xl"} leading-relaxed text-neutral-500`} data-salat-status="">{t(STATUS[phase.state])}</p>
          {located && <p className="font-arabic text-sm text-neutral-700" data-salat-surah={verses[0]!.surah}>{`سورة ${located.nameArabic}`}</p>}
          {prompting && <p className="text-xs text-amber-900/80" data-salat-prompting="">{t("salatPrompting")}</p>}
          {rec.error && <p className="max-w-xs text-xs text-red-900">{t(rec.error)}</p>}
        </div>
        <button type="button" onClick={end} data-salat-end=""
          className="rounded-full border border-neutral-800 px-6 py-2.5 text-sm text-neutral-500 active:bg-neutral-900">
          <Square className="me-2 inline h-3.5 w-3.5" />{t("salatEnd")}
        </button>
      </div>
    );
  }

  /* ── before the prayer ── */
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black text-neutral-200" data-salat="setup">
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-5 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h1 className="font-arabic text-3xl text-amber-200/90">وضع الصلاة</h1>
          <button type="button" onClick={() => { stopPrompt(); onClose(); }} aria-label={t("close")} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-900" data-salat-close=""><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm leading-relaxed text-neutral-400">{t("salatIntro")}</p>

        <section className="space-y-2 rounded-2xl border border-neutral-800 p-4">
          <label className="block text-sm text-neutral-300" htmlFor="salat-reciter">{ar ? "اختيار القارئ للتذكير الصوتي" : t("salatReciter")}</label>
          <div className="flex gap-2">
            <select id="salat-reciter" value={prefs.reciterId} onChange={(e) => setPrefs({ reciterId: e.target.value })} data-salat-reciter=""
              className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100">
              {SALAT_RECITERS.map((r) => <option key={r.id} value={r.id}>{reciterName(r.id)}</option>)}
            </select>
            <button type="button" onClick={() => void preview()} data-salat-preview=""
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-700/50 px-3 text-sm text-amber-200/90 active:bg-neutral-900">
              {previewing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}{t("salatPreview")}
            </button>
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-neutral-800 p-4">
          <div className="flex items-baseline justify-between text-sm">
            <label htmlFor="salat-silence" className="text-neutral-300">{t("salatSilence")}</label>
            <span className="tabular-nums text-amber-200/90" dir="ltr">{(prefs.silenceMs / 1000).toFixed(1)} s</span>
          </div>
          <input id="salat-silence" type="range" min={SILENCE_RANGE_MS[0]} max={SILENCE_RANGE_MS[1]} step={500} value={prefs.silenceMs}
            onChange={(e) => setPrefs({ silenceMs: Number(e.target.value) })} className="w-full accent-amber-500" data-salat-silence="" />
        </section>

        <section className="space-y-2 rounded-2xl border border-neutral-800 p-4">
          <p className="text-sm text-neutral-300">{t("salatPromptLength")}</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(["words", "ayah"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={prefs.promptMode === m} onClick={() => setPrefs({ promptMode: m })} data-salat-mode={m}
                className={`rounded-xl border px-3 py-2.5 text-sm ${prefs.promptMode === m ? "border-amber-600/70 bg-amber-950/40 text-amber-100" : "border-neutral-800 text-neutral-400"}`}>
                <span className="block font-arabic">{m === "words" ? "كلمات قليلة" : "آية كاملة"}</span>
                {!ar && <span className="block text-xs opacity-70">{t(m === "words" ? "salatWords" : "salatAyah")}</span>}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-neutral-800 p-4">
          <div className="flex items-baseline justify-between text-sm">
            <label htmlFor="salat-volume" className="flex items-center gap-1.5 text-neutral-300"><Volume2 className="h-4 w-4" />{t("salatVolume")}</label>
            <span className="tabular-nums text-amber-200/90" dir="ltr">{Math.round(prefs.volume * 100)} %</span>
          </div>
          <input id="salat-volume" type="range" min={5} max={100} step={5} value={Math.round(prefs.volume * 100)}
            onChange={(e) => setPrefs({ volume: Number(e.target.value) / 100 })} className="w-full accent-amber-500" data-salat-volume="" />
        </section>

        <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-500">
          <li>• {t("salatNoteFatiha")}</li>
          <li>• {t("salatNoteTakbir")}</li>
          <li>• {t("salatNotePrivacy")}</li>
        </ul>

        <button type="button" onClick={start} disabled={!mushaf} data-salat-start=""
          className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 py-4 text-lg font-semibold text-black disabled:opacity-40">
          <Mic className="h-5 w-5" /><span className="font-arabic">ابدأ الصلاة</span>{!ar && <span className="text-base opacity-80">· {t("salatStart")}</span>}
        </button>
      </div>
    </div>
  );
}

export default SalatModeView;
