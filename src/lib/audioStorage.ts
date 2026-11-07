/**
 * The user's own recitation recordings, stored only on this device.
 *
 * - Android/iOS: files in the app's private data folder (@capacitor/filesystem, Directory.Data),
 *   which the system keeps (unlike WebView storage, which iOS may clear under storage pressure).
 * - Web: IndexedDB (Blob), private to the site.
 * An index (Preferences / localStorage) lists the recordings and the verses each one covers, so the
 * Mushaf can mark verses that have a recording. Nothing is ever uploaded.
 *
 * One recording is kept per surah + verse range: a new recording of the same range replaces the old
 * one. At most MAX_RECORDINGS are kept; the oldest are deleted first.
 */
import { useEffect, useSyncExternalStore } from "react";
import { capacitorGlobal, createSignal, idb, isNativePlatform, kv } from "@/lib/storage";
import { audioDebug } from "@/lib/audioDebug";

export type RecordingMeta = {
  id: string;
  surah: number;
  fromAyah: number;
  toAyah: number;
  createdAt: string;
  seconds: number;
  mime: string;
  bytes: number;
};

export const MAX_RECORDINGS = 200;
const INDEX_KEY = "hifz.recordings.v1";
const DIR = "recordings";
const blobKey = (id: string) => `recording:${id}`;

const extFor = (mime: string) => (mime.includes("webm") ? "webm" : mime.includes("ogg") ? "ogg" : mime.includes("mp4") || mime.includes("aac") ? "m4a" : "wav");

/* ------------------------------------------------------------------ */
/* Pure helpers (tested)                                               */
/* ------------------------------------------------------------------ */

export const covers = (r: RecordingMeta, surah: number, ayah: number) => r.surah === surah && ayah >= r.fromAyah && ayah <= r.toAyah;

/** Newest recording that covers this verse. */
export function recordingForVerse(list: readonly RecordingMeta[], surah: number, ayah: number): RecordingMeta | null {
  let best: RecordingMeta | null = null;
  for (const r of list) if (covers(r, surah, ayah) && (!best || r.createdAt > best.createdAt)) best = r;
  return best;
}

/** Newest recording of exactly this range, else the newest one starting at `fromAyah`. */
export function recordingForRange(list: readonly RecordingMeta[], surah: number, fromAyah: number, toAyah: number): RecordingMeta | null {
  const newest = (xs: RecordingMeta[]) => xs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null;
  return newest(list.filter((r) => r.surah === surah && r.fromAyah === fromAyah && r.toAyah === toAyah))
    ?? newest(list.filter((r) => r.surah === surah && r.fromAyah === fromAyah));
}

/** Adds a recording: drops one of the same range and the oldest beyond the limit. Returns [next list, removed]. */
export function addToIndex(list: readonly RecordingMeta[], rec: RecordingMeta, max = MAX_RECORDINGS): [RecordingMeta[], RecordingMeta[]] {
  const removed = list.filter((r) => r.surah === rec.surah && r.fromAyah === rec.fromAyah && r.toAyah === rec.toAyah);
  let next = [rec, ...list.filter((r) => !removed.includes(r))].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (next.length > max) { removed.push(...next.slice(max)); next = next.slice(0, max); }
  return [next, removed];
}

/* ------------------------------------------------------------------ */
/* Storage backends                                                    */
/* ------------------------------------------------------------------ */

type FilesystemModule = typeof import("@capacitor/filesystem");
let fsModule: Promise<FilesystemModule> | null = null;
const fs = () => (fsModule ??= import("@capacitor/filesystem"));
const nativePath = (r: Pick<RecordingMeta, "id" | "mime">) => `${DIR}/${r.id}.${extFor(r.mime)}`;

const toBase64 = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

async function writeBlob(r: RecordingMeta, blob: Blob) {
  if (isNativePlatform()) {
    const { Filesystem, Directory } = await fs();
    await Filesystem.writeFile({ path: nativePath(r), directory: Directory.Data, data: await toBase64(blob), recursive: true });
  } else {
    await idb.set(blobKey(r.id), blob);
  }
}

async function removeBlob(r: RecordingMeta) {
  try {
    if (isNativePlatform()) {
      const { Filesystem, Directory } = await fs();
      await Filesystem.deleteFile({ path: nativePath(r), directory: Directory.Data });
    } else {
      await idb.delete(blobKey(r.id));
    }
  } catch { /* already gone */ }
}

/** A URL the <audio> element can play. Revoke it with `releaseUrl` when done (web only). */
export async function recordingUrl(r: RecordingMeta): Promise<string | null> {
  if (isNativePlatform()) {
    const { Filesystem, Directory } = await fs();
    try {
      const { uri } = await Filesystem.getUri({ path: nativePath(r), directory: Directory.Data });
      return capacitorGlobal()?.convertFileSrc?.(uri) ?? uri;
    } catch { return null; }
  }
  const blob = await idb.get<Blob>(blobKey(r.id));
  return blob ? URL.createObjectURL(blob) : null;
}
export const releaseUrl = (url: string | null) => { if (url?.startsWith("blob:")) URL.revokeObjectURL(url); };

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const signal = createSignal<RecordingMeta[]>([]);
let loaded: Promise<void> | null = null;
let chain: Promise<unknown> = Promise.resolve();
const serial = <T,>(fn: () => Promise<T>): Promise<T> => { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; };

export function loadRecordings(): Promise<void> {
  loaded ??= kv.getJson<RecordingMeta[]>(INDEX_KEY, []).then((list) => { signal.set(Array.isArray(list) ? list : []); }).catch(() => {});
  return loaded;
}
const saveIndex = (list: RecordingMeta[]) => { signal.set(list); return kv.setJson(INDEX_KEY, list); };

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Saves a recording of verses fromAyah–toAyah of a surah (replacing an older one of the same range). */
export function saveRecording(input: { surah: number; fromAyah: number; toAyah: number; blob: Blob; seconds: number }): Promise<RecordingMeta> {
  return serial(async () => {
    await loadRecordings();
    const rec: RecordingMeta = {
      id: newId(), surah: input.surah, fromAyah: input.fromAyah, toAyah: Math.max(input.fromAyah, input.toAyah),
      createdAt: new Date().toISOString(), seconds: Math.round(input.seconds * 10) / 10, mime: input.blob.type || "audio/wav", bytes: input.blob.size,
    };
    await writeBlob(rec, input.blob);
    const [next, removed] = addToIndex(signal.get(), rec);
    await saveIndex(next);
    await Promise.all(removed.map(removeBlob));
    audioDebug("recording saved", { surah: rec.surah, ayat: `${rec.fromAyah}-${rec.toAyah}`, seconds: rec.seconds, bytes: rec.bytes, mime: rec.mime, replaced: removed.length });
    return rec;
  });
}

export function deleteRecording(id: string): Promise<void> {
  return serial(async () => {
    await loadRecordings();
    const r = signal.get().find((x) => x.id === id);
    if (!r) return;
    await saveIndex(signal.get().filter((x) => x.id !== id));
    await removeBlob(r);
  });
}

/** Removes every recording (used by "Delete all my data"). */
export function deleteAllRecordings(): Promise<void> {
  return serial(async () => {
    await loadRecordings();
    const all = signal.get();
    await saveIndex([]);
    if (isNativePlatform()) {
      try { const { Filesystem, Directory } = await fs(); await Filesystem.rmdir({ path: DIR, directory: Directory.Data, recursive: true }); } catch { /* none */ }
    } else await Promise.all(all.map(removeBlob));
  });
}

export const getRecordings = () => signal.get();

export function useRecordings(): RecordingMeta[] {
  const value = useSyncExternalStore(signal.subscribe, signal.get, signal.get);
  useEffect(() => { void loadRecordings(); }, []);
  return value;
}
