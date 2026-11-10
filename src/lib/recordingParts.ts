/**
 * Splitting one continuous recitation into recordings: one per surah (v30 — before, v29 cut at every page
 * turn too, and a bug lost the first page of a surah).
 *
 * The microphone runs on across page turns and from one surah into the next (An-Naba → An-Nazi'at →
 * 'Abasa). Each finished part — the page turned, the surah's last word was reached, or the reader moved on
 * to another surah — is cut off as its own recording (`useTranscribingRecorder.cut`), so «جلسات التسجيل»
 * lists سورة النبأ, سورة النازعات, سورة عبس separately and no page overwrites another.
 */
import type { LiveStatus } from "@/lib/quranMatcher";
import { accuracyOf } from "@/lib/audioStorage";

export type JudgedWord = { key: string; status: LiveStatus | undefined };
export type RecordingPart = { surah: number; fromAyah: number; toAyah: number; verses: string[]; words: number; accuracy: number | null; correct?: number; near?: number; wrong?: number };

const verseOf = (key: string) => key.slice(0, key.lastIndexOf(":"));

/**
 * The verses recited (any judged word) and not saved yet (`skip`), grouped by surah in reading order, with
 * the accuracy of their words. Words still PENDING do not count.
 */
export function recordingParts(words: readonly JudgedWord[], skip: ReadonlySet<string> = new Set()): RecordingPart[] {
  const by = new Map<number, { ayat: Set<number>; verses: Set<string>; correct: number; near: number; wrong: number; words: number }>();
  for (const w of words) {
    if (!w.status || w.status === "PENDING") continue;
    const verse = verseOf(w.key);
    if (skip.has(verse)) continue;
    const [s, a] = verse.split(":").map(Number) as [number, number];
    const g = by.get(s) ?? { ayat: new Set<number>(), verses: new Set<string>(), correct: 0, near: 0, wrong: 0, words: 0 };
    g.ayat.add(a); g.verses.add(verse); g.words++;
    if (w.status === "CORRECT") g.correct++; else if (w.status === "WARNING") g.near++; else if (w.status === "ERROR") g.wrong++;
    by.set(s, g);
  }
  return [...by.entries()].map(([surah, g]) => ({
    surah, fromAyah: Math.min(...g.ayat), toAyah: Math.max(...g.ayat), verses: [...g.verses], words: g.words, accuracy: accuracyOf(g),
    correct: g.correct, near: g.near, wrong: g.wrong,
  }));
}

/**
 * v30: the open (not yet saved) part of each surah, collected across page turns — a surah over several pages
 * (Al-Balad, Al-Fajr…) becomes ONE recording «verse 1 to verse 20», not one per page.
 */
export type OpenParts = Map<number, RecordingPart>;
export function addToOpen(open: OpenParts, parts: readonly RecordingPart[]): OpenParts {
  const next: OpenParts = new Map(open);
  for (const p of parts) {
    const o = next.get(p.surah);
    if (!o) { next.set(p.surah, { ...p, verses: [...p.verses] }); continue; }
    const correct = (o.correct ?? 0) + (p.correct ?? 0), near = (o.near ?? 0) + (p.near ?? 0), wrong = (o.wrong ?? 0) + (p.wrong ?? 0);
    next.set(p.surah, {
      surah: p.surah, fromAyah: Math.min(o.fromAyah, p.fromAyah), toAyah: Math.max(o.toAyah, p.toAyah),
      verses: [...new Set([...o.verses, ...p.verses])], words: o.words + p.words, correct, near, wrong,
      accuracy: accuracyOf({ correct, near, wrong }),
    });
  }
  return next;
}

/** When one piece of audio holds several parts (no live cut was possible): the part with the most words. */
export function mainPart(parts: readonly RecordingPart[]): RecordingPart | null {
  let best: RecordingPart | null = null;
  for (const p of parts) if (!best || p.words > best.words) best = p;
  return best;
}

/** Seconds of audio below which a part without any recited verse is not kept (e.g. the silence after a surah). */
export const MIN_EMPTY_PART_SECONDS = 4;
/** Silence after a surah's last word before the recording stops by itself (unless the reader goes on). */
export const SURAH_END_SILENCE_MS = 2000;
