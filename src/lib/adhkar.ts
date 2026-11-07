/**
 * Daily adhkar: texts bundled with the app (src/data/adhkar.json, works fully offline) and a
 * per-day counter for each dhikr. Counts are stored on this device and start fresh every day.
 */
import { useEffect, useSyncExternalStore } from "react";
import data from "@/data/adhkar.json";
import { createSignal, kv } from "@/lib/storage";
import { localDate } from "@/lib/progressStorage";

export type AdhkarCategoryId = "morning" | "evening" | "prayer" | "sleep";
export const ADHKAR_CATEGORIES: AdhkarCategoryId[] = ["morning", "evening", "prayer", "sleep"];

/** A Quranic passage, rendered from the bundled Mushaf text. */
export type QuranRef = { surah: number; from: number; to: number; basmala?: boolean };

export type Dhikr = {
  id: string;
  /** How many times to say it. */
  count: number;
  /** Plain Arabic text (non-Quranic). */
  text?: string;
  /** Quranic verses (shown from the Mushaf data). */
  quran?: QuranRef[];
  /** Said before the verses, e.g. the istiʿādhah. */
  preface?: string;
  sourceAr: string;
  sourceEn: string;
  benefitAr?: string;
  benefitEn?: string;
};

export type AdhkarCategory = { id: AdhkarCategoryId; items: Dhikr[] };

export const ADHKAR = (data as unknown as { categories: AdhkarCategory[] }).categories;
export const adhkarCategory = (id: AdhkarCategoryId): AdhkarCategory => ADHKAR.find((c) => c.id === id) ?? { id, items: [] };

/** Suggests a category from the time of day: morning until noon, evening from 15:00, sleep from 21:00. */
export function suggestedCategory(d = new Date()): AdhkarCategoryId {
  const h = d.getHours();
  if (h >= 4 && h < 12) return "morning";
  if (h >= 15 && h < 21) return "evening";
  if (h >= 21 || h < 4) return "sleep";
  return "prayer";
}

/* ------------------------------------------------------------------ */
/* Counts                                                              */
/* ------------------------------------------------------------------ */

export type AdhkarDay = { version: 1; date: string; counts: Record<string, number> };
const KEY = "hifz.adhkar.v1";
const fresh = (date = localDate()): AdhkarDay => ({ version: 1, date, counts: {} });

/** Same day → unchanged; otherwise empty counts for today. */
export const forToday = (day: AdhkarDay, today = localDate()): AdhkarDay => (day.date === today ? day : fresh(today));

/** Adds one to a dhikr's count, never beyond its target. */
export function increment(day: AdhkarDay, dhikr: Dhikr, today = localDate()): AdhkarDay {
  const cur = forToday(day, today);
  const n = cur.counts[dhikr.id] ?? 0;
  if (n >= dhikr.count) return cur;
  return { ...cur, counts: { ...cur.counts, [dhikr.id]: n + 1 } };
}

export function resetCategory(day: AdhkarDay, category: AdhkarCategory, today = localDate()): AdhkarDay {
  const cur = forToday(day, today);
  const counts = { ...cur.counts };
  for (const d of category.items) delete counts[d.id];
  return { ...cur, counts };
}

export function categoryProgress(day: AdhkarDay, category: AdhkarCategory, today = localDate()) {
  const cur = forToday(day, today);
  const done = category.items.filter((d) => (cur.counts[d.id] ?? 0) >= d.count).length;
  return { done, total: category.items.length };
}

const signal = createSignal<AdhkarDay>(fresh());
let loaded: Promise<void> | null = null;
let writeChain: Promise<void> = Promise.resolve();

function load() {
  loaded ??= kv.getJson<AdhkarDay | null>(KEY, null).then((raw) => {
    const ok = raw && raw.version === 1 && typeof raw.date === "string" && raw.counts && typeof raw.counts === "object";
    signal.set(forToday(ok ? raw : fresh()));
  }).catch(() => {});
  return loaded;
}

function save(next: AdhkarDay) {
  signal.set(next);
  writeChain = writeChain.then(() => kv.setJson(KEY, next)).catch(() => {});
}

export const countDhikr = (dhikr: Dhikr) => { save(increment(signal.get(), dhikr)); return signal.get().counts[dhikr.id] ?? 0; };
export const resetAdhkar = (category: AdhkarCategory) => save(resetCategory(signal.get(), category));

/** Today's counts (switches to a new day at local midnight when the app is used). */
export function useAdhkarDay(): AdhkarDay {
  const value = useSyncExternalStore(signal.subscribe, signal.get, signal.get);
  useEffect(() => {
    void load();
    const roll = () => { const today = localDate(); if (signal.get().date !== today) signal.set(fresh(today)); };
    const timer = setInterval(roll, 60_000);
    document.addEventListener("visibilitychange", roll);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", roll); };
  }, []);
  return forToday(value);
}
