import { useEffect, useSyncExternalStore } from "react";
import { createSignal, kv } from "@/lib/storage";
import { isLanguage, type Language } from "@/i18n";


/**
 * auto: live browser recognition where available (web), otherwise on-device Whisper with live preview.
 * whisper: always on-device Whisper (private, offline). In the app recognition is always on the device.
 */
export type SpeechEngine = "auto" | "whisper";
export type ThemeId = "emerald" | "light" | "dark";
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
};

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
  for (const k of ["mistakeVibration", "completionSound", "autoStopSurahEnd", "hiddenFirstWord", "dailyReminder", "errorDetection", "showPastMistakes", "mistakeSound", "sessionSound", "sessionHaptic", "saveRecordings"] as const) if (typeof out[k] !== "boolean") out[k] = DEFAULT_SETTINGS[k];
  if (typeof out.dailyReminderTime !== "string" || !/^\d{2}:\d{2}$/.test(out.dailyReminderTime)) out.dailyReminderTime = DEFAULT_SETTINGS.dailyReminderTime;
  if (!(PLAYBACK_RATES as readonly number[]).includes(out.playbackRate as number)) out.playbackRate = 1;
  if (!["tone", "click", "bell"].includes(out.mistakeSoundType as string)) out.mistakeSoundType = "tone";
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
