/**
 * Hybrid prayer-time engine.
 *
 *  1. PRIMARY — on the device, offline: the `adhan` library calculates the times from the position (GPS)
 *     with the chosen method (MWL, ISNA, Egyptian, Karachi, Umm al-Qura as used in Saudi Arabia / Nusuk,
 *     Diyanet, KEMENAG, JAKIM, UOIF, Dubai, Kuwait, Qatar, Singapore, Tehran, Moonsighting Committee,
 *     Russia) and madhab (Asr: Shafiʿi / Hanafi). High latitudes (e.g. Germany in summer) use the
 *     "seventh of the night" / recommended rule, so Fajr and Isha always exist.
 *  2. FALLBACK — online: the free Aladhan API (timingsByCity) when there is no GPS position or a city was
 *     chosen by hand. The answer of each day is kept, so the last result also works offline.
 *  3. Manual offsets: every prayer can be moved by −15…+15 minutes to match the local mosque.
 *
 * Only the position / city is used, only for this calculation, and it stays on the device (the city
 * request to Aladhan contains the city name, never the GPS position).
 */
import { CalculationMethod, CalculationParameters, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from "adhan";
import { createSignal, kv } from "@/lib/storage";
import type { Language } from "@/i18n";

export const PRAYERS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerName = (typeof PRAYERS)[number];
export type DayTimes = Record<PrayerName, Date>;

export type MethodId =
  | "MWL" | "ISNA" | "Egyptian" | "Karachi" | "UmmAlQura" | "Diyanet" | "Kemenag" | "JAKIM" | "UOIF"
  | "Dubai" | "Kuwait" | "Qatar" | "Singapore" | "Tehran" | "Moonsighting" | "Russia";

/** Display name, the adhan parameters and Aladhan's method number of every method. */
export const METHODS: Record<MethodId, { name: string; aladhan: number; params: () => CalculationParameters }> = {
  MWL: { name: "Muslim World League", aladhan: 3, params: () => CalculationMethod.MuslimWorldLeague() },
  ISNA: { name: "ISNA (North America)", aladhan: 2, params: () => CalculationMethod.NorthAmerica() },
  Egyptian: { name: "Egyptian General Authority", aladhan: 5, params: () => CalculationMethod.Egyptian() },
  Karachi: { name: "University of Islamic Sciences, Karachi", aladhan: 1, params: () => CalculationMethod.Karachi() },
  UmmAlQura: { name: "Umm al-Qura, Makkah (Saudi Arabia)", aladhan: 4, params: () => CalculationMethod.UmmAlQura() },
  Diyanet: { name: "Diyanet İşleri Başkanlığı (Türkiye)", aladhan: 13, params: () => CalculationMethod.Turkey() },
  Kemenag: { name: "KEMENAG (Indonesia)", aladhan: 20, params: () => angles(20, 18) },
  JAKIM: { name: "JAKIM (Malaysia)", aladhan: 17, params: () => angles(20, 18) },
  UOIF: { name: "UOIF (France)", aladhan: 12, params: () => angles(12, 12) },
  Dubai: { name: "Dubai", aladhan: 16, params: () => CalculationMethod.Dubai() },
  Kuwait: { name: "Kuwait", aladhan: 9, params: () => CalculationMethod.Kuwait() },
  Qatar: { name: "Qatar", aladhan: 10, params: () => CalculationMethod.Qatar() },
  Singapore: { name: "MUIS (Singapore)", aladhan: 11, params: () => CalculationMethod.Singapore() },
  Tehran: { name: "Institute of Geophysics, Tehran", aladhan: 7, params: () => CalculationMethod.Tehran() },
  Moonsighting: { name: "Moonsighting Committee", aladhan: 15, params: () => CalculationMethod.MoonsightingCommittee() },
  Russia: { name: "Spiritual Administration of Muslims of Russia", aladhan: 14, params: () => angles(16, 15) },
};
export const METHOD_IDS = Object.keys(METHODS) as MethodId[];

function angles(fajr: number, isha: number): CalculationParameters {
  const p = CalculationMethod.Other();
  p.fajrAngle = fajr;
  p.ishaAngle = isha;
  return p;
}

/** A sensible default for the app language (the user can change it). */
export function defaultMethod(language: Language): MethodId {
  switch (language) {
    case "ar": return "UmmAlQura";
    case "tr": return "Diyanet";
    case "id": return "Kemenag";
    case "ms": return "JAKIM";
    case "ur": case "bn": return "Karachi";
    case "ru": return "Russia";
    default: return "MWL";
  }
}

/* ───────────── settings ───────────── */

export type PrayerLocation =
  | { mode: "gps"; lat: number; lon: number; label?: string | undefined; at: string }
  | { mode: "city"; city: string; country: string };
export type Offsets = Record<PrayerName, number>;
/** The five prayers that can notify (sunrise is not a prayer). */
export const NOTIFY_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type NotifyPrayer = (typeof NOTIFY_PRAYERS)[number];
/** 🔊 full Adhan · 📳 vibration only · 🔇 off */
export type NotifyMode = "adhan" | "vibrate" | "off";
export type PrayerSettings = {
  method: MethodId | null; // null → default for the language
  madhab: "shafi" | "hanafi";
  offsets: Offsets;
  location: PrayerLocation | null;
  /** Notification mode per prayer. */
  notify: Partial<Record<NotifyPrayer, NotifyMode>>;
  /** Muezzin voice for all prayers (adhanVoices.ts). */
  voice: string;
  /** A different voice for single prayers (overrides `voice`). */
  prayerVoices: Partial<Record<NotifyPrayer, string>>;
};
export const ZERO_OFFSETS: Offsets = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = { method: null, madhab: "shafi", offsets: ZERO_OFFSETS, location: null, notify: {}, voice: "madinah", prayerVoices: {} };

/** Mode of a prayer (older settings stored `true` for "on" → full Adhan). */
export function modeOf(s: Pick<PrayerSettings, "notify">, p: NotifyPrayer): NotifyMode {
  const v = s.notify[p] as NotifyMode | boolean | undefined;
  return v === true ? "adhan" : v === "adhan" || v === "vibrate" ? v : "off";
}
/** The voice of a prayer: its own one, else the global voice. */
export const voiceOf = (s: Pick<PrayerSettings, "voice" | "prayerVoices">, p: NotifyPrayer) => s.prayerVoices[p] ?? s.voice;
export const MAX_OFFSET = 15;
export const clampOffset = (m: number) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, Math.round(m)));

const KEY = "qm.prayer.settings.v1";
const signal = createSignal<PrayerSettings>(DEFAULT_PRAYER_SETTINGS);
let loaded: Promise<void> | null = null;
export function loadPrayerSettings(): Promise<void> {
  loaded ??= kv.getJson<Partial<PrayerSettings>>(KEY, {}).then((s) => {
    const notify: PrayerSettings["notify"] = {};
    for (const p of NOTIFY_PRAYERS) { const m = modeOf({ notify: (s.notify ?? {}) as PrayerSettings["notify"] }, p); if (m !== "off") notify[p] = m; }
    signal.set({ ...DEFAULT_PRAYER_SETTINGS, ...s, offsets: { ...ZERO_OFFSETS, ...(s.offsets ?? {}) }, notify, prayerVoices: { ...(s.prayerVoices ?? {}) } });
  });
  return loaded;
}
export const prayerSettings = signal;
export async function updatePrayerSettings(patch: Partial<PrayerSettings>) {
  await loadPrayerSettings();
  const next = { ...signal.get(), ...patch };
  signal.set(next);
  await kv.setJson(KEY, next);
}

/** Sets the notification mode of one prayer (from the current settings, so quick taps never get lost). */
export async function setPrayerMode(p: NotifyPrayer, mode: NotifyMode) {
  await loadPrayerSettings();
  const notify = { ...signal.get().notify };
  if (mode === "off") delete notify[p]; else notify[p] = mode;
  await updatePrayerSettings({ notify });
}
/** The next mode when the row icon is tapped: 🔊 Adhan → 📳 vibration → 🔇 off → 🔊 … */
export const nextMode = (m: NotifyMode): NotifyMode => (m === "adhan" ? "vibrate" : m === "vibrate" ? "off" : "adhan");

/* ───────────── calculation ───────────── */

const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60000);
export function applyOffsets(t: DayTimes, offsets: Offsets): DayTimes {
  const out = {} as DayTimes;
  for (const p of PRAYERS) out[p] = addMinutes(t[p], clampOffset(offsets[p] ?? 0));
  return out;
}

/** adhan parameters for a method / madhab at a latitude. */
export function parametersFor(method: MethodId, madhab: "shafi" | "hanafi", lat: number): CalculationParameters {
  const p = METHODS[method].params();
  p.madhab = madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  // Above ~48° Fajr / Isha twilight may never end in summer: use a night-fraction rule.
  if (Math.abs(lat) >= 48) p.highLatitudeRule = HighLatitudeRule.SeventhOfTheNight;
  return p;
}

/** PRIMARY: on-device calculation (adhan) for a date (local calendar day). */
export function calculateLocal(lat: number, lon: number, date: Date, method: MethodId, madhab: "shafi" | "hanafi"): DayTimes {
  const pt = new PrayerTimes(new Coordinates(lat, lon), date, parametersFor(method, madhab, lat));
  return { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha };
}

/** "HH:MM" (Aladhan, possibly with " (CET)") on the given day → Date in local time. */
export function parseClock(hhmm: string, day: Date): Date | null {
  const m = hhmm.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(day);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

const ALADHAN = "https://api.aladhan.com/v1";
const dayKey = (d: Date) => `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;

type AladhanTimings = Record<string, string>;
/** FALLBACK: Aladhan timingsByCity (times of the city's own timezone, shown as wall-clock times). */
export async function fetchCityTimes(city: string, country: string, date: Date, method: MethodId, madhab: "shafi" | "hanafi"): Promise<DayTimes> {
  const cacheKey = `qm.prayer.city.${city.toLowerCase()}|${country.toLowerCase()}|${method}|${madhab}|${dayKey(date)}`;
  const toTimes = (t: AladhanTimings) => {
    const out = {} as DayTimes;
    const map: Record<PrayerName, string> = { fajr: "Fajr", sunrise: "Sunrise", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };
    for (const p of PRAYERS) { const d = parseClock(t[map[p]] ?? "", date); if (!d) throw new Error("bad timings"); out[p] = d; }
    return out;
  };
  const cached = await kv.getJson<AladhanTimings | null>(cacheKey, null);
  if (cached) return toTimes(cached);
  const q = new URLSearchParams({ city, country, method: String(METHODS[method].aladhan), school: madhab === "hanafi" ? "1" : "0" });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(`${ALADHAN}/timingsByCity/${dayKey(date)}?${q}`, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json() as { code?: number; data?: { timings?: AladhanTimings } };
    const t = j.data?.timings;
    if (!t) throw new Error("no timings");
    void kv.setJson(cacheKey, t);
    return toTimes(t);
  } finally { clearTimeout(timer); }
}

export type TimesResult = { times: DayTimes; source: "device" | "aladhan"; method: MethodId };

/**
 * Times for a day by the hybrid rule: GPS position → on-device (offline); city → Aladhan (online,
 * cached per day). Offsets are applied to both.
 */
export async function timesFor(settings: PrayerSettings, language: Language, date = new Date()): Promise<TimesResult> {
  const method = settings.method ?? defaultMethod(language);
  const loc = settings.location;
  if (!loc) throw new Error("no-location");
  if (loc.mode === "gps") return { times: applyOffsets(calculateLocal(loc.lat, loc.lon, date, method, settings.madhab), settings.offsets), source: "device", method };
  return { times: applyOffsets(await fetchCityTimes(loc.city, loc.country, date, method, settings.madhab), settings.offsets), source: "aladhan", method };
}

/** The next prayer after `now` (sunrise is not a prayer) — tomorrow's Fajr after Isha. */
export function nextPrayer(today: DayTimes, tomorrow: DayTimes | null, now = new Date()): { name: PrayerName; at: Date } | null {
  for (const p of PRAYERS) if (p !== "sunrise" && today[p] > now) return { name: p, at: today[p] };
  return tomorrow ? { name: "fajr", at: tomorrow.fajr } : null;
}

/** "in 1 h 05 min" helper: minutes until a time. */
export const minutesUntil = (at: Date, now = new Date()) => Math.max(0, Math.round((at.getTime() - now.getTime()) / 60000));
