/**
 * Sheikh recitation playback that keeps going with the screen off or the app in the background.
 *
 *  - One shared <audio> element for every verse: the next verse starts on the same element, which the
 *    browser / WebView treats as one continuing media session (a new element per verse can be refused
 *    in the background).
 *  - Media Session API (web, iOS): title, Sheikh and play / pause / next / previous on the lock screen
 *    and in the notification shade.
 *  - Android app: the WebView has no Media Session API and Android would put a backgrounded app to
 *    sleep, so the native BackgroundAudio plugin (native/android/, installed by
 *    scripts/native-permissions.mjs) runs a media-playback foreground service with a notification
 *    (play / pause, stop) while a recitation plays.
 *  - iOS app: background audio is enabled in Info.plist (UIBackgroundModes audio) by the same script.
 *
 * Playback stops only when the user pauses / stops (in the app, on the lock screen, in the
 * notification) or the recitation finishes.
 */
import { assetUrl } from "@/lib/assets";
import { platform } from "@/lib/storage";

type NativeAction = { action: "toggle" | "stop" };
type ListenerHandle = { remove: () => Promise<void> };
interface BackgroundAudioPlugin {
  update(options: { title: string; artist: string; playing: boolean }): Promise<void>;
  stop(): Promise<void>;
  addListener(event: "action", cb: (a: NativeAction) => void): Promise<ListenerHandle>;
}
/** The native plugin (Android app only); loaded on first use. */
let plugin: Promise<BackgroundAudioPlugin | null> | null = null;
function backgroundAudio(): Promise<BackgroundAudioPlugin | null> {
  plugin ??= platform() !== "android" ? Promise.resolve(null) : import("@capacitor/core")
    .then(({ Capacitor, registerPlugin }) => (Capacitor.isPluginAvailable("BackgroundAudio") ? registerPlugin<BackgroundAudioPlugin>("BackgroundAudio") : null))
    .catch(() => null);
  return plugin;
}

/* ───────────── the shared element ───────────── */

let element: HTMLAudioElement | null = null;

/** The one <audio> element all Sheikh playback uses; handlers of the previous verse are removed. */
export function sheikhAudio(src: string): HTMLAudioElement {
  element ??= new Audio();
  const a = element;
  a.onended = null; a.onerror = null; a.ontimeupdate = null;
  a.preload = "auto";
  a.setAttribute("playsinline", "");
  if (a.src !== src) a.src = src;
  else a.currentTime = 0;
  return a;
}

/** Stops whatever the shared element plays (keeps the element). */
export function stopSheikhAudio() {
  if (!element) return;
  element.onended = null; element.onerror = null;
  element.pause();
}

/* ───────────── session: lock screen / notification ───────────── */

export type SessionInfo = { title: string; artist: string; album?: string | undefined };
export type SessionHandlers = { onPlay: () => void; onPause: () => void; onStop: () => void; onNext?: (() => void) | undefined; onPrevious?: (() => void) | undefined };

let handlers: SessionHandlers | null = null;
let nativeListener: Promise<ListenerHandle | null> | null = null;
let current: { info: SessionInfo; playing: boolean } | null = null;

function mediaSession(): MediaSession | null {
  return typeof navigator !== "undefined" && "mediaSession" in navigator ? navigator.mediaSession : null;
}

function bindWebHandlers() {
  const ms = mediaSession();
  if (!ms) return;
  const set = (action: MediaSessionAction, fn: (() => void) | null) => { try { ms.setActionHandler(action, fn); } catch { /* unsupported action */ } };
  set("play", handlers ? () => handlers?.onPlay() : null);
  set("pause", handlers ? () => handlers?.onPause() : null);
  set("stop", handlers ? () => handlers?.onStop() : null);
  set("nexttrack", handlers?.onNext ? () => handlers?.onNext?.() : null);
  set("previoustrack", handlers?.onPrevious ? () => handlers?.onPrevious?.() : null);
}

/**
 * Shows / updates the playing recitation on the lock screen and in the notification (and on Android keeps
 * the app awake while it plays). Call on every verse change and on play / pause.
 */
export function updateSession(info: SessionInfo, playing: boolean, h: SessionHandlers) {
  handlers = h;
  current = { info, playing };
  const ms = mediaSession();
  if (ms) {
    try {
      const icon = new URL(assetUrl("icon-512.png"), location.href).href;
      ms.metadata = new MediaMetadata({ title: info.title, artist: info.artist, album: info.album ?? "Quran Muallem", artwork: [{ src: icon, sizes: "512x512", type: "image/png" }] });
      ms.playbackState = playing ? "playing" : "paused";
    } catch { /* MediaMetadata missing */ }
    bindWebHandlers();
  }
  void backgroundAudio().then((native) => {
    if (!native) return;
    nativeListener ??= native.addListener("action", ({ action }) => {
      if (action === "stop") handlers?.onStop();
      else if (current?.playing) handlers?.onPause(); else handlers?.onPlay();
    }).catch(() => null);
    return native.update({ title: info.title, artist: info.artist, playing });
  }).catch(() => {});
}

/** The recitation ended or was stopped: remove the lock-screen controls and the notification. */
export function endSession() {
  handlers = null;
  current = null;
  const ms = mediaSession();
  if (ms) { try { ms.metadata = null; ms.playbackState = "none"; } catch { /* ignore */ } bindWebHandlers(); }
  void backgroundAudio().then((native) => native?.stop()).catch(() => {});
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
