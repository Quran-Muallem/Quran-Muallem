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

export type Tri = Record<"ar" | "de" | "en" | "fr" | "es" | "tr" | "ur" | "id" | "ms" | "ru" | "bn" | "sq" | "bs", string>;
export type KidsTafsirEntry = { id: string; surah: number; ayah?: number; title: Tri; say: Tri; story: Tri; deed: Tri };
export const KIDS_TAFSIR: KidsTafsirEntry[] = [...part1, ...part2, ...part3] as KidsTafsirEntry[];
/** v53: the other app languages (es, tr, ur, id, ms, ru, bn, sq, bs) — one overlay file per language. */
const KT_OVERLAYS = import.meta.glob<{ default: Record<string, { title: string; say: string; story: string; deed: string }> }>("../data/kidsTafsirI18n/*.json", { eager: true });
for (const [path, mod] of Object.entries(KT_OVERLAYS)) {
  const lang = path.slice(path.lastIndexOf("/") + 1, -5) as keyof Tri;
  for (const e of KIDS_TAFSIR) {
    const o = mod.default[e.id];
    if (o) { e.title[lang] = o.title; e.say[lang] = o.say; e.story[lang] = o.story; e.deed[lang] = o.deed; }
  }
}
export type KidsGroup = { id: "fatiha" | "kursi" | "kahf" | "tabarak" | "amma"; entries: KidsTafsirEntry[] };
export const KIDS_GROUPS: KidsGroup[] = [
  { id: "fatiha", entries: KIDS_TAFSIR.filter((e) => e.surah === 1) },
  { id: "kursi", entries: KIDS_TAFSIR.filter((e) => e.id === "kursi") },
  { id: "kahf", entries: KIDS_TAFSIR.filter((e) => e.surah === 18) },
  { id: "tabarak", entries: KIDS_TAFSIR.filter((e) => e.surah >= 67 && e.surah <= 77) },
  { id: "amma", entries: KIDS_TAFSIR.filter((e) => e.surah >= 78) },
];
export type KidsLang = "ar" | "de" | "en" | "fr" | "es" | "tr" | "ur" | "id" | "ms" | "ru" | "bn" | "sq" | "bs";
const KIDS_LANGS: string[] = ["ar", "de", "en", "fr", "es", "tr", "ur", "id", "ms", "ru", "bn", "sq", "bs"];
export const kidsLang = (lang: string): KidsLang => (KIDS_LANGS.includes(lang) ? (lang as KidsLang) : "en");

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
