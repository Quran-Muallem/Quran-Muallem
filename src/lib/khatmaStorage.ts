/**
 * Khatma (completing the whole Quran) — reading (Tilawa) and memorization (Hifz) tracked separately.
 * Saved on the device only (Capacitor Preferences in the app, localStorage in the browser) under
 * "hifz.khatma.v1"; "Delete all my data" removes it with the other hifz.* keys.
 *
 * Progress is counted in Mushaf pages (604, Madani Mushaf). Juz and surahs count as completed when all
 * of their pages are done; which pages belong to which juz / surah comes from the bundled Mushaf layout
 * (`pageIndexFrom`).
 */
import { useSyncExternalStore } from "react";
import { createSignal, kv } from "@/lib/storage";
import { localDate } from "@/lib/progressStorage";
import type { Mushaf } from "@/lib/mushafData";

export const KHATMA_PAGES = 604;
export type KhatmaKind = "tilawa" | "hifz";

/** The goal: finish in N days, or N pages / N juz per day. */
export type KhatmaPlan = { type: "days"; days: number } | { type: "pages"; perDay: number } | { type: "juz"; perDay: number };

export type Khatma = {
  id: string;
  kind: KhatmaKind;
  plan: KhatmaPlan;
  startDate: string;
  /** One character per page: "1" done, "0" not yet. */
  done: string;
  /** Pages logged per day (date → pages), for "today" and the history. */
  log: Record<string, number>;
  /** Pages added by the last action (for "undo"). */
  lastAdded: number[];
  completedAt: string | null;
};

export type FinishedKhatma = { kind: KhatmaKind; startDate: string; completedAt: string; days: number };
export type KhatmaState = { version: 1; tilawa: Khatma | null; hifz: Khatma | null; finished: FinishedKhatma[] };

const KEY = "hifz.khatma.v1";
const empty = (): KhatmaState => ({ version: 1, tilawa: null, hifz: null, finished: [] });
const signal = createSignal<KhatmaState>(empty());
let loaded: Promise<void> | null = null;

/* ───────────── plan arithmetic ───────────── */

/** Pages per day for a plan (a juz is ~20 pages). */
export function dailyPages(plan: KhatmaPlan): number {
  if (plan.type === "days") return Math.max(1, Math.ceil(KHATMA_PAGES / Math.max(1, plan.days)));
  if (plan.type === "juz") return Math.max(1, Math.round(plan.perDay * 20));
  return Math.max(1, Math.round(plan.perDay));
}
/** Days the plan takes in total. */
export const planDays = (plan: KhatmaPlan) => (plan.type === "days" ? Math.max(1, plan.days) : Math.ceil(KHATMA_PAGES / dailyPages(plan)));

const daysBetween = (a: string, b: string) => {
  const d = (s: string) => { const [y, m, dd] = s.split("-").map(Number); return Date.UTC(y ?? 1970, (m ?? 1) - 1, dd ?? 1); };
  return Math.round((d(b) - d(a)) / 86_400_000);
};
const addDays = (date: string, n: number) => { const [y, m, d] = date.split("-").map(Number); return localDate(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n)); };

/* ───────────── page index (juz / surah membership) ───────────── */

export type PageIndex = { juzOfPage: number[]; surahsOfPage: number[][] };

/** Builds the page → juz / surahs index from the bundled Mushaf (index 0 = page 1). */
export function pageIndexFrom(m: Mushaf): PageIndex {
  const juzOfPage: number[] = [], surahsOfPage: number[][] = [];
  for (let p = 1; p <= KHATMA_PAGES; p++) {
    juzOfPage.push(m.juzOfPage(p));
    surahsOfPage.push([...new Set(m.pageVerses(p).map((v) => v.surah))]);
  }
  return { juzOfPage, surahsOfPage };
}

export type KhatmaStats = {
  pagesDone: number;
  percent: number;
  /** Per juz 1–30: share of its pages done (0–1). */
  juz: number[];
  juzDone: number;
  /** Per surah 1–114: completed? */
  surahs: boolean[];
  surahsDone: number;
  /** First page not done yet (null when finished). */
  nextPage: number | null;
  target: number;
  today: number;
  /** Pages that should be done by the end of today under the plan. */
  expected: number;
  /** done − expected (positive: ahead of plan). */
  ahead: number;
  dayNumber: number;
  totalDays: number;
  /** Date the khatma will be finished at the current pace (null before any reading). */
  projected: string | null;
};

export function khatmaStats(k: Khatma, index: PageIndex | null, today = localDate()): KhatmaStats {
  const pagesDone = [...k.done].filter((c) => c === "1").length;
  const juzPages = Array.from({ length: 30 }, () => ({ total: 0, done: 0 }));
  const surahPages = Array.from({ length: 114 }, () => ({ total: 0, done: 0 }));
  for (let p = 0; p < KHATMA_PAGES; p++) {
    const d = k.done[p] === "1";
    const j = index?.juzOfPage[p] ?? Math.min(30, Math.floor(p / 20) + 1);
    juzPages[j - 1]!.total++; if (d) juzPages[j - 1]!.done++;
    for (const s of index?.surahsOfPage[p] ?? []) { surahPages[s - 1]!.total++; if (d) surahPages[s - 1]!.done++; }
  }
  const juz = juzPages.map((x) => (x.total ? x.done / x.total : 0));
  const surahs = surahPages.map((x) => x.total > 0 && x.done === x.total);
  const target = dailyPages(k.plan);
  const dayNumber = Math.max(1, daysBetween(k.startDate, today) + 1);
  const expected = Math.min(KHATMA_PAGES, target * dayNumber);
  const first = k.done.indexOf("0");
  const elapsed = Math.max(1, daysBetween(k.startDate, today) + (k.log[today] ? 1 : 0));
  const pace = pagesDone / elapsed;
  return {
    pagesDone,
    percent: Math.round((pagesDone / KHATMA_PAGES) * 1000) / 10,
    juz, juzDone: juz.filter((x) => x >= 1).length,
    surahs, surahsDone: surahs.filter(Boolean).length,
    nextPage: first < 0 ? null : first + 1,
    target,
    today: k.log[today] ?? 0,
    expected,
    ahead: pagesDone - expected,
    dayNumber,
    totalDays: planDays(k.plan),
    projected: k.completedAt ? k.completedAt.slice(0, 10) : pace > 0 ? addDays(today, Math.ceil((KHATMA_PAGES - pagesDone) / pace)) : null,
  };
}

/* ───────────── changes (pure) ───────────── */

export function newKhatma(kind: KhatmaKind, plan: KhatmaPlan, today = localDate()): Khatma {
  return { id: `${kind}-${today}-${Math.random().toString(36).slice(2, 7)}`, kind, plan, startDate: today, done: "0".repeat(KHATMA_PAGES), log: {}, lastAdded: [], completedAt: null };
}

function setPages(k: Khatma, pages: number[], value: boolean, today: string): Khatma {
  const chars = [...k.done];
  const changed: number[] = [];
  for (const p of pages) {
    if (p < 1 || p > KHATMA_PAGES) continue;
    if ((chars[p - 1] === "1") !== value) { chars[p - 1] = value ? "1" : "0"; changed.push(p); }
  }
  const log = { ...k.log };
  const delta = value ? changed.length : -changed.length;
  if (delta) log[today] = Math.max(0, (log[today] ?? 0) + delta);
  const done = chars.join("");
  return { ...k, done, log, lastAdded: value ? changed : [], completedAt: done.includes("0") ? null : k.completedAt ?? today };
}

/** Quick log: the next `count` pages not done yet, in Mushaf order (default: today's target). */
export function logPages(k: Khatma, count = dailyPages(k.plan), today = localDate()): Khatma {
  const pages: number[] = [];
  for (let p = 1; p <= KHATMA_PAGES && pages.length < count; p++) if (k.done[p - 1] !== "1") pages.push(p);
  return setPages(k, pages, true, today);
}
/** "I have read up to page N": every page up to N is done. */
export function logUpTo(k: Khatma, page: number, today = localDate()): Khatma {
  return setPages(k, Array.from({ length: Math.min(KHATMA_PAGES, Math.max(0, page)) }, (_, i) => i + 1), true, today);
}
/** A whole juz done / not done. */
export function toggleJuz(k: Khatma, juz: number, index: PageIndex | null, today = localDate()): Khatma {
  const pages: number[] = [];
  for (let p = 1; p <= KHATMA_PAGES; p++) if ((index?.juzOfPage[p - 1] ?? Math.min(30, Math.floor((p - 1) / 20) + 1)) === juz) pages.push(p);
  const all = pages.every((p) => k.done[p - 1] === "1");
  return setPages(k, pages, !all, today);
}
/** Undo the last log. */
export const undoLast = (k: Khatma, today = localDate()): Khatma => ({ ...setPages(k, k.lastAdded, false, today), lastAdded: [] });

/* ───────────── store ───────────── */

function sanitize(raw: unknown): KhatmaState {
  const s = empty();
  if (!raw || typeof raw !== "object") return s;
  const r = raw as Partial<KhatmaState>;
  const ok = (k: unknown): k is Khatma => !!k && typeof (k as Khatma).done === "string" && (k as Khatma).done.length === KHATMA_PAGES && !!(k as Khatma).plan;
  if (ok(r.tilawa)) s.tilawa = { ...r.tilawa, lastAdded: r.tilawa.lastAdded ?? [] };
  if (ok(r.hifz)) s.hifz = { ...r.hifz, lastAdded: r.hifz.lastAdded ?? [] };
  if (Array.isArray(r.finished)) s.finished = r.finished.slice(-50);
  return s;
}

export function loadKhatma(): Promise<void> {
  loaded ??= kv.getJson<unknown>(KEY, null).then((raw) => signal.set(sanitize(raw))).catch(() => {});
  return loaded;
}
export const getKhatmaState = () => signal.get();
export function useKhatma(): KhatmaState {
  return useSyncExternalStore(signal.subscribe, signal.get, signal.get);
}

async function save(next: KhatmaState) {
  signal.set(next);
  try { await kv.setJson(KEY, next); } catch { /* kept in memory */ }
}

/** Applies a change to one khatma; a khatma that just got completed is added to the history. */
export async function updateKhatma(kind: KhatmaKind, change: (k: Khatma) => Khatma): Promise<{ completed: boolean }> {
  await loadKhatma();
  const cur = signal.get();
  const k = cur[kind];
  if (!k) return { completed: false };
  const next = change(k);
  const completed = !k.completedAt && !!next.completedAt;
  const finished = completed ? [...cur.finished, { kind, startDate: next.startDate, completedAt: next.completedAt!, days: daysBetween(next.startDate, next.completedAt!) + 1 }] : cur.finished;
  await save({ ...cur, [kind]: next, finished });
  return { completed };
}

export async function startKhatma(kind: KhatmaKind, plan: KhatmaPlan) {
  await loadKhatma();
  await save({ ...signal.get(), [kind]: newKhatma(kind, plan) });
}
export async function endKhatma(kind: KhatmaKind) {
  await loadKhatma();
  await save({ ...signal.get(), [kind]: null });
}
export async function changePlan(kind: KhatmaKind, plan: KhatmaPlan) {
  await updateKhatma(kind, (k) => ({ ...k, plan }));
}
