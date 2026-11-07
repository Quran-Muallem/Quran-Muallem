/**
 * Reciter manager: 10 well-known Sheikhs, streaming URLs and one-time offline downloads.
 *
 * Audio sources (public, free):
 *  - per-Ayah MP3s from everyayah.com: used by the player, so the current Ayah can be highlighted
 *    and recitation practice can loop single verses. These are what gets downloaded for offline use.
 *  - full-surah MP3s from mp3quran.net: `fetchSurahAudioUrl()` for continuous listening / sharing.
 *
 * Downloads go to the app's data folder via @capacitor/filesystem on iOS/Android, and to the
 * browser's Cache Storage on the web (only works if the audio host allows CORS).
 */
import { capacitorGlobal, isNativePlatform, kv, createSignal } from "@/lib/storage";
import { getSurahMeta } from "@/lib/quranService";

export type Reciter = {
  id: string;
  nameArabic: string;
  nameEnglish: string;
  style: "murattal" | "mujawwad";
  /**
   * Quran.com v4 recitation id, informational only (the app does not depend on it).
   * Values follow Quran.com's /resources/recitations list as far as known; null where Quran.com
   * has no verse-by-verse recitation of this Sheikh.
   */
  quranComId: number | null;
  /** everyayah.com folder: https://everyayah.com/data/<folder>/SSSAAA.mp3 */
  everyAyahFolder: string;
  /** mp3quran.net server folder (full surahs): <server>SSS.mp3 */
  surahServer: string;
};

export const RECITERS: Reciter[] = [
  { id: "alafasy", nameArabic: "مشاري راشد العفاسي", nameEnglish: "Mishary Rashid Alafasy", style: "murattal", quranComId: 7, everyAyahFolder: "Alafasy_128kbps", surahServer: "https://server8.mp3quran.net/afs/" },
  { id: "abdulbasit", nameArabic: "عبد الباسط عبد الصمد", nameEnglish: "Abdul Basit Abdul Samad", style: "murattal", quranComId: 2, everyAyahFolder: "Abdul_Basit_Murattal_192kbps", surahServer: "https://server7.mp3quran.net/basit/" },
  { id: "husary", nameArabic: "محمود خليل الحصري", nameEnglish: "Mahmoud Khalil Al-Husary", style: "murattal", quranComId: 6, everyAyahFolder: "Husary_128kbps", surahServer: "https://server13.mp3quran.net/husr/" },
  { id: "minshawi", nameArabic: "محمد صديق المنشاوي", nameEnglish: "Mohamed Siddiq Al-Minshawi", style: "murattal", quranComId: 9, everyAyahFolder: "Minshawy_Murattal_128kbps", surahServer: "https://server10.mp3quran.net/minsh/" },
  { id: "maher", nameArabic: "ماهر المعيقلي", nameEnglish: "Maher Al-Muaiqly", style: "murattal", quranComId: null, everyAyahFolder: "MaherAlMuaiqly128kbps", surahServer: "https://server12.mp3quran.net/maher/" },
  { id: "sudais", nameArabic: "عبد الرحمن السديس", nameEnglish: "Abdur-Rahman As-Sudais", style: "murattal", quranComId: 3, everyAyahFolder: "Abdurrahmaan_As-Sudais_192kbps", surahServer: "https://server11.mp3quran.net/sds/" },
  { id: "shuraym", nameArabic: "سعود الشريم", nameEnglish: "Sa'ud Ash-Shuraym", style: "murattal", quranComId: 10, everyAyahFolder: "Saood_ash-Shuraym_128kbps", surahServer: "https://server7.mp3quran.net/shur/" },
  { id: "ghamdi", nameArabic: "سعد الغامدي", nameEnglish: "Saad Al-Ghamdi", style: "murattal", quranComId: null, everyAyahFolder: "Ghamadi_40kbps", surahServer: "https://server7.mp3quran.net/s_gmd/" },
  { id: "shatri", nameArabic: "أبو بكر الشاطري", nameEnglish: "Abu Bakr Al-Shatri", style: "murattal", quranComId: 4, everyAyahFolder: "Abu_Bakr_Ash-Shaatree_128kbps", surahServer: "https://server11.mp3quran.net/shatri/" },
  { id: "dossari", nameArabic: "ياسر الدوسري", nameEnglish: "Yasser Ad-Dussary", style: "murattal", quranComId: null, everyAyahFolder: "Yasser_Ad-Dussary_128kbps", surahServer: "https://server11.mp3quran.net/yasser/" },
];

export const DEFAULT_RECITER = RECITERS[0]!;
export const getReciter = (id: string): Reciter => RECITERS.find((r) => r.id === id) ?? DEFAULT_RECITER;

const pad3 = (n: number) => String(n).padStart(3, "0");
const fileName = (surah: number, ayah: number) => `${pad3(surah)}${pad3(ayah)}.mp3`;

/** Remote URL of one Ayah. */
export const ayahRemoteUrl = (reciterId: string, surah: number, ayah: number) =>
  `https://everyayah.com/data/${getReciter(reciterId).everyAyahFolder}/${fileName(surah, ayah)}`;

/** Remote URL of the whole surah as one MP3. */
export const surahRemoteUrl = (reciterId: string, surah: number) => `${getReciter(reciterId).surahServer}${pad3(surah)}.mp3`;

/* ------------------------------------------------------------------ */
/* Download manifest                                                   */
/* ------------------------------------------------------------------ */

export type DownloadState =
  | { status: "none" }
  | { status: "downloading"; done: number; total: number }
  | { status: "complete"; files: number; bytes: number; at: string }
  | { status: "error"; done: number; total: number; message: string };

type Manifest = Record<string, { files: number; bytes: number; at: string }>;
const MANIFEST_KEY = "hifz.audio.downloads.v1";
const mKey = (reciterId: string, surah: number) => `${reciterId}/${surah}`;

const manifest = createSignal<Manifest>({});
const live = createSignal<Record<string, DownloadState>>({});
let manifestLoaded: Promise<void> | null = null;

export function loadDownloads(): Promise<void> {
  manifestLoaded ??= kv.getJson<Manifest>(MANIFEST_KEY, {}).then((m) => manifest.set(m));
  return manifestLoaded;
}

const saveManifest = (m: Manifest) => { manifest.set(m); return kv.setJson(MANIFEST_KEY, m); };

export function getDownloadState(reciterId: string, surah: number): DownloadState {
  const k = mKey(reciterId, surah);
  const running = live.get()[k];
  if (running) return running;
  const done = manifest.get()[k];
  return done ? { status: "complete", ...done } : { status: "none" };
}

/** Subscribe to any download change (for React: useSyncExternalStore). */
export function subscribeDownloads(listener: () => void): () => void {
  const a = manifest.subscribe(listener), b = live.subscribe(listener);
  return () => { a(); b(); };
}
let version = 0;
subscribeDownloads(() => { version++; });
export const downloadsVersion = () => version;

export function downloadedSurahs(reciterId: string): number[] {
  return Object.keys(manifest.get())
    .filter((k) => k.startsWith(`${reciterId}/`))
    .map((k) => Number(k.split("/")[1]))
    .sort((a, b) => a - b);
}

const setLive = (k: string, state: DownloadState | null) => {
  const next = { ...live.get() };
  if (state) next[k] = state; else delete next[k];
  live.set(next);
};

/* ------------------------------------------------------------------ */
/* Storage backends                                                    */
/* ------------------------------------------------------------------ */

const WEB_CACHE = "hifz-audio-v1";
const nativePath = (reciterId: string, surah: number, ayah?: number) =>
  `audio/${reciterId}/${pad3(surah)}${ayah ? `/${fileName(surah, ayah)}` : ""}`;

type FilesystemModule = typeof import("@capacitor/filesystem");
let fsModule: Promise<FilesystemModule> | null = null;
const fs = () => (fsModule ??= import("@capacitor/filesystem"));

/** Downloads one file; returns its size in bytes. */
async function saveFile(url: string, reciterId: string, surah: number, ayah: number, signal: AbortSignal): Promise<number> {
  if (isNativePlatform()) {
    const { Filesystem, Directory } = await fs();
    // Native HTTP: no CORS restrictions, streams to disk.
    const res = await Filesystem.downloadFile({ url, path: nativePath(reciterId, surah, ayah), directory: Directory.Data, recursive: true });
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (!res.path && !res.blob) throw new Error("Download failed");
    try { return (await Filesystem.stat({ path: nativePath(reciterId, surah, ayah), directory: Directory.Data })).size; } catch { return 0; }
  }
  if (typeof caches === "undefined") throw new Error("Offline storage is not available in this browser");
  const res = await fetch(url, { signal, mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const cache = await caches.open(WEB_CACHE);
  await cache.put(url, new Response(blob, { headers: { "Content-Type": "audio/mpeg", "Content-Length": String(blob.size) } }));
  return blob.size;
}

async function removeFiles(reciterId: string, surah: number, ayahs: number) {
  if (isNativePlatform()) {
    const { Filesystem, Directory } = await fs();
    try { await Filesystem.rmdir({ path: nativePath(reciterId, surah), directory: Directory.Data, recursive: true }); } catch { /* already gone */ }
    return;
  }
  if (typeof caches === "undefined") return;
  const cache = await caches.open(WEB_CACHE);
  await Promise.all(Array.from({ length: ayahs }, (_, i) => cache.delete(ayahRemoteUrl(reciterId, surah, i + 1))));
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const controllers = new Map<string, AbortController>();
const objectUrls = new Map<string, string>();

/**
 * URL to play one Ayah: the offline copy if the surah was downloaded, otherwise the stream.
 */
export async function getAyahAudioUrl(reciterId: string, surah: number, ayah: number): Promise<string> {
  await loadDownloads();
  const remote = ayahRemoteUrl(reciterId, surah, ayah);
  if (getDownloadState(reciterId, surah).status !== "complete") return remote;
  try {
    if (isNativePlatform()) {
      const { Filesystem, Directory } = await fs();
      const { uri } = await Filesystem.getUri({ path: nativePath(reciterId, surah, ayah), directory: Directory.Data });
      return capacitorGlobal()?.convertFileSrc?.(uri) ?? uri;
    }
    const hit = await (await caches.open(WEB_CACHE)).match(remote);
    if (!hit) return remote;
    const existing = objectUrls.get(remote);
    if (existing) return existing;
    const url = URL.createObjectURL(await hit.blob());
    objectUrls.set(remote, url);
    if (objectUrls.size > 40) { const [k, v] = objectUrls.entries().next().value as [string, string]; URL.revokeObjectURL(v); objectUrls.delete(k); }
    return url;
  } catch {
    return remote;
  }
}

/**
 * Stream URL of the complete surah (one MP3) for the selected Sheikh.
 * Async so it can later resolve through an API without changing callers.
 */
export async function fetchSurahAudioUrl(reciterId: string, surah: number): Promise<string> {
  return surahRemoteUrl(reciterId, surah);
}

/**
 * Downloads every Ayah of a surah for offline listening (one-time). Progress is reported per file and
 * through `subscribeDownloads`. Resolves when complete; rejects on failure (partial files are kept for retry).
 */
export async function downloadSurahOffline(reciterId: string, surah: number, onProgress?: (done: number, total: number) => void): Promise<void> {
  await loadDownloads();
  const k = mKey(reciterId, surah);
  if (controllers.has(k)) return;
  const total = getSurahMeta(surah)?.versesCount ?? 0;
  if (!total) throw new Error(`Unknown surah ${surah}`);
  const controller = new AbortController();
  controllers.set(k, controller);
  let done = 0, bytes = 0;
  setLive(k, { status: "downloading", done, total });
  const queue = Array.from({ length: total }, (_, i) => i + 1);
  const worker = async () => {
    for (let ayah = queue.shift(); ayah; ayah = queue.shift()) {
      if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
      let attempt = 0;
      for (;;) {
        try { bytes += await saveFile(ayahRemoteUrl(reciterId, surah, ayah), reciterId, surah, ayah, controller.signal); break; }
        catch (e) { if (controller.signal.aborted || ++attempt >= 3) throw e; await new Promise((r) => setTimeout(r, 800 * attempt)); }
      }
      done++;
      setLive(k, { status: "downloading", done, total });
      onProgress?.(done, total);
    }
  };
  try {
    await Promise.all([worker(), worker(), worker(), worker()]);
    await saveManifest({ ...manifest.get(), [k]: { files: total, bytes, at: new Date().toISOString() } });
    setLive(k, null);
  } catch (e) {
    const aborted = controller.signal.aborted;
    setLive(k, aborted ? null : { status: "error", done, total, message: e instanceof Error ? e.message : String(e) });
    throw e;
  } finally {
    controllers.delete(k);
  }
}

export function cancelDownload(reciterId: string, surah: number) {
  controllers.get(mKey(reciterId, surah))?.abort();
}

export async function deleteSurahDownload(reciterId: string, surah: number): Promise<void> {
  await loadDownloads();
  cancelDownload(reciterId, surah);
  await removeFiles(reciterId, surah, getSurahMeta(surah)?.versesCount ?? 0);
  const m = { ...manifest.get() };
  delete m[mKey(reciterId, surah)];
  await saveManifest(m);
  setLive(mKey(reciterId, surah), null);
}

/** Total bytes downloaded (all reciters). */
export const downloadedBytes = () => Object.values(manifest.get()).reduce((s, e) => s + e.bytes, 0);

export const formatBytes = (b: number) =>
  b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;
