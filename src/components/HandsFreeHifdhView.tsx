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
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bluetooth, Headphones, Pause, Play, Smartphone, Square, Volume2, X } from "lucide-react";
import { GlowStart, StudioCard, StudioShell, StudioSlider, studioChoice } from "@/components/companion/Studio";
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

export function HandsFreeHifdhView({ onClose, switcher }: { onClose: () => void; switcher?: ReactNode }) {
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
  // v49: background — listening goes on with the screen off (Android: the foreground service's microphone)
  const rec = useRecitation(targets, { phonemeRefs: refs, forceLive: true, keepAudio: false, background: true });

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
    let last = 0;
    const step = () => {
      const now = Date.now();
      if (now - last < 200) return;
      last = now;
      const { rec: r, prefs: p, prompting: busy, paused: ps, verses: vs } = live.current;
      if (!r.listening || ps) return;
      const ayahOfToken = (tok: number) => { let k = tok; for (const v of vs) { if (k < v.tokenWord.length) return v.ayah; k -= v.tokenWord.length; } return null; };
      apply(tracker.current.tick({ now, match: r.match, voiced: r.voicedLast(p.silenceMs / 1000), prompting: busy, ayahOfToken }));
    };
    const id = setInterval(step, 250);
    // v49: with the screen off the page's timers are throttled — the microphone chunks keep the clock going.
    window.addEventListener("qm:mic-tick", step);
    return () => { clearInterval(id); window.removeEventListener("qm:mic-tick", step); };
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
      <div className="qm-native-colors fixed inset-0 z-[70] flex flex-col items-center justify-between bg-black px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center" data-handsfree="running" data-hf-state={state}>
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

  const btName = devices.find((d) => d.kind === "bluetooth")?.name;
  return (
    <StudioShell data={{ "data-handsfree": "setup" }} switcher={switcher} onClose={() => { stopPrompt(); onClose(); }} closeLabel={t("close")}
      title={ar ? "المراجعة الحرة" : t("hfTitle")} intro={t("hfIntro")}>
      <StudioCard title={t("hfOutput")} icon={<Headphones className="h-4 w-4" />}>
        <div className="grid grid-cols-3 gap-2.5" role="radiogroup">
          {(["auto", "bluetooth", "speaker"] as const).map((r) => {
            const Icon = r === "auto" ? Headphones : r === "bluetooth" ? Bluetooth : Smartphone;
            return (
              <button key={r} type="button" role="radio" aria-checked={prefs.route === r} onClick={() => setPrefs({ route: r })} data-hf-route-option={r}
                className={studioChoice(prefs.route === r, "flex min-h-[5.25rem] flex-col items-center justify-center gap-1.5 text-center text-[0.9rem] leading-tight")}>
                <Icon className="h-7 w-7" strokeWidth={1.9} />{t(r === "auto" ? "hfRouteAuto" : r === "bluetooth" ? "hfRouteBluetooth" : "hfRouteSpeaker")}
              </button>
            );
          })}
        </div>
        <p className="flex items-start gap-2 rounded-2xl px-3 py-2.5 text-[0.92rem] font-semibold leading-snug sx-chip" data-hf-route={prefs.route} data-hf-bt={bt ? "yes" : "no"} data-hf-status="">
          <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: prefs.route === "speaker" ? "var(--sx-gold)" : bt ? "#22c55e" : "#f59e0b" }} />
          {prefs.route === "speaker" ? t("hfStatusSpeaker") : bt ? t("hfStatusBt").replace("{name}", btName ?? t("hfRouteBluetooth")) : t("hfStatusNoBt")}
        </p>
        {prefs.route === "bluetooth" && !bt && <p className="text-[0.9rem] font-semibold text-[#b45309]">{t("hfNoBluetooth")}</p>}
      </StudioCard>

      <StudioCard title={t("salatVoiceCard")} icon={<Volume2 className="h-4 w-4" />}>
        <label className="block text-[0.98rem] font-semibold sx-ink" htmlFor="hf-reciter">{t("salatReciter")}</label>
        <div className="flex gap-2">
          <select id="hf-reciter" value={prefs.reciterId} onChange={(e) => setPrefs({ reciterId: e.target.value })} data-hf-reciter=""
            className="min-h-[52px] min-w-0 flex-1 rounded-2xl border-0 px-3 text-[0.98rem] font-semibold sx-chip sx-ink">
            {SALAT_RECITERS.map((r) => <option key={r.id} value={r.id}>{ar ? getReciter(r.id).nameArabic : getReciter(r.id).nameEnglish}</option>)}
          </select>
          <button type="button" onClick={() => void preview()} data-hf-preview="" className={studioChoice(previewing, "flex shrink-0 items-center gap-1.5")}>
            {previewing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}{t("salatPreview")}
          </button>
        </div>
        <StudioSlider id="hf-silence" label={t("salatSilence")} value={prefs.silenceMs} display={`${(prefs.silenceMs / 1000).toFixed(1)} s`}
          min={SILENCE_RANGE_MS[0]} max={SILENCE_RANGE_MS[1]} step={500} onChange={(v) => setPrefs({ silenceMs: v })} data={{ "data-hf-silence": "" }} />
        <p className="text-[0.98rem] font-semibold sx-ink">{t("salatPromptLength")}</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(["words", "ayah"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={prefs.promptMode === m} onClick={() => setPrefs({ promptMode: m })} className={studioChoice(prefs.promptMode === m)} data-hf-mode={m}>
              <span className="font-arabic">{m === "words" ? "كلمات قليلة" : "آية كاملة"}</span>
            </button>
          ))}
        </div>
        <p className="text-[0.98rem] font-semibold sx-ink">{t("hfIdle")}</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {IDLE_OPTIONS_MS.map((ms) => (
            <button key={ms} type="button" role="radio" aria-checked={prefs.idleMs === ms} onClick={() => setPrefs({ idleMs: ms })} className={studioChoice(prefs.idleMs === ms)} data-hf-idle={ms}>{t("hfSeconds").replace("{n}", num(ms / 1000))}</button>
          ))}
        </div>
        <StudioSlider id="hf-volume" label={<><Volume2 className="h-4 w-4" />{t("salatVolume")}</>} value={Math.round(prefs.volume * 100)} display={`${Math.round(prefs.volume * 100)} %`}
          min={5} max={100} step={5} onChange={(v) => setPrefs({ volume: v / 100 })} data={{ "data-hf-volume": "" }} />
      </StudioCard>

      <ul className="space-y-1.5 px-1 text-[0.9rem] leading-relaxed sx-ink-soft">
        <li>• {t("hfNoteGate")}</li>
        <li>• {t("hfNoteButtons")}</li>
        <li>• {t("salatNotePrivacy").split(/[.。؛]/)[0]}.</li>
      </ul>

      {log.length > 0 && (
        <StudioCard title={t("hfLog")} data-hf-log={String(log.length)}>
          {log.slice(0, 8).map((e) => (
            <div key={e.at} className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-[0.85rem] sx-chip">
              <span className="font-arabic text-[0.98rem] font-bold">سورة {getSurahMeta(e.surah)?.nameArabic} · {num(e.fromAyah)}{e.toAyah > e.fromAyah ? `–${num(e.toAyah)}` : ""}</span>
              <span dir="ltr" className="sx-ink-soft">{new Date(e.at).toLocaleString(language, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </StudioCard>
      )}

      <GlowStart onClick={start} disabled={!mushaf} data={{ "data-hf-start": "" }} tone="emerald">
        <Headphones className="h-7 w-7" />{t("hfStart")}
      </GlowStart>
    </StudioShell>
  );
}

export default HandsFreeHifdhView;
