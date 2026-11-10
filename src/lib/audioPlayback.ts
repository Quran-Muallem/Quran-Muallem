/**
 * Sheikh recitation playback that keeps going with the screen off or the app in the background.
 *
 *  - One shared <audio> element for every verse: the next verse starts on the same element, which the
 *    browser / WebView treats as one continuing media session (a new element per verse can be refused
 *    in the background).
 *  - Media Session API (web, iOS): title, Sheikh and play / pause / next / previous on the lock screen
 *    and in the notification shade.
 *  - Android app: the WebView has no usable Media Session and Android would put a backgrounded app to
 *    sleep, so the native BackgroundAudio plugin (native/android/, installed by
 *    scripts/native-permissions.mjs) runs a media-playback foreground service with a real MediaSession
 *    (lock screen: surah, «بصوت الشيخ …», artwork, seekable progress, play / pause, previous / next) and a
 *    wake + Wi-Fi lock while a recitation plays. (v23/v24 used @capgo/capacitor-media-session instead,
 *    which holds no wake lock — playback stopped with the screen off. Do not go back to it.)
 *  - iOS app: background audio is enabled in Info.plist (UIBackgroundModes audio) by the same script.
 *
 * Playback stops only when the user pauses / stops (in the app, on the lock screen, in the
 * notification) or the recitation finishes.
 */
import { assetUrl } from "@/lib/assets";
import { platform } from "@/lib/storage";
import { getSettings, subscribeSettings } from "@/lib/settings";
import { thenSafe } from "@/lib/thenSafe";

type NativeAction = { action: "toggle" | "play" | "pause" | "next" | "previous" | "stop" | "seekto"; seekTime?: number };
type ListenerHandle = { remove: () => Promise<void> };
/** v29 native player of the Android app: state reported by the service (seconds). */
export type NativePlayerEvent = { state: "loading" | "playing" | "paused" | "ended" | "stopped" | "error"; index: number; position: number; duration: number };
export type NativePlayerItem = { url: string; title: string; artist: string; album: string };
export type NativeDownloadEvent = { id: string; received: number; total: number };
export interface BackgroundAudioPlugin {
  update(options: { title: string; artist: string; album: string; playing: boolean; position: number; duration: number; canPrev: boolean; canNext: boolean }): Promise<void>;
  stop(): Promise<void>;
  /** v29: native download into the app's files folder (`path` relative to it); rejects on failure / cancel. */
  download(options: { id: string; url: string; path: string }): Promise<{ bytes: number }>;
  cancelDownload(options: { id: string }): Promise<void>;
  /** v29: native playlist player (MediaPlayer in the foreground service). */
  playerLoad(options: { items: NativePlayerItem[]; index: number; startMs: number }): Promise<void>;
  playerControl(options: { action: "pause" | "resume" | "stop" | "seek" | "next" | "previous" | "index" | "rate"; ms?: number; index?: number }): Promise<void>;
  playerMarks(options: { index: number; marks: number[] }): Promise<void>;
  addListener(event: "action", cb: (a: NativeAction) => void): Promise<ListenerHandle>;
  addListener(event: "player", cb: (e: NativePlayerEvent) => void): Promise<ListenerHandle>;
  addListener(event: "download", cb: (e: NativeDownloadEvent) => void): Promise<ListenerHandle>;
}
/** The native plugin (Android app only); loaded on first use. */
let plugin: Promise<BackgroundAudioPlugin | null> | null = null;
export function backgroundAudio(): Promise<BackgroundAudioPlugin | null> {
  plugin ??= platform() !== "android" ? Promise.resolve(null) : import("@capacitor/core")
    .then(({ Capacitor, registerPlugin }) => (Capacitor.isPluginAvailable("BackgroundAudio") ? thenSafe(registerPlugin<BackgroundAudioPlugin>("BackgroundAudio")) : null))
    .catch(() => null);
  return plugin;
}

/* ───────────── the shared element ───────────── */

let element: HTMLAudioElement | null = null;

/** The one <audio> element all Sheikh playback uses; handlers of the previous verse are removed. */
export function sheikhAudio(src: string): HTMLAudioElement {
  watchRate();
  element ??= new Audio();
  const a = element;
  a.onended = null; a.onerror = null; a.ontimeupdate = null; a.onloadedmetadata = null;
  a.preload = "auto";
  a.setAttribute("playsinline", "");
  if (a.src !== src) a.src = src;
  else a.currentTime = 0;
  applyRate(a);
  return a;
}

/** «سرعة التلاوة» (v30): the Sheikh's playback speed, kept across sources (and pitch preserved). */
function applyRate(a: HTMLAudioElement) {
  const r = getSettings().playbackRate || 1;
  a.defaultPlaybackRate = r; a.playbackRate = r;
  (a as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
}
let rateWatch = false;
function watchRate() {
  if (rateWatch) return;
  rateWatch = true;
  let last = getSettings().playbackRate;
  subscribeSettings(() => {
    const r = getSettings().playbackRate;
    if (r === last) return;
    last = r;
    if (element) applyRate(element);
    void backgroundAudio().then((p) => p?.playerControl({ action: "rate", ms: r * 1000 }).catch(() => {}));
  });
}

/**
 * Who plays on the shared element (Mushaf / Recite verse player, the reciters library …). A new owner
 * takes it over and the previous one is told to drop its "playing" state.
 */
let owner: { id: symbol; lost: () => void } | null = null;
export function claimSheikhAudio(id: symbol, lost: () => void) {
  if (owner && owner.id !== id) { const prev = owner; owner = null; prev.lost(); }
  owner = { id, lost };
}
export function releaseSheikhAudio(id: symbol) { if (owner?.id === id) owner = null; }

/** Stops whatever the shared element plays (keeps the element). */
export function stopSheikhAudio() {
  if (!element) return;
  element.onended = null; element.onerror = null;
  element.pause();
}

/* ───────────── session: lock screen / notification ───────────── */

export type SessionInfo = { title: string; artist: string; album?: string | undefined };
export type SessionHandlers = {
  onPlay: () => void; onPause: () => void; onStop: () => void;
  onNext?: (() => void) | undefined; onPrevious?: (() => void) | undefined;
  /** Seek inside the current verse (seconds), from the lock-screen progress bar. */
  onSeek?: ((seconds: number) => void) | undefined;
};

let handlers: SessionHandlers | null = null;
let nativeListener: Promise<ListenerHandle | null> | null = null;
let current: { info: SessionInfo; playing: boolean } | null = null;

function mediaSession(): MediaSession | null {
  return typeof navigator !== "undefined" && "mediaSession" in navigator ? navigator.mediaSession : null;
}

function bindWebHandlers() {
  const ms = mediaSession();
  if (!ms) return;
  const set = (action: MediaSessionAction, fn: MediaSessionActionHandler | null) => { try { ms.setActionHandler(action, fn); } catch { /* unsupported action */ } };
  set("play", handlers ? () => handlers?.onPlay() : null);
  set("pause", handlers ? () => handlers?.onPause() : null);
  set("stop", handlers ? () => handlers?.onStop() : null);
  set("nexttrack", handlers?.onNext ? () => handlers?.onNext?.() : null);
  set("previoustrack", handlers?.onPrevious ? () => handlers?.onPrevious?.() : null);
  set("seekto", handlers?.onSeek ? (d) => { if (d.seekTime != null) handlers?.onSeek?.(d.seekTime); } : null);
}

const position = () => {
  const a = element;
  const duration = a && Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 0;
  return { position: a ? (duration ? Math.min(a.currentTime, duration) : a.currentTime) : 0, duration, rate: a?.playbackRate || 1 };
};

/** Tells the native service (Android) the current state; this also renews its wake lock. */
async function pushNative(native: BackgroundAudioPlugin) {
  const c = current;
  if (!c) return;
  const p = position();
  await native.update({
    title: c.info.title, artist: c.info.artist, album: c.info.album ?? "Quran Muallem", playing: c.playing,
    position: p.position, duration: p.duration, canPrev: !!handlers?.onPrevious, canNext: !!handlers?.onNext,
  }).catch(() => {});
}

/** Progress bar of the lock-screen player: the position every few seconds (Android: renews the wake lock). */
let progressTimer: ReturnType<typeof setInterval> | null = null;
function trackProgress(native: BackgroundAudioPlugin | null, playing: boolean) {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
  const report = () => {
    if (native) { void pushNative(native); return; }
    const p = position();
    if (p.duration) { try { mediaSession()?.setPositionState?.({ duration: p.duration, position: p.position, playbackRate: p.rate }); } catch { /* unsupported */ } }
  };
  if (element) element.onloadedmetadata = report;
  report();
  if (playing) progressTimer = setInterval(report, native ? 5000 : 1000);
}

/**
 * Shows / updates the playing recitation on the lock screen and in the notification (and on Android keeps
 * the app awake while it plays). Call on every verse change and on play / pause.
 */
export function updateSession(info: SessionInfo, playing: boolean, h: SessionHandlers) {
  handlers = h;
  current = { info, playing };
  void backgroundAudio().then(async (native) => {
    if (native) {
      nativeListener ??= native.addListener("action", ({ action, seekTime }) => {
        if (action === "stop") handlers?.onStop();
        else if (action === "play") handlers?.onPlay();
        else if (action === "pause") handlers?.onPause();
        else if (action === "next") handlers?.onNext?.();
        else if (action === "previous") handlers?.onPrevious?.();
        else if (action === "seekto") { if (seekTime != null) handlers?.onSeek?.(seekTime); }
        else if (current?.playing) handlers?.onPause(); else handlers?.onPlay();
      }).catch(() => null);
      await pushNative(native);
      trackProgress(native, playing);
      return;
    }
    const ms = mediaSession();
    if (!ms) return;
    try {
      ms.metadata = new MediaMetadata({
        title: info.title, artist: info.artist, album: info.album ?? "Quran Muallem",
        artwork: [192, 512].map((s) => ({ src: new URL(assetUrl(`icon-${s}.png`), location.href).href, sizes: `${s}x${s}`, type: "image/png" })),
      });
      ms.playbackState = playing ? "playing" : "paused";
    } catch { /* MediaMetadata missing */ }
    bindWebHandlers();
    trackProgress(null, playing);
  }).catch(() => {});
}

/**
 * The native player (reciters library) takes over the service: forget the web session (handlers, progress
 * reports) without stopping the service — a report from it would end the native playlist.
 */
export function detachWebSession() {
  handlers = null;
  current = null;
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

/** The recitation ended or was stopped: remove the lock-screen controls and the notification. */
export function endSession() {
  handlers = null;
  current = null;
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
  void backgroundAudio().then(async (native) => {
    if (native) { await native.stop().catch(() => {}); return; }
    const ms = mediaSession();
    if (ms) { try { ms.metadata = null; ms.playbackState = "none"; } catch { /* ignore */ } bindWebHandlers(); }
  }).catch(() => {});
}

/**
 * Lock-screen texts in the app language: title «سورة الفاتحة» (with «· الآية ٣» while playing verse by
 * verse), artist «بصوت الشيخ مشاري العفاسي».
 */
export type MediaTextKey = "mediaByReciter" | "mediaSurah" | "mediaAyah";
export function sessionTexts(t: (k: MediaTextKey) => string, o: { language: string; surahArabic: string; surahSimple: string; ayah?: number | null; reciterArabic: string; reciterEnglish: string }) {
  const ar = o.language === "ar" || o.language === "ur";
  const digits = (n: number) => (o.language === "ar" ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]!) : String(n));
  const surah = t("mediaSurah").replace("{surah}", ar ? o.surahArabic : o.surahSimple);
  return {
    title: o.ayah ? `${surah} · ${t("mediaAyah").replace("{ayah}", digits(o.ayah))}` : surah,
    artist: t("mediaByReciter").replace("{name}", ar ? o.reciterArabic : o.reciterEnglish),
  };
}

/* ───────────── one word in the Sheikh's voice ───────────── */

/**
 * Plays one word (e.g. a word recited wrongly, from the word popover).
 *  1. In the selected Sheikh's voice: Quran.com's verse recording of that Sheikh with its word timings
 *     (`segments`), played from the word's start to its end. Needs the internet once per verse.
 *  2. Otherwise (no timings for this Sheikh, offline): Quran.com's word-by-word recording (one standard voice).
 * Resolves with which voice played, or rejects if neither could play.
 */
export type WordVoice = "sheikh" | "wordByWord";
const QURAN_API = "https://api.quran.com/api/v4";
const VERSES_CDN = "https://verses.quran.com/";
const WBW_CDN = "https://audio.qurancdn.com/";
const pad3 = (n: number) => String(n).padStart(3, "0");
type Timed = { url: string; segments: [number, number, number][] };
const timings = new Map<string, Promise<Timed | null>>();
let wordAudio: HTMLAudioElement | null = null;
let wordStop: ReturnType<typeof setTimeout> | null = null;

/** Normalizes Quran.com segments ([pos, start, end] or [index, pos, start, end]) to [pos, start, end]. */
export function normalizeSegments(raw: unknown): [number, number, number][] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s): [number, number, number][] => {
    if (!Array.isArray(s)) return [];
    const n = s.map(Number);
    if (n.length >= 4 && n.every(Number.isFinite)) return [[n[1]!, n[2]!, n[3]!]];
    if (n.length === 3 && n.every(Number.isFinite)) return [[n[0]!, n[1]!, n[2]!]];
    return [];
  }).filter(([, a, b]) => b > a);
}

function verseTimings(quranComId: number, surah: number, ayah: number): Promise<Timed | null> {
  const key = `${quranComId}/${surah}:${ayah}`;
  let p = timings.get(key);
  if (!p) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    p = fetch(`${QURAN_API}/recitations/${quranComId}/by_ayah/${surah}:${ayah}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { audio_files?: { url?: string; segments?: unknown }[] } | null) => {
        const f = d?.audio_files?.[0];
        if (!f?.url) return null;
        const segments = normalizeSegments(f.segments);
        if (!segments.length) return null;
        const url = /^https?:/.test(f.url) ? f.url : f.url.startsWith("//") ? `https:${f.url}` : VERSES_CDN + f.url.replace(/^\//, "");
        return { url, segments };
      })
      .catch(() => null)
      .finally(() => clearTimeout(timer));
    timings.set(key, p);
    void p.then((v) => { if (!v) timings.delete(key); });
  }
  return p;
}

export function stopWordAudio() {
  if (wordStop) { clearTimeout(wordStop); wordStop = null; }
  wordAudio?.pause();
}

async function playClip(url: string, fromMs = 0, toMs?: number) {
  stopWordAudio();
  wordAudio ??= new Audio();
  const a = wordAudio;
  a.src = url;
  a.preload = "auto";
  await new Promise<void>((resolve, reject) => {
    const ok = () => { cleanup(); resolve(); };
    const bad = () => { cleanup(); reject(new Error("audio")); };
    const cleanup = () => { a.removeEventListener("loadedmetadata", ok); a.removeEventListener("error", bad); };
    if (a.readyState >= 1) return resolve();
    a.addEventListener("loadedmetadata", ok);
    a.addEventListener("error", bad);
    a.load();
  });
  a.currentTime = fromMs / 1000;
  await a.play();
  if (toMs != null) wordStop = setTimeout(() => a.pause(), Math.max(150, toMs - fromMs + 80));
}

export async function playWord(opts: { quranComId: number | null; surah: number; ayah: number; word: number }): Promise<WordVoice> {
  const { quranComId, surah, ayah, word } = opts;
  if (quranComId != null) {
    const t = await verseTimings(quranComId, surah, ayah);
    const seg = t?.segments.find(([pos]) => pos === word) ?? (t?.segments[0]?.[0] === 0 ? t.segments.find(([pos]) => pos === word - 1) : undefined);
    if (t && seg) {
      try { await playClip(t.url, seg[1], seg[2]); return "sheikh"; } catch { /* fall back below */ }
    }
  }
  await playClip(`${WBW_CDN}wbw/${pad3(surah)}_${pad3(ayah)}_${pad3(word)}.mp3`);
  return "wordByWord";
}
