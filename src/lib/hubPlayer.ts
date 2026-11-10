/**
 * Player of the reciters library: plays a whole surah file, then the next surah of the same riwaya, until
 * paused — also with the screen off (shared <audio> element + lock-screen session of audioPlayback.ts).
 * Lock screen: «بصوت الشيخ … | سورة …», play / pause, previous / next verse (by mp3quran.net verse timing, or
 * previous / next surah without timing), artwork and a seekable progress bar.
 *
 * Android app (v29): the surahs play in the app's native player (MediaPlayer in the foreground service,
 * `playerLoad` of the BackgroundAudio plugin) — the WebView's <audio> stopped when the app was minimised or
 * the screen locked. The web layer only mirrors its state ("player" events). Older app builds without the
 * native player, iOS and the browser keep the <audio> element.
 */
import { useSyncExternalStore } from "react";
import { backgroundAudio, claimSheikhAudio, detachWebSession, endSession, releaseSheikhAudio, sessionTexts, sheikhAudio, stopSheikhAudio, updateSession, type BackgroundAudioPlugin, type NativePlayerEvent } from "@/lib/audioPlayback";
import { createSignal } from "@/lib/storage";
import { getSurahMeta } from "@/lib/quranService";
import { translate } from "@/lib/i18n";
import type { Language } from "@/i18n";
import { getHubReciter, getMoshaf, moshafSurahs, surahNativeUrl, surahPlayUrl, verseAt, verseTiming, type HubReciter, type Moshaf, type VerseTiming } from "@/lib/recitersHub";

export type HubPlayerState = {
  reciterId: number; moshafId: number; surah: number;
  playing: boolean; loading: boolean; failed: boolean;
  position: number; duration: number; ayah: number | null;
} | null;

const state = createSignal<HubPlayerState>(null);
const me = Symbol("reciters-library");
let token = 0;
let timing: VerseTiming | null = null;
let language: Language = "ar";
let el: HTMLAudioElement | null = null;

export const setHubPlayerLanguage = (l: Language) => { language = l; };
export const hubPlayerState = () => state.get();
export function useHubPlayer(): HubPlayerState { return useSyncExternalStore(state.subscribe, state.get, state.get); }
const patch = (p: Partial<NonNullable<HubPlayerState>>) => { const s = state.get(); if (s) state.set({ ...s, ...p }); };

function current(): { r: HubReciter; m: Moshaf; surah: number } | null {
  const s = state.get();
  const r = s && getHubReciter(s.reciterId);
  return s && r ? { r, m: getMoshaf(r, s.moshafId), surah: s.surah } : null;
}

function announce(playing: boolean) {
  const c = current(), s = state.get();
  if (!c || !s) return;
  const meta = getSurahMeta(c.surah);
  const ar = language === "ar" || language === "ur";
  const texts = sessionTexts((k) => translate(language, k), {
    language, surahArabic: meta?.nameArabic ?? "", surahSimple: meta?.nameSimple ?? "", ayah: s.ayah,
    reciterArabic: c.r.ar, reciterEnglish: c.r.en,
  });
  updateSession({ ...texts, album: c.m.ar }, playing, {
    onPlay: resume, onPause: pause, onStop: stop, onNext: next, onPrevious: previous,
    onSeek: (t) => { if (el) el.currentTime = t; },
  });
}

/* ───────────── native player (Android app) ───────────── */

/** The native player, when this app build has it (Android); null → <audio>. */
let nativeOk: Promise<BackgroundAudioPlugin | null> | null = null;
const nativePlayer = () => (nativeOk ??= backgroundAudio().then((p) => (p && typeof (p as Partial<BackgroundAudioPlugin>).playerLoad === "function" ? p : null)).catch(() => null));
/** Playing natively: the playlist (surahs from the started one to the end of the riwaya). */
let native: { plugin: BackgroundAudioPlugin; list: number[] } | null = null;
let nativeSub: Promise<{ remove: () => Promise<void> } | null> | null = null;

function onNativeEvent(e: NativePlayerEvent) {
  const n = native, s = state.get();
  if (!n || !s) return;
  const surah = n.list[e.index] ?? s.surah;
  if (surah !== s.surah) {
    // The service moved on to the next surah: its verse timing for the lock screen's previous / next.
    timing = null;
    const c = current();
    if (c) { const my = token; void verseTiming(c.m, surah).then((t) => { if (my !== token || !t) return; timing = t; void n.plugin.playerMarks({ index: e.index, marks: t.map((v) => v.start) }).catch(() => {}); }); }
  }
  const ayah = timing ? verseAt(timing, e.position * 1000) : null;
  if (e.state === "ended" || e.state === "stopped") {
    native = null;
    state.set(e.state === "stopped" && !s.playing ? null : { ...s, surah, playing: false, loading: false, position: 0, ayah: null });
    releaseSheikhAudio(me);
    return;
  }
  state.set({ ...s, surah, playing: e.state === "playing", loading: e.state === "loading", failed: e.state === "error", position: e.position, duration: e.duration || s.duration, ayah });
}

async function playNative(p: BackgroundAudioPlugin, my: number, r: HubReciter, m: Moshaf, surah: number, startMs: number): Promise<boolean> {
  const all = moshafSurahs(m);
  const list = all.slice(Math.max(0, all.indexOf(surah)));
  const texts = (s: number) => {
    const meta = getSurahMeta(s);
    return sessionTexts((k) => translate(language, k), { language, surahArabic: meta?.nameArabic ?? "", surahSimple: meta?.nameSimple ?? "", ayah: null, reciterArabic: r.ar, reciterEnglish: r.en });
  };
  const items = await Promise.all(list.map(async (s) => ({ url: await surahNativeUrl(r, m, s), ...texts(s), album: m.ar })));
  if (my !== token) return true;
  nativeSub ??= p.addListener("player", onNativeEvent).catch(() => null);
  await nativeSub;
  detachWebSession(); // the service now belongs to the native playlist
  try {
    await p.playerLoad({ items, index: 0, startMs });
  } catch { return false; }
  native = { plugin: p, list };
  void verseTiming(m, surah).then((t) => { if (my !== token || !t) return; timing = t; void p.playerMarks({ index: 0, marks: t.map((v) => v.start) }).catch(() => {}); });
  return true;
}

/** Starts a surah (from `startMs`, e.g. a verse). */
export async function playSurah(r: HubReciter, m: Moshaf, surah: number, startMs = 0) {
  const my = ++token;
  claimSheikhAudio(me, () => { token++; el = null; if (native) { void native.plugin.playerControl({ action: "stop" }).catch(() => {}); native = null; } patch({ playing: false, loading: false }); });
  state.set({ reciterId: r.id, moshafId: m.id, surah, playing: false, loading: true, failed: false, position: startMs / 1000, duration: 0, ayah: null });
  timing = null;
  const np = await nativePlayer();
  if (my !== token) return;
  if (np) {
    stopSheikhAudio(); el = null;
    if (await playNative(np, my, r, m, surah, startMs)) return;
  }
  void verseTiming(m, surah).then((t) => { if (my === token) { timing = t; tick(); } });
  try {
    const url = await surahPlayUrl(r, m, surah);
    if (my !== token) return;
    const a = sheikhAudio(url);
    el = a;
    a.ontimeupdate = () => { if (my === token) tick(); };
    a.onloadedmetadata = () => { if (my !== token) return; if (startMs) a.currentTime = startMs / 1000; patch({ duration: a.duration || 0 }); };
    a.onended = () => { if (my === token) void advance(1); };
    a.onerror = () => { if (my === token) { patch({ playing: false, loading: false, failed: true }); announce(false); } };
    await a.play();
    if (my !== token) return;
    patch({ playing: true, loading: false, duration: a.duration || 0 });
    announce(true);
  } catch {
    if (my === token) patch({ playing: false, loading: false, failed: true });
  }
}

let lastAyah: number | null = null;
function tick() {
  const a = el;
  if (!a) return;
  const ayah = timing ? verseAt(timing, a.currentTime * 1000) : null;
  patch({ position: a.currentTime, duration: Number.isFinite(a.duration) ? a.duration : 0, ayah });
  if (ayah !== lastAyah) { lastAyah = ayah; const s = state.get(); if (s?.playing) announce(true); }
}

/** Next / previous surah of the riwaya (stops after the last one). */
async function advance(dir: 1 | -1) {
  const c = current();
  if (!c) return;
  const list = moshafSurahs(c.m);
  const nextSurah = list[list.indexOf(c.surah) + dir];
  if (nextSurah) await playSurah(c.r, c.m, nextSurah);
  else if (dir === 1) { patch({ playing: false }); endSession(); releaseSheikhAudio(me); }
}

export function pause() {
  if (native) { void native.plugin.playerControl({ action: "pause" }).catch(() => {}); patch({ playing: false }); return; }
  el?.pause(); patch({ playing: false }); announce(false);
}
export function resume() {
  const c = current(), a = el;
  if (!c) return;
  if (native) { void native.plugin.playerControl({ action: "resume" }).catch(() => {}); patch({ playing: true }); return; }
  if (a && a.src && a.paused) void a.play().then(() => { patch({ playing: true }); announce(true); }).catch(() => void playSurah(c.r, c.m, c.surah));
  else if (!a) void playSurah(c.r, c.m, c.surah);
}
export function toggle() { const s = state.get(); if (s?.playing || s?.loading) pause(); else resume(); }
export function stop() {
  token++;
  if (native) { void native.plugin.playerControl({ action: "stop" }).catch(() => {}); native = null; state.set(null); releaseSheikhAudio(me); return; }
  stopSheikhAudio(); el = null; state.set(null); endSession(); releaseSheikhAudio(me);
}
export function seek(seconds: number) {
  if (native) { void native.plugin.playerControl({ action: "seek", ms: Math.max(0, seconds) * 1000 }).catch(() => {}); patch({ position: Math.max(0, seconds) }); return; }
  if (el) { el.currentTime = Math.max(0, seconds); tick(); }
}

/** Next verse (with timing) or next surah. */
export function next() {
  if (native) { void native.plugin.playerControl({ action: "next" }).catch(() => {}); return; }
  const a = el, s = state.get();
  if (a && timing && s?.ayah != null) {
    const n = timing.find((v) => v.ayah === s.ayah! + 1);
    if (n) { a.currentTime = n.start / 1000; tick(); return; }
  } else if (a && timing && s?.ayah == null && timing[0]) { a.currentTime = timing[0].start / 1000; tick(); return; }
  void advance(1);
}
/** Previous verse (back to the start of the current one first), or previous surah. */
export function previous() {
  if (native) {
    // The native playlist starts at the surah that was started: before it, restart from the previous surah.
    const s = state.get(), c = current();
    if (native.list[0] === s?.surah && (s?.position ?? 0) < 3 && c) { const list = moshafSurahs(c.m); const prev = list[list.indexOf(c.surah) - 1]; if (prev) { void playSurah(c.r, c.m, prev); return; } }
    void native.plugin.playerControl({ action: "previous" }).catch(() => {});
    return;
  }
  const a = el, s = state.get();
  if (a && timing && s?.ayah != null) {
    const cur = timing.find((v) => v.ayah === s.ayah);
    if (cur && a.currentTime * 1000 - cur.start > 2500) { a.currentTime = cur.start / 1000; tick(); return; }
    const p = timing.find((v) => v.ayah === s.ayah! - 1);
    if (p) { a.currentTime = p.start / 1000; tick(); return; }
  }
  if (a && a.currentTime > 3) { a.currentTime = 0; tick(); return; }
  void advance(-1);
}
