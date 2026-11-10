/**
 * Reciters library (المقرئين): 86 Sheikhs and their riwayat from mp3quran.net (one MP3 per surah).
 *
 *  - Catalogue: `src/data/recitersCatalog.json` (generated from the mp3quran.net API v3: reciters + the
 *    `ayat_timing` reads), so the list works offline.
 *  - Favourites: kv `hifz.reciters.favorites.v1`.
 *  - Downloads: one file per surah in a sequential queue, 3 attempts each, a stall watchdog (STALL_MS) and
 *    storage fallbacks — Android app (v29): the app's own native downloader (BackgroundAudio plugin,
 *    HttpURLConnection) → @capacitor/file-transfer → WebView stream appended to the file → IndexedDB;
 *    browser: Cache Storage → IndexedDB (cdn.mp3quran.net sends CORS *). Manifest kv
 *    `hifz.surahAudio.downloads.v1` (records where each surah is stored).
 *  - Verse timing (where mp3quran.net has it): `ayat_timing?surah=&read=` → verse start / end in ms, so the
 *    lock screen's previous / next jump verse by verse inside the surah file.
 */
import { useSyncExternalStore } from "react";
import catalog from "@/data/recitersCatalog.json";
import { capacitorGlobal, createSignal, idb, isNativePlatform, kv } from "@/lib/storage";
import { foldSurahName } from "@/lib/goTo";
import { backgroundAudio } from "@/lib/audioPlayback";
import { thenSafe } from "@/lib/thenSafe";

export type Moshaf = { id: number; ar: string; en: string; server: string; surahs?: number[]; timing?: number };
export type HubReciter = { id: number; ar: string; en: string; moshaf: Moshaf[] };

export const HUB_RECITERS: HubReciter[] = (catalog as { reciters: HubReciter[] }).reciters;
export const getHubReciter = (id: number) => HUB_RECITERS.find((r) => r.id === id);
export const getMoshaf = (r: HubReciter, moshafId: number) => r.moshaf.find((m) => m.id === moshafId) ?? r.moshaf[0]!;
export const moshafSurahs = (m: Moshaf): number[] => m.surahs ?? Array.from({ length: 114 }, (_, i) => i + 1);

const pad3 = (n: number) => String(n).padStart(3, "0");
export const surahRemote = (m: Moshaf, surah: number) => `${m.server}${pad3(surah)}.mp3`;
/** Download key of one riwaya of one Sheikh. */
export const moshafKey = (r: HubReciter | number, m: Moshaf | number) => `${typeof r === "number" ? r : r.id}-${typeof m === "number" ? m : m.id}`;

/** Live filter by name (Arabic without diacritics / hamza forms, or Latin), and by riwaya. */
const foldName = (s: string) => foldSurahName(s).replace(/ال/g, "");
export function searchReciters(list: readonly HubReciter[], query: string): HubReciter[] {
  const q = foldName(query.trim());
  if (!q) return [...list];
  return list.filter((r) => [r.ar, r.en, ...r.moshaf.map((m) => m.ar), ...r.moshaf.map((m) => m.en)].some((n) => foldName(n).includes(q)));
}

/* ───────────── favourites ───────────── */

const FAV_KEY = "hifz.reciters.favorites.v1";
const favorites = createSignal<number[]>([]);
let favLoaded: Promise<void> | null = null;
const loadFavorites = () => (favLoaded ??= kv.getJson<number[]>(FAV_KEY, []).then((v) => favorites.set(Array.isArray(v) ? v : [])));
export async function toggleFavorite(id: number) {
  await loadFavorites();
  const cur = favorites.get();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  favorites.set(next);
  await kv.setJson(FAV_KEY, next);
}
export function useFavorites(): number[] {
  void loadFavorites();
  return useSyncExternalStore(favorites.subscribe, favorites.get, favorites.get);
}

/* ───────────── downloads ───────────── */

type Manifest = Record<string, { bytes: number; at: string; store?: "file" | "cache" | "idb" }>;
export type SurahDownload = { status: "none" } | { status: "downloading"; received: number; total: number } | { status: "complete"; bytes: number } | { status: "error"; message: string };
export type MoshafDownload = { done: number; total: number; running: boolean; bytes: number; current?: SurahDownload | undefined };

const MANIFEST = "hifz.surahAudio.downloads.v1";
const WEB_CACHE = "hifz-surah-audio-v1";
const manifest = createSignal<Manifest>({});
const live = createSignal<Record<string, SurahDownload>>({});
/** Whole-riwaya downloads in progress: key → surahs left. */
const batches = createSignal<Record<string, { total: number; done: number }>>({});
let manifestLoaded: Promise<void> | null = null;
export const loadSurahDownloads = () => (manifestLoaded ??= kv.getJson<Manifest>(MANIFEST, {}).then((m) => manifest.set(m && typeof m === "object" ? m : {})));
const saveManifest = (m: Manifest) => { manifest.set(m); return kv.setJson(MANIFEST, m); };
const fileKey = (key: string, surah: number) => `${key}/${surah}`;
const setLive = (k: string, s: SurahDownload | null) => { const n = { ...live.get() }; if (s) n[k] = s; else delete n[k]; live.set(n); };

let version = 0;
const bump = () => { version++; };
manifest.subscribe(bump); live.subscribe(bump); batches.subscribe(bump);
const subscribeAll = (l: () => void) => { const a = manifest.subscribe(l), b = live.subscribe(l), c = batches.subscribe(l); return () => { a(); b(); c(); }; };
/** Re-renders on any download change. */
export function useSurahDownloads(): number {
  void loadSurahDownloads();
  return useSyncExternalStore(subscribeAll, () => version, () => version);
}

export function surahDownloadState(key: string, surah: number): SurahDownload {
  const k = fileKey(key, surah);
  const l = live.get()[k];
  if (l) return l;
  const m = manifest.get()[k];
  return m ? { status: "complete", bytes: m.bytes } : { status: "none" };
}
export function moshafDownloadState(r: HubReciter, m: Moshaf): MoshafDownload {
  const key = moshafKey(r, m), list = moshafSurahs(m), man = manifest.get();
  let done = 0, bytes = 0;
  for (const s of list) { const e = man[fileKey(key, s)]; if (e) { done++; bytes += e.bytes; } }
  const running = !!batches.get()[key] || list.some((s) => live.get()[fileKey(key, s)]?.status === "downloading");
  const current = list.map((s) => live.get()[fileKey(key, s)]).find((x) => x?.status === "downloading");
  return { done, total: list.length, running, bytes, current };
}
/** Sheikhs with at least one downloaded surah (for the "Downloaded" tab). */
export function downloadedReciterIds(): number[] {
  const ids = new Set<number>();
  for (const k of Object.keys(manifest.get())) ids.add(Number(k.split("-")[0]));
  for (const [k, v] of Object.entries(live.get())) if (v.status === "downloading") ids.add(Number(k.split("-")[0]));
  return [...ids];
}
export const totalDownloadedBytes = () => Object.values(manifest.get()).reduce((s, e) => s + e.bytes, 0);

const nativeDir = (key: string) => `quran-audio/${key}`;
const nativeFile = (key: string, surah: number) => `${nativeDir(key)}/${pad3(surah)}.mp3`;
const idbKey = (url: string) => `surahAudio:${url}`;

type FT = typeof import("@capacitor/file-transfer").FileTransfer;
let ftPlugin: Promise<FT | null> | null = null;
const fileTransfer = () => (ftPlugin ??= !isNativePlatform() ? Promise.resolve(null) : Promise.all([import("@capacitor/core"), import("@capacitor/file-transfer")])
  .then(([{ Capacitor }, m]) => (Capacitor.isPluginAvailable("FileTransfer") ? thenSafe(m.FileTransfer) : null)).catch(() => null));

const controllers = new Map<string, AbortController>();

/** No byte for this long → the attempt counts as stuck and the next strategy / retry takes over. */
export const STALL_MS = 25_000;

class Stalled extends Error { constructor() { super("Download stalled"); } }
const aborted = () => new DOMException("Aborted", "AbortError");

/**
 * fetch() with live progress; the request is cancelled when no data arrives for STALL_MS (this is what
 * kept the spinner turning forever on surahs 1 and 2) or when the user cancels.
 * `onChunk` receives every piece (to write it out as it comes); returns the size.
 */
async function streamDownload(url: string, signal: AbortSignal, onProgress: (received: number, total: number) => void, onChunk: (c: Uint8Array) => Promise<void> | void): Promise<number> {
  const ctl = new AbortController();
  const stop = () => ctl.abort();
  signal.addEventListener("abort", stop);
  let idle: ReturnType<typeof setTimeout> | null = null;
  let stalled = false;
  const arm = () => { if (idle) clearTimeout(idle); idle = setTimeout(() => { stalled = true; ctl.abort(); }, STALL_MS); };
  try {
    arm();
    const res = await fetch(url, { signal: ctl.signal, mode: "cors", cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get("Content-Length")) || (await contentLength(url));
    onProgress(0, total);
    if (!res.body) { // very old WebViews: no streaming
      const buf = new Uint8Array(await res.arrayBuffer());
      await onChunk(buf); onProgress(buf.length, total || buf.length);
      return buf.length;
    }
    const reader = res.body.getReader();
    let received = 0;
    for (;;) {
      arm();
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      await onChunk(value);
      onProgress(received, total);
    }
    if (!received) throw new Error("Empty download");
    if (total && received < total) throw new Error("Incomplete download");
    return received;
  } catch (e) {
    if (signal.aborted) throw aborted();
    if (stalled) throw new Stalled();
    throw e;
  } finally {
    if (idle) clearTimeout(idle);
    signal.removeEventListener("abort", stop);
  }
}

const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

type Stored = { bytes: number; store: Store };
export type Store = "file" | "cache" | "idb";

let activeNative = 0;
/** Size of a file from a HEAD request (Content-Length is CORS-safelisted), 0 when unknown. */
export async function contentLength(url: string): Promise<number> {
  try {
    const ctl = new AbortController();
    const id = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(url, { method: "HEAD", mode: "cors", signal: ctl.signal });
    clearTimeout(id);
    return Number(r.headers.get("Content-Length")) || 0;
  } catch { return 0; }
}

/**
 * App: the file-transfer plugin writes straight to a file; watched for stalls. Android often reports
 * progress without a length ("lengthComputable: false") — then the size from a HEAD request is used, so the
 * surah row shows a real percentage and MB like the web app.
 */
async function nativeFileTransfer(url: string, key: string, surah: number, signal: AbortSignal, progress: (r: number, t: number) => void): Promise<Stored> {
  const ft = await fileTransfer();
  if (!ft) throw new Error("no file-transfer");
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  await Filesystem.mkdir({ path: nativeDir(key), directory: Directory.Data, recursive: true }).catch(() => {});
  const { uri } = await Filesystem.getUri({ path: nativeFile(key, surah), directory: Directory.Data });
  const known = await contentLength(url);
  progress(0, known);
  let last = Date.now();
  // The event's url can differ from ours after a redirect: with a single transfer running, take every event.
  activeNative++;
  const sub = await ft.addListener("progress", (p) => { if (p.url === url || activeNative === 1) { last = Date.now(); progress(p.bytes, p.lengthComputable && p.contentLength > 0 ? p.contentLength : known); } });
  try {
    await new Promise<void>((resolve, reject) => {
      const watch = setInterval(() => {
        if (signal.aborted) { clearInterval(watch); reject(aborted()); }
        else if (Date.now() - last > STALL_MS) { clearInterval(watch); reject(new Stalled()); }
      }, 1000);
      ft.downloadFile({ url, path: uri, progress: true }).then(() => { clearInterval(watch); resolve(); }, (e: unknown) => { clearInterval(watch); reject(e); });
    });
  } finally { activeNative--; void sub.remove(); }
  const st = await Filesystem.stat({ path: nativeFile(key, surah), directory: Directory.Data });
  if (!st.size) throw new Error("Empty download");
  return { bytes: st.size, store: "file" };
}

/**
 * Android app (v29): the app's own native downloader (BackgroundAudio plugin) writes straight into the files
 * folder with progress events (received / total from the server). Older app builds without it reject at once
 * and the next strategy takes over. Also watched for stalls.
 */
let nativeDownloadSeq = 0;
async function nativePluginDownload(url: string, key: string, surah: number, signal: AbortSignal, progress: (r: number, t: number) => void): Promise<Stored> {
  const na = await backgroundAudio();
  if (!na) throw new Error("no native downloader");
  const id = `dl${++nativeDownloadSeq}`;
  let last = Date.now();
  const sub = await na.addListener("download", (e) => { if (e.id === id) { last = Date.now(); progress(e.received, e.total); } });
  progress(0, 0);
  try {
    const res = await new Promise<{ bytes: number }>((resolve, reject) => {
      const watch = setInterval(() => {
        if (signal.aborted) { clearInterval(watch); void na.cancelDownload({ id }).catch(() => {}); reject(aborted()); }
        else if (Date.now() - last > STALL_MS) { clearInterval(watch); void na.cancelDownload({ id }).catch(() => {}); reject(new Stalled()); }
      }, 1000);
      na.download({ id, url, path: nativeFile(key, surah) }).then((r) => { clearInterval(watch); resolve(r); }, (e: unknown) => { clearInterval(watch); reject(e); });
    });
    if (!res.bytes) throw new Error("Empty download");
    return { bytes: res.bytes, store: "file" };
  } finally { void sub.remove(); }
}

/** App without the plugin (or when it hangs): stream in the WebView and append the pieces to the file. */
async function nativeStreamToFile(url: string, key: string, surah: number, signal: AbortSignal, progress: (r: number, t: number) => void): Promise<Stored> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const path = nativeFile(key, surah);
  await Filesystem.mkdir({ path: nativeDir(key), directory: Directory.Data, recursive: true }).catch(() => {});
  await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(() => {});
  let pending: Uint8Array[] = [], size = 0, first = true;
  const flush = async () => {
    if (!size) return;
    const all = new Uint8Array(size);
    let o = 0; for (const p of pending) { all.set(p, o); o += p.length; }
    pending = []; size = 0;
    const data = toBase64(all);
    if (first) { await Filesystem.writeFile({ path, directory: Directory.Data, data, recursive: true }); first = false; }
    else await Filesystem.appendFile({ path, directory: Directory.Data, data });
  };
  const bytes = await streamDownload(url, signal, progress, async (c) => { pending.push(c); size += c.length; if (size >= 1 << 20) await flush(); });
  await flush();
  return { bytes, store: "file" };
}

/** Browser / fallback: the whole file as a Blob → Cache Storage, or IndexedDB when that is not possible. */
async function webStore(url: string, signal: AbortSignal, progress: (r: number, t: number) => void): Promise<Stored> {
  const chunks: Uint8Array[] = [];
  const bytes = await streamDownload(url, signal, progress, (c) => { chunks.push(c); });
  const blob = new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
  if (typeof caches !== "undefined") {
    try {
      await (await caches.open(WEB_CACHE)).put(url, new Response(blob, { headers: { "Content-Type": "audio/mpeg", "Content-Length": String(blob.size) } }));
      return { bytes, store: "cache" };
    } catch { /* quota / not allowed → IndexedDB */ }
  }
  await idb.set(idbKey(url), blob);
  if (!(await idb.get<Blob>(idbKey(url)))) throw new Error("No offline storage available");
  return { bytes, store: "idb" };
}

/**
 * One surah, trying the strategies in order (app: file-transfer → stream to file → IndexedDB; browser:
 * Cache Storage → IndexedDB). A stalled or failed strategy hands over to the next one.
 */
async function downloadOne(key: string, m: Moshaf, surah: number, signal: AbortSignal): Promise<Stored> {
  const k = fileKey(key, surah), url = surahRemote(m, surah);
  let lastPush = 0;
  const progress = (received: number, total: number) => {
    if (signal.aborted) return;
    const now = Date.now();
    if (now - lastPush < 250 && received !== total) return;
    lastPush = now;
    setLive(k, { status: "downloading", received, total });
  };
  setLive(k, { status: "downloading", received: 0, total: 0 });
  const strategies = isNativePlatform()
    ? [() => nativePluginDownload(url, key, surah, signal, progress), () => nativeFileTransfer(url, key, surah, signal, progress), () => nativeStreamToFile(url, key, surah, signal, progress), () => webStore(url, signal, progress)]
    : [() => webStore(url, signal, progress)];
  let error: unknown = null;
  for (const run of strategies) {
    try { return await run(); } catch (e) {
      if (signal.aborted) throw aborted();
      error = e;
    }
  }
  throw error ?? new Error("Download failed");
}

/** Downloads one surah of one riwaya: 3 attempts (each through every strategy), then an error state with retry. */
export async function downloadSurahFile(r: HubReciter, m: Moshaf, surah: number): Promise<void> {
  await loadSurahDownloads();
  const key = moshafKey(r, m), k = fileKey(key, surah);
  if (manifest.get()[k] || controllers.has(k)) return;
  const c = new AbortController();
  controllers.set(k, c);
  try {
    for (let attempt = 1; ; attempt++) {
      try {
        const { bytes, store } = await downloadOne(key, m, surah, c.signal);
        await saveManifest({ ...manifest.get(), [k]: { bytes, at: new Date().toISOString(), store } });
        setLive(k, null);
        return;
      } catch (e) {
        if (c.signal.aborted) { setLive(k, null); throw e; }
        if (attempt >= 3) { setLive(k, { status: "error", message: e instanceof Error ? e.message : String(e) }); throw e; }
        await new Promise((res) => setTimeout(res, 1500 * attempt));
      }
    }
  } finally { controllers.delete(k); }
}

/**
 * Downloads every surah of a riwaya one after another (a sequential queue; finished surahs are skipped, so
 * it can be resumed). A surah that fails three times is skipped and the queue goes on.
 */
export async function downloadMoshaf(r: HubReciter, m: Moshaf): Promise<void> {
  await loadSurahDownloads();
  const key = moshafKey(r, m);
  if (batches.get()[key]) return;
  const list = moshafSurahs(m);
  const setBatch = (done: number) => batches.set({ ...batches.get(), [key]: { total: list.length, done } });
  setBatch(0);
  let failed = 0;
  try {
    for (const [i, s] of list.entries()) {
      if (!batches.get()[key]) break; // cancelled
      if (!manifest.get()[fileKey(key, s)]) {
        try { await downloadSurahFile(r, m, s); } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") break;
          if (++failed >= 5) break; // the network is down – stop instead of failing 114 times
        }
      }
      if (batches.get()[key]) setBatch(i + 1);
    }
  } finally {
    const b = { ...batches.get() }; delete b[key]; batches.set(b);
  }
}
export function cancelMoshafDownload(r: HubReciter, m: Moshaf) {
  const key = moshafKey(r, m);
  const b = { ...batches.get() }; delete b[key]; batches.set(b);
  for (const s of moshafSurahs(m)) controllers.get(fileKey(key, s))?.abort();
}

export async function deleteSurahFile(r: HubReciter, m: Moshaf, surah: number) {
  await loadSurahDownloads();
  const key = moshafKey(r, m), k = fileKey(key, surah), url = surahRemote(m, surah);
  controllers.get(k)?.abort();
  if (isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    await Filesystem.deleteFile({ path: nativeFile(key, surah), directory: Directory.Data }).catch(() => {});
  }
  if (typeof caches !== "undefined") await (await caches.open(WEB_CACHE)).delete(url).catch(() => false);
  await idb.delete(idbKey(url)).catch(() => {});
  const man = { ...manifest.get() }; delete man[k];
  await saveManifest(man);
  setLive(k, null);
}
export async function deleteMoshaf(r: HubReciter, m: Moshaf) {
  cancelMoshafDownload(r, m);
  for (const s of moshafSurahs(m)) if (manifest.get()[fileKey(moshafKey(r, m), s)]) await deleteSurahFile(r, m, s);
}

let objectUrl: string | null = null;
const blobUrl = (b: Blob) => { if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = URL.createObjectURL(b); return objectUrl; };
/** URL to play a surah: the downloaded copy when there is one (file, Cache Storage or IndexedDB), else the stream. */
export async function surahPlayUrl(r: HubReciter, m: Moshaf, surah: number): Promise<string> {
  await loadSurahDownloads();
  const remote = surahRemote(m, surah);
  const entry = manifest.get()[fileKey(moshafKey(r, m), surah)];
  if (!entry) return remote;
  try {
    const store = entry.store ?? (isNativePlatform() ? "file" : "cache");
    if (store === "file") {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const { uri } = await Filesystem.getUri({ path: nativeFile(moshafKey(r, m), surah), directory: Directory.Data });
      return capacitorGlobal()?.convertFileSrc?.(uri) ?? uri;
    }
    if (store === "idb") { const b = await idb.get<Blob>(idbKey(remote)); return b ? blobUrl(b) : remote; }
    const hit = await (await caches.open(WEB_CACHE)).match(remote);
    return hit ? blobUrl(await hit.blob()) : remote;
  } catch { return remote; }
}

/**
 * Android native player (v29): a URL the MediaPlayer can open — the downloaded file (file://… in the app's
 * files folder) or the stream. Copies in Cache Storage / IndexedDB are WebView-only, so those stream.
 */
let filesBase: Promise<string | null> | null = null;
export async function surahNativeUrl(r: HubReciter, m: Moshaf, surah: number): Promise<string> {
  await loadSurahDownloads();
  const remote = surahRemote(m, surah);
  const entry = manifest.get()[fileKey(moshafKey(r, m), surah)];
  if (!entry || (entry.store ?? "file") !== "file") return remote;
  filesBase ??= import("@capacitor/filesystem").then(({ Filesystem, Directory }) => Filesystem.getUri({ path: "", directory: Directory.Data }).then((u) => u.uri.replace(/\/+$/, ""))).catch(() => null);
  const base = await filesBase;
  return base ? `${base}/${nativeFile(moshafKey(r, m), surah)}` : remote;
}

/* ───────────── verse timing ───────────── */

export type VerseTiming = { ayah: number; start: number; end: number }[];
/** Verse start / end (ms) inside the surah file, cached; null when mp3quran.net has no timing for this riwaya. */
export async function verseTiming(m: Moshaf, surah: number): Promise<VerseTiming | null> {
  if (!m.timing) return null;
  const key = `mp3quran.timing.${m.timing}.${surah}`;
  const hit = await idb.get<VerseTiming>(key).catch(() => undefined);
  if (hit) return hit;
  try {
    const res = await fetch(`https://www.mp3quran.net/api/v3/ayat_timing?surah=${surah}&read=${m.timing}`);
    if (!res.ok) return null;
    const raw = await res.json() as { ayah: number; start_time: number; end_time: number }[];
    const t = raw.filter((x) => x.ayah > 0).map((x) => ({ ayah: x.ayah, start: x.start_time, end: x.end_time }));
    if (!t.length) return null;
    await idb.set(key, t).catch(() => {});
    return t;
  } catch { return null; }
}
/** The verse playing at `ms` (null before verse 1, e.g. during the isti'adha). */
export function verseAt(t: VerseTiming, ms: number): number | null {
  let cur: number | null = null;
  for (const v of t) { if (v.start <= ms + 50) cur = v.ayah; else break; }
  return cur;
}
