/**
 * v55: stars a child earns by reciting a whole surah live in the Kids Mushaf (1–5, forgiving curve).
 * The best result per surah is kept (repeating the same surah can only improve it), and the sum is added to
 * the child's total star balance («رحلة النجوم»).
 */
import { useSyncExternalStore } from "react";

/** v56: one persistent key for the stars of every surah (best result kept). */
export const KIDS_STARS_KEY = "qm_kids_surah_stars";
const OLD_KEY = "qm.kids.reciteStars.v1";
const listeners = new Set<() => void>();
let cache: Record<number, number> | null = null;

function read(): Record<number, number> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KIDS_STARS_KEY) ?? localStorage.getItem(OLD_KEY) ?? "{}"; // migrate v55 results
    cache = JSON.parse(raw) as Record<number, number>;
  } catch { cache = {}; }
  return cache!;
}

/** Forgiving child curve: ≥85 % → 5, ≥70 % → 4, ≥50 % → 3, ≥30 % → 2, otherwise 1 (every try earns a star). */
export function kidsStarsFor(ratio: number): 1 | 2 | 3 | 4 | 5 {
  const p = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return p >= 85 ? 5 : p >= 70 ? 4 : p >= 50 ? 3 : p >= 30 ? 2 : 1;
}

/** Records a result; returns how many NEW stars were added to the balance (0 if not better than before). */
export function creditRecitationStars(surah: number, stars: number): number {
  const cur = { ...read() };
  const before = cur[surah] ?? 0;
  if (stars <= before) return 0;
  cur[surah] = stars;
  cache = cur;
  try { localStorage.setItem(KIDS_STARS_KEY, JSON.stringify(cur)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
  try { window.dispatchEvent(new CustomEvent("qm:kids-stars", { detail: { surah, stars, total: recitationStarTotal(cur) } })); } catch { /* ignore */ }
  return stars - before;
}

function subscribe(l: () => void) {
  listeners.add(l);
  // another WebView tab / window wrote the stars → re-read
  const onStorage = (e: StorageEvent) => { if (e.key === KIDS_STARS_KEY) { cache = null; l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}
export function useRecitationStars(): Record<number, number> {
  return useSyncExternalStore(subscribe, read, read);
}
/** Test helper: forget the in-memory copy. */
export const resetKidsStarsCache = () => { cache = null; };

export const recitationStarTotal = (m: Record<number, number>) => Object.values(m).reduce((a, b) => a + b, 0);
