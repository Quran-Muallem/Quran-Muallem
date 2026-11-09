/**
 * Quran translations and Tafsir Ibn Kathir (تفسير القرآن العظيم), loaded online on first use and then
 * kept on the device (IndexedDB via `idb`): a surah's translation / a verse's tafsir is downloaded once
 * and works offline afterwards. Nothing is sent anywhere except the request for the public text.
 *
 * Sources (public, free, no key):
 *  - Quran.com API v4 (translations by resource id, tafsirs by resource id)
 *  - AlQuran.Cloud (translation editions) — fallback, and first choice where its edition is the exact one
 *  - spa5k/tafsir_api on jsDelivr / GitHub (Ibn Kathir, as-Sa'di, al-Qurtubi, al-Baghawi, al-Wasit, at-Tabari,
 *    al-Muyassar, Ma'arif-ul-Quran, Al-Mukhtasar … in many languages)
 * A whole translation / tafsir can also be downloaded at once (`downloadTranslation`, `downloadTafsir`).
 * Every option has an ordered list of sources; the first that answers wins.
 *
 * Tafsir Ibn Kathir is not freely available in German, French, Indonesian, Malay, Spanish, Albanian or
 * Bosnian (those editions are under copyright): there the English abridged Ibn Kathir is shown, with a note.
 */
import { idb, kv } from "@/lib/storage";
import type { Language } from "@/i18n";

const QURAN_COM = "https://api.quran.com/api/v4";
const ALQURAN_CLOUD = "https://api.alquran.cloud/v1";
/** jsDelivr first; GitHub raw (CORS-enabled) when jsDelivr refuses a file (its size limits). */
const TAFSIR_CDNS = ["https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir", "https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir"];

export type ContentSource =
  | { kind: "quranCom"; id: number }
  | { kind: "alquranCloud"; edition: string }
  | { kind: "tafsirCdn"; slug: string }
  /** QuranEnc.com (translations of the King Fahd Complex / Rowwad, with their footnotes). */
  | { kind: "quranEnc"; key: string };

/** Content language: the app's languages plus a few more offered for translations / tafsir. */
export type ContentLanguage = Language | "pt" | "it" | "nl" | "fa";
export type TranslationOption = { id: string; language: ContentLanguage; name: string; sources: ContentSource[] };
export type TafsirOption = { id: string; language: ContentLanguage; name: string; sources: ContentSource[]; /** Tafsir Ibn Kathir */ ibnKathir?: boolean };

/** Language headers of the selector lists (own name of each language). */
export const CONTENT_LANGUAGE_NAMES: Record<ContentLanguage, string> = {
  ar: "العربية", en: "English", de: "Deutsch", fr: "Français", tr: "Türkçe", ur: "اردو", id: "Bahasa Indonesia", ms: "Bahasa Melayu",
  es: "Español", ru: "Русский", bn: "বাংলা", sq: "Shqip", bs: "Bosanski", pt: "Português", it: "Italiano", nl: "Nederlands", fa: "فارسی",
};
/** Order of the language groups: the app language first, then Arabic and English, then the rest. */
export function languageOrder(app: Language): ContentLanguage[] {
  const all = Object.keys(CONTENT_LANGUAGE_NAMES) as ContentLanguage[];
  const first: ContentLanguage[] = [app, ...(["ar", "en"] as const).filter((l) => l !== app)];
  return [...first, ...all.filter((l) => !first.includes(l))];
}

/* ───────────── translations ───────────── */

const aqc = (edition: string): ContentSource => ({ kind: "alquranCloud", edition });
const qc = (id: number): ContentSource => ({ kind: "quranCom", id });
const qe = (key: string): ContentSource => ({ kind: "quranEnc", key });
const QURAN_ENC = "https://quranenc.com/api/v1";

export const TRANSLATIONS: TranslationOption[] = [
  // "The Clear Quran" by Mustafa Khattab (Quran.com id 131) is licensed: the public API returns no text for it.
  { id: "en-sahih", language: "en", name: "Saheeh International", sources: [qc(20), aqc("en.sahih")] },
  { id: "en-itani", language: "en", name: "Clear Qur'an (Talal Itani)", sources: [aqc("en.itani")] },
  { id: "en-yusufali", language: "en", name: "Abdullah Yusuf Ali", sources: [qc(22), aqc("en.yusufali")] },
  { id: "en-haleem", language: "en", name: "M.A.S. Abdel Haleem", sources: [qc(85)] },
  { id: "en-pickthall", language: "en", name: "Marmaduke Pickthall", sources: [qc(19), aqc("en.pickthall")] },
  { id: "en-hilali", language: "en", name: "Al-Hilali & Khan", sources: [qc(203), aqc("en.hilali")] },
  { id: "de-bubenheim", language: "de", name: "Bubenheim & Elyas", sources: [qc(27), aqc("de.bubenheim")] },
  { id: "de-rwwad", language: "de", name: "Rowwad-Übersetzungszentrum (mit Fußnoten)", sources: [qe("german_rwwad")] },
  { id: "de-aburida", language: "de", name: "Abu Rida Muhammad ibn Rassoul", sources: [aqc("de.aburida")] },
  { id: "de-zaidan", language: "de", name: "Amir Zaidan", sources: [aqc("de.zaidan")] },
  { id: "fr-hamidullah", language: "fr", name: "Muhammad Hamidullah", sources: [qc(31), aqc("fr.hamidullah")] },
  { id: "tr-diyanet", language: "tr", name: "Diyanet İşleri", sources: [qc(77), aqc("tr.diyanet")] },
  { id: "tr-vakfi", language: "tr", name: "Diyanet Vakfı", sources: [aqc("tr.vakfi")] },
  { id: "tr-yazir", language: "tr", name: "Elmalılı Hamdi Yazır", sources: [aqc("tr.yazir")] },
  { id: "ur-jalandhari", language: "ur", name: "فتح محمد جالندھری", sources: [aqc("ur.jalandhry"), qc(234)] },
  { id: "ur-maududi", language: "ur", name: "تفہیم القرآن (مودودی)", sources: [qc(97), aqc("ur.maududi")] },
  { id: "ur-junagarhi", language: "ur", name: "محمد جوناگڑھی", sources: [qc(54), aqc("ur.junagarhi")] },
  { id: "id-kemenag", language: "id", name: "Kementerian Agama RI", sources: [qc(33), aqc("id.indonesian")] },
  { id: "id-muntakhab", language: "id", name: "Quraish Shihab (Al-Muntakhab)", sources: [aqc("id.muntakhab")] },
  { id: "ms-basmeih", language: "ms", name: "Abdullah Muhammad Basmeih", sources: [qc(39), aqc("ms.basmeih")] },
  { id: "es-garcia", language: "es", name: "Isa García", sources: [qc(83), aqc("es.garcia")] },
  { id: "es-cortes", language: "es", name: "Julio Cortés", sources: [aqc("es.cortes")] },
  { id: "ru-kuliev", language: "ru", name: "Эльмир Кулиев", sources: [qc(45), aqc("ru.kuliev")] },
  { id: "ru-abuadel", language: "ru", name: "Абу Адель", sources: [qc(79), aqc("ru.abuadel")] },
  { id: "bn-muhiuddin", language: "bn", name: "মুহিউদ্দীন খান", sources: [aqc("bn.bengali")] },
  { id: "bn-hoque", language: "bn", name: "জহুরুল হক", sources: [aqc("bn.hoque")] },
  { id: "sq-ahmeti", language: "sq", name: "Sherif Ahmeti", sources: [aqc("sq.ahmeti")] },
  { id: "sq-nahi", language: "sq", name: "Hasan Efendi Nahi", sources: [aqc("sq.nahi")] },
  { id: "bs-korkut", language: "bs", name: "Besim Korkut", sources: [aqc("bs.korkut"), qc(126)] },
  { id: "bs-mlivo", language: "bs", name: "Mustafa Mlivo", sources: [aqc("bs.mlivo")] },
  { id: "pt-elhayek", language: "pt", name: "Samir El-Hayek", sources: [aqc("pt.elhayek")] },
  { id: "it-piccardo", language: "it", name: "Hamza Roberto Piccardo", sources: [qc(153), aqc("it.piccardo")] },
  { id: "nl-siregar", language: "nl", name: "Sofian S. Siregar", sources: [aqc("nl.siregar")] },
  { id: "nl-leemhuis", language: "nl", name: "Fred Leemhuis", sources: [aqc("nl.leemhuis")] },
  { id: "fa-makarem", language: "fa", name: "مکارم شیرازی", sources: [aqc("fa.makarem")] },
  { id: "fa-ansarian", language: "fa", name: "حسین انصاریان", sources: [aqc("fa.ansarian")] },
];

/** The default translations of an app language; Arabic readers get English (an Arabic "translation" makes no sense). */
export function translationsFor(language: Language): TranslationOption[] {
  const own = TRANSLATIONS.filter((t) => t.language === language);
  return own.length ? own : TRANSLATIONS.filter((t) => t.language === "en");
}
/** The chosen translation (any language may be chosen); default: the first of the app language. */
export const getTranslation = (id: string | null | undefined, language: Language): TranslationOption =>
  TRANSLATIONS.find((t) => t.id === id) ?? translationsFor(language)[0]!;

/* ───────────── tafsir ───────────── */

const cdn = (slug: string): ContentSource => ({ kind: "tafsirCdn", slug });
const IBN_KATHIR_EN: TafsirOption = { id: "ik-en", language: "en", name: "Tafsir Ibn Kathir (Abridged)", ibnKathir: true, sources: [cdn("en-tafisr-ibn-kathir"), qc(169)] };
export const IBN_KATHIR_AR: TafsirOption = { id: "ik-ar", language: "ar", name: "تفسير القرآن العظيم — ابن كثير", ibnKathir: true, sources: [cdn("ar-tafsir-ibn-kathir"), qc(14)] };
export const TAFSIRS: TafsirOption[] = [
  IBN_KATHIR_AR,
  { id: "ar-saadi", language: "ar", name: "تيسير الكريم الرحمن — السعدي", sources: [cdn("ar-tafseer-al-saddi"), qc(91)] },
  { id: "ar-qurtubi", language: "ar", name: "الجامع لأحكام القرآن — القرطبي", sources: [cdn("ar-tafseer-al-qurtubi"), qc(90)] },
  { id: "ar-baghawi", language: "ar", name: "معالم التنزيل — البغوي", sources: [cdn("ar-tafsir-al-baghawi"), qc(94)] },
  { id: "ar-wasit", language: "ar", name: "التفسير الوسيط — طنطاوي", sources: [cdn("ar-tafsir-al-wasit"), qc(93)] },
  { id: "ar-tabari", language: "ar", name: "جامع البيان — الطبري", sources: [cdn("ar-tafsir-al-tabari"), qc(15)] },
  { id: "ar-muyassar", language: "ar", name: "التفسير الميسر", sources: [cdn("ar-tafsir-muyassar"), qc(16)] },
  { id: "ar-jalalayn", language: "ar", name: "تفسير الجلالين", sources: [cdn("ar-tafsir-al-jalalayn")] },
  { id: "ar-mukhtasar", language: "ar", name: "المختصر في تفسير القرآن الكريم", sources: [cdn("ar-tafsir-al-mukhtasar")] },
  IBN_KATHIR_EN,
  { id: "en-maarif", language: "en", name: "Ma'arif-ul-Quran (Mufti Muhammad Shafi)", sources: [cdn("en-tafsir-maarif-ul-quran"), qc(168)] },
  { id: "en-mukhtasar", language: "en", name: "Al-Mukhtasar", sources: [cdn("en-tafsir-al-mukhtasar")] },
  { id: "en-jalalayn", language: "en", name: "Tafsir al-Jalalayn", sources: [cdn("en-al-jalalayn")] },
  { id: "en-tazkir", language: "en", name: "Tazkirul Quran (Wahiduddin Khan)", sources: [cdn("en-tazkirul-quran"), qc(817)] },
  { id: "fr-mukhtasar", language: "fr", name: "Al-Mukhtasar (abrégé)", sources: [cdn("french-mokhtasar")] },
  { id: "ik-tr", language: "tr", name: "İbn Kesîr Tefsiri", ibnKathir: true, sources: [cdn("tr-tafsir-ibne-kathir")] },
  { id: "tr-saadi", language: "tr", name: "Es-Sa'dî Tefsiri", sources: [cdn("turkish-tafsir-as-saadi-turkish")] },
  { id: "tr-mukhtasar", language: "tr", name: "El-Muhtasar", sources: [cdn("turkish-mokhtasar")] },
  { id: "ik-ur", language: "ur", name: "تفسیر ابن کثیر", ibnKathir: true, sources: [cdn("ur-tafseer-ibn-e-kaseer"), qc(160)] },
  { id: "ur-saadi", language: "ur", name: "تفسیر السعدی", sources: [cdn("ur-tafsir-as-saadi-urdu")] },
  { id: "ur-bayan", language: "ur", name: "بیان القرآن (ڈاکٹر اسرار احمد)", sources: [cdn("ur-tafsir-bayan-ul-quran"), qc(159)] },
  { id: "ur-zilal", language: "ur", name: "فی ظلال القرآن", sources: [cdn("tafsir-fe-zalul-quran-syed-qatab"), qc(157)] },
  { id: "id-saadi", language: "id", name: "Tafsir As-Sa'di", sources: [cdn("id-tafsir-as-saadi")] },
  { id: "id-mukhtasar", language: "id", name: "Al-Mukhtashar", sources: [cdn("indonesian-mokhtasar")] },
  { id: "es-mukhtasar", language: "es", name: "Al-Mujtasar (resumen)", sources: [cdn("spanish-mokhtasar")] },
  { id: "ik-ru", language: "ru", name: "Тафсир Ибн Касира", ibnKathir: true, sources: [cdn("ru-tafsir-ibne-kahtir")] },
  { id: "ru-saadi", language: "ru", name: "Тафсир ас-Саади", sources: [cdn("ru-tafseer-al-saddi"), qc(170)] },
  { id: "ru-mukhtasar", language: "ru", name: "Аль-Мухтасар", sources: [cdn("russian-mokhtasar")] },
  { id: "ik-bn", language: "bn", name: "তাফসীর ইবনে কাসীর", ibnKathir: true, sources: [cdn("bn-tafseer-ibn-e-kaseer"), qc(164)] },
  { id: "bn-ahsanul", language: "bn", name: "তাফসীর আহসানুল বায়ান", sources: [cdn("bn-tafsir-ahsanul-bayaan"), qc(165)] },
  { id: "bn-zakaria", language: "bn", name: "তাফসীর আবু বকর জাকারিয়া", sources: [cdn("bn-tafsir-abu-bakr-zakaria"), qc(166)] },
  { id: "sq-saadi", language: "sq", name: "Tefsiri i Sa'diut", sources: [cdn("sq-saadi")] },
  { id: "bs-mukhtasar", language: "bs", name: "Skraćeni tefsir (Al-Muhtasar)", sources: [cdn("bosnian-mokhtasar")] },
  { id: "it-mukhtasar", language: "it", name: "Al-Mukhtasar", sources: [cdn("italian-mokhtasar")] },
  { id: "fa-saadi", language: "fa", name: "تفسیر سعدی", sources: [cdn("fr-tafsir-as-saadi")] },
  { id: "fa-mukhtasar", language: "fa", name: "المختصر", sources: [cdn("persian-mokhtasar")] },
];

/**
 * The default tafsir: Ibn Kathir in the app language; `fallback` is true where none is freely available and
 * the English abridged Ibn Kathir is shown (the selector offers what exists in the language, e.g. Al-Mukhtasar).
 */
export function tafsirFor(language: Language): { option: TafsirOption; fallback: boolean } {
  const own = TAFSIRS.find((t) => t.language === language && t.ibnKathir);
  return own ? { option: own, fallback: false } : { option: IBN_KATHIR_EN, fallback: true };
}
/** The chosen tafsir, else the default of the language. */
export function getTafsir(id: string | null | undefined, language: Language): { option: TafsirOption; fallback: boolean } {
  const chosen = TAFSIRS.find((t) => t.id === id);
  return chosen ? { option: chosen, fallback: false } : tafsirFor(language);
}

/* ───────────── text cleaning ───────────── */

/** Removes footnote markers and HTML from a translation / tafsir text; keeps paragraph breaks. */
export function cleanText(html: string): string {
  return html
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Picks the text out of the different JSON shapes of the tafsir sources. */
export function tafsirTextOf(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  for (const k of ["text", "content", "tafsir"]) {
    const v = d[k];
    if (typeof v === "string" && v.trim()) return cleanText(v);
    if (v && typeof v === "object") { const inner = tafsirTextOf(v); if (inner) return inner; }
  }
  return "";
}

/* ───────────── fetching with a device cache ───────────── */

async function getJson(url: string, timeoutMs = 12000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}

/** Verse texts of one surah in one translation source: index = ayah - 1. */
async function surahFromSource(src: ContentSource, surah: number): Promise<string[]> {
  if (src.kind === "quranCom") {
    const d = await getJson(`${QURAN_COM}/quran/translations/${src.id}?chapter_number=${surah}`) as { translations?: { text?: string }[] };
    const list = d.translations ?? [];
    if (!list.length) throw new Error("empty");
    return list.map((t) => cleanText(t.text ?? ""));
  }
  if (src.kind === "alquranCloud") {
    const d = await getJson(`${ALQURAN_CLOUD}/surah/${surah}/${src.edition}`) as { data?: { ayahs?: { numberInSurah: number; text: string }[] } };
    const ayahs = d.data?.ayahs ?? [];
    if (!ayahs.length) throw new Error("empty");
    const out: string[] = [];
    for (const a of ayahs) out[a.numberInSurah - 1] = cleanText(a.text);
    return out;
  }
  if (src.kind === "quranEnc") {
    const d = await getJson(`${QURAN_ENC}/translation/sura/${src.key}/${surah}`) as { result?: { aya: string; translation: string; footnotes?: string }[] };
    const list = d.result ?? [];
    if (!list.length) throw new Error("empty");
    const out: string[] = [];
    for (const a of list) {
      const notes = (a.footnotes ?? "").trim();
      out[Number(a.aya) - 1] = cleanText(a.translation) + (notes ? `\n\n${cleanText(notes)}` : "");
    }
    return out;
  }
  throw new Error("not a translation source");
}

const inflight = new Map<string, Promise<unknown>>();
function once<T>(key: string, run: () => Promise<T>): Promise<T> {
  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) { p = run().finally(() => inflight.delete(key)); inflight.set(key, p); }
  return p;
}

export type ContentError = "offline" | "failed";
export class ContentLoadError extends Error { constructor(public code: ContentError) { super(code); } }
const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

/** The whole surah in a translation (device cache first). */
export function loadTranslation(optionId: string, language: Language, surah: number): Promise<string[]> {
  const option = getTranslation(optionId, language);
  const key = `qm.tr.${option.id}.${surah}`;
  return once(key, async () => {
    const cached = await idb.get<string[]>(key);
    if (cached?.length) return cached;
    if (isOffline()) throw new ContentLoadError("offline");
    for (const src of option.sources) {
      try {
        const verses = await surahFromSource(src, surah);
        await idb.set(key, verses);
        return verses;
      } catch { /* next source */ }
    }
    throw new ContentLoadError(isOffline() ? "offline" : "failed");
  });
}

/** One verse's translation. */
export async function verseTranslation(optionId: string, language: Language, surah: number, ayah: number): Promise<string> {
  return (await loadTranslation(optionId, language, surah))[ayah - 1] ?? "";
}

async function fromCdns(path: string): Promise<unknown> {
  let last: unknown;
  for (const base of TAFSIR_CDNS) { try { return await getJson(`${base}/${path}`); } catch (e) { last = e; } }
  throw last;
}

async function tafsirFromSource(src: ContentSource, surah: number, ayah: number): Promise<string> {
  if (src.kind === "tafsirCdn") return tafsirTextOf(await fromCdns(`${src.slug}/${surah}/${ayah}.json`));
  if (src.kind === "quranCom") return tafsirTextOf(await getJson(`${QURAN_COM}/tafsirs/${src.id}/by_ayah/${surah}:${ayah}`));
  throw new Error("not a tafsir source");
}

export type TafsirResult = { text: string; /** Ibn Kathir explains several verses together: the verse the text belongs to. */ fromAyah: number };

/**
 * The tafsir of a verse (device cache first). Ibn Kathir often comments on a group of verses at its first
 * verse; for the others the text is empty, so up to 15 verses back are tried and the group's text is shown.
 */
export function loadTafsir(option: TafsirOption, surah: number, ayah: number): Promise<TafsirResult> {
  const key = `qm.tf.${option.id}.${surah}:${ayah}`;
  return once(key, async () => {
    const cached = await idb.get<TafsirResult>(key);
    if (cached?.text) return cached;
    if (isOffline()) throw new ContentLoadError("offline");
    let reached = false;
    for (let a = ayah; a >= Math.max(1, ayah - 15); a--) {
      for (const src of option.sources) {
        try {
          const text = await tafsirFromSource(src, surah, a);
          reached = true;
          if (text) { const res = { text, fromAyah: a }; await idb.set(key, res); return res; }
          break; // the source answered: the comment is on an earlier verse
        } catch { /* next source */ }
      }
      if (!reached) break;
    }
    throw new ContentLoadError(isOffline() ? "offline" : "failed");
  });
}

/* ───────────── whole-edition downloads (offline use) ───────────── */

export type ContentKind = "tr" | "tf";
const doneKey = (kind: ContentKind, id: string) => `qm.dl.${kind}.${id}`;
const SURAHS = 114;

/** Whether a whole translation / tafsir is on the device. */
export async function isDownloaded(kind: ContentKind, id: string): Promise<boolean> {
  return (await kv.get(doneKey(kind, id))) === "1";
}

const aborted = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException("Aborted", "AbortError"); };

/**
 * Downloads a whole translation (AlQuran.Cloud: the whole Quran in one request; otherwise surah by surah)
 * into the same cache the verse sheet reads from. `onProgress(done, total)` counts surahs.
 */
export async function downloadTranslation(option: TranslationOption, onProgress?: (done: number, total: number) => void, signal?: AbortSignal): Promise<void> {
  if (isOffline()) throw new ContentLoadError("offline");
  const whole = option.sources.find((s): s is Extract<ContentSource, { kind: "alquranCloud" }> => s.kind === "alquranCloud");
  if (whole) {
    try {
      const d = await getJson(`${ALQURAN_CLOUD}/quran/${whole.edition}`, 60000) as { data?: { surahs?: { number: number; ayahs: { numberInSurah: number; text: string }[] }[] } };
      const surahs = d.data?.surahs ?? [];
      if (surahs.length === SURAHS) {
        for (const s of surahs) {
          aborted(signal);
          const verses: string[] = [];
          for (const a of s.ayahs) verses[a.numberInSurah - 1] = cleanText(a.text);
          await idb.set(`qm.tr.${option.id}.${s.number}`, verses);
          onProgress?.(s.number, SURAHS);
        }
        await kv.set(doneKey("tr", option.id), "1");
        return;
      }
    } catch (e) { if (signal?.aborted) throw e; /* surah by surah below */ }
  }
  for (let s = 1; s <= SURAHS; s++) {
    aborted(signal);
    const key = `qm.tr.${option.id}.${s}`;
    if (!(await idb.get<string[]>(key))?.length) {
      let ok = false;
      for (const src of option.sources) {
        try { await idb.set(key, await surahFromSource(src, s)); ok = true; break; } catch { /* next source */ }
      }
      if (!ok) throw new ContentLoadError(isOffline() ? "offline" : "failed");
    }
    onProgress?.(s, SURAHS);
  }
  await kv.set(doneKey("tr", option.id), "1");
}

/** A surah's tafsir texts by verse from one source (empty string where the comment is on an earlier verse). */
async function tafsirSurah(src: ContentSource, surah: number): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (src.kind === "tafsirCdn") {
    const d = await fromCdns(`${src.slug}/${surah}.json`) as unknown;
    const list = Array.isArray(d) ? d : (d as { ayahs?: unknown[] })?.ayahs ?? [];
    for (const x of list as { ayah?: string | number; text?: string }[]) out.set(Number(x.ayah), x.text ? cleanText(x.text) : "");
  } else if (src.kind === "quranCom") {
    for (let page = 1; page < 50; page++) {
      const d = await getJson(`${QURAN_COM}/tafsirs/${src.id}/by_chapter/${surah}?per_page=50&page=${page}`) as { tafsirs?: { verse_key: string; text: string }[]; pagination?: { next_page: number | null } };
      for (const t of d.tafsirs ?? []) out.set(Number(t.verse_key.split(":")[1]), cleanText(t.text ?? ""));
      if (!d.pagination?.next_page) break;
    }
  } else throw new Error("not a tafsir source");
  if (!out.size) throw new Error("empty");
  return out;
}

/** Downloads a whole tafsir, surah by surah, into the verse cache (grouped comments filled in). */
export async function downloadTafsir(option: TafsirOption, onProgress?: (done: number, total: number) => void, signal?: AbortSignal): Promise<void> {
  if (isOffline()) throw new ContentLoadError("offline");
  for (let s = 1; s <= SURAHS; s++) {
    aborted(signal);
    const surahKey = `qm.tfs.${option.id}.${s}`;
    if ((await kv.get(surahKey)) !== "1") {
      let texts: Map<number, string> | null = null;
      for (const src of option.sources) { try { texts = await tafsirSurah(src, s); break; } catch { /* next source */ } }
      if (!texts) throw new ContentLoadError(isOffline() ? "offline" : "failed");
      let last: TafsirResult | null = null;
      for (const a of [...texts.keys()].sort((x, y) => x - y)) {
        const text = texts.get(a) ?? "";
        if (text) last = { text, fromAyah: a };
        if (last) await idb.set(`qm.tf.${option.id}.${s}:${a}`, last);
      }
      await kv.set(surahKey, "1");
    }
    onProgress?.(s, SURAHS);
  }
  await kv.set(doneKey("tf", option.id), "1");
}

/** Removes a downloaded translation / tafsir from the device. */
export async function removeDownload(kind: ContentKind, id: string): Promise<void> {
  const prefix = kind === "tr" ? `qm.tr.${id}.` : `qm.tf.${id}.`;
  for (const k of await idb.keys()) if (k.startsWith(prefix)) await idb.delete(k);
  if (kind === "tf") for (let s = 1; s <= SURAHS; s++) await kv.remove(`qm.tfs.${id}.${s}`);
  await kv.remove(doneKey(kind, id));
}
