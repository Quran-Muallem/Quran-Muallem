/**
 * Duas & adhkar library (كل الأذكار): the 132 chapters of Hisn al-Muslim (Arabic with tashkeel, English
 * transliteration and translation, Arabic references) plus the Quranic and Sunnah duas of
 * src/data/adhkar.json — in collapsible categories, with search and favourites.
 *
 * The Hisn data (~270 KB) is loaded on demand (dynamic import), not with the app start.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import adhkarData from "@/data/adhkar.json";
import type { Dhikr, QuranRef } from "@/lib/adhkar";
import { createSignal, kv } from "@/lib/storage";
import { foldSurahName } from "@/lib/goTo";

export type DuaCategory = "quran" | "sunnah" | "daynight" | "prayer" | "travel" | "distress" | "daily" | "illness" | "nature" | "hajj";
/** Order of the accordions. The first six are the requested ones; the rest keep every Hisn chapter reachable. */
export const DUA_CATEGORIES: { id: DuaCategory; emoji: string; key: string }[] = [
  { id: "quran", emoji: "📖", key: "duaCatQuran" },
  { id: "sunnah", emoji: "📜", key: "duaCatSunnah" },
  { id: "daynight", emoji: "🌅", key: "duaCatDayNight" },
  { id: "prayer", emoji: "🕌", key: "duaCatPrayer" },
  { id: "travel", emoji: "🚗", key: "duaCatTravel" },
  { id: "distress", emoji: "🤲", key: "duaCatDistress" },
  { id: "daily", emoji: "🏠", key: "duaCatDaily" },
  { id: "illness", emoji: "🏥", key: "duaCatIllness" },
  { id: "nature", emoji: "🌧️", key: "duaCatNature" },
  { id: "hajj", emoji: "🕋", key: "duaCatHajj" },
];

/** One text inside an entry (an entry is a Hisn chapter or a single dua). */
export type DuaText = {
  id: string;
  ar?: string;            // Arabic with tashkeel (Sunnah texts)
  quran?: QuranRef[];     // Quranic passage, rendered from the Mushaf text
  preface?: string;       // said before the verses (e.g. «الله أكبر» ×3 before the travel dua)
  tr?: string;            // transliteration
  en?: string;            // English translation
  ref?: string;           // reference (Arabic)
  repeat: number;
};
export type DuaEntry = { key: string; cat: DuaCategory; icon: string; ar: string; en: string; texts: DuaText[]; chapterRefs?: string[] };

type HisnChapter = { id: number; ar: string; en: string; cat: DuaCategory; icon: string; refs?: string[]; items: { id: number; ar: string; tr: string; en: string; repeat: number; ref?: string }[] };

const firstWords = (s: string, n = 6) => s.replace(/[()«»"]/g, "").split(/\s+/).slice(0, n).join(" ");

/** Own Sunnah duas that Hisn al-Muslim already has as a chapter (not listed twice). */
const IN_HISN = new Set(["d-istikhara", "d-adhan", "d-wake", "d-leave-home", "d-masjid-in", "d-masjid-out", "d-toilet-in", "d-toilet-out", "d-eat-start", "d-eat-end", "d-clothes", "d-travel", "d-rain", "d-sick", "d-anger", "d-karb", "d-hamm", "d-rahmataka", "d-zalamtu"]);

/** The Quranic and general Sunnah duas of the bundled adhkar (category "dua"). */
function ownDuas(): DuaEntry[] {
  const cat = (adhkarData as { categories: { id: string; items: (Dhikr & { group?: string })[] }[] }).categories.find((c) => c.id === "dua");
  return (cat?.items ?? []).filter((d) => !IN_HISN.has(d.id)).map((d) => {
    const quran = d.group === "quran";
    const title = quran ? `${d.benefitAr ? `${d.benefitAr.split("(")[0]!.trim()} — ` : ""}${d.sourceAr}` : (d.benefitAr?.split(/[:(]/)[0]?.trim() || firstWords(d.text ?? ""));
    const titleEn = quran ? `${d.benefitEn ? `${d.benefitEn.split("(")[0]!.trim()} — ` : ""}${d.sourceEn}` : (d.benefitEn?.split(/[:(]/)[0]?.trim() || d.sourceEn);
    return {
      key: `d:${d.id}`, cat: quran ? "quran" : "sunnah", icon: quran ? "📖" : "🤲", ar: title, en: titleEn,
      texts: [{ id: d.id, ...(d.quran ? { quran: d.quran } : {}), ...(d.text ? { ar: d.text } : {}), ...(d.preface ? { preface: d.preface } : {}), ref: d.sourceAr, repeat: d.count || 1 }],
    } satisfies DuaEntry;
  });
}

let library: Promise<DuaEntry[]> | null = null;
/** Every entry (own duas first, then Hisn al-Muslim in book order). */
export function loadDuaLibrary(): Promise<DuaEntry[]> {
  library ??= import("@/data/hisnMuslim.json").then((m) => {
    const hisn = ((m.default ?? m) as unknown as { chapters: HisnChapter[] }).chapters.map((c): DuaEntry => ({
      key: `h:${c.id}`, cat: c.cat, icon: c.icon, ar: c.ar, en: c.en.charAt(0).toUpperCase() + c.en.slice(1),
      texts: c.items.map((i) => ({ id: String(i.id), ar: i.ar, ...(i.tr ? { tr: i.tr } : {}), ...(i.en ? { en: i.en } : {}), ...(i.ref ? { ref: i.ref } : {}), repeat: i.repeat || 1 })),
      ...(c.refs?.length ? { chapterRefs: c.refs } : {}),
    }));
    return [...ownDuas(), ...hisn];
  });
  return library;
}
export function useDuaLibrary(): DuaEntry[] | null {
  const [list, setList] = useState<DuaEntry[] | null>(null);
  useEffect(() => { let alive = true; void loadDuaLibrary().then((l) => { if (alive) setList(l); }); return () => { alive = false; }; }, []);
  return list;
}

const fold = (s: string) => foldSurahName(s).replace(/ال/g, "");
/** Live search by title (Arabic without tashkeel / hamza forms, or English), then by the text itself. */
export function searchDuas(list: readonly DuaEntry[], query: string): DuaEntry[] {
  const q = fold(query.trim());
  if (!q) return [...list];
  const byTitle = list.filter((e) => fold(e.ar).includes(q) || fold(e.en).includes(q));
  const byText = list.filter((e) => !byTitle.includes(e) && e.texts.some((t) => (t.ar && fold(t.ar).includes(q)) || (t.en && fold(t.en).includes(q))));
  return [...byTitle, ...byText];
}

/* ───────────── favourites ───────────── */

const FAV_KEY = "hifz.duas.favorites.v1";
const favorites = createSignal<string[]>([]);
let favLoaded: Promise<void> | null = null;
const loadFavorites = () => (favLoaded ??= kv.getJson<string[]>(FAV_KEY, []).then((v) => favorites.set(Array.isArray(v) ? v : [])));
export async function toggleDuaFavorite(key: string) {
  await loadFavorites();
  const cur = favorites.get();
  const next = cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key];
  favorites.set(next);
  await kv.setJson(FAV_KEY, next);
}
export function useDuaFavorites(): string[] {
  void loadFavorites();
  return useSyncExternalStore(favorites.subscribe, favorites.get, favorites.get);
}

/* ───────────── reading settings (detail screen) ───────────── */

export type DuaReading = { size: number; tr: boolean; translation: boolean };
const READ_KEY = "hifz.duas.reading.v1";
const reading = createSignal<DuaReading>({ size: 1, tr: true, translation: true });
let readLoaded: Promise<void> | null = null;
const loadReading = () => (readLoaded ??= kv.getJson<DuaReading | null>(READ_KEY, null).then((v) => { if (v) reading.set({ ...reading.get(), ...v }); }));
export function setDuaReading(p: Partial<DuaReading>) { const n = { ...reading.get(), ...p }; reading.set(n); void kv.setJson(READ_KEY, n); }
export function useDuaReading(): DuaReading { void loadReading(); return useSyncExternalStore(reading.subscribe, reading.get, reading.get); }

/** Plain text of an entry for sharing. */
export function shareText(e: DuaEntry, quranText?: (r: QuranRef[]) => string): string {
  const parts = [e.ar];
  for (const t of e.texts) {
    parts.push("", t.quran && quranText ? quranText(t.quran) : t.ar ?? "");
    if (t.tr) parts.push(t.tr);
    if (t.en) parts.push(t.en);
    if (t.ref) parts.push(`— ${t.ref}`);
  }
  parts.push("", "Quran Muallem – معلم القرآن");
  return parts.join("\n");
}
