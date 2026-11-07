/**
 * Quran data service. Primary source is the Mushaf text bundled with the app (src/lib/mushafData.ts).
 * Fallback: all 114 surahs from the public Quran.com API (v4), Uthmani script
 * (`text_uthmani`), cached on the device (IndexedDB) so the Mushaf works fully offline after the
 * first load. Backup source: api.alquran.cloud. Built-in metadata keeps the surah list available
 * even on the very first offline start.
 */
import { idb } from "@/lib/storage";
import { SURAHS as BUNDLED } from "@/lib/quran-data";
import { loadMushaf } from "@/lib/mushafData";

export const QURAN_API = "https://api.quran.com/api/v4";
const ALQURAN_CLOUD = "https://api.alquran.cloud/v1";

export type RevelationPlace = "makkah" | "madinah";

export type SurahMeta = {
  id: number;
  nameArabic: string;
  nameSimple: string;
  versesCount: number;
  revelationPlace: RevelationPlace;
  /** Every surah except Al-Fatiha (where it is Ayah 1) and At-Tawbah starts with a separate Basmalah. */
  bismillahPre: boolean;
};

export type Ayah = { number: number; text: string };
export type SurahText = { surahId: number; ayahs: Ayah[]; source: "mushaf" | "quran.com" | "alquran.cloud" | "bundled"; cachedAt: string };

/** [Arabic name, transliteration, verses, Medinan?] — built-in, verified: 114 surahs, 6236 verses. */
const META: [string, string, number, 0 | 1][] = [["الفاتحة","Al-Fatihah",7,0],["البقرة","Al-Baqarah",286,1],["آل عمران","Ali 'Imran",200,1],["النساء","An-Nisa",176,1],["المائدة","Al-Ma'idah",120,1],["الأنعام","Al-An'am",165,0],["الأعراف","Al-A'raf",206,0],["الأنفال","Al-Anfal",75,1],["التوبة","At-Tawbah",129,1],["يونس","Yunus",109,0],["هود","Hud",123,0],["يوسف","Yusuf",111,0],["الرعد","Ar-Ra'd",43,1],["إبراهيم","Ibrahim",52,0],["الحجر","Al-Hijr",99,0],["النحل","An-Nahl",128,0],["الإسراء","Al-Isra",111,0],["الكهف","Al-Kahf",110,0],["مريم","Maryam",98,0],["طه","Taha",135,0],["الأنبياء","Al-Anbya",112,0],["الحج","Al-Hajj",78,1],["المؤمنون","Al-Mu'minun",118,0],["النور","An-Nur",64,1],["الفرقان","Al-Furqan",77,0],["الشعراء","Ash-Shu'ara",227,0],["النمل","An-Naml",93,0],["القصص","Al-Qasas",88,0],["العنكبوت","Al-'Ankabut",69,0],["الروم","Ar-Rum",60,0],["لقمان","Luqman",34,0],["السجدة","As-Sajdah",30,0],["الأحزاب","Al-Ahzab",73,1],["سبأ","Saba",54,0],["فاطر","Fatir",45,0],["يس","Ya-Sin",83,0],["الصافات","As-Saffat",182,0],["ص","Sad",88,0],["الزمر","Az-Zumar",75,0],["غافر","Ghafir",85,0],["فصلت","Fussilat",54,0],["الشورى","Ash-Shuraa",53,0],["الزخرف","Az-Zukhruf",89,0],["الدخان","Ad-Dukhan",59,0],["الجاثية","Al-Jathiyah",37,0],["الأحقاف","Al-Ahqaf",35,0],["محمد","Muhammad",38,1],["الفتح","Al-Fath",29,1],["الحجرات","Al-Hujurat",18,1],["ق","Qaf",45,0],["الذاريات","Adh-Dhariyat",60,0],["الطور","At-Tur",49,0],["النجم","An-Najm",62,0],["القمر","Al-Qamar",55,0],["الرحمن","Ar-Rahman",78,1],["الواقعة","Al-Waqi'ah",96,0],["الحديد","Al-Hadid",29,1],["المجادلة","Al-Mujadila",22,1],["الحشر","Al-Hashr",24,1],["الممتحنة","Al-Mumtahanah",13,1],["الصف","As-Saf",14,1],["الجمعة","Al-Jumu'ah",11,1],["المنافقون","Al-Munafiqun",11,1],["التغابن","At-Taghabun",18,1],["الطلاق","At-Talaq",12,1],["التحريم","At-Tahrim",12,1],["الملك","Al-Mulk",30,0],["القلم","Al-Qalam",52,0],["الحاقة","Al-Haqqah",52,0],["المعارج","Al-Ma'arij",44,0],["نوح","Nuh",28,0],["الجن","Al-Jinn",28,0],["المزمل","Al-Muzzammil",20,0],["المدثر","Al-Muddaththir",56,0],["القيامة","Al-Qiyamah",40,0],["الإنسان","Al-Insan",31,1],["المرسلات","Al-Mursalat",50,0],["النبأ","An-Naba",40,0],["النازعات","An-Nazi'at",46,0],["عبس","'Abasa",42,0],["التكوير","At-Takwir",29,0],["الانفطار","Al-Infitar",19,0],["المطففين","Al-Mutaffifin",36,0],["الانشقاق","Al-Inshiqaq",25,0],["البروج","Al-Buruj",22,0],["الطارق","At-Tariq",17,0],["الأعلى","Al-A'la",19,0],["الغاشية","Al-Ghashiyah",26,0],["الفجر","Al-Fajr",30,0],["البلد","Al-Balad",20,0],["الشمس","Ash-Shams",15,0],["الليل","Al-Layl",21,0],["الضحى","Ad-Duhaa",11,0],["الشرح","Ash-Sharh",8,0],["التين","At-Tin",8,0],["العلق","Al-'Alaq",19,0],["القدر","Al-Qadr",5,0],["البينة","Al-Bayyinah",8,1],["الزلزلة","Az-Zalzalah",8,1],["العاديات","Al-'Adiyat",11,0],["القارعة","Al-Qari'ah",11,0],["التكاثر","At-Takathur",8,0],["العصر","Al-'Asr",3,0],["الهمزة","Al-Humazah",9,0],["الفيل","Al-Fil",5,0],["قريش","Quraysh",4,0],["الماعون","Al-Ma'un",7,0],["الكوثر","Al-Kawthar",3,0],["الكافرون","Al-Kafirun",6,0],["النصر","An-Nasr",3,1],["المسد","Al-Masad",5,0],["الإخلاص","Al-Ikhlas",4,0],["الفلق","Al-Falaq",5,0],["الناس","An-Nas",6,0]];

export const SURAH_META: SurahMeta[] = META.map(([nameArabic, nameSimple, versesCount, medinan], i) => ({
  id: i + 1, nameArabic, nameSimple, versesCount,
  revelationPlace: medinan ? "madinah" : "makkah",
  bismillahPre: i + 1 !== 1 && i + 1 !== 9,
}));

export const getSurahMeta = (id: number): SurahMeta | undefined => SURAH_META[id - 1];

export const BASMALAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

const CACHE_VERSION = 1;
const surahKey = (id: number) => `quran:surah:${id}:v${CACHE_VERSION}`;
const LIST_KEY = `quran:chapters:v${CACHE_VERSION}`;

const validId = (id: number) => Number.isInteger(id) && id >= 1 && id <= 114;

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" }, ...(signal ? { signal } : {}) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Surah list                                                          */
/* ------------------------------------------------------------------ */

type ApiChapter = { id: number; revelation_place: string; name_simple: string; name_arabic: string; verses_count: number; bismillah_pre: boolean };

let listMemo: SurahMeta[] | null = null;

/**
 * All 114 surahs with metadata. Returns immediately from cache or built-in data; refreshes
 * from Quran.com in the background when online.
 */
export async function getSurahList({ refresh = false, signal }: { refresh?: boolean; signal?: AbortSignal } = {}): Promise<SurahMeta[]> {
  if (listMemo && !refresh) return listMemo;
  const cached = await idb.get<SurahMeta[]>(LIST_KEY);
  if (cached?.length === 114 && !refresh) return (listMemo = cached);
  try {
    const data = await getJson<{ chapters: ApiChapter[] }>(`${QURAN_API}/chapters?language=ar`, signal);
    const list = data.chapters
      .filter((c) => validId(c.id))
      .sort((a, b) => a.id - b.id)
      .map((c): SurahMeta => ({
        id: c.id,
        nameArabic: c.name_arabic || getSurahMeta(c.id)?.nameArabic || "",
        nameSimple: c.name_simple || getSurahMeta(c.id)?.nameSimple || "",
        versesCount: c.verses_count,
        revelationPlace: c.revelation_place === "madinah" ? "madinah" : "makkah",
        bismillahPre: c.bismillah_pre,
      }));
    if (list.length === 114) { await idb.set(LIST_KEY, list); return (listMemo = list); }
  } catch { /* offline or API change: built-in metadata below */ }
  return (listMemo = cached?.length === 114 ? cached : SURAH_META);
}

/* ------------------------------------------------------------------ */
/* Ayahs                                                               */
/* ------------------------------------------------------------------ */

type QuranComVerse = { verse_key: string; text_uthmani: string };

async function fromQuranCom(id: number, signal?: AbortSignal): Promise<Ayah[]> {
  const data = await getJson<{ verses: QuranComVerse[] }>(`${QURAN_API}/quran/verses/uthmani?chapter_number=${id}`, signal);
  return data.verses
    .map((v) => ({ number: Number(v.verse_key.split(":")[1]), text: cleanText(v.text_uthmani) }))
    .filter((a) => a.number > 0 && a.text)
    .sort((a, b) => a.number - b.number);
}

/** Fallback source. Its Uthmani text prefixes the Basmalah to Ayah 1 of most surahs; that is removed here. */
async function fromAlQuranCloud(id: number, signal?: AbortSignal): Promise<Ayah[]> {
  const data = await getJson<{ data: { ayahs: { numberInSurah: number; text: string }[] } }>(`${ALQURAN_CLOUD}/surah/${id}/quran-uthmani`, signal);
  return data.data.ayahs.map((a) => ({
    number: a.numberInSurah,
    text: cleanText(a.numberInSurah === 1 && id !== 1 ? stripBasmalah(a.text) : a.text),
  }));
}

const skeleton = (s: string) => s.replace(/[ً-ٰٟۖ-ۭـ]/g, "").replace(/[ٱأإآ]/g, "ا");

export function stripBasmalah(text: string): string {
  const words = text.trim().split(/\s+/);
  const head = skeleton(words.slice(0, 4).join(" "));
  return head === skeleton(BASMALAH) ? words.slice(4).join(" ") : text;
}

/** Removes stray BOM / zero-width characters and collapses spaces; keeps all Tashkeel and Quranic marks. */
const cleanText = (t: string) => t.replace(/[﻿​]/g, "").replace(/\s+/g, " ").trim();

function bundled(id: number): Ayah[] | null {
  const s = BUNDLED.find((b) => b.number === id);
  const meta = getSurahMeta(id);
  // The demo data holds only some verses of a few surahs; use it only when it is complete.
  if (!s || !meta || s.ayat.length !== meta.versesCount) return null;
  return s.ayat.map((text, i) => ({ number: i + 1, text }));
}

const inflight = new Map<number, Promise<SurahText>>();

/**
 * Verses of a surah in Uthmani script. Cache first (offline), then Quran.com, then alquran.cloud,
 * then built-in data. Throws if nothing is available (offline and never loaded).
 */
export function getSurahAyahs(surahId: number, { signal }: { signal?: AbortSignal } = {}): Promise<SurahText> {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  if (!validId(surahId)) return Promise.reject(new Error(`Invalid surah ${surahId}`));
  const running = inflight.get(surahId);
  if (running) return running;
  const job = (async (): Promise<SurahText> => {
    const expected = getSurahMeta(surahId)?.versesCount ?? 0;
    // 1. Text shipped with the app (same words and spelling as the Mushaf pages) — always offline.
    try {
      const m = await loadMushaf();
      const ayahs = Array.from({ length: m.versesCount(surahId) }, (_, i) => ({ number: i + 1, text: m.words(surahId, i + 1).join(" ") }));
      if (ayahs.length === expected && ayahs.every((a) => a.text)) return { surahId, ayahs, source: "mushaf", cachedAt: new Date().toISOString() };
    } catch { /* data file missing: fall back to cache / network */ }
    const cached = await idb.get<SurahText>(surahKey(surahId));
    if (cached?.ayahs?.length) return cached;
    for (const [source, load] of [["quran.com", fromQuranCom], ["alquran.cloud", fromAlQuranCloud]] as const) {
      try {
        // The request is shared by all callers and always finishes (and gets cached), even if one caller stops waiting.
        const ayahs = await load(surahId);
        if (ayahs.length === expected) {
          const value: SurahText = { surahId, ayahs, source, cachedAt: new Date().toISOString() };
          await idb.set(surahKey(surahId), value);
          return value;
        }
      } catch { /* try the next source */ }
    }
    const local = bundled(surahId);
    if (local) return { surahId, ayahs: local, source: "bundled", cachedAt: new Date().toISOString() };
    throw new QuranOfflineError(surahId);
  })();
  inflight.set(surahId, job);
  job.finally(() => inflight.delete(surahId)).catch(() => {});
  return job;
}

export class QuranOfflineError extends Error {
  constructor(readonly surahId: number) { super(`Surah ${surahId} is not cached and the device is offline`); this.name = "QuranOfflineError"; }
}

export async function isSurahCached(surahId: number): Promise<boolean> {
  return !!(await idb.get<SurahText>(surahKey(surahId)))?.ayahs?.length || !!bundled(surahId);
}

export async function cachedSurahIds(): Promise<number[]> {
  const keys = await idb.keys();
  const ids = new Set(keys.map((k) => /^quran:surah:(\d+):v\d+$/.exec(k)?.[1]).filter(Boolean).map(Number));
  for (const b of BUNDLED) if (bundled(b.number)) ids.add(b.number);
  return [...ids].sort((a, b) => a - b);
}

/**
 * Downloads the text of all 114 surahs for offline use (about 1.5 MB). Already cached surahs are skipped.
 * `onProgress(done, total)` is called after each surah.
 */
export async function downloadWholeQuran(onProgress?: (done: number, total: number) => void, signal?: AbortSignal): Promise<{ failed: number[] }> {
  const ids = Array.from({ length: 114 }, (_, i) => i + 1);
  const failed: number[] = [];
  let done = 0;
  const queue = [...ids];
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      if (signal?.aborted) return;
      try { await getSurahAyahs(id, signal ? { signal } : {}); } catch { failed.push(id); }
      onProgress?.(++done, ids.length);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return { failed: failed.sort((a, b) => a - b) };
}

/** Clears cached text (it is downloaded again when needed). */
export async function clearQuranCache(): Promise<void> {
  const keys = await idb.keys();
  await Promise.all(keys.filter((k) => k.startsWith("quran:")).map((k) => idb.delete(k)));
  listMemo = null;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const EASTERN = "٠١٢٣٤٥٦٧٨٩";
export const toArabicDigits = (n: number | string) => String(n).replace(/\d/g, (d) => EASTERN[Number(d)] ?? d);

/** Traditional end-of-ayah ornament with Eastern Arabic numerals, e.g. ﴿١٢﴾. */
export const ayahMarker = (n: number) => `﴿${toArabicDigits(n)}﴾`;

export const revelationLabel = (place: RevelationPlace, language: string) =>
  language === "ar" ? (place === "madinah" ? "مدنية" : "مكية") : place === "madinah" ? "Medinan" : "Meccan";
