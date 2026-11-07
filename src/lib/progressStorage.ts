/**
 * Local-first progress tracking: last position, per-verse memorization status, accuracy,
 * daily activity and streaks. Everything stays on the device; JSON export/import moves it
 * between devices.
 */
import { useEffect, useSyncExternalStore } from "react";
import { createSignal, kv } from "@/lib/storage";
import { recordSurahAccuracy } from "@/lib/userAdaptation";

export const TOTAL_AYAHS = 6236;

export type VerseStatus = "NEW" | "MEMORIZED" | "NEEDS_REVISION";
export type StudyMode = "RECITATION_MODE" | "MEMORIZATION_MODE" | "READING";

export type VerseProgress = {
  status: VerseStatus;
  /** Last and best accuracy (0–100) from recitation matching. */
  lastAccuracy: number | null;
  bestAccuracy: number | null;
  attempts: number;
  /** ISO date-time of the last practice. */
  lastPracticed: string | null;
  /** Local calendar date (YYYY-MM-DD) when this verse is due for review. */
  nextReview: string | null;
  /** Current review interval in days (spaced repetition). */
  intervalDays: number;
};

export type LastPosition = { surahId: number; ayahId: number; mode: StudyMode; updatedAt: string };

export type DayActivity = { sessions: number; ayahsPracticed: number; correctWords: number; totalWords: number };

export type StudySession = {
  at: string;
  surahId: number;
  fromAyah: number;
  toAyah: number;
  mode: StudyMode;
  accuracy: number;
};

export type LocalProgress = {
  version: 1;
  lastPosition: LastPosition | null;
  /** Keyed "surah:ayah", e.g. "67:1". Verses never practiced are absent (= NEW). */
  verses: Record<string, VerseProgress>;
  streak: { current: number; longest: number; lastActiveDate: string | null };
  /** Keyed by local date YYYY-MM-DD. */
  daily: Record<string, DayActivity>;
  /** Most recent sessions first, capped. */
  sessions: StudySession[];
};

export const emptyProgress = (): LocalProgress => ({
  version: 1,
  lastPosition: null,
  verses: {},
  streak: { current: 0, longest: 0, lastActiveDate: null },
  daily: {},
  sessions: [],
});

const KEY = "hifz.progress.v1";
const MAX_SESSIONS = 200;
/** Accuracy needed in memorization mode to count a verse as memorized. */
export const MEMORIZED_THRESHOLD = 90;
/** Spaced-repetition ladder in days. */
const INTERVALS = [1, 3, 7, 14, 30, 60, 120];

export const verseKey = (surahId: number, ayahId: number) => `${surahId}:${ayahId}`;
export const parseVerseKey = (key: string) => {
  const [s, a] = key.split(":").map(Number);
  return { surahId: s ?? 0, ayahId: a ?? 0 };
};

/** Local calendar date (not UTC), so the streak follows the user's day. */
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return localDate(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
};
/** Monday of the week containing `date` (weeks start on Monday). */
export const mondayOf = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
};
/** One-letter day labels, Monday first: English M T W T F S S · Arabic ن ث ر خ ج س ح (الاثنين … الأحد). */
/** One-letter weekday labels (Monday first) for every app language. */
export { WEEKDAY_LETTERS } from "@/i18n";
const daysBetween = (a: string, b: string) => {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb ?? 0, (mb ?? 1) - 1, db ?? 1) - Date.UTC(ya ?? 0, (ma ?? 1) - 1, da ?? 1)) / 86_400_000);
};

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const signal = createSignal<LocalProgress>(emptyProgress());
let loaded: Promise<LocalProgress> | null = null;
let writeChain: Promise<void> = Promise.resolve();

export function loadProgress(): Promise<LocalProgress> {
  loaded ??= kv.getJson<unknown>(KEY, null).then((raw) => {
    const value = sanitize(raw) ?? emptyProgress();
    signal.set(value);
    return value;
  });
  return loaded;
}

export const getProgress = () => signal.get();

/** Called after every change of the progress store (used by the badges). */
export const subscribeProgress = (listener: () => void) => signal.subscribe(listener);

async function commit(update: (p: LocalProgress) => LocalProgress): Promise<LocalProgress> {
  await loadProgress();
  const next = update(structuredClone(signal.get()));
  signal.set(next);
  writeChain = writeChain.then(() => kv.setJson(KEY, next)).catch(() => {});
  await writeChain;
  return next;
}

export function useProgress(): LocalProgress {
  const value = useSyncExternalStore(signal.subscribe, signal.get, () => EMPTY);
  useEffect(() => { void loadProgress(); }, []);
  return value;
}
const EMPTY = emptyProgress();

/* ------------------------------------------------------------------ */
/* Updates                                                             */
/* ------------------------------------------------------------------ */

function touchStreak(p: LocalProgress, today: string) {
  const last = p.streak.lastActiveDate;
  if (last === today) return;
  const gap = last ? daysBetween(last, today) : Infinity;
  p.streak.current = gap === 1 ? p.streak.current + 1 : 1;
  p.streak.longest = Math.max(p.streak.longest, p.streak.current);
  p.streak.lastActiveDate = today;
}

/** Remembers where the user is ("continue where you left off"). Does not count as study activity. */
export function setLastPosition(surahId: number, ayahId: number, mode: StudyMode): Promise<LocalProgress> {
  return commit((p) => ({ ...p, lastPosition: { surahId, ayahId, mode, updatedAt: new Date().toISOString() } }));
}

export type AyahResult = { ayahId: number; accuracy: number; correctWords: number; totalWords: number };

/**
 * Records a recitation attempt for one or more verses of a surah.
 * - Memorization mode: ≥ 90 % → MEMORIZED (review interval grows), otherwise NEEDS_REVISION (due tomorrow / today).
 * - Recitation (reading along): stores accuracy only; a memorized verse read badly is flagged for revision.
 */
export function recordAttempt(input: { surahId: number; mode: StudyMode; results: AyahResult[]; now?: Date }): Promise<LocalProgress> {
  const now = input.now ?? new Date();
  // Accuracy history per surah for "My voice profile" (weighted by words, like the session list).
  const totalWords = input.results.reduce((s, r) => s + r.totalWords, 0);
  if (totalWords) void recordSurahAccuracy(input.surahId, input.results.reduce((s, r) => s + r.accuracy * r.totalWords, 0) / totalWords, input.results.length, input.mode === "MEMORIZATION_MODE", now).catch(() => {});
  const today = localDate(now);
  return commit((p) => {
    if (input.results.length === 0) return p;
    for (const r of input.results) {
      const key = verseKey(input.surahId, r.ayahId);
      const v: VerseProgress = p.verses[key] ?? { status: "NEW", lastAccuracy: null, bestAccuracy: null, attempts: 0, lastPracticed: null, nextReview: null, intervalDays: 0 };
      const acc = Math.max(0, Math.min(100, Math.round(r.accuracy)));
      v.attempts += 1;
      v.lastAccuracy = acc;
      v.bestAccuracy = Math.max(v.bestAccuracy ?? 0, acc);
      v.lastPracticed = now.toISOString();
      if (input.mode === "MEMORIZATION_MODE") {
        if (acc >= MEMORIZED_THRESHOLD) {
          const step = v.status === "MEMORIZED" ? INTERVALS.findIndex((d) => d > v.intervalDays) : 0;
          v.intervalDays = INTERVALS[step === -1 ? INTERVALS.length - 1 : step] ?? 1;
          v.status = "MEMORIZED";
        } else {
          v.status = "NEEDS_REVISION";
          v.intervalDays = acc >= 60 ? 1 : 0;
        }
        v.nextReview = addDays(today, v.intervalDays);
      } else if (v.status === "MEMORIZED" && acc < 60) {
        v.status = "NEEDS_REVISION"; v.intervalDays = 0; v.nextReview = today;
      }
      p.verses[key] = v;
    }
    const day = p.daily[today] ?? { sessions: 0, ayahsPracticed: 0, correctWords: 0, totalWords: 0 };
    day.sessions += 1;
    day.ayahsPracticed += input.results.length;
    day.correctWords += input.results.reduce((s, r) => s + r.correctWords, 0);
    day.totalWords += input.results.reduce((s, r) => s + r.totalWords, 0);
    p.daily[today] = day;
    touchStreak(p, today);
    const ayahs = input.results.map((r) => r.ayahId);
    const words = input.results.reduce((s, r) => s + r.totalWords, 0);
    p.sessions.unshift({
      at: now.toISOString(), surahId: input.surahId, fromAyah: Math.min(...ayahs), toAyah: Math.max(...ayahs), mode: input.mode,
      accuracy: words ? Math.round(input.results.reduce((s, r) => s + r.accuracy * r.totalWords, 0) / words) : 0,
    });
    p.sessions = p.sessions.slice(0, MAX_SESSIONS);
    const last = Math.max(...ayahs);
    p.lastPosition = { surahId: input.surahId, ayahId: last, mode: input.mode, updatedAt: now.toISOString() };
    return p;
  });
}

/** Manually set a verse's status (e.g. "I already know this surah"). */
export function setVerseStatus(surahId: number, ayahIds: number[], status: VerseStatus): Promise<LocalProgress> {
  const today = localDate();
  return commit((p) => {
    for (const a of ayahIds) {
      const key = verseKey(surahId, a);
      if (status === "NEW") { delete p.verses[key]; continue; }
      const v = p.verses[key] ?? { status, lastAccuracy: null, bestAccuracy: null, attempts: 0, lastPracticed: null, nextReview: null, intervalDays: 0 };
      v.status = status;
      v.intervalDays = status === "MEMORIZED" ? Math.max(v.intervalDays, 3) : 0;
      v.nextReview = addDays(today, v.intervalDays);
      p.verses[key] = v;
    }
    return p;
  });
}

export const resetProgress = () => commit(() => emptyProgress());

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export const verseStatus = (p: LocalProgress, surahId: number, ayahId: number): VerseStatus =>
  p.verses[verseKey(surahId, ayahId)]?.status ?? "NEW";

/** A contiguous run of due verses in one surah, for "review today". */
export type DueRange = { surahId: number; fromAyah: number; toAyah: number; count: number; overdueDays: number };

/** Verses due today: NEEDS_REVISION, or MEMORIZED whose review date has come. Grouped into contiguous ranges. */
export function getDueRanges(p: LocalProgress, today = localDate()): DueRange[] {
  const due = Object.entries(p.verses)
    .filter(([, v]) => v.status === "NEEDS_REVISION" || (v.status === "MEMORIZED" && !!v.nextReview && v.nextReview <= today))
    .map(([k, v]) => ({ ...parseVerseKey(k), overdue: v.nextReview ? Math.max(0, daysBetween(v.nextReview, today)) : 0 }))
    .sort((a, b) => a.surahId - b.surahId || a.ayahId - b.ayahId);
  const ranges: DueRange[] = [];
  for (const v of due) {
    const last = ranges.at(-1);
    if (last && last.surahId === v.surahId && last.toAyah + 1 === v.ayahId && last.count < 10) {
      last.toAyah = v.ayahId; last.count++; last.overdueDays = Math.max(last.overdueDays, v.overdue);
    } else ranges.push({ surahId: v.surahId, fromAyah: v.ayahId, toAyah: v.ayahId, count: 1, overdueDays: v.overdue });
  }
  return ranges.sort((a, b) => b.overdueDays - a.overdueDays || a.surahId - b.surahId);
}

export type ProgressStats = {
  memorized: number;
  needsRevision: number;
  practiced: number;
  dueToday: number;
  /** Average of last accuracies across practiced verses, or null. */
  averageAccuracy: number | null;
  /** Current streak, already reset to 0 if the user skipped a day. */
  streak: number;
  longestStreak: number;
  activeToday: boolean;
  /** Ayahs practiced on each day of the current week, Monday → Sunday (future days are 0). */
  week: { date: string; ayahs: number; today: boolean; future: boolean }[];
};

export function getStats(p: LocalProgress, today = localDate()): ProgressStats {
  const verses = Object.values(p.verses);
  const accs = verses.map((v) => v.lastAccuracy).filter((a): a is number => a != null);
  const last = p.streak.lastActiveDate;
  const alive = !!last && daysBetween(last, today) <= 1;
  return {
    memorized: verses.filter((v) => v.status === "MEMORIZED").length,
    needsRevision: verses.filter((v) => v.status === "NEEDS_REVISION").length,
    practiced: verses.length,
    dueToday: getDueRanges(p, today).reduce((s, r) => s + r.count, 0),
    averageAccuracy: accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null,
    streak: alive ? p.streak.current : 0,
    longestStreak: p.streak.longest,
    activeToday: last === today,
    week: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(mondayOf(today), i);
      return { date, ayahs: p.daily[date]?.ayahsPracticed ?? 0, today: date === today, future: date > today };
    }),
  };
}

/** Per-surah summary for progress bars. */
export function surahProgress(p: LocalProgress, surahId: number, versesCount: number) {
  let memorized = 0, revision = 0;
  for (let a = 1; a <= versesCount; a++) {
    const s = verseStatus(p, surahId, a);
    if (s === "MEMORIZED") memorized++; else if (s === "NEEDS_REVISION") revision++;
  }
  return { memorized, revision, percent: versesCount ? Math.round((memorized / versesCount) * 100) : 0 };
}

/** Surahs the user has touched, most recent first. */
export function recentSurahs(p: LocalProgress, limit = 4): number[] {
  const seen: number[] = [];
  if (p.lastPosition) seen.push(p.lastPosition.surahId);
  for (const s of p.sessions) if (!seen.includes(s.surahId)) seen.push(s.surahId);
  return seen.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Backup                                                              */
/* ------------------------------------------------------------------ */

const APP_TAG = "quran.muallem/progress";
/** Backups made before the app was renamed. */
const LEGACY_TAGS = ["com.hifz.quran.ai/progress"];

export type ProgressBackup = { app: typeof APP_TAG; exportedAt: string; progress: LocalProgress };

export function exportProgressJson(p: LocalProgress = signal.get()): string {
  const backup: ProgressBackup = { app: APP_TAG, exportedAt: new Date().toISOString(), progress: p };
  return JSON.stringify(backup, null, 2);
}

export const backupFileName = () => `quran-muallem-backup-${localDate()}.json`;

/** Triggers a download (browser) or the share sheet / file save (native, if available). */
export async function downloadBackup(): Promise<void> {
  await loadProgress();
  const json = exportProgressJson();
  const name = backupFileName();
  const file = new File([json], name, { type: "application/json" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] }) && /android|iphone|ipad/i.test(navigator.userAgent)) {
    try { await nav.share({ files: [file], title: name }); return; } catch { /* fall back to download */ }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export class BackupError extends Error {}

function sanitize(raw: unknown): LocalProgress | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<LocalProgress>;
  if (p.version !== 1 || typeof p.verses !== "object" || !p.verses) return null;
  const base = emptyProgress();
  const verses: Record<string, VerseProgress> = {};
  for (const [k, v] of Object.entries(p.verses)) {
    if (!/^\d{1,3}:\d{1,3}$/.test(k) || !v || typeof v !== "object") continue;
    const status = (v as VerseProgress).status;
    if (status !== "MEMORIZED" && status !== "NEEDS_REVISION" && status !== "NEW") continue;
    verses[k] = { ...{ lastAccuracy: null, bestAccuracy: null, attempts: 0, lastPracticed: null, nextReview: null, intervalDays: 0 }, ...(v as VerseProgress) };
  }
  return {
    version: 1,
    lastPosition: p.lastPosition && typeof p.lastPosition.surahId === "number" ? p.lastPosition : null,
    verses,
    streak: { ...base.streak, ...(p.streak ?? {}) },
    daily: p.daily && typeof p.daily === "object" ? p.daily : {},
    sessions: Array.isArray(p.sessions) ? p.sessions.slice(0, MAX_SESSIONS) : [],
  };
}

/** Parses a backup (from exportProgressJson). Throws BackupError if it is not a valid backup. */
export function parseBackup(json: string): LocalProgress {
  let data: unknown;
  try { data = JSON.parse(json); } catch { throw new BackupError("not-json"); }
  const tag = (data as { app?: unknown } | null)?.app;
  const progress = tag === APP_TAG || LEGACY_TAGS.includes(tag as string) ? (data as ProgressBackup).progress : data;
  const clean = sanitize(progress);
  if (!clean) throw new BackupError("invalid");
  return clean;
}

/**
 * Restores a backup. "replace" overwrites everything; "merge" keeps, per verse, the more recently
 * practiced record, sums nothing twice and keeps the longer streak.
 */
export function importProgressJson(json: string, mode: "merge" | "replace" = "merge"): Promise<LocalProgress> {
  const incoming = parseBackup(json);
  return commit((current) => {
    if (mode === "replace") return incoming;
    const verses = { ...current.verses };
    for (const [k, v] of Object.entries(incoming.verses)) {
      const mine = verses[k];
      if (!mine || (v.lastPracticed ?? "") > (mine.lastPracticed ?? "")) verses[k] = v;
    }
    const daily = { ...incoming.daily };
    for (const [d, a] of Object.entries(current.daily)) {
      const other = daily[d];
      daily[d] = !other || a.ayahsPracticed >= other.ayahsPracticed ? a : other;
    }
    const later = (a: LastPosition | null, b: LastPosition | null) => (!a ? b : !b ? a : a.updatedAt >= b.updatedAt ? a : b);
    const streakFrom = (current.streak.lastActiveDate ?? "") >= (incoming.streak.lastActiveDate ?? "") ? current.streak : incoming.streak;
    const sessions = [...current.sessions, ...incoming.sessions]
      .filter((s, i, all) => all.findIndex((o) => o.at === s.at && o.surahId === s.surahId) === i)
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, MAX_SESSIONS);
    return {
      version: 1,
      lastPosition: later(current.lastPosition, incoming.lastPosition),
      verses,
      streak: { ...streakFrom, longest: Math.max(current.streak.longest, incoming.streak.longest) },
      daily,
      sessions,
    };
  });
}
