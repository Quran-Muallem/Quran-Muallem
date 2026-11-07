import { normalizeArabic, type LiveStatus } from "@/lib/quranMatcher";
import type { AyahResult } from "@/lib/progressStorage";

/**
 * Turns live word statuses into per-Ayah results for the progress tracker.
 * Only verses the reciter finished (or passed) are scored; untouched verses are left out, and the verse
 * the reciter stopped in the middle of is skipped so a pause never counts as a mistake.
 */
export function ayahResults(ayat: readonly { number: number; text: string }[], statuses: readonly LiveStatus[], done: boolean): AyahResult[] {
  const spans: { number: number; words: LiveStatus[] }[] = [];
  let offset = 0;
  for (const a of ayat) {
    const tokens = a.text.split(" ");
    const words = tokens.map((t, i) => (normalizeArabic(t) ? statuses[offset + i] ?? "PENDING" : null)).filter((s): s is LiveStatus => s !== null);
    spans.push({ number: a.number, words });
    offset += tokens.length;
  }
  let lastReached = -1;
  spans.forEach((s, i) => { if (s.words.some((w) => w !== "PENDING")) lastReached = i; });
  const out: AyahResult[] = [];
  spans.forEach((s, i) => {
    if (i > lastReached || !s.words.length) return;
    const finished = i < lastReached || done || s.words.every((w) => w !== "PENDING");
    if (!finished) return;
    const correct = s.words.filter((w) => w === "CORRECT").length;
    const warning = s.words.filter((w) => w === "WARNING").length;
    out.push({ ayahId: s.number, accuracy: ((correct + warning * 0.5) / s.words.length) * 100, correctWords: correct, totalWords: s.words.length });
  });
  return out;
}
