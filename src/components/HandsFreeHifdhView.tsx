/**
 * v45 «المراجعة الحرة (الشاشة مغلقة / بلوتوث)» — hands-free, on-the-go Hifdh.
 *
 * Setup: Sheikh (with a voice test), silence delay 2–6 s, prompt length, idle time (15 / 30 s), prompt
 * volume, output route (تلقائي / سماعة البلوتوث / مكبر الصوت) with the connected devices.
 * Running: the phone may go into a pocket and the screen may turn off —
 *  - Android app: microphone foreground service (HandsFreeMicService) with a silent notification showing the
 *    status; the WebView keeps recognising on the device;
 *  - iOS / browser: a silent looped audio session keeps the page's audio alive while the screen dims;
 *  - headset / AirPods / car buttons: play-pause → pause / resume listening, next / previous → repeat the
 *    last prompt (native MediaSession + navigator.mediaSession).
 * Logic: HandsFreeTracker (src/lib/HandsFreeHifdhService.ts). Recognition: useRecitation (on-device, nothing
 * recorded or kept). Prompts: the Salat Mode's Sheikh player (src/lib/sheikhPrompt.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bluetooth, Headphones, Pause, Play, Smartphone, Square, Volume2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useRecitation } from "@/lib/useRecitation";
import { loadQuranPhonemes, phonemeRefs, usePhonemeLexicon } from "@/lib/quranAlignment";
import { locateRecitation, locatorIndex, type LocatorKind } from "@/lib/ayahLocator";
import { loadMushaf, type Mushaf } from "@/lib/mushafData";
import { getReciter } from "@/lib/reciterManager";
import { backgroundAudio } from "@/lib/audioPlayback";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { playPrompt, stopPrompt } from "@/lib/sheikhPrompt";
import { playCompletionChime } from "@/lib/chime";
import { successHaptic } from "@/lib/haptics";
import { assetUrl } from "@/lib/assets";
import { promptSpan, salatVerse, trailingErrors, SILENCE_RANGE_MS, type PromptMode, type SalatVerse } from "@/lib/SalatPrayerTracker";
import { SALAT_RECITERS } from "@/components/SalatModeView";
import {
  HandsFreeTracker, IDLE_OPTIONS_MS, addHandsFreeLog, applyAudioRoute, hasBluetooth, listAudioDevices, loadHandsFreeLog,
  type AudioDevice, type AudioRoute, type HandsFreeEvent, type HandsFreeLogEntry, type HandsFreeState,
} from "@/lib/HandsFreeHifdhService";

const STORE_KEY = "hifz.handsfree.v1";
type Prefs = { reciterId: string; silenceMs: number; promptMode: PromptMode; idleMs: number; volume: number; route: AudioRoute };
function loadPrefs(globalReciter: string): Prefs {
  const d: Prefs = { reciterId: SALAT_RECITERS.some((r) => r.id === globalReciter) ? globalReciter : "alafasy", silenceMs: 3500, promptMode: "words", idleMs: 15_000, volume: 0.5, route: "auto" };
  try {
    const r = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null") as Partial<Prefs> | null;
    if (!r) return d;
    return {
      reciterId: SALAT_RECITERS.some((x) => x.id === r.reciterId) ? r.reciterId! : d.reciterId,
      silenceMs: Math.min(SILENCE_RANGE_MS[1], Math.max(SILENCE_RANGE_MS[0], Number(r.silenceMs) || d.silenceMs)),
      promptMode: r.promptMode === "ayah" ? "ayah" : "words",
      idleMs: (IDLE_OPTIONS_MS as readonly number[]).includes(Number(r.idleMs)) ? Number(r.idleMs) : d.idleMs,
      volume: Math.min(1, Math.max(0.05, Number(r.volume) || d.volume)),
      route: r.route === "bluetooth" || r.route === "speaker" ? r.route : "auto",
    };
  } catch { return d; }
}
const WINDOW = 20;

/* iOS / browser: a silent looped track keeps the audio session (and the microphone) alive when the screen dims. */
let keepAliveEl: HTMLAudioElement | null = null;
function keepAlive(on: boolean) {
  if (!on) { keepAliveEl?.pause(); return; }
  keepAliveEl ??= new Audio(assetUrl("adhan/silence.mp3"));
  keepAliveEl.loop = true;
  keepAliveEl.volume = 0.01;
  void keepAliveEl.play().catch(() => {});
}

export function HandsFreeHifdhView({ onClose }: { onClose: () => void }) {
  const { t, language } = useI18n();
  const ar = language === "ar";
  const num = (n: number) => (ar ? toArabicDigits(n) : String(n));
  const settings = useSettings();
  const [prefs, setPrefsState] = useState<Prefs>(() => loadPrefs(settings.reciterId));
  const setPrefs = (p: Partial<Prefs>) => setPrefsState((c) => { const n = { ...c, ...p }; try { localStorage.setItem(STORE_KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [state, setState] = useState<HandsFreeState>("OFF");
  const [verses, setVerses] = useState<SalatVerse[]>([]);
  const [prompting, setPrompting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [log, setLog] = useState<HandsFreeLogEntry[]>(() => loadHandsFreeLog());
  const [mushaf, setMushaf] = useState<Mushaf | null>(null);
  const lexicon = usePhonemeLexicon();

  useEffect(() => { void loadMushaf().then(setMushaf).catch(() => {}); void loadQuranPhonemes().catch(() => {}); }, []);
  // Connected devices (Bluetooth earphones, car): now and whenever they change.
  useEffect(() => {
    const refresh = () => void listAudioDevices().then(setDevices);
    refresh();
    navigator.mediaDevices?.addEventListener?.("devicechange", refresh);
    const id = setInterval(refresh, 8000);
    return () => { navigator.mediaDevices?.removeEventListener?.("devicechange", refresh); clearInterval(id); };
  }, []);

  const targets = useMemo(() => verses.map((v) => v.words.join(" ")), [verses]);
  const refs = useMemo(() => (lexicon ? verses.flatMap((v) => phonemeRefs(lexicon, v.surah, v.ayah, v.words as string[])) : null), [lexicon, verses]);
  const rec = useRecitation(targets, { phonemeRefs: refs, forceLive: true, keepAudio: false });

  const tracker = useRef(new HandsFreeTracker());
  useEffect(() => { tracker.current.setConfig({ silenceMs: prefs.silenceMs, promptMode: prefs.promptMode, idleMs: prefs.idleMs }); }, [prefs.silenceMs, prefs.promptMode, prefs.idleMs]);
  const live = useRef({ rec, verses, prefs, mushaf, prompting, paused });
  live.current = { rec, verses, prefs, mushaf, prompting, paused };
  const stale = useRef<string | null>(null);
  const rawLen = () => { const r = live.current.rec; return r.transcriptKind === "phonemes" ? r.transcript.length : r.transcript.trim().split(/\s+/).filter(Boolean).length; };

  const versesFrom = useCallback((m: Mushaf, surah: number, ayah: number) => {
    const out: SalatVerse[] = [];
    for (let a = ayah; a <= Math.min(m.versesCount(surah), ayah + WINDOW - 1); a++) out.push(salatVerse(surah, a, m.words(surah, a)));
    return out;
  }, []);

  /** Lock-screen / notification status text. */
  const status = useCallback((st: HandsFreeState, at?: { surah: number; ayah: number } | null) => {
    if (st === "ACTIVE_MEMORIZATION" && at) return `${t("hfFollowing")}: سورة ${getSurahMeta(at.surah)?.nameArabic ?? ""}`;
    return t("hfWaiting");
  }, [t]);
  const pushStatus = useCallback((text: string) => {
    void backgroundAudio().then((p) => p?.updateHandsFree({ text })).catch(() => {});
    try { if ("mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: text, artist: "Quran Muallem", album: t("hfTitle") }); } catch { /* unsupported */ }
  }, [t]);

  const prompt = useCallback(async (token: number, reason: "stall" | "mistake", mode: PromptMode) => {
    const { verses: vs, prefs: p, rec: r } = live.current;
    const span = promptSpan(vs, token, mode, reason);
    if (!span) return;
    setPrompting(true);
    if (r.canPause) r.pause();
    try { await playPrompt({ reciterId: p.reciterId, surah: span.surah, ayah: span.ayah, fromWord: span.fromWord, toWord: span.toWord, words: vs.find((v) => v.surah === span.surah && v.ayah === span.ayah)?.words.length ?? 1, volume: p.volume }); } catch { /* offline */ }
    if (r.canPause && !live.current.paused && tracker.current.state !== "OFF") live.current.rec.resume();
    setPrompting(false);
  }, []);

  const apply = useCallback((events: HandsFreeEvent[]) => {
    for (const e of events) {
      if (e.type === "state") {
        setState(e.state);
        if (e.state === "IDLE_LISTENING") {
          setVerses([]);
          stale.current = live.current.rec.transcript;
          const pos = rawLen();
          if (pos > 0) live.current.rec.rebaseBy(pos);
          live.current.rec.forgetMistakes();
        }
        pushStatus(status(e.state, tracker.current.located));
      } else if (e.type === "locked") {
        void playCompletionChime(0.08); void successHaptic();
        pushStatus(status("ACTIVE_MEMORIZATION", e));
      } else if (e.type === "prompt") void prompt(e.token, e.reason, e.mode);
      else if (e.type === "idle" && e.entry) setLog(addHandsFreeLog(e.entry));
    }
  }, [prompt, pushStatus, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Voice heard → the silence clock restarts.
  useEffect(() => {
    if (!running || !rec.transcript) return;
    if (stale.current !== null) { if (rec.transcript === stale.current) return; stale.current = null; }
    tracker.current.heard(Date.now());
  }, [rec.transcript, running]);

  // The noise gate: lock on only when 3–4 words match a verse (locator, ≥ 85 %, unique place).
  const locating = useRef(false);
  useEffect(() => {
    if (!running || paused || !rec.listening || !mushaf || !rec.transcript || stale.current !== null) return;
    const tr = tracker.current;
    if (tr.state === "ACTIVE_MEMORIZATION" && trailingErrors(rec.match.statuses, rec.match.cursor) < 4) return;
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
        if (!found) {
          // Idle: keep only the recent sound (street noise, talk) so the transcript stays short.
          const len = rawLen();
          const keep = kind === "phonemes" ? 220 : 40;
          if (tr.state === "IDLE_LISTENING" && len > keep * 2) { stale.current = r.transcript; r.rebaseBy(len - keep); }
          return;
        }
        const hit = { ...found };
        if (found.word >= mushaf.words(found.surah, found.ayah).length) {
          if (found.ayah < mushaf.versesCount(found.surah)) hit.ayah = found.ayah + 1;
          else if (found.surah < 114) { hit.surah = found.surah + 1; hit.ayah = 1; }
        }
        apply(tr.onLocated({ surah: hit.surah, ayah: hit.ayah }, Date.now()));
        setVerses(versesFrom(mushaf, hit.surah, hit.ayah));
        stale.current = r.transcript;
        if (hit.startRaw > 0) r.rebaseBy(hit.startRaw);
        r.forgetMistakes();
      }).catch(() => {}).finally(() => { locating.current = false; });
    }, 450);
    return () => clearTimeout(timer);
  }, [rec.transcript, running, paused, mushaf]); // eslint-disable-line react-hooks/exhaustive-deps

  // Slide the window on near its end.
  useEffect(() => {
    if (!mushaf || !verses.length) return;
    const last = verses[verses.length - 1]!;
    const tokens = verses.reduce((n, v) => n + v.tokenWord.length, 0);
    const tail = verses.slice(-3).reduce((n, v) => n + v.tokenWord.length, 0);
    if (rec.match.cursor < tokens - tail || last.ayah >= mushaf.versesCount(last.surah) || verses.length > 60) return;
    setVerses((cur) => [...cur, ...versesFrom(mushaf, last.surah, last.ayah + 1)]);
  }, [rec.match.cursor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clock.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const { rec: r, prefs: p, prompting: busy, paused: ps, verses: vs } = live.current;
      if (!r.listening || ps) return;
      const ayahOfToken = (tok: number) => { let k = tok; for (const v of vs) { if (k < v.tokenWord.length) return v.ayah; k -= v.tokenWord.length; } return null; };
      apply(tracker.current.tick({ now: Date.now(), match: r.match, voiced: r.voicedLast(p.silenceMs / 1000), prompting: busy, ayahOfToken }));
    }, 250);
    return () => clearInterval(id);
  }, [running, apply]);

  // Recording size limit (≈ 12 min): start a new recording, listening goes on.
  const userStop = useRef(false);
  useEffect(() => {
    if (!running || paused || rec.listening || rec.processing || userStop.current) return;
    const id = setTimeout(() => {
      if (live.current.rec.listening || userStop.current || live.current.paused) return;
      stale.current = null;
      apply(tracker.current.stop(Date.now()));
      apply(tracker.current.start(Date.now()));
      live.current.rec.toggle();
    }, 600);
    return () => clearTimeout(id);
  }, [rec.listening, rec.processing, running, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Headset / AirPods / car buttons */
  const togglePause = useCallback(() => {
    const r = live.current.rec;
    setPaused((p) => {
      const next = !p;
      if (next) { stopPrompt(); if (r.canPause) r.pause(); } else if (r.canPause) r.resume();
      pushStatus(next ? t("hfPaused") : status(tracker.current.state, tracker.current.located));
      return next;
    });
  }, [pushStatus, status, t]);
  const repeatPrompt = useCallback(() => apply(tracker.current.repeat(Date.now(), live.current.rec.match)), [apply]);
  useEffect(() => {
    if (!running) return;
    let handle: { remove: () => Promise<void> } | null = null;
    void backgroundAudio().then(async (p) => {
      if (!p) return;
      handle = await p.addListener("handsfree", (e) => {
        if (e.action === "repeat") repeatPrompt();
        else if (e.action === "toggle" || (e.action === "pause" && !live.current.paused) || (e.action === "play" && live.current.paused)) togglePause();
      });
    }).catch(() => {});
    const ms = "mediaSession" in navigator ? navigator.mediaSession : null;
    try {
      ms?.setActionHandler("pause", () => { if (!live.current.paused) togglePause(); });
      ms?.setActionHandler("play", () => { if (live.current.paused) togglePause(); });
      ms?.setActionHandler("nexttrack", repeatPrompt);
      ms?.setActionHandler("previoustrack", repeatPrompt);
    } catch { /* unsupported */ }
    return () => {
      void handle?.remove();
      try { for (const a of ["pause", "play", "nexttrack", "previoustrack"] as const) ms?.setActionHandler(a, null); } catch { /* ignore */ }
    };
  }, [running, repeatPrompt, togglePause]);

  const start = () => {
    stopPrompt();
    userStop.current = false; stale.current = null;
    tracker.current = new HandsFreeTracker({ silenceMs: prefs.silenceMs, promptMode: prefs.promptMode, idleMs: prefs.idleMs });
    void applyAudioRoute(prefs.route);
    keepAlive(true);
    void backgroundAudio().then((p) => p?.startHandsFree({ title: t("hfTitle"), text: t("hfWaiting") })).catch(() => {});
    apply(tracker.current.start(Date.now()));
    setPaused(false);
    setRunning(true);
    if (!rec.listening) rec.toggle();
  };
  const end = () => {
    userStop.current = true;
    stopPrompt();
    apply(tracker.current.stop(Date.now()));
    setRunning(false); setPaused(false);
    if (rec.listening) rec.reset();
    setVerses([]);
    keepAlive(false);
    void applyAudioRoute("auto");
    void backgroundAudio().then((p) => p?.stopHandsFree()).catch(() => {});
  };
  useEffect(() => () => { userStop.current = true; stopPrompt(); keepAlive(false); void backgroundAudio().then((p) => p?.stopHandsFree()).catch(() => {}); }, []);

  const preview = async () => {
    if (previewing) { stopPrompt(); setPreviewing(false); return; }
    setPreviewing(true);
    try { await playPrompt({ reciterId: prefs.reciterId, surah: 67, ayah: 1, fromWord: 1, toWord: 3, words: 8, volume: prefs.volume }); } catch { /* offline */ }
    setPreviewing(false);
  };

  const bt = hasBluetooth(devices);
  const routeBadge = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/60 px-3 py-1 text-xs text-emerald-200/80" data-hf-route={prefs.route} data-hf-bt={bt ? "yes" : "no"}>
      {prefs.route === "speaker" ? <Smartphone className="h-3.5 w-3.5" /> : bt ? <Bluetooth className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
      {prefs.route === "speaker" ? t("hfRouteSpeaker") : bt ? `${t("hfRouteBluetooth")}${devices.find((d) => d.kind === "bluetooth")?.name ? ` · ${devices.find((d) => d.kind === "bluetooth")!.name}` : ""}` : t("hfRouteAuto")}
    </span>
  );
  const loc = tracker.current.located;

  if (running) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-black px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center" data-handsfree="running" data-hf-state={state}>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs tracking-widest text-neutral-600">{t("hfTitle")}</p>
          {routeBadge}
        </div>
        <div className="flex flex-col items-center gap-4">
          <span className={`h-3 w-3 rounded-full transition-colors duration-700 ${paused ? "bg-neutral-700" : state === "ACTIVE_MEMORIZATION" ? "bg-emerald-600 shadow-[0_0_20px_#059669]" : "animate-pulse bg-amber-700"}`} aria-hidden="true" />
          <p className={`${ar ? "font-arabic text-2xl" : "text-xl"} leading-relaxed text-neutral-300`} data-hf-status="">
            {paused ? t("hfPaused") : state === "ACTIVE_MEMORIZATION" ? t("hfFollowing") : t("hfWaiting")}
          </p>
          {loc && state === "ACTIVE_MEMORIZATION" && <p className="font-arabic text-lg text-emerald-400/80" data-hf-surah={loc.surah}>سورة {getSurahMeta(loc.surah)?.nameArabic}</p>}
          {prompting && <p className="text-xs text-amber-700" data-hf-prompting="">{t("salatPrompting")}</p>}
          {rec.error && <p className="max-w-xs text-xs text-red-800">{t(rec.error)}</p>}
          <p className="max-w-xs text-xs leading-relaxed text-neutral-600">{t("hfRunningHint")}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={togglePause} data-hf-pause="" className="flex items-center gap-2 rounded-full border border-neutral-800 px-5 py-2.5 text-sm text-neutral-400 active:bg-neutral-900">
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}{t(paused ? "hfResume" : "hfPause")}
          </button>
          <button type="button" onClick={end} data-hf-end="" className="flex items-center gap-2 rounded-full border border-neutral-800 px-5 py-2.5 text-sm text-neutral-400 active:bg-neutral-900">
            <Square className="h-4 w-4" />{t("hfStop")}
          </button>
        </div>
      </div>
    );
  }

  const chip = (on: boolean) => `rounded-xl border px-3 py-2.5 text-sm ${on ? "border-emerald-500/70 bg-emerald-950/50 text-emerald-100" : "border-neutral-800 text-neutral-400"}`;
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-neutral-950 text-neutral-200" data-handsfree="setup">
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-5 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h1 className="font-arabic text-2xl text-emerald-200">{ar ? "المراجعة الحرة" : t("hfTitle")}</h1>
          <button type="button" onClick={() => { stopPrompt(); onClose(); }} aria-label={t("close")} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-900" data-hf-close=""><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm leading-relaxed text-neutral-400">{t("hfIntro")}</p>

        <section className="space-y-2 rounded-2xl border border-neutral-800 p-4">
          <p className="text-sm text-neutral-300">{t("hfOutput")}</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {(["auto", "bluetooth", "speaker"] as const).map((r) => (
              <button key={r} type="button" role="radio" aria-checked={prefs.route === r} onClick={() => setPrefs({ route: r })} data-hf-route-option={r} className={chip(prefs.route === r)}>
                {t(r === "auto" ? "hfRouteAuto" : r === "bluetooth" ? "hfRouteBluetooth" : "hfRouteSpeaker")}
              </button>
            ))}
          </div>
          <div className="pt-1">{routeBadge}</div>
          {prefs.route === "bluetooth" && !bt && <p className="text-xs text-amber-600">{t("hfNoBluetooth")}</p>}
        </section>

        <section className="space-y-2 rounded-2xl border border-neutral-800 p-4">
          <label className="block text-sm text-neutral-300" htmlFor="hf-reciter">{t("salatReciter")}</label>
          <div className="flex gap-2">
            <select id="hf-reciter" value={prefs.reciterId} onChange={(e) => setPrefs({ reciterId: e.target.value })} data-hf-reciter=""
              className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100">
              {SALAT_RECITERS.map((r) => <option key={r.id} value={r.id}>{ar ? getReciter(r.id).nameArabic : getReciter(r.id).nameEnglish}</option>)}
            </select>
            <button type="button" onClick={() => void preview()} data-hf-preview="" className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-700/50 px-3 text-sm text-emerald-200">
              {previewing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}{t("salatPreview")}
            </button>
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-neutral-800 p-4">
          <div className="flex items-baseline justify-between text-sm"><span className="text-neutral-300">{t("salatSilence")}</span><span className="tabular-nums text-emerald-300" dir="ltr">{(prefs.silenceMs / 1000).toFixed(1)} s</span></div>
          <input type="range" min={SILENCE_RANGE_MS[0]} max={SILENCE_RANGE_MS[1]} step={500} value={prefs.silenceMs} onChange={(e) => setPrefs({ silenceMs: Number(e.target.value) })} className="w-full accent-emerald-500" aria-label={t("salatSilence")} data-hf-silence="" />
          <p className="pt-2 text-sm text-neutral-300">{t("salatPromptLength")}</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(["words", "ayah"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={prefs.promptMode === m} onClick={() => setPrefs({ promptMode: m })} className={chip(prefs.promptMode === m)} data-hf-mode={m}>
                <span className="font-arabic">{m === "words" ? "كلمات قليلة" : "آية كاملة"}</span>
              </button>
            ))}
          </div>
          <p className="pt-2 text-sm text-neutral-300">{t("hfIdle")}</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {IDLE_OPTIONS_MS.map((ms) => (
              <button key={ms} type="button" role="radio" aria-checked={prefs.idleMs === ms} onClick={() => setPrefs({ idleMs: ms })} className={chip(prefs.idleMs === ms)} data-hf-idle={ms}>{t("hfSeconds").replace("{n}", num(ms / 1000))}</button>
            ))}
          </div>
          <div className="flex items-baseline justify-between pt-2 text-sm"><span className="flex items-center gap-1.5 text-neutral-300"><Volume2 className="h-4 w-4" />{t("salatVolume")}</span><span className="tabular-nums text-emerald-300" dir="ltr">{Math.round(prefs.volume * 100)} %</span></div>
          <input type="range" min={5} max={100} step={5} value={Math.round(prefs.volume * 100)} onChange={(e) => setPrefs({ volume: Number(e.target.value) / 100 })} className="w-full accent-emerald-500" aria-label={t("salatVolume")} />
        </section>

        <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-500">
          <li>• {t("hfNoteGate")}</li>
          <li>• {t("hfNoteButtons")}</li>
          <li>• {t("salatNotePrivacy").split(/[.。؛]/)[0]}.</li>
        </ul>

        {log.length > 0 && (
          <section className="space-y-1.5" data-hf-log={log.length}>
            <p className="text-sm text-neutral-300">{t("hfLog")}</p>
            {log.slice(0, 8).map((e) => (
              <div key={e.at} className="flex items-center justify-between rounded-xl border border-neutral-900 px-3 py-2 text-xs text-neutral-400">
                <span className="font-arabic text-sm text-neutral-200">سورة {getSurahMeta(e.surah)?.nameArabic} · {num(e.fromAyah)}{e.toAyah > e.fromAyah ? `–${num(e.toAyah)}` : ""}</span>
                <span dir="ltr">{new Date(e.at).toLocaleString(language, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </section>
        )}

        <button type="button" onClick={start} disabled={!mushaf} data-hf-start=""
          className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-4 text-lg font-semibold text-white disabled:opacity-40">
          <Headphones className="h-5 w-5" />{t("hfStart")}
        </button>
      </div>
    </div>
  );
}

export default HandsFreeHifdhView;
