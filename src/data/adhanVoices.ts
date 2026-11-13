/**
 * Muezzin voices for the Adhan notification (sources and licences: `public/adhan/CREDITS.md`, also shown in
 * the prayer settings). Only these two voices are offered; ids stored by older versions (e.g. "makkah",
 * "madinah_cc") are no longer listed and fall back to the default voice in `adhanFileFor`.
 *
 * Files (made by `scripts/adhan-sounds.mjs` from the originals):
 *   public/adhan/<id>.mp3         full Adhan — preview, web, Android notification channel sound (res/raw)
 *   public/adhan/ios/<id>.caf     first 30 s (iOS plays at most 30 s of a notification sound)
 */
export type AdhanVoiceId = "madinah" | "alafasy";

export type AdhanVoice = {
  id: AdhanVoiceId;
  /** Name in Arabic and in English (other languages use the English name). */
  ar: string; en: string;
  /** Full recording in public/adhan/ (without extension); null = no recording for the other prayers. */
  file: string | null;
  /** Recording of this voice for Fajr (with «الصلاة خير من النوم»); null → `FAJR_FALLBACK` is used for Fajr. */
  fajrFile: string | null;
  /** Shown under the name in the settings (source and licence). */
  credit?: string;
};

export const ADHAN_VOICES: AdhanVoice[] = [
  { id: "madinah", ar: "المدينة المنورة — الشيخ محمد مروان قصاص", en: "Madinah — Sheikh Muhammad Marwan Qassas", file: "madinah", fajrFile: "madinah_fajr", credit: "Masjid an-Nabawi · supplied by the app owner" },
  { id: "alafasy", ar: "الشيخ مشاري راشد العفاسي (أذان الفجر)", en: "Sheikh Mishary Rashid Alafasy (Fajr Adhan)", file: null, fajrFile: "alafasy_fajr", credit: "Maqam Hijaz · supplied by the app owner" },
];

/** Voice used for Fajr when the chosen voice has no Fajr recording: Fajr always includes «الصلاة خير من النوم». */
export const FAJR_FALLBACK: AdhanVoiceId = "madinah";
export const DEFAULT_VOICE: AdhanVoiceId = "madinah";

export const getVoice = (id: string | null | undefined): AdhanVoice | undefined => ADHAN_VOICES.find((v) => v.id === id);
/** Usable for every prayer (has a normal recording). */
export const isAvailable = (v: AdhanVoice | undefined): v is AdhanVoice & { file: string } => !!v?.file;
/** Usable for a prayer: Fajr also accepts voices that only have a Fajr recording. */
export const isAvailableFor = (v: AdhanVoice | undefined, isFajr: boolean): v is AdhanVoice => !!v && (!!v.file || (isFajr && !!v.fajrFile));

/** The recording (file name) actually played for a prayer with a voice. */
export function adhanFileFor(voiceId: string | null | undefined, isFajr: boolean): string {
  const v = getVoice(voiceId);
  if (isFajr) return (isAvailableFor(v, true) ? v.fajrFile : null) ?? getVoice(FAJR_FALLBACK)!.fajrFile!;
  return (isAvailable(v) ? v : getVoice(DEFAULT_VOICE)!).file!;
}

/** Android notification channel per recording (a channel's sound cannot change after it was created). */
export const channelFor = (file: string) => `adhan_${file}_v1`;
export const VIBRATE_CHANNEL = "prayer_vibrate_v1";
/** One second of silence: the "vibration only" channel / iOS sound (no tone, just the vibration). */
export const SILENT_FILE = "silence";
