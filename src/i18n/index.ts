/**
 * Languages of the app. Arabic and English live in src/lib/i18n.tsx (`copy`, the reference texts);
 * every other language is a JSON dictionary in src/i18n/locales/<code>.json (key → text), loaded when
 * the language is chosen. A missing key falls back to English, so a new text never shows as blank.
 *
 * The choice is saved with the other settings (Capacitor Preferences / localStorage) and applied at
 * start: <html lang> and dir="rtl" for Arabic and Urdu, dir="ltr" for all others.
 */
import { createSignal } from "@/lib/storage";

export const LANGUAGES = [
  { code: "ar", native: "العربية", english: "Arabic", dir: "rtl", locale: "ar" },
  { code: "en", native: "English", english: "English", dir: "ltr", locale: "en" },
  { code: "de", native: "Deutsch", english: "German", dir: "ltr", locale: "de" },
  { code: "fr", native: "Français", english: "French", dir: "ltr", locale: "fr" },
  { code: "tr", native: "Türkçe", english: "Turkish", dir: "ltr", locale: "tr" },
  { code: "ur", native: "اردو", english: "Urdu", dir: "rtl", locale: "ur" },
  { code: "id", native: "Bahasa Indonesia", english: "Indonesian", dir: "ltr", locale: "id" },
  { code: "ms", native: "Bahasa Melayu", english: "Malay", dir: "ltr", locale: "ms" },
  { code: "es", native: "Español", english: "Spanish", dir: "ltr", locale: "es" },
  { code: "ru", native: "Русский", english: "Russian", dir: "ltr", locale: "ru" },
  { code: "bn", native: "বাংলা", english: "Bengali", dir: "ltr", locale: "bn" },
  { code: "sq", native: "Shqip", english: "Albanian", dir: "ltr", locale: "sq" },
  { code: "bs", native: "Bosanski", english: "Bosnian", dir: "ltr", locale: "bs" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];
export const isLanguage = (v: unknown): v is Language => LANGUAGES.some((l) => l.code === v);
export const languageInfo = (code: Language) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[1];
export const isRtl = (code: Language) => languageInfo(code).dir === "rtl";
/** Locale for dates and numbers (Intl). */
export const localeFor = (code: Language) => languageInfo(code).locale;

type Dict = Record<string, string>;
const loaders: Record<Exclude<Language, "ar" | "en">, () => Promise<{ default: Dict }>> = {
  de: () => import("./locales/de.json"),
  fr: () => import("./locales/fr.json"),
  tr: () => import("./locales/tr.json"),
  ur: () => import("./locales/ur.json"),
  id: () => import("./locales/id.json"),
  ms: () => import("./locales/ms.json"),
  es: () => import("./locales/es.json"),
  ru: () => import("./locales/ru.json"),
  bn: () => import("./locales/bn.json"),
  sq: () => import("./locales/sq.json"),
  bs: () => import("./locales/bs.json"),
};

/** Loaded dictionaries (a new object whenever one arrives, so components re-render). */
export const dictionaries = createSignal<Partial<Record<Language, Dict>>>({});
const pending = new Map<Language, Promise<void>>();

export function loadLanguage(code: Language): Promise<void> {
  if (code === "ar" || code === "en" || dictionaries.get()[code]) return Promise.resolve();
  let p = pending.get(code);
  if (!p) {
    p = loaders[code]().then((m) => { dictionaries.set({ ...dictionaries.get(), [code]: m.default }); }).catch(() => { pending.delete(code); });
    pending.set(code, p);
  }
  return p;
}

/** One-letter weekday labels, Monday → Sunday. */
export const WEEKDAY_LETTERS: Record<Language, readonly string[]> = {
  ar: ["ن", "ث", "ر", "خ", "ج", "س", "ح"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
  de: ["M", "D", "M", "D", "F", "S", "S"],
  fr: ["L", "M", "M", "J", "V", "S", "D"],
  tr: ["P", "S", "Ç", "P", "C", "C", "P"],
  ur: ["پ", "م", "ب", "ج", "ج", "ہ", "ا"],
  id: ["S", "S", "R", "K", "J", "S", "M"],
  ms: ["I", "S", "R", "K", "J", "S", "A"],
  es: ["L", "M", "X", "J", "V", "S", "D"],
  ru: ["П", "В", "С", "Ч", "П", "С", "В"],
  bn: ["সো", "ম", "বু", "বৃ", "শু", "শ", "র"],
  sq: ["H", "M", "M", "E", "P", "Sh", "D"],
  bs: ["P", "U", "S", "Č", "P", "S", "N"],
};
