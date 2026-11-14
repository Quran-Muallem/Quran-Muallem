/**
 * Salat Companion (رفيق الصلاة, formerly «وضع الصلاة», v42) — a silent, respectful companion during prayer (e.g. Qiyām al-Layl).
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
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Clock3, Play, Smartphone, Square, Volume2 } from "lucide-react";
import { GlowStart, PlacementCard, PrayerCard, RakahDots, StudioCard, StudioShell, StudioSlider, studioChoice } from "@/components/companion/Studio";
import { PrayingPersonIcon } from "@/components/icons/PrayingPersonIcon";
import { useI18n, type CopyKey } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useKeepAwake } from "@/lib/wakeLock";
import { useRecitation } from "@/lib/useRecitation";
import { loadQuranPhonemes, phonemeRefs, usePhonemeLexicon } from "@/lib/quranAlignment";
import { locateRecitation, locatorIndex, type LocatorKind } from "@/lib/ayahLocator";
import { loadMushaf, type Mushaf } from "@/lib/mushafData";
import { RECITERS, getAyahAudioUrl, getReciter } from "@/lib/reciterManager";
import { backgroundAudio, verseTimings, stopSheikhAudio, stopWordAudio } from "@/lib/audioPlayback";
import { getSurahMeta } from "@/lib/quranService";
import {
  DEFAULT_SALAT_CONFIG, SILENCE_RANGE_MS, SalatPrayerTracker, promptSpan, salatVerse, trailingErrors,
  type PromptMode, type SalatEvent, type SalatState, type SalatVerse,
} from "@/lib/SalatPrayerTracker";
import {
  MotionCore, QIYAM_OPTIONS, fatihaOnlyRakah, requestMotionPermission, startMotionSensors, targetRakaat,
  type MotionEvent, type Placement, type Posture, type PrayerId,
} from "@/lib/SalatMotionTracker";
import { assetUrl } from "@/lib/assets";
import { playPrompt, stopPrompt } from "@/lib/sheikhPrompt";

/** Sheikhs with verse audio and word timings (prompts of a few words need the timings). */
export const SALAT_RECITERS = RECITERS.filter((r) => r.quranComId != null);
const STORE_KEY = "hifz.salat.v1";
type SalatPrefs = {
  reciterId: string; silenceMs: number; promptMode: PromptMode; volume: number;
  /** v43: which prayer, rakʿāt of Qiyām al-Layl (null = open), where the phone is (none = no sensors). */
  prayer: PrayerId; qiyamCount: number | null; placement: Placement | "none";
};
const PRAYERS: PrayerId[] = ["fajr", "dhuhr", "asr", "maghrib", "isha", "qiyam"];
const PLACEMENTS: (Placement | "none")[] = ["chest", "trousers", "jacket", "none"];

function loadPrefs(globalReciter: string): SalatPrefs {
  const fallback: SalatPrefs = {
    reciterId: SALAT_RECITERS.some((r) => r.id === globalReciter) ? globalReciter : "alafasy",
    silenceMs: DEFAULT_SALAT_CONFIG.silenceMs, promptMode: DEFAULT_SALAT_CONFIG.promptMode, volume: 0.45,
    prayer: "qiyam", qiyamCount: null, placement: "none",
  };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null") as Partial<SalatPrefs> | null;
    if (!raw) return fallback;
    return {
      reciterId: SALAT_RECITERS.some((r) => r.id === raw.reciterId) ? raw.reciterId! : fallback.reciterId,
      silenceMs: Math.min(SILENCE_RANGE_MS[1], Math.max(SILENCE_RANGE_MS[0], Number(raw.silenceMs) || fallback.silenceMs)),
      promptMode: raw.promptMode === "ayah" ? "ayah" : "words",
      volume: Math.min(1, Math.max(0.05, Number(raw.volume) || fallback.volume)),
      prayer: PRAYERS.includes(raw.prayer as PrayerId) ? raw.prayer as PrayerId : fallback.prayer,
      qiyamCount: (QIYAM_OPTIONS as readonly (number | null)[]).includes(raw.qiyamCount ?? null) ? raw.qiyamCount ?? null : null,
      placement: PLACEMENTS.includes(raw.placement as Placement) ? raw.placement as Placement | "none" : fallback.placement,
    };
  } catch { return fallback; }
}
const savePrefs = (p: SalatPrefs) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(p)); } catch { /* private mode */ } };

/* ───────────── soft prompt player: src/lib/sheikhPrompt.ts (v45: shared with the hands-free Hifdh mode) ───────────── */

/* ───────────── v43: «سبحان الله» rakʿah reminder (bundled, works offline) ───────────── */

let tasbihEl: HTMLAudioElement | null = null;
/**
 * v49: create, preload and unlock the «سبحان الله» player inside the «ابدأ الصلاة» tap — mobile WebViews
 * block audio started later without a user gesture, which silenced the reminder mid-prayer.
 */
export function unlockSubhanAllah() {
  tasbihEl ??= new Audio(assetUrl("salat/subhanallah.mp3"));
  const el = tasbihEl;
  el.preload = "auto";
  try {
    el.muted = true;
    const p = el.play();
    void p?.then(() => { el.pause(); el.currentTime = 0; el.muted = false; }).catch(() => { el.muted = false; });
  } catch { el.muted = false; }
}
async function playSubhanAllah(volume: number): Promise<void> {
  stopPrompt();
  tasbihEl ??= new Audio(assetUrl("salat/subhanallah.mp3"));
  const el = tasbihEl;
  el.muted = false;
  el.currentTime = 0;
  el.volume = Math.min(1, Math.max(0.05, volume));
  await el.play();
  await new Promise<void>((resolve) => { const done = () => { el.removeEventListener("ended", done); el.removeEventListener("pause", done); resolve(); }; el.addEventListener("ended", done); el.addEventListener("pause", done); });
}

const PRAYER_AR: Record<PrayerId, string> = { fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء", qiyam: "قيام الليل" };
const PRAYER_NAME_KEY: Record<PrayerId, CopyKey> = { fajr: "spFajr", dhuhr: "spDhuhr", asr: "spAsr", maghrib: "spMaghrib", isha: "spIsha", qiyam: "spQiyam" };
const PRAYER_KEY: Record<PrayerId, CopyKey> = { fajr: "prayerFajr", dhuhr: "prayerDhuhr", asr: "prayerAsr", maghrib: "prayerMaghrib", isha: "prayerIsha", qiyam: "salatQiyam" };
const PLACEMENT_KEY: Record<Placement | "none", CopyKey> = { chest: "salatPlaceChest", trousers: "salatPlaceTrousers", jacket: "salatPlaceJacket", none: "salatPlaceNone" };
const POSTURE_KEY: Record<Posture, CopyKey> = {
  CALIBRATING: "salatCalibrating", QIYAM: "salatPQiyam", RUKU: "salatPRuku", ITIDAL: "salatPItidal", SUJUD_1: "salatPSujud",
  JALSA: "salatPJalsa", SUJUD_2: "salatPSujud", TASHAHHUD: "salatPTashahhud",
};

/* ───────────── view ───────────── */

const STATUS: Record<SalatState, CopyKey> = {
  IDLE: "salatReady", RECITING_FATIHA: "salatWaitFatiha", ACTIVE_SURAH_TRACKING: "salatTracking", IN_RUKU_OR_SUJUD: "salatRuku",
};
const WINDOW = 20;

export function SalatModeView({ onClose, switcher }: { onClose: () => void; switcher?: ReactNode }) {
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
  // v43: motion sensors
  const motion = useRef<MotionCore | null>(null);
  const stopSensors = useRef<(() => void) | null>(null);
  const [posture, setPosture] = useState<Posture | null>(null);
  const [motionRakah, setMotionRakah] = useState(0);
  const [motionError, setMotionError] = useState(false);
  // v49: «سبحان الله» when the count passes the target (from the sensors OR the voice) — once per rakʿah.
  const alertedFor = useRef(0);
  const [extraWarn, setExtraWarn] = useState(false);

  useEffect(() => { void loadMushaf().then(setMushaf).catch(() => {}); void loadQuranPhonemes().catch(() => {}); }, []);
  useEffect(() => () => { stopPrompt(); }, []);

  // Targets: al-Fātiḥah while it is recited / between rakʿāt (never judged), the located passage after it.
  const fatiha = useMemo(() => (mushaf ? Array.from({ length: 7 }, (_, i) => salatVerse(1, i + 1, mushaf.words(1, i + 1))) : []), [mushaf]);
  const active = phase.state === "ACTIVE_SURAH_TRACKING" && verses.length ? verses : fatiha;
  const targets = useMemo(() => active.map((v) => v.words.join(" ")), [active]);
  const tokens = useMemo(() => targets.flatMap((s) => s.split(" ")), [targets]);
  const refs = useMemo(() => (lexicon ? active.flatMap((v) => phonemeRefs(lexicon, v.surah, v.ayah, v.words as string[])) : null), [lexicon, active]);
  // v49: background — the prayer is followed with the screen off / phone in the pocket
  const rec = useRecitation(targets, { phonemeRefs: refs, forceLive: true, keepAudio: false, background: true });

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
        if (e.state === "IN_RUKU_OR_SUJUD") { stopPrompt(); motion.current?.speechCue(performance.now()); }
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
    // v51 hard lockout: with the sensors on, prompt only while standing upright (qiyām, θ < 25°) —
    // never in rukūʿ, sujūd or the tashahhud, whatever the speech engine thinks.
    const m = motion.current;
    if (m?.calibrated && (m.posture !== "QIYAM" || m.tilt >= (m.placement === "trousers" ? 25 : 35))) return;
    if (tracker.current.state === "IN_RUKU_OR_SUJUD") return;
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
    if (tracker.current.passive) return; // v43: Fātiḥah-only rakʿah
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
    let last = 0;
    const step = () => {
      const now = Date.now();
      if (now - last < 200) return;
      last = now;
      const { rec: r, prefs: p, prompting: busy } = live.current;
      if (!r.listening || r.paused && !busy) return;
      apply(tracker.current.tick({ now, match: r.match, voiced: r.voicedLast(p.silenceMs / 1000), prompting: busy }));
    };
    const id = setInterval(step, 250);
    window.addEventListener("qm:mic-tick", step); // v49: keeps going with the screen off
    return () => { clearInterval(id); window.removeEventListener("qm:mic-tick", step); };
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

  /* v43: sensor events → rakʿah, posture, muting, reminders */
  const rawLen = () => {
    const r = live.current.rec;
    return r.transcriptKind === "phonemes" ? r.transcript.length : r.transcript.trim().split(/\s+/).filter(Boolean).length;
  };
  const onMotion = useCallback((events: MotionEvent[]) => {
    const now = Date.now();
    const tr = tracker.current;
    for (const e of events) {
      if (e.type === "calibrated") setPosture("QIYAM");
      else if (e.type === "posture") setPosture(e.posture);
      else if (e.type === "mute") { stopPrompt(); apply(tr.motionMute(now, rawLen())); }
      else if (e.type === "newRakah") {
        setMotionRakah(e.rakah);
        tr.setPassive(fatihaOnlyRakah(live.current.prefs.prayer, e.rakah));
        apply(tr.motionNewRakah(now, rawLen(), e.rakah));
      } else if (e.type === "tooMany") {
        alertExtraRef.current(e.completed + 1);
      } else if (e.type === "tooFew") {
        remind();
      }
    }
  }, [apply]); // eslint-disable-line react-hooks/exhaustive-deps

  /** «سبحان الله» — bypasses the rukūʿ/sujūd mute (that only silences the Sheikh's prompts). */
  const remind = () => {
    const r = live.current.rec;
    if (r.canPause) r.pause();
    void playSubhanAllah(live.current.prefs.volume).catch(() => {}).finally(() => { if (r.canPause && tracker.current.state !== "IDLE") live.current.rec.resume(); });
  };
  /** Too many rakʿāt: alert at once (audio + «اجلس للتشهد»), once per rakʿah number. */
  const alertExtra = (rakah: number) => {
    if (rakah <= alertedFor.current) return;
    alertedFor.current = rakah;
    setExtraWarn(true);
    window.setTimeout(() => setExtraWarn(false), 9000);
    remind();
  };
  const alertExtraRef = useRef(alertExtra);
  alertExtraRef.current = alertExtra;

  const start = () => {
    unlockSubhanAllah(); // v49: inside the tap
    // v49: microphone foreground service — the prayer is followed with the screen off / phone in the pocket.
    void backgroundAudio().then((p) => p?.startHandsFree({ title: ar ? "رفيق الصلاة" : t("hubSalat"), text: ar ? "رفيق الصلاة نشط – يتابع صلاتك بصمت" : t("salatWaitFatiha") })).catch(() => {});
    alertedFor.current = 0; setExtraWarn(false);
    // v43: sensors first — iOS grants motion access only inside this tap.
    stopSensors.current?.(); stopSensors.current = null; motion.current = null;
    setPosture(null); setMotionRakah(0); setMotionError(false);
    if (prefs.placement !== "none") {
      const core = new MotionCore({ placement: prefs.placement, prayer: prefs.prayer, target: targetRakaat(prefs.prayer, prefs.qiyamCount) });
      motion.current = core;
      setPosture("CALIBRATING"); setMotionRakah(1);
      void requestMotionPermission().then(async (ok) => {
        if (!ok || motion.current !== core) { if (!ok) { setMotionError(true); setPosture(null); motion.current = null; } return; }
        const stop = await startMotionSensors(core, onMotion);
        if (motion.current === core) stopSensors.current = stop; else stop();
      }).catch(() => { setMotionError(true); setPosture(null); motion.current = null; });
    }
    stopPrompt(); stopSheikhAudio();
    userStop.current = false;
    stale.current = null;
    tracker.current = new SalatPrayerTracker({ silenceMs: prefs.silenceMs, promptMode: prefs.promptMode });
    apply(tracker.current.start(Date.now()));
    tracker.current.setPassive(false);
    setRunning(true);
    if (!rec.listening) rec.toggle();
  };
  const end = () => {
    void backgroundAudio().then((p) => p?.stopHandsFree()).catch(() => {});
    stopSensors.current?.(); stopSensors.current = null; motion.current = null; setPosture(null);
    userStop.current = true;
    stopPrompt();
    apply(tracker.current.stop());
    setRunning(false);
    if (rec.listening) rec.reset();
    setVerses([]);
  };
  useEffect(() => () => { userStop.current = true; stopSensors.current?.(); void backgroundAudio().then((p) => p?.stopHandsFree()).catch(() => {}); }, []);

  const preview = async () => {
    if (previewing) { stopPrompt(); setPreviewing(false); return; }
    setPreviewing(true);
    try { await playPrompt({ reciterId: prefs.reciterId, surah: 1, ayah: 2, fromWord: 1, toWord: 3, words: 4, volume: prefs.volume }); } catch { /* offline */ }
    setPreviewing(false);
  };

  const ar = language === "ar";
  const reciterName = (id: string) => { const r = getReciter(id); return ar ? r.nameArabic : r.nameEnglish; };
  const located = phase.state === "ACTIVE_SURAH_TRACKING" && verses[0] ? getSurahMeta(verses[0].surah) : null;
  // v43: with the sensors on, they count the rakʿāt.
  const sensing = motion.current != null && posture != null;
  const shownRakah = sensing && motionRakah > 0 ? motionRakah : phase.rakah;
  const target = targetRakaat(prefs.prayer, prefs.qiyamCount);
  const num = (n: number) => (ar ? n.toLocaleString("ar-EG") : String(n));
  const prayerName = ar ? `صلاة ${PRAYER_AR[prefs.prayer]}` : t(PRAYER_KEY[prefs.prayer]);
  // v49 strict guard: whichever counter passed the target (e.g. «الركعة ٣ من ٢» in Fajr) → alert immediately.
  useEffect(() => {
    if (running && target != null && shownRakah > target) alertExtraRef.current(shownRakah);
  }, [running, shownRakah, target]);
  const statusLine = [prayerName, target ? t("salatRakahOf").replace("{n}", num(shownRakah)).replace("{m}", num(target)) : t("salatRakah").replace("{n}", num(shownRakah)), posture && posture !== "CALIBRATING" ? t(POSTURE_KEY[posture]) : null].filter(Boolean).join(" • ");

  /* ── during the prayer ── */
  if (running) {
    const dot = phase.state === "IN_RUKU_OR_SUJUD" ? "#7c5a12" : phase.state === "ACTIVE_SURAH_TRACKING" ? "#0f5f45" : "#3b4b44";
    return (
      <div className="qm-native-colors fixed inset-0 z-[70] flex select-none flex-col items-center justify-between bg-black px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]" data-salat="running" data-salat-state={phase.state}>
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs tracking-widest text-neutral-700" data-salat-rakah={shownRakah}>{t("salatRakah").replace("{n}", num(shownRakah))}</p>
          {/* v43: «صلاة العشاء • الركعة ٢ من ٤ • قيام» */}
          <p className="text-[11px] text-neutral-700" data-salat-line="" data-salat-posture={posture ?? ""}>{statusLine}</p>
        </div>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="h-2.5 w-2.5 rounded-full transition-colors duration-700" style={{ background: dot, boxShadow: `0 0 18px ${dot}` }} aria-hidden="true" />
          <p className={`${ar ? "font-arabic text-2xl" : "text-xl"} leading-relaxed text-neutral-500`} data-salat-status="">{t(STATUS[phase.state])}</p>
          {located && <p className="font-arabic text-sm text-neutral-700" data-salat-surah={verses[0]!.surah}>{`سورة ${located.nameArabic}`}</p>}
          {prompting && <p className="text-xs text-amber-900/80" data-salat-prompting="">{t("salatPrompting")}</p>}
          {extraWarn && (
            <p className={`${ar ? "font-arabic text-lg" : "text-base"} max-w-xs rounded-2xl border border-amber-700/60 px-4 py-3 leading-relaxed text-amber-500`} role="alert" data-salat-extra="">
              {t("salatExtraWarn").replace("{prayer}", ar ? PRAYER_AR[prefs.prayer] : t(PRAYER_KEY[prefs.prayer]))}
            </p>
          )}
          {rec.error && <p className="max-w-xs text-xs text-red-900">{t(rec.error)}</p>}
          {posture === "CALIBRATING" && <p className="max-w-xs text-sm leading-relaxed text-emerald-900" data-salat-calibrating="">{t("salatCalibrateHint")}</p>}
          {motionError && <p className="max-w-xs text-xs text-red-900" data-salat-motion-error="">{t("salatMotionDenied")}</p>}
        </div>
        {sensing ? (
          // In a pocket the screen may be touched by accident: ending needs a long press.
          <HoldButton onHold={end} label={t("salatEndHold")} />
        ) : (
          <button type="button" onClick={end} data-salat-end=""
            className="rounded-full border border-neutral-800 px-6 py-2.5 text-sm text-neutral-500 active:bg-neutral-900">
            <Square className="me-2 inline h-3.5 w-3.5" />{t("salatEnd")}
          </button>
        )}
      </div>
    );
  }

  /* ── before the prayer: v52 Guided Companion Studio ── */
  const rk = (p: PrayerId) => (p === "qiyam" ? (prefs.qiyamCount ?? null) : targetRakaat(p, null));
  const rkLabel = (p: PrayerId) => {
    const n = rk(p);
    if (n == null) return t("salatOpen");
    return ar && n === 2 ? "ركعتان" : t("salatRakaatN").replace("{n}", num(n));
  };
  return (
    <StudioShell data={{ "data-salat": "setup" }} switcher={switcher} onClose={() => { stopPrompt(); onClose(); }} closeLabel={t("close")}
      title={ar ? "رفيق الصلاة" : t("hubSalat")} intro={t("salatIntro")}>
      {/* v43: which prayer, and where the phone is (motion sensors count the rakʿāt) */}
      <StudioCard title={ar ? "اختيار الصلاة" : t("salatPrayer")} icon={<Clock3 className="h-4 w-4" />} data-salat-prayer-setup="">
        <div className="grid grid-cols-3 gap-2.5" role="radiogroup">
          {PRAYERS.map((p) => (
            <PrayerCard key={p} on={prefs.prayer === p} latin={!ar} name={ar ? PRAYER_AR[p] : t(PRAYER_NAME_KEY[p])} sub={rkLabel(p)} total={rk(p)} full={p === "qiyam" ? (rk(p) ?? 0) : Math.min(2, rk(p) ?? 0)}
              onClick={() => setPrefs({ prayer: p })} data={{ "data-salat-prayer": p }} />
          ))}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.85rem] sx-ink-soft" data-salat-dots-legend="">
          <span className="inline-flex items-center gap-1.5"><RakahDots total={1} full={1} />{t("salatDotFull")}</span>
          <span className="inline-flex items-center gap-1.5"><RakahDots total={1} full={0} />{t("salatDotFatiha")}</span>
        </p>
        {prefs.prayer === "qiyam" && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("salatQiyamCount")}>
            {QIYAM_OPTIONS.map((n) => (
              <button key={String(n)} type="button" role="radio" aria-checked={prefs.qiyamCount === n} onClick={() => setPrefs({ qiyamCount: n })} data-salat-qiyam={n ?? "open"}
                className={studioChoice(prefs.qiyamCount === n, "min-w-[3.25rem] rounded-full px-4")}>
                {n == null ? t("salatOpen") : num(n)}
              </button>
            ))}
          </div>
        )}
      </StudioCard>

      <StudioCard title={ar ? "مكان وضع الهاتف" : t("salatPlacement")} icon={<Smartphone className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
          {PLACEMENTS.map((pl) => (
            <PlacementCard key={pl} kind={pl} on={prefs.placement === pl} label={t(PLACEMENT_KEY[pl])} onClick={() => setPrefs({ placement: pl })} data={{ "data-salat-placement": pl }} />
          ))}
        </div>
        {prefs.placement !== "none" && <p className="text-[0.9rem] leading-relaxed sx-ink-soft" data-salat-calib-note="">{t("salatCalibrateNote")}</p>}
      </StudioCard>

      <StudioCard title={t("salatVoiceCard")} icon={<Volume2 className="h-4 w-4" />}>
        <label className="block text-[0.98rem] font-semibold sx-ink" htmlFor="salat-reciter">{ar ? "اختيار القارئ للتذكير الصوتي" : t("salatReciter")}</label>
        <div className="flex gap-2">
          <select id="salat-reciter" value={prefs.reciterId} onChange={(e) => setPrefs({ reciterId: e.target.value })} data-salat-reciter=""
            className="min-h-[52px] min-w-0 flex-1 rounded-2xl border-0 px-3 text-[0.98rem] font-semibold sx-chip sx-ink">
            {SALAT_RECITERS.map((r) => <option key={r.id} value={r.id}>{reciterName(r.id)}</option>)}
          </select>
          <button type="button" onClick={() => void preview()} data-salat-preview="" className={studioChoice(previewing, "flex shrink-0 items-center gap-1.5")}>
            {previewing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}{t("salatPreview")}
          </button>
        </div>
        <StudioSlider id="salat-silence" label={t("salatSilence")} value={prefs.silenceMs} display={`${(prefs.silenceMs / 1000).toFixed(1)} s`}
          min={SILENCE_RANGE_MS[0]} max={SILENCE_RANGE_MS[1]} step={500} onChange={(v) => setPrefs({ silenceMs: v })} data={{ "data-salat-silence": "" }} />
        <p className="text-[0.98rem] font-semibold sx-ink">{t("salatPromptLength")}</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(["words", "ayah"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={prefs.promptMode === m} onClick={() => setPrefs({ promptMode: m })} data-salat-mode={m} className={studioChoice(prefs.promptMode === m)}>
              <span className="block font-arabic">{m === "words" ? "كلمات قليلة" : "آية كاملة"}</span>
              {!ar && <span className="block text-xs font-medium opacity-75">{t(m === "words" ? "salatWords" : "salatAyah")}</span>}
            </button>
          ))}
        </div>
        <StudioSlider id="salat-volume" label={<><Volume2 className="h-4 w-4" />{t("salatVolume")}</>} value={Math.round(prefs.volume * 100)} display={`${Math.round(prefs.volume * 100)} %`}
          min={5} max={100} step={5} onChange={(v) => setPrefs({ volume: v / 100 })} data={{ "data-salat-volume": "" }} />
      </StudioCard>

      <ul className="space-y-1.5 px-1 text-[0.9rem] leading-relaxed sx-ink-soft">
        <li>• {t("salatNoteFatiha")}</li>
        <li>• {t("salatNoteTakbir")}</li>
        <li>• {t("salatNotePrivacy")}</li>
      </ul>

      <GlowStart onClick={start} disabled={!mushaf} data={{ "data-salat-start": "" }}>
        <PrayingPersonIcon className="h-7 w-7 shrink-0" />{ar ? <span className="font-arabic">ابدأ رفيق الصلاة</span> : <span>{t("salatStartCompanion")}</span>}
      </GlowStart>
    </StudioShell>
  );
}

export default SalatModeView;

/** v43: a button that acts only after being held for 1.2 s (no accidental taps from a pocket). */
function HoldButton({ onHold, label }: { onHold: () => void; label: string }) {
  const [p, setP] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; setP(0); };
  const begin = () => {
    stop();
    const t0 = Date.now();
    timer.current = setInterval(() => {
      const v = Math.min(1, (Date.now() - t0) / 1200);
      setP(v);
      if (v >= 1) { stop(); onHold(); }
    }, 40);
  };
  useEffect(() => stop, []);
  return (
    <button type="button" onPointerDown={begin} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()} data-salat-end="" data-salat-hold=""
      className="relative overflow-hidden rounded-full border border-neutral-800 px-6 py-2.5 text-sm text-neutral-500">
      <span className="absolute inset-y-0 start-0 bg-neutral-900" style={{ width: `${p * 100}%` }} aria-hidden="true" />
      <span className="relative"><Square className="me-2 inline h-3.5 w-3.5" />{label}</span>
    </button>
  );
}
