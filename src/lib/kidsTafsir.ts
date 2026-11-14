/**
 * v45 «تفسير مبسط للأطفال»: simplified, age-appropriate tafsir for children (al-Fātiḥah, Āyat al-Kursī, the
 * four stories of al-Kahf, Juz Tabārak and Juz ʿAmma) in Arabic, German and English — every entry in three
 * cards: what the verses say · an example / story · my good deed today. Bundled (offline). Other app
 * languages show the English text. Written for children in simple words; not a scholarly tafsir.
 * Read aloud: native text-to-speech in the app (@capacitor-community/text-to-speech), speechSynthesis on the web.
 */
import { pauseAfter, speakSentence, storySentences, wait, STORYTELLER } from "@/lib/storyVoice";
import part1 from "@/data/kidsTafsir1.json";
import part2 from "@/data/kidsTafsir2.json";
import part3 from "@/data/kidsTafsir3.json";
import { isNativePlatform } from "@/lib/storage";

export type Tri = { ar: string; de: string; en: string; fr: string };
export type KidsTafsirEntry = { id: string; surah: number; ayah?: number; title: Tri; say: Tri; story: Tri; deed: Tri };
export const KIDS_TAFSIR: KidsTafsirEntry[] = [...part1, ...part2, ...part3] as KidsTafsirEntry[];
export type KidsGroup = { id: "fatiha" | "kursi" | "kahf" | "tabarak" | "amma"; entries: KidsTafsirEntry[] };
export const KIDS_GROUPS: KidsGroup[] = [
  { id: "fatiha", entries: KIDS_TAFSIR.filter((e) => e.surah === 1) },
  { id: "kursi", entries: KIDS_TAFSIR.filter((e) => e.id === "kursi") },
  { id: "kahf", entries: KIDS_TAFSIR.filter((e) => e.surah === 18) },
  { id: "tabarak", entries: KIDS_TAFSIR.filter((e) => e.surah >= 67 && e.surah <= 77) },
  { id: "amma", entries: KIDS_TAFSIR.filter((e) => e.surah >= 78) },
];
export type KidsLang = "ar" | "de" | "en" | "fr";
export const kidsLang = (lang: string): KidsLang => (lang === "ar" || lang === "de" || lang === "fr" ? lang : "en");

/**
 * Reads `text` aloud (stops what was being read). Resolves when finished.
 * v49: the warm storyteller voice — the most natural voice on the device, sentence pauses, pitch 1.08 / rate 0.92.
 */
let speakRun = 0;
export async function speak(text: string, lang: KidsLang): Promise<void> {
  await stopSpeaking();
  const id = ++speakRun;
  const ss = storySentences(text);
  for (const s of ss) {
    if (id !== speakRun) return;
    await speakSentence(s, lang, 1, STORYTELLER);
    if (id !== speakRun) return;
    await wait(pauseAfter(s));
  }
}
export async function stopSpeaking(): Promise<void> {
  speakRun++;
  if (isNativePlatform()) { try { const { TextToSpeech } = await import("@capacitor-community/text-to-speech"); await TextToSpeech.stop(); } catch { /* ignore */ } }
  try { (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis?.cancel(); } catch { /* ignore */ }
}

/** Verses each story-entry covers (entries without an `ayah` cover the whole surah). */
const RANGES: Record<string, [number, number]> = { kursi: [255, 255] };
const STORY_END: Record<number, number> = { 9: 26, 32: 44, 60: 82, 83: 98 }; // al-Kahf stories

/** v46: the kids tafsir entry for a tapped verse, if there is one. */
export function kidsTafsirFor(surah: number, ayah: number): KidsTafsirEntry | null {
  const list = KIDS_TAFSIR.filter((e) => e.surah === surah);
  for (const e of list) {
    if (e.ayah == null) continue;
    const [a, b] = RANGES[e.id] ?? [e.ayah, surah === 18 ? STORY_END[e.ayah] ?? e.ayah : e.ayah];
    if (ayah >= a && ayah <= b) return e;
  }
  return list.find((e) => e.ayah == null) ?? null;
}
