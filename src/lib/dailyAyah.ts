/**
 * Daily encouraging verse. Only references are stored here; the text always comes from the bundled
 * Mushaf data (src/lib/mushafData.ts), so it is the authentic Uthmani text.
 */
import { localDate } from "@/lib/progressStorage";

export type AyahRef = { surah: number; from: number; to: number };

/** Verses of hope, ease, patience, du'a and the virtue of the Quran. */
export const ENCOURAGING: AyahRef[] = [
  { surah: 94, from: 5, to: 6 },   // فإن مع العسر يسرا
  { surah: 54, from: 17, to: 17 }, // ولقد يسرنا القرآن للذكر
  { surah: 13, from: 28, to: 28 }, // ألا بذكر الله تطمئن القلوب
  { surah: 2, from: 152, to: 152 },
  { surah: 2, from: 153, to: 153 },
  { surah: 3, from: 139, to: 139 },
  { surah: 39, from: 53, to: 53 },
  { surah: 93, from: 5, to: 5 },
  { surah: 11, from: 115, to: 115 },
  { surah: 73, from: 4, to: 4 },
  { surah: 17, from: 9, to: 9 },
  { surah: 64, from: 16, to: 16 },
  { surah: 29, from: 69, to: 69 },
  { surah: 12, from: 87, to: 87 },
  { surah: 3, from: 200, to: 200 },
  { surah: 47, from: 7, to: 7 },
  { surah: 2, from: 45, to: 45 },
  { surah: 16, from: 128, to: 128 },
  { surah: 2, from: 186, to: 186 },
  { surah: 20, from: 25, to: 28 }, // رب اشرح لي صدري…
  { surah: 3, from: 8, to: 8 },
  { surah: 2, from: 201, to: 201 },
  { surah: 9, from: 51, to: 51 },
  { surah: 33, from: 41, to: 41 },
  { surah: 10, from: 57, to: 57 },
  { surah: 55, from: 13, to: 13 },
  { surah: 65, from: 3, to: 3 },
  { surah: 2, from: 286, to: 286 },
];

/** Same verse all day, a different one each day (deterministic shuffle of the date). */
export function ayahOfTheDay(date = localDate(), offset = 0): AyahRef {
  let h = 2166136261;
  for (const c of date) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const i = ((h >>> 0) + offset) % ENCOURAGING.length;
  return ENCOURAGING[i]!;
}
