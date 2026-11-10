/**
 * v38 «ألوان أحكام التجويد»: the Tajweed rules coloured in the Quran text.
 *
 * Source: Quran.com's `text_uthmani_tajweed` (Uthmani text with <tajweed class=…> marks per letter), loaded per
 * surah when the colours are on and kept in IndexedDB (offline afterwards). Each verse is split into its words
 * and stored as segments «text + rule»; a verse is used only when its word count equals the Mushaf's, so the
 * coloured words line up exactly with the words the recitation check judges (otherwise that verse stays plain).
 * The colours follow Quran.com's scheme (lighter tones on the dark themes, see styles.css `.tj-*`).
 */
import { useEffect, useState } from "react";
import type { CopyKey } from "@/lib/i18n";
import { idb } from "@/lib/storage";

export type TajweedSeg = { text: string; cls?: string };
/** Words of a verse, each a list of segments. */
export type TajweedVerse = TajweedSeg[][];
/** «surah:ayah» → words. */
export type TajweedSurah = Record<string, TajweedVerse>;

const API = "https://api.quran.com/api/v4/quran/verses/uthmani_tajweed";
const CACHE = (s: number) => `tajweed:v1:${s}`;

/** The rule classes Quran.com uses (others are drawn plain). */
export const TAJWEED_CLASSES = new Set([
  "ham_wasl", "laam_shamsiyah", "slnt", "madda_normal", "madda_permissible", "madda_necessary", "madda_obligatory",
  "qalaqah", "ikhafa_shafawi", "ikhafa", "idgham_shafawi", "iqlab", "idgham_ghunnah", "idgham_wo_ghunnah",
  "idgham_mutajanisayn", "idgham_mutaqaribayn", "ghunnah",
]);

/** Legend in the settings: one colour per group of rules. */
export const TAJWEED_LEGEND: readonly [string, CopyKey][] = [
  ["madda_necessary", "tjcMaddLazim"], ["madda_obligatory", "tjcMaddWajib"], ["madda_permissible", "tjcMaddJaiz"], ["madda_normal", "tjcMaddTabii"],
  ["ghunnah", "tjcGhunnah"], ["ikhafa", "tjcIkhfa"], ["idgham_ghunnah", "tjcIdgham"], ["iqlab", "tjcIqlab"],
  ["qalaqah", "tjcQalqalah"], ["ham_wasl", "tjcSilent"],
];

/**
 * Splits Quran.com's tajweed HTML of one verse into words of coloured segments. The verse-end number
 * (<span class=end>) is dropped; a rule spanning two words («دًى ل») is cut at the space and colours both parts.
 */
export function parseTajweedVerse(html: string): TajweedVerse {
  const cleaned = html.replace(/<span class=["']?end["']?>[^<]*<\/span>/g, "");
  const words: TajweedVerse = [[]];
  let cls: string | undefined;
  const push = (text: string) => {
    for (const [i, part] of text.split(" ").entries()) {
      if (i > 0) words.push([]);
      if (!part) continue;
      const w = words[words.length - 1]!;
      const last = w[w.length - 1];
      if (last && last.cls === cls) last.text += part;
      else w.push(cls ? { text: part, cls } : { text: part });
    }
  };
  const re = /<tajweed class=["']?([\w-]+)["']?>|<\/tajweed>|<[^>]+>|([^<]+)/g;
  for (let m = re.exec(cleaned); m; m = re.exec(cleaned)) {
    if (m[1]) cls = TAJWEED_CLASSES.has(m[1]) ? m[1] : undefined;
    else if (m[0] === "</tajweed>") cls = undefined;
    else if (m[2]) push(m[2]);
  }
  // «۞» (rub' al-hizb) is its own token here but part of the next word in the Mushaf data.
  const out: TajweedVerse = [];
  let carry: TajweedSeg[] = [];
  for (const w of words) {
    if (!w.length) continue;
    if (w.map((x) => x.text).join("") === "۞") { carry = [...carry, ...w, { text: " " }]; continue; }
    out.push([...carry, ...w]);
    carry = [];
  }
  return out;
}

const memory = new Map<number, Promise<TajweedSurah | null>>();

/** The tajweed words of a surah (IndexedDB, else Quran.com; null when offline and not saved). */
export function tajweedSurah(surah: number): Promise<TajweedSurah | null> {
  let p = memory.get(surah);
  if (!p) {
    p = (async () => {
      const cached = await idb.get<TajweedSurah>(CACHE(surah)).catch(() => undefined);
      if (cached) return cached;
      const res = await fetch(`${API}?chapter_number=${surah}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { verses?: { verse_key: string; text_uthmani_tajweed: string }[] };
      const out: TajweedSurah = {};
      for (const v of data.verses ?? []) out[v.verse_key] = parseTajweedVerse(v.text_uthmani_tajweed ?? "");
      if (Object.keys(out).length) void idb.set(CACHE(surah), out).catch(() => {});
      return out;
    })().catch(() => null);
    memory.set(surah, p);
    void p.then((v) => { if (!v) memory.delete(surah); });
  }
  return p;
}

/**
 * Coloured words for the given verses: «s:a:w» → segments, only for verses whose word count matches
 * `wordCount(s, a)` (the Mushaf's). Empty while loading or when `enabled` is off.
 */
export function useTajweedWords(enabled: boolean, verses: readonly { surah: number; ayah: number }[], wordCount: (s: number, a: number) => number): Map<string, TajweedSeg[]> {
  const [map, setMap] = useState<Map<string, TajweedSeg[]>>(() => new Map());
  const key = enabled ? verses.map((v) => `${v.surah}:${v.ayah}`).join(",") : "";
  useEffect(() => {
    if (!key) { setMap(new Map()); return; }
    let alive = true;
    const surahs = [...new Set(verses.map((v) => v.surah))];
    void Promise.all(surahs.map((s) => tajweedSurah(s))).then((all) => {
      if (!alive) return;
      const out = new Map<string, TajweedSeg[]>();
      surahs.forEach((s, i) => {
        const data = all[i];
        if (!data) return;
        for (const v of verses) {
          if (v.surah !== s) continue;
          const words = data[`${s}:${v.ayah}`];
          if (!words || words.length !== wordCount(s, v.ayah)) continue;
          words.forEach((segs, w) => out.set(`${s}:${v.ayah}:${w + 1}`, segs));
        }
      });
      setMap(out);
    });
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return map;
}
