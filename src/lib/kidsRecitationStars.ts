/**
 * v55: stars a child earns by reciting a whole surah live in the Kids Mushaf (1–5, forgiving curve).
 * The best result per surah is kept (repeating the same surah can only improve it), and the sum is added to
 * the child's total star balance («رحلة النجوم»).
 */
import { useSyncExternalStore } from "react";

const KEY = "qm.kids.reciteStars.v1";
const listeners = new Set<() => void>();
let cache: Record<number, number> | null = null;

function read(): Record<number, number> {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<number, number>; } catch { cache = {}; }
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
  try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
  return stars - before;
}

export function useRecitationStars(): Record<number, number> {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, read, read);
}

export const recitationStarTotal = (m: Record<number, number>) => Object.values(m).reduce((a, b) => a + b, 0);
