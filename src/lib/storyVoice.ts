/**
 * v49 storyteller voice: picks the most natural voice the device has for the language (neural / natural /
 * premium / enhanced / network voices first, robotic defaults last), splits text into sentences and speaks
 * them with storyteller pauses (≈350–500 ms between sentences, 700 ms after a question or exclamation) and
 * a warm tuning for children (pitch 1.08, rate × 0.92). Native text-to-speech in the app, Web Speech in the
 * browser. v53: all 13 app languages (see VOICE_LOCALE).
 */
import { Capacitor } from "@capacitor/core";

export type VoiceLang = "ar" | "de" | "en" | "fr" | "es" | "tr" | "ur" | "id" | "ms" | "ru" | "bn" | "sq" | "bs";
/** v53: BCP-47 speech locale per app language — narration always follows the selected UI language. */
export const VOICE_LOCALE: Record<VoiceLang, string> = {
  ar: "ar-SA", de: "de-DE", en: "en-US", fr: "fr-FR", es: "es-ES", tr: "tr-TR", ur: "ur-PK", id: "id-ID", ms: "ms-MY", ru: "ru-RU", bn: "bn-BD", sq: "sq-AL", bs: "bs-BA",
};
/** Close relatives used when a device has no voice for the language itself (e.g. Bosnian → Croatian / Serbian). */
const VOICE_FALLBACK: Partial<Record<VoiceLang, string[]>> = { bs: ["hr", "sr"], ms: ["id"], ur: ["hi"] };
const native = () => Capacitor.isNativePlatform();
const synth = () => (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;

type V = { name: string; lang: string; localService?: boolean; voiceURI?: string; default?: boolean };

/** Higher = more natural. */
export function voiceScore(v: V, lang: VoiceLang): number {
  const l = v.lang.toLowerCase().replace("_", "-");
  if (!l.startsWith(lang)) {
    const alt = VOICE_FALLBACK[lang]?.findIndex((x) => l.startsWith(x)) ?? -1;
    if (alt < 0) return -1;
    return 0.5 - alt * 0.1; // usable, but any voice of the language itself wins
  }
  const n = `${v.name} ${v.voiceURI ?? ""}`.toLowerCase();
  let s = 1;
  if (/neural|natural|premium|enhanced|wavenet|studio|journey|polyglot/.test(n)) s += 6;
  if (/network|online/.test(n)) s += 4;              // Android: «…-network» voices are the neural ones
  if (/google/.test(n)) s += 3;
  if (/siri|samantha|daniel|anna|thomas|amelie|majed|tarik|laila|maged/.test(n)) s += 2; // good Apple voices
  if (/compact|espeak|robot|novelty|whisper|bad news|bells|zarvox|bubbles/.test(n)) s -= 6;
  // preferred regional voices for storytelling
  if (lang === "en" && /en-us|en-gb/.test(l)) s += 1;
  if (l === VOICE_LOCALE[lang].toLowerCase()) s += 1;
  if (lang === "fr" && /fr-fr/.test(l)) s += 1;
  if (lang === "de" && /de-de/.test(l)) s += 1;
  if (lang === "ar" && /ar-sa|ar-eg|ar-ae|ar-xa/.test(l)) s += 1;
  return s;
}

let nativeVoices: V[] | null = null;
async function nativeVoiceIndex(lang: VoiceLang): Promise<number | undefined> {
  try {
    if (!nativeVoices) { const { TextToSpeech } = await import("@capacitor-community/text-to-speech"); nativeVoices = (await TextToSpeech.getSupportedVoices()).voices as V[]; }
    let best = -1, bestScore = 0;
    nativeVoices.forEach((v, i) => { const sc = voiceScore(v, lang); if (sc > bestScore) { bestScore = sc; best = i; } });
    return best >= 0 ? best : undefined;
  } catch { return undefined; }
}
export function bestWebVoice(lang: VoiceLang): SpeechSynthesisVoice | undefined {
  const vs = synth()?.getVoices() ?? [];
  let best: SpeechSynthesisVoice | undefined, bestScore = 0;
  for (const v of vs) { const sc = voiceScore(v, lang); if (sc > bestScore) { bestScore = sc; best = v; } }
  return best;
}

/** Story sentences (keeps the end mark); quotes and «» stay with their sentence. */
export function storySentences(text: string): string[] {
  const out = text.replace(/\s+/g, " ").trim().match(/[^.!?؟…]+(?:[.!?؟…]+["»”']?|$)/g) ?? [text];
  return out.map((s) => s.trim()).filter(Boolean);
}
/** Pause after a sentence: longer after questions / exclamations (dramatic), ~350–500 ms otherwise. */
export function pauseAfter(sentence: string): number {
  if (/[?؟!]["»”']?$/.test(sentence)) return 700;
  return 350 + Math.min(150, Math.round(sentence.length * 1.5));
}

export type Tuning = { rate: number; pitch: number };
export const STORYTELLER: Tuning = { rate: 0.92, pitch: 1.08 };
export const PLAIN: Tuning = { rate: 1, pitch: 1 };

export async function hush() {
  if (native()) { try { const { TextToSpeech } = await import("@capacitor-community/text-to-speech"); await TextToSpeech.stop(); } catch { /* ignore */ } }
  try { synth()?.cancel(); } catch { /* ignore */ }
}

/** One sentence. Native TTS runs a little faster than the web voices at the same number. */
export async function speakSentence(text: string, lang: VoiceLang, speed: number, tuning: Tuning): Promise<void> {
  const rate = speed * tuning.rate;
  if (native()) {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    const voice = await nativeVoiceIndex(lang);
    await TextToSpeech.speak({ text, lang: VOICE_LOCALE[lang], rate: rate * 0.9, pitch: tuning.pitch, volume: 1, category: "playback", ...(voice != null ? { voice } : {}) });
    return;
  }
  const s = synth();
  if (!s) throw new Error("no speech");
  await new Promise<void>((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE_LOCALE[lang]; u.rate = rate; u.pitch = tuning.pitch;
    const v = bestWebVoice(lang);
    if (v) { u.voice = v; u.lang = v.lang; }
    u.onend = () => resolve(); u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? resolve() : reject(new Error(e.error)));
    s.speak(u);
  });
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
