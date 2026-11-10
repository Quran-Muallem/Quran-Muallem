/**
 * Splitting one continuous recitation into recordings (v29): one per page and per surah.
 *
 * The microphone runs on across page turns and from one surah into the next (An-Naba → An-Nazi'at →
 * 'Abasa). Each finished part — the page turned, the surah's last word was reached, or the reader moved on
 * to another surah — is cut off as its own recording (`useTranscribingRecorder.cut`), so «جلسات التسجيل»
 * lists سورة النبأ, سورة النازعات, سورة عبس separately and no page overwrites another.
 */
import type { LiveStatus } from "@/lib/quranMatcher";
import { accuracyOf } from "@/lib/audioStorage";

export type JudgedWord = { key: string; status: LiveStatus | undefined };
export type RecordingPart = { surah: number; fromAyah: number; toAyah: number; verses: string[]; words: number; accuracy: number | null };

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
  }));
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
