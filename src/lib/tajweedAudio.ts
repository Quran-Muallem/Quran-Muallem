/**
 * Tajweed examples in the selected Sheikh's voice (v35).
 *
 * Each example has a place in the Quran ([surah, ayah, firstWord, lastWord]: `ref` in the data, else
 * src/data/tajweedRefs.json). Playback, like a word in the Mushaf:
 *  · «wordByWord» (default, v36) — Quran.com's word-by-word recording, the same voice as «استمع إلى الكلمة»
 *     in the mistake corrections, the words one after another;
 *  · «sheikh» — the selected Sheikh's verse recording from Quran.com with its word timings, played from the
 *     first word's start to the last word's end (one word or a phrase).
 *  The reader picks which comes first (`getExampleSource`); the other is the fallback, then:
 *  3. «verse» — last resort: the Sheikh's whole verse (the app's usual verse audio, also offline downloads).
 */
import refs from "@/data/tajweedRefs.json";
import type { TajweedExample } from "@/data/tajweedData";
import { claimSheikhAudio, currentWordAudio, normalizeSegments, playClip, sheikhAudio, stopWordAudio } from "@/lib/audioPlayback";
import { getAyahAudioUrl, getReciter } from "@/lib/reciterManager";
import { getSettings } from "@/lib/settings";
import { verseTiming, type Moshaf } from "@/lib/recitersHub";

export type ExampleRef = [number, number, number, number];
export type ExampleVoice = "sheikh" | "wordByWord" | "verse";

const REFS = refs as unknown as Record<string, ExampleRef>;
export const exampleRef = (e: TajweedExample): ExampleRef | null => e.ref ?? REFS[e.ar] ?? null;

const WBW = "https://audio.qurancdn.com/wbw/";
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
/* v38 · the voices of the Tajweed examples: Mujawwad Sheikhs (Hafs)                                        */
/* ------------------------------------------------------------------------------------------------------ */

export type TajweedVoiceId = "husary-mj" | "minshawi-mj" | "abdulbasit-mj" | "mustafa-mj" | "hudhaifi" | "wbw" | "selected";
export type TajweedVoice = {
  id: TajweedVoiceId; ar: string; en: string;
  /** mujawwad / murattal Sheikh, the word-by-word voice of the corrections, or the Sheikh chosen in the settings. */
  style: "mujawwad" | "murattal" | "wbw" | "selected";
  /** Quran.com recitation with word timings → one word / a phrase can be cut out. */
  quranComId?: number;
  /** everyayah.com folder (one file per verse). */
  everyAyah?: string;
  /** mp3quran.net surah files with verse timing (`read` id). */
  mp3quran?: { server: string; timing: number };
};
/**
 * Hafs ʿan ʿĀṣim only (the guide teaches Hafs). Word-exact for Abdul-Basit and Minshawi (Quran.com word timings);
 * Husary, Mustafa Ismail and Hudhaifi have verse recordings only, so their example plays the whole verse.
 * Al-Hudhaifi recorded no Mujawwad: his Murattal is offered.
 */
export const TAJWEED_VOICES: readonly TajweedVoice[] = [
  { id: "husary-mj", ar: "محمود خليل الحصري", en: "Mahmoud Khalil Al-Husary", style: "mujawwad", everyAyah: "Husary_128kbps_Mujawwad" },
  { id: "minshawi-mj", ar: "محمد صديق المنشاوي", en: "Muhammad Siddiq Al-Minshawi", style: "mujawwad", quranComId: 8, everyAyah: "Minshawy_Mujawwad_192kbps" },
  { id: "abdulbasit-mj", ar: "عبدالباسط عبدالصمد", en: "Abdul-Basit Abdul-Samad", style: "mujawwad", quranComId: 1, everyAyah: "Abdul_Basit_Mujawwad_128kbps" },
  { id: "mustafa-mj", ar: "مصطفى إسماعيل", en: "Mustafa Ismail", style: "mujawwad", mp3quran: { server: "https://cdn.mp3quran.net/audio/mustafa-ismail/r2/", timing: 288 } },
  { id: "hudhaifi", ar: "علي بن عبدالرحمن الحذيفي", en: "Ali Al-Huthaify", style: "murattal", everyAyah: "Hudhaify_128kbps" },
  { id: "wbw", ar: "", en: "", style: "wbw" },
  { id: "selected", ar: "", en: "", style: "selected" },
];
export const DEFAULT_TAJWEED_VOICE: TajweedVoiceId = "husary-mj";
export const tajweedVoice = (id: TajweedVoiceId): TajweedVoice => TAJWEED_VOICES.find((v) => v.id === id) ?? TAJWEED_VOICES[0]!;

const SOURCE_KEY = "qm.tajweed.voice";
/** The voice chosen in the guide (v36 values «wordByWord» / «sheikh» are carried over). */
export function getExampleSource(): TajweedVoiceId {
  try {
    const v = localStorage.getItem(SOURCE_KEY);
    if (v === "wordByWord") return "wbw";
    if (v === "sheikh") return "selected";
    return TAJWEED_VOICES.some((x) => x.id === v) ? (v as TajweedVoiceId) : DEFAULT_TAJWEED_VOICE;
  } catch { return DEFAULT_TAJWEED_VOICE; }
}
export function setExampleSource(v: TajweedVoiceId) {
  try { localStorage.setItem(SOURCE_KEY, v); } catch { /* private mode */ }
}

/**
 * Plays an example; resolves with the voice used once it has finished (or was stopped / replaced),
 * rejects when nothing could play. Order: the chosen voice (word-exact where it has word timings, else its
 * whole verse) → the word-by-word voice → the Sheikh of the settings' whole verse.
 */
export async function playExample(e: TajweedExample, reciterId = getSettings().reciterId, onStart?: (voice: ExampleVoice) => void, source: TajweedVoiceId = getExampleSource()): Promise<ExampleVoice> {
  const ref = exampleRef(e);
  if (!ref) throw new Error("no reference");
  const [s, a, w1, w2] = ref;
  const my = ++token;
  // One Sheikh voice at a time: the Mushaf / Recite player stops.
  claimSheikhAudio(me, () => { if (my === token) stopWordAudio(); });
  const voice = tajweedVoice(source);

  /** A Quran.com recitation cut to the example's words (false: no timings for them). */
  const cut = async (quranComId: number | null | undefined): Promise<boolean> => {
    if (quranComId == null) return false;
    const t = await exampleTimings(quranComId, s, a);
    const segs = t?.segments ?? [];
    // Quran.com counts words from 1 (some files from 0).
    const shift = segs[0]?.[0] === 0 ? 1 : 0;
    const first = segs.find(([p]) => p + shift === w1), last = segs.find(([p]) => p + shift === w2);
    if (!t || !first || !last || my !== token) return false;
    try { await playClip(t.url, first[1], last[2]); } catch { return false; }
    onStart?.("sheikh"); await untilStopped(currentWordAudio(), my);
    return true;
  };
  /** The word-by-word voice (the same as «استمع إلى الكلمة» in the mistake corrections), word after word. */
  const wordByWord = async (): Promise<boolean> => {
    try {
      for (let w = w1; w <= w2 && my === token; w++) {
        await playClip(`${WBW}${pad3(s)}_${pad3(a)}_${pad3(w)}.mp3`);
        if (w === w1) onStart?.("wordByWord");
        await untilStopped(currentWordAudio(), my);
      }
      return true;
    } catch { return false; }
  };
  /** The chosen Sheikh's whole verse (everyayah file, or the verse cut out of the mp3quran surah file). */
  const verse = async (v: TajweedVoice): Promise<boolean> => {
    try {
      if (v.everyAyah) await playClip(`https://everyayah.com/data/${v.everyAyah}/${pad3(s)}${pad3(a)}.mp3`);
      else if (v.mp3quran) {
        const timing = await verseTiming({ timing: v.mp3quran.timing } as Moshaf, s);
        const t = timing?.find((x) => x.ayah === a);
        if (!t || my !== token) return false;
        await playClip(`${v.mp3quran.server}${pad3(s)}.mp3`, t.start, t.end);
      } else return false;
    } catch { return false; }
    onStart?.("verse"); await untilStopped(currentWordAudio(), my, 180000);
    return true;
  };
  const selected = getReciter(reciterId);

  const order: [ExampleVoice, () => Promise<boolean>][] =
    voice.style === "wbw" ? [["wordByWord", wordByWord], ["sheikh", () => cut(selected.quranComId)]]
    : voice.style === "selected" ? [["sheikh", () => cut(selected.quranComId)], ["wordByWord", wordByWord]]
    : [["sheikh", () => cut(voice.quranComId)], ["verse", () => verse(voice)], ["wordByWord", wordByWord]];
  for (const [kind, play] of order) {
    if (my !== token) return kind;
    if (await play()) return kind;
  }
  // Last resort: the Sheikh of the settings, whole verse (also offline downloads).
  const url = await getAyahAudioUrl(reciterId, s, a);
  if (my !== token) return "verse";
  const el = sheikhAudio(url);
  await el.play();
  onStart?.("verse");
  await untilStopped(el, my, 120000);
  if (my !== token) el.pause();
  return "verse";
}
