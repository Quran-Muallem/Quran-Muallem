/**
 * Tajweed examples in a Sheikh's voice (v35 → v39).
 *
 * Each example has a place in the Quran ([surah, ayah, firstWord, lastWord]: `ref` in the data, else
 * src/data/tajweedRefs.json). v39: the example's WHOLE verse is played in the voice chosen in the guide
 * (`TAJWEED_VOICES`) — never a single cut-out word, never the word-by-word voice (that one belongs to the
 * Mushaf's mistake corrections) — and the guide lights up the example's words in the verse.
 */
import refs from "@/data/tajweedRefs.json";
import type { TajweedExample } from "@/data/tajweedData";
import { claimSheikhAudio, currentWordAudio, normalizeSegments, playClip, sheikhAudio, stopWordAudio } from "@/lib/audioPlayback";
import { getAyahAudioUrl } from "@/lib/reciterManager";
import { getSettings } from "@/lib/settings";
import { verseTiming, type Moshaf } from "@/lib/recitersHub";

export type ExampleRef = [number, number, number, number];
/** How an example played: «sheikh» = the verse with word timings, «verse» = verse audio without them. */
export type ExampleVoice = "sheikh" | "verse";

const REFS = refs as unknown as Record<string, ExampleRef>;
export const exampleRef = (e: TajweedExample): ExampleRef | null => e.ref ?? REFS[e.ar] ?? null;

const pad3 = (n: number) => String(n).padStart(3, "0");
const me = Symbol("tajweed-examples");
let token = 0;

/**
 * The Sheikh's verse file and word timings from Quran.com. Asks for `fields=segments` explicitly: without it
 * the API answers with the file only (no word timings).
 */
type Timed = { url: string; segments: [number, number, number][] };
const timings = new Map<string, Promise<Timed | null>>();
export function exampleTimings(quranComId: number, surah: number, ayah: number): Promise<Timed | null> {
  const key = `${quranComId}/${surah}:${ayah}`;
  let p = timings.get(key);
  if (!p) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    p = fetch(`https://api.quran.com/api/v4/recitations/${quranComId}/by_ayah/${surah}:${ayah}?fields=segments`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { audio_files?: { url?: string; segments?: unknown }[] } | null) => {
        const f = d?.audio_files?.[0];
        const segments = normalizeSegments(f?.segments);
        if (!f?.url || !segments.length) return null;
        const url = /^https?:/.test(f.url) ? f.url : f.url.startsWith("//") ? `https:${f.url}` : `https://verses.quran.com/${f.url.replace(/^\//, "")}`;
        return { url, segments };
      })
      .catch(() => null)
      .finally(() => clearTimeout(timer));
    timings.set(key, p);
    void p.then((v) => { if (!v) timings.delete(key); });
  }
  return p;
}

/** Stops an example that is playing. */
export function stopExample() { token++; stopWordAudio(); }

/** Waits until `a` stops (end, pause at the clip's end, error) or a newer example starts. */
function untilStopped(a: HTMLAudioElement | null, my: number, maxMs = 60000): Promise<void> {
  return new Promise((resolve) => {
    if (!a || a.paused) { resolve(); return; }
    const done = () => { clearInterval(watch); clearTimeout(cap); a.removeEventListener("pause", done); a.removeEventListener("ended", done); a.removeEventListener("error", done); resolve(); };
    a.addEventListener("pause", done); a.addEventListener("ended", done); a.addEventListener("error", done);
    const watch = setInterval(() => { if (my !== token) done(); }, 200);
    const cap = setTimeout(done, maxMs);
  });
}

/* ------------------------------------------------------------------------------------------------------ */
/* v38/v39 · the voices of the Tajweed examples — always the WHOLE verse                                     */
/* ------------------------------------------------------------------------------------------------------ */

export type TajweedVoiceId = "husary-mj" | "minshawi-mj" | "abdulbasit-mj" | "mustafa-mj" | "hudhaifi" | "alafasy";
export type TajweedVoice = {
  id: TajweedVoiceId; ar: string; en: string;
  style: "mujawwad" | "murattal";
  /** Quran.com recitation with word timings → the word being recited is highlighted while the verse plays. */
  quranComId?: number;
  /** everyayah.com folder (one file per verse). */
  everyAyah?: string;
  /** mp3quran.net surah files with verse timing (`read` id). */
  mp3quran?: { server: string; timing: number };
};
/**
 * Hafs ʿan ʿĀṣim (the guide teaches Hafs). v39: an example always plays its whole verse, so the madd, ghunnah
 * and the stop are heard in their flow. Abdul-Basit, Al-Minshawi and Al-Afasy have word timings (the word
 * being recited lights up); the others light up the example's words for the whole verse.
 */
export const TAJWEED_VOICES: readonly TajweedVoice[] = [
  { id: "husary-mj", ar: "محمود خليل الحصري", en: "Mahmoud Khalil Al-Husary", style: "mujawwad", everyAyah: "Husary_128kbps_Mujawwad" },
  { id: "minshawi-mj", ar: "محمد صديق المنشاوي", en: "Muhammad Siddiq Al-Minshawi", style: "mujawwad", quranComId: 8, everyAyah: "Minshawy_Mujawwad_192kbps" },
  { id: "abdulbasit-mj", ar: "عبدالباسط عبدالصمد", en: "Abdul-Basit Abdul-Samad", style: "mujawwad", quranComId: 1, everyAyah: "Abdul_Basit_Mujawwad_128kbps" },
  { id: "mustafa-mj", ar: "مصطفى إسماعيل", en: "Mustafa Ismail", style: "mujawwad", mp3quran: { server: "https://cdn.mp3quran.net/audio/mustafa-ismail/r2/", timing: 288 } },
  { id: "hudhaifi", ar: "علي بن عبدالرحمن الحذيفي", en: "Ali Al-Huthaify", style: "murattal", everyAyah: "Hudhaify_128kbps" },
  { id: "alafasy", ar: "مشاري راشد العفاسي", en: "Mishary Rashid Al-Afasy", style: "murattal", quranComId: 7, everyAyah: "Alafasy_128kbps" },
];
export const DEFAULT_TAJWEED_VOICE: TajweedVoiceId = "husary-mj";
export const tajweedVoice = (id: TajweedVoiceId): TajweedVoice => TAJWEED_VOICES.find((v) => v.id === id) ?? TAJWEED_VOICES[0]!;

const SOURCE_KEY = "qm.tajweed.voice";
/** The voice chosen in the guide. Old choices: «sheikh» (v36) → Al-Afasy; word-by-word (removed in v39) → default. */
export function getExampleSource(): TajweedVoiceId {
  try {
    const v = localStorage.getItem(SOURCE_KEY);
    if (v === "sheikh" || v === "selected") return "alafasy";
    return TAJWEED_VOICES.some((x) => x.id === v) ? (v as TajweedVoiceId) : DEFAULT_TAJWEED_VOICE;
  } catch { return DEFAULT_TAJWEED_VOICE; }
}
export function setExampleSource(v: TajweedVoiceId) {
  try { localStorage.setItem(SOURCE_KEY, v); } catch { /* private mode */ }
}

/**
 * Plays the WHOLE verse of an example in the chosen voice; resolves once it has finished (or was stopped /
 * replaced) with how it played — «sheikh»: with word timings (`onWord` reports the Mushaf word being recited),
 * «verse»: verse audio without timings — and rejects when nothing could play. Fallback: the voice's verse file,
 * then the verse of the Sheikh chosen in the settings (also offline downloads). No word-by-word voice here (v39).
 */
export async function playExample(e: TajweedExample, reciterId = getSettings().reciterId, onStart?: (voice: ExampleVoice) => void, source: TajweedVoiceId = getExampleSource(), onWord?: (word: number | null) => void): Promise<ExampleVoice> {
  const ref = exampleRef(e);
  if (!ref) throw new Error("no reference");
  const [s, a] = ref;
  const my = ++token;
  // One Sheikh voice at a time: the Mushaf / Recite player stops.
  claimSheikhAudio(me, () => { if (my === token) stopWordAudio(); });
  const voice = tajweedVoice(source);

  /** The verse with Quran.com word timings; `onWord` follows the recitation. */
  const timed = async (): Promise<boolean> => {
    if (voice.quranComId == null) return false;
    const t = await exampleTimings(voice.quranComId, s, a);
    if (!t || my !== token) return false;
    try { await playClip(t.url); } catch { return false; }
    onStart?.("sheikh");
    const shift = t.segments[0]?.[0] === 0 ? 1 : 0;
    const el = currentWordAudio();
    let last: number | null = null;
    const follow = setInterval(() => {
      if (!el || my !== token) return;
      const ms = el.currentTime * 1000;
      const seg = t.segments.find(([, from, to]) => ms >= from && ms < to);
      const w = seg ? seg[0] + shift : null;
      if (w !== last) { last = w; onWord?.(w); }
    }, 80);
    try { await untilStopped(el, my, 300000); } finally { clearInterval(follow); onWord?.(null); }
    return true;
  };
  /** The verse file of the voice (everyayah, or the verse cut out of the mp3quran surah file). */
  const verse = async (): Promise<boolean> => {
    try {
      if (voice.everyAyah) await playClip(`https://everyayah.com/data/${voice.everyAyah}/${pad3(s)}${pad3(a)}.mp3`);
      else if (voice.mp3quran) {
        const timing = await verseTiming({ timing: voice.mp3quran.timing } as Moshaf, s);
        const t = timing?.find((x) => x.ayah === a);
        if (!t || my !== token) return false;
        await playClip(`${voice.mp3quran.server}${pad3(s)}.mp3`, t.start, t.end);
      } else return false;
    } catch { return false; }
    onStart?.("verse"); await untilStopped(currentWordAudio(), my, 300000);
    return true;
  };

  if (await timed()) return "sheikh";
  if (my !== token) return "sheikh";
  if (await verse()) return "verse";
  // Last resort: the Sheikh of the settings, whole verse.
  const url = await getAyahAudioUrl(reciterId, s, a);
  if (my !== token) return "verse";
  const el = sheikhAudio(url);
  await el.play();
  onStart?.("verse");
  await untilStopped(el, my, 300000);
  if (my !== token) el.pause();
  return "verse";
}
