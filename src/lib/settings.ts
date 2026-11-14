import { useEffect, useSyncExternalStore } from "react";
import { createSignal, kv } from "@/lib/storage";
import { isLanguage, type Language } from "@/i18n";


/**
 * auto: live browser recognition where available (web), otherwise on-device Whisper with live preview.
 * whisper: always on-device Whisper (private, offline). In the app recognition is always on the device.
 */
export type SpeechEngine = "auto" | "whisper";
export type ThemeId = "emerald" | "light" | "dark";
export type KidsTheme = "sky" | "garden" | "night";
export const KIDS_THEMES: readonly KidsTheme[] = ["sky", "garden", "night"];
export const THEME_COLORS: Record<ThemeId, string> = { emerald: "#022c22", light: "#f7f0de", dark: "#0e100f" };

export type AppSettings = {
  language: Language;
  theme: ThemeId;
  reciterId: string;
  speechEngine: SpeechEngine;
  /** Re-transcribe the recording every few seconds while reciting (on-device Whisper; uses more battery). */
  whisperLive: boolean;
  /** On-device Whisper model: base (more accurate) or tiny (lighter, faster). */
  whisperModel: "tiny" | "base";
  /**
   * Recognition engine. "zipformer": Quran-Lab's phoneme model bundled with the app (used when its files
   * are present and it runs on the device; otherwise Whisper). "whisper": always Whisper.
   */
  recognizer: "zipformer" | "whisper";
  /** Chosen Quran translation per app language (ids of `TRANSLATIONS` in quranContent.ts). */
  translations: Partial<Record<Language, string>>;
  /** Chosen tafsir per app language (ids of `TAFSIRS`). */
  tafsirs: Partial<Record<Language, string>>;
  /** v29 settings («الأصوات والتفاعل الحسي», «الآيات المخفية», «تذكيرات»). */
  /** Light vibration when a word turns red / orange while reciting. */
  mistakeVibration: boolean;
  /** Vibration + chime when a surah is completed (after the recording ends). */
  completionSound: boolean;
  /** Stop the recording by itself after 2 s of silence at a surah end (else only by the stop button). */
  autoStopSurahEnd: boolean;
  /** Memorization mode: keep the first word of every verse visible as a cue. */
  hiddenFirstWord: boolean;
  /** Daily reminder for the wird («تذكير بالمداومة على الورد اليومي»), app only. */
  dailyReminder: boolean;
  /** Its time, "HH:MM" (24 h). */
  dailyReminderTime: string;
  /** v30 settings. */
  /** «كشف الأخطاء»: mark wrong / unclear words while reciting (off → no red / orange, no mistake alert). */
  errorDetection: boolean;
  /** «تظليل الأخطاء الماضية»: show the saved colours of earlier recitations (red / orange) in the Mushaf. */
  showPastMistakes: boolean;
  /** Short sound when a word is marked wrong. */
  mistakeSound: boolean;
  mistakeSoundType: "tone" | "click" | "bell";
  /** Sound / vibration when the microphone starts and stops. */
  sessionSound: boolean;
  sessionHaptic: boolean;
  /** Playback speed of the Sheikh (0.5 – 1.75). */
  playbackRate: number;
  /** «حفظ التسجيلات الصوتية»: keep the recordings of your recitation on this device. */
  saveRecordings: boolean;
  /** v38 «هيئة المصحف»: the Madinah page (15 lines like print) or flowing Quran text in a clear script. */
  mushafStyle: MushafStyle;
  /** Font size (px) of the flowing text style. */
  quranFontSize: number;
  /** «ألوان أحكام التجويد»: colour the Tajweed rules in the Quran text (Mushaf and Tasmīʿ). */
  tajweedColors: boolean;
  /** v45 «حجم الخط في التطبيق»: scale of ALL interface text (0.85 – 1.6). */
  appFontScale: number;
  /** v45 Quran text font: default (Madinah page Amiri Quran, flowing text Scheherazade) or one for both. */
  quranFont: QuranFont;
  /** v45 Arabic interface / tafsir font. */
  arabicUiFont: ArabicUiFont;
  /** v45 Latin interface font (German, English, …). */
  latinFont: LatinFont;
  /** v45 «تباين عالٍ». */
  highContrast: boolean;
  /** v45 «وضع الأطفال». */
  kidsMode: boolean;
  /** v47: the kids storybook theme — «سماء مشرقة» / «حديقة الزمرد» / «قمر الليل الهادئ». */
  kidsTheme: KidsTheme;
};
/** v45: "lines" = «آية في كل سطر» (each verse on its own row). */
export type MushafStyle = "madinah" | "clean" | "lines";
export const QURAN_FONT_SIZES = [20, 22, 24, 28, 32, 36, 40, 44, 48, 54] as const;
export type QuranFont = "default" | "uthmani" | "naskh" | "amiri";
export type ArabicUiFont = "default" | "naskh" | "cairo";
export type LatinFont = "default" | "atkinson" | "lexend" | "opendyslexic" | "inter";
export const FONT_SCALE_PRESETS = [["S", 0.9], ["M", 1], ["L", 1.15], ["XL", 1.3], ["XXL", 1.5]] as const;
export const FONT_SCALE_RANGE = [0.85, 1.6] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  language: "ar",
  theme: "emerald",
  reciterId: "alafasy",
  speechEngine: "auto",
  whisperLive: false,
  whisperModel: "base",
  recognizer: "zipformer",
  translations: {},
  tafsirs: {},
  mistakeVibration: true,
  completionSound: true,
  autoStopSurahEnd: true,
  hiddenFirstWord: false,
  dailyReminder: false,
  dailyReminderTime: "20:00",
  errorDetection: true,
  showPastMistakes: true,
  mistakeSound: false,
  mistakeSoundType: "tone",
  sessionSound: true,
  sessionHaptic: true,
  playbackRate: 1,
  saveRecordings: true,
  mushafStyle: "madinah",
  quranFontSize: 28,
  tajweedColors: false,
  appFontScale: 1,
  quranFont: "default",
  arabicUiFont: "default",
  latinFont: "default",
  highContrast: false,
  kidsMode: false,
  kidsTheme: "sky",
};
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75] as const;

const KEY = "hifz.settings";
const signal = createSignal<AppSettings>(DEFAULT_SETTINGS);
let loaded: Promise<void> | null = null;

export function loadSettings(): Promise<void> {
  loaded ??= kv.getJson<Partial<AppSettings>>(KEY, {}).then((saved) => {
    signal.set(cleanSettings({ ...DEFAULT_SETTINGS, ...saved, ...changedBeforeLoad }));
    // Older versions could store a Groq key (cloud recognition, AI chat). Both are gone: remove the key.
    void kv.remove("hifz.groq.apiKey").catch(() => {});
    void kv.remove("hifz.openai.apiKey").catch(() => {});
  });
  return loaded;
}

/** Drops values older versions allowed but this one doesn't (e.g. the removed "groq" engine, old chat settings). */
export function cleanSettings(s: AppSettings & Record<string, unknown>): AppSettings {
  const out = { ...s } as AppSettings & Record<string, unknown>;
  if (!isLanguage(out.language)) out.language = DEFAULT_SETTINGS.language;
  if (out.speechEngine !== "auto" && out.speechEngine !== "whisper") out.speechEngine = "auto";
  // "quran" (the removed experimental Whisper model) and anything unknown → base.
  if (out.whisperModel !== "tiny" && out.whisperModel !== "base") out.whisperModel = "base";
  if (out.recognizer !== "zipformer" && out.recognizer !== "whisper") out.recognizer = "zipformer";
  if (!out.translations || typeof out.translations !== "object") out.translations = {};
  if (!out.tafsirs || typeof out.tafsirs !== "object") out.tafsirs = {};
  for (const k of ["mistakeVibration", "completionSound", "autoStopSurahEnd", "hiddenFirstWord", "dailyReminder", "errorDetection", "showPastMistakes", "mistakeSound", "sessionSound", "sessionHaptic", "saveRecordings", "tajweedColors", "highContrast", "kidsMode"] as const) if (typeof out[k] !== "boolean") out[k] = DEFAULT_SETTINGS[k];
  if (typeof out.dailyReminderTime !== "string" || !/^\d{2}:\d{2}$/.test(out.dailyReminderTime)) out.dailyReminderTime = DEFAULT_SETTINGS.dailyReminderTime;
  if (!(PLAYBACK_RATES as readonly number[]).includes(out.playbackRate as number)) out.playbackRate = 1;
  if (!["tone", "click", "bell"].includes(out.mistakeSoundType as string)) out.mistakeSoundType = "tone";
  if (out.mushafStyle !== "madinah" && out.mushafStyle !== "clean" && out.mushafStyle !== "lines") out.mushafStyle = "madinah";
  const sc = Number(out.appFontScale);
  out.appFontScale = Number.isFinite(sc) ? Math.min(FONT_SCALE_RANGE[1], Math.max(FONT_SCALE_RANGE[0], Math.round(sc * 100) / 100)) : 1;
  if (!["default", "uthmani", "naskh", "amiri"].includes(out.quranFont as string)) out.quranFont = "default";
  if (!(KIDS_THEMES as readonly string[]).includes(out.kidsTheme as string)) out.kidsTheme = "sky";
  if (!["default", "naskh", "cairo"].includes(out.arabicUiFont as string)) out.arabicUiFont = "default";
  if (!["default", "atkinson", "lexend", "opendyslexic", "inter"].includes(out.latinFont as string)) out.latinFont = "default";
  if (!(QURAN_FONT_SIZES as readonly number[]).includes(out.quranFontSize as number)) out.quranFontSize = DEFAULT_SETTINGS.quranFontSize;
  delete out["chatProvider"]; delete out["chatModel"];
  return out;
}

/* Changes made before the saved settings finished loading must win over the saved ones. */
let changedBeforeLoad: Partial<AppSettings> = {};

export const getSettings = () => signal.get();

/** Applies a theme to the page (also mirrored to localStorage so the app starts in the right colours). */
export function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;
  if (theme === "emerald") delete document.documentElement.dataset["theme"]; else document.documentElement.dataset["theme"] = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  try { localStorage.setItem("hifz.theme", theme); } catch { /* ignore */ }
}

/**
 * v45: typography + visual comfort on the page root — font scale (rem-based, so ALL interface text
 * follows), font families via data attributes (CSS in styles.css), high contrast, kids theme. Mirrored to
 * localStorage so the app starts with them (index.html reads it before React).
 */
export function applyTypography(s: Pick<AppSettings, "appFontScale" | "quranFont" | "arabicUiFont" | "latinFont" | "highContrast" | "kidsMode"> & { kidsTheme?: KidsTheme }) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--app-font-scale", String(s.appFontScale));
  root.style.fontSize = s.appFontScale === 1 ? "" : `${Math.round(s.appFontScale * 1000) / 10}%`;
  const set = (k: string, v: string | null) => { if (v) root.dataset[k] = v; else delete root.dataset[k]; };
  set("quranFont", s.quranFont === "default" ? null : s.quranFont);
  set("arFont", s.arabicUiFont === "default" ? null : s.arabicUiFont);
  set("latinFont", s.latinFont === "default" ? null : s.latinFont);
  set("contrast", s.highContrast ? "high" : null);
  set("kids", s.kidsMode ? "on" : null);
  set("kidsTheme", s.kidsMode ? s.kidsTheme ?? "sky" : null);
  try { localStorage.setItem("hifz.typography", JSON.stringify({ appFontScale: s.appFontScale, quranFont: s.quranFont, arabicUiFont: s.arabicUiFont, latinFont: s.latinFont, highContrast: s.highContrast, kidsMode: s.kidsMode, kidsTheme: s.kidsTheme })); } catch { /* ignore */ }
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  if (!loaded) changedBeforeLoad = { ...changedBeforeLoad, ...patch };
  const next = { ...signal.get(), ...patch };
  signal.set(next);
  await kv.setJson(KEY, next);
}

/** Called on every settings change (non-React code). */
export const subscribeSettings = (fn: () => void) => signal.subscribe(fn);

export function useSettings(): AppSettings {
  const value = useSyncExternalStore(signal.subscribe, signal.get, () => DEFAULT_SETTINGS);
  useEffect(() => { void loadSettings(); }, []);
  return value;
}
