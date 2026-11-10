/**
 * Mushaf navigation (v29 header + «اذهب إلى» bottom sheet):
 *  - hizb of a page (60 ahzab, start verses from Quran.com's hizb_number index),
 *  - bookmarked pages (kv `hifz.mushaf.bookmarks.v1`),
 *  - «قرأت مؤخرًا» — recently read places, one card per surah with its last page and verse
 *    (kv `hifz.mushaf.recent.v1`),
 *  - memorization share of a surah for the progress line under each surah.
 */
import { useSyncExternalStore } from "react";
import { createSignal, kv } from "@/lib/storage";
import type { Mushaf } from "@/lib/mushafData";
import type { LocalProgress } from "@/lib/progressStorage";

/** First verse of each of the 60 ahzab. */
export const HIZB_STARTS: readonly [number, number][] = [
  [1, 1], [2, 75], [2, 142], [2, 203], [2, 253], [3, 15], [3, 93], [3, 171], [4, 24], [4, 88], [4, 148], [5, 27], [5, 82], [6, 36], [6, 111],
  [7, 1], [7, 88], [7, 171], [8, 41], [9, 34], [9, 93], [10, 26], [11, 6], [11, 84], [12, 53], [13, 19], [15, 1], [16, 51], [17, 1], [17, 99],
  [18, 75], [20, 1], [21, 1], [22, 1], [23, 1], [24, 21], [25, 21], [26, 111], [27, 56], [28, 51], [29, 46], [31, 22], [33, 31], [34, 24], [36, 28],
  [37, 145], [39, 32], [40, 41], [41, 47], [43, 24], [46, 1], [48, 18], [51, 31], [55, 1], [58, 1], [62, 1], [67, 1], [72, 1], [78, 1], [87, 1],
];

/** Hizb (1–60) a page belongs to: the last hizb that starts on or before it. */
export function hizbOfPage(m: Pick<Mushaf, "pageOf">, page: number): number {
  let h = 1;
  HIZB_STARTS.forEach(([s, a], i) => { if (m.pageOf(s, a) <= page) h = i + 1; });
  return h;
}

/* ───────────── bookmarks ───────────── */

const BM_KEY = "hifz.mushaf.bookmarks.v1";
export type PageBookmark = { page: number; surah: number; ayah: number; at: string };
const bookmarks = createSignal<PageBookmark[]>([]);
let bmLoaded: Promise<void> | null = null;
const loadBookmarks = () => (bmLoaded ??= kv.getJson<PageBookmark[]>(BM_KEY, []).then((v) => bookmarks.set(Array.isArray(v) ? v : [])));
export async function toggleBookmark(b: Omit<PageBookmark, "at">) {
  await loadBookmarks();
  const cur = bookmarks.get();
  const next = cur.some((x) => x.page === b.page) ? cur.filter((x) => x.page !== b.page) : [{ ...b, at: new Date().toISOString() }, ...cur];
  bookmarks.set(next);
  await kv.setJson(BM_KEY, next);
}
export function useBookmarks(): PageBookmark[] {
  void loadBookmarks();
  return useSyncExternalStore(bookmarks.subscribe, bookmarks.get, bookmarks.get);
}

/* ───────────── recently read ───────────── */

const RECENT_KEY = "hifz.mushaf.recent.v1";
export const MAX_RECENT = 8;
export type RecentRead = { surah: number; ayah: number; page: number; at: string };
const recent = createSignal<RecentRead[]>([]);
let recentLoaded: Promise<void> | null = null;
const loadRecent = () => (recentLoaded ??= kv.getJson<RecentRead[]>(RECENT_KEY, []).then((v) => recent.set(Array.isArray(v) ? v : [])));

/** Newest first, one entry per surah (the new place replaces the older one of the same surah). */
export function addRecent(list: readonly RecentRead[], r: RecentRead, max = MAX_RECENT): RecentRead[] {
  return [r, ...list.filter((x) => x.surah !== r.surah)].slice(0, max);
}
export async function noteRecentRead(surah: number, ayah: number, page: number) {
  await loadRecent();
  const cur = recent.get();
  if (cur[0] && cur[0].surah === surah && cur[0].page === page && cur[0].ayah === ayah) return;
  const next = addRecent(cur, { surah, ayah, page, at: new Date().toISOString() });
  recent.set(next);
  await kv.setJson(RECENT_KEY, next);
}
export function useRecentReads(): RecentRead[] {
  void loadRecent();
  return useSyncExternalStore(recent.subscribe, recent.get, recent.get);
}

/* ───────────── progress line ───────────── */

/** Share (0–1) of a surah's verses marked memorized. */
export function memorizedShare(p: Pick<LocalProgress, "verses">, surah: number, versesCount: number): number {
  if (!versesCount) return 0;
  let n = 0;
  const prefix = `${surah}:`;
  for (const [k, v] of Object.entries(p.verses)) if (k.startsWith(prefix) && v.status === "MEMORIZED") n++;
  return Math.min(1, n / versesCount);
}

/** First page of each juz (1–30). */
export const JUZ_COUNT = 30;
