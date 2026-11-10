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

/**
 * Plays an example; resolves with the voice used once it has finished (or was stopped / replaced),
 * rejects when nothing could play.
 */
/** Which voice the guide starts with: the word-by-word voice of the mistake corrections (default) or the selected Sheikh. */
export type ExampleSource = "wordByWord" | "sheikh";
const SOURCE_KEY = "qm.tajweed.voice";
export function getExampleSource(): ExampleSource {
  try { return localStorage.getItem(SOURCE_KEY) === "sheikh" ? "sheikh" : "wordByWord"; } catch { return "wordByWord"; }
}
export function setExampleSource(v: ExampleSource) {
  try { localStorage.setItem(SOURCE_KEY, v); } catch { /* private mode */ }
}

export async function playExample(e: TajweedExample, reciterId = getSettings().reciterId, onStart?: (voice: ExampleVoice) => void, source: ExampleSource = getExampleSource()): Promise<ExampleVoice> {
  const ref = exampleRef(e);
  if (!ref) throw new Error("no reference");
  const [s, a, w1, w2] = ref;
  const my = ++token;
  // One Sheikh voice at a time: the Mushaf / Recite player stops.
  claimSheikhAudio(me, () => { if (my === token) stopWordAudio(); });
  const reciter = getReciter(reciterId);

  /** The selected Sheikh's verse recording, cut to the example's words (false: not available). */
  const sheikh = async (): Promise<boolean> => {
    if (reciter.quranComId == null) return false;
    const t = await exampleTimings(reciter.quranComId, s, a);
    const segs = t?.segments ?? [];
    // Quran.com counts words from 1 (some files from 0).
    const shift = segs[0]?.[0] === 0 ? 1 : 0;
    const first = segs.find(([p]) => p + shift === w1), last = segs.find(([p]) => p + shift === w2) ?? first;
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

  const order: [ExampleVoice, () => Promise<boolean>][] = source === "sheikh"
    ? [["sheikh", sheikh], ["wordByWord", wordByWord]]
    : [["wordByWord", wordByWord], ["sheikh", sheikh]];
  for (const [voice, play] of order) {
    if (my !== token) return voice;
    if (await play()) return voice;
  }
  // Last resort: the Sheikh's whole verse (also offline downloads).
  const url = await getAyahAudioUrl(reciterId, s, a);
  if (my !== token) return "verse";
  const el = sheikhAudio(url);
  await el.play();
  onStart?.("verse");
  await untilStopped(el, my, 120000);
  if (my !== token) el.pause();
  return "verse";
}
