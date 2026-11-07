import { useSyncExternalStore } from "react";
import { createSignal, idb } from "./storage";
import { normalizeArabic, setMatcherAdaptation } from "./quranMatcher";

/**
 * Stage 4 — "My voice profile": local adaptation of the recognizer to the user's voice. Nothing leaves
 * the device; everything lives in IndexedDB under `quran_user_voice_profile`.
 *
 * What it adapts (an honest lexicon/threshold approach, no acoustic model training on the phone):
 *  1. Learned variants: the user taps a word that was marked wrong although they said it correctly and
 *     adds it. From then on, when Whisper hears that same word that way, it counts as correct.
 *  2. Accent: letters the user's variants keep swapping (e.g. ق heard as ك, ث as س) are learned once seen
 *     twice, so other words with the same swap are accepted too.
 *  3. Strictness: how far a word may differ and still count as "almost right".
 *  4. Speaking speed: the measured words per second loosen the limits that protect against Whisper
 *     inventing words, so a fast reciter never loses real words.
 *  5. Accuracy history per surah, to see progress over time.
 */

export const VOICE_PROFILE_KEY = "quran_user_voice_profile";

export type Strictness = "strict" | "normal" | "lenient";
export const STRICTNESS_FACTOR: Record<Strictness, number> = { strict: 0.6, normal: 1, lenient: 1.5 };

export type VoiceVariant = {
  /** Normalized target word (no harakat) — or, for the phoneme engine, the word's canonical phonemes. */
  expected: string;
  /** Normalized word as Whisper heard it. */
  heard: string;
  /** The Mushaf word and the raw heard word, for display. */
  word: string;
  heardRaw: string;
  surah?: number | undefined;
  ayah?: number | undefined;
  added: string;
};

export type AccuracyPoint = { at: string; accuracy: number; verses: number; hifz: boolean };

export type VoiceProfile = {
  version: 1;
  variants: VoiceVariant[];
  strictness: Strictness;
  /** Learned speaking speed (words per voiced second), null until measured. */
  wordsPerSecond: number | null;
  speedSamples: number;
  /** surah → last attempts (oldest first). */
  accuracy: Record<string, AccuracyPoint[]>;
};

export const MAX_VARIANTS = 500;
export const MAX_POINTS_PER_SURAH = 60;
/** Typical murattal pace the default limits were tuned for. */
const BASE_WPS = 2;

export const emptyProfile = (): VoiceProfile => ({ version: 1, variants: [], strictness: "normal", wordsPerSecond: null, speedSamples: 0, accuracy: {} });

const signal = createSignal<VoiceProfile>(emptyProfile());
let loaded: Promise<void> | null = null;

function sanitize(raw: unknown): VoiceProfile {
  const p = emptyProfile();
  if (!raw || typeof raw !== "object") return p;
  const r = raw as Partial<VoiceProfile>;
  if (Array.isArray(r.variants)) p.variants = r.variants.filter((v) => v && typeof v.expected === "string" && typeof v.heard === "string" && v.expected && v.heard).slice(-MAX_VARIANTS);
  if (r.strictness === "strict" || r.strictness === "lenient") p.strictness = r.strictness;
  if (typeof r.wordsPerSecond === "number" && r.wordsPerSecond > 0 && r.wordsPerSecond < 10) p.wordsPerSecond = r.wordsPerSecond;
  if (typeof r.speedSamples === "number") p.speedSamples = r.speedSamples;
  if (r.accuracy && typeof r.accuracy === "object") {
    for (const [k, list] of Object.entries(r.accuracy)) if (Array.isArray(list)) p.accuracy[k] = list.filter((x) => x && typeof x.accuracy === "number").slice(-MAX_POINTS_PER_SURAH);
  }
  return p;
}

/* ───────────── accent: letter swaps learned from the variants ───────────── */

/** Single-letter substitutions between two words of equal length ("قال"/"كال" → ["ق>ك"]). */
export function letterSwaps(expected: string, heard: string): string[] {
  const a = [...expected], b = [...heard];
  if (a.length !== b.length) return [];
  const swaps: string[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) swaps.push(`${a[i]}>${b[i]}`);
  return swaps.length <= 2 ? swaps : [];
}

/** Swaps seen in at least two different variants. */
export function learnedSwaps(variants: readonly VoiceVariant[]): Map<string, string[]> {
  const count = new Map<string, number>();
  for (const v of variants) for (const sw of new Set(letterSwaps(v.expected, v.heard))) count.set(sw, (count.get(sw) ?? 0) + 1);
  const out = new Map<string, string[]>();
  for (const [sw, n] of count) {
    if (n < 2) continue;
    const [from, to] = sw.split(">") as [string, string];
    out.set(from, [...(out.get(from) ?? []), to]);
  }
  return out;
}

/** Builds the matcher hook for a profile (exported for tests). */
export function adaptationFor(profile: VoiceProfile) {
  const exact = new Set(profile.variants.map((v) => `${v.expected}|${v.heard}`));
  const swaps = learnedSwaps(profile.variants);
  const accepts = (target: string, spoken: string) => {
    if (exact.has(`${target}|${spoken}`)) return true;
    if (!swaps.size || target.length !== spoken.length) return false;
    const a = [...target], b = [...spoken];
    let changed = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === b[i]) continue;
      if (!swaps.get(a[i]!)?.includes(b[i]!)) return false;
      changed++;
    }
    return changed > 0 && changed <= 2;
  };
  return { accepts, tolerance: STRICTNESS_FACTOR[profile.strictness] };
}

function apply(next: VoiceProfile) {
  signal.set(next);
  setMatcherAdaptation(adaptationFor(next));
}

async function save(next: VoiceProfile) {
  apply(next);
  try { await idb.set(VOICE_PROFILE_KEY, next); } catch { /* memory copy stays */ }
}

export function loadVoiceProfile(): Promise<void> {
  loaded ??= idb.get<unknown>(VOICE_PROFILE_KEY).then((raw) => apply(sanitize(raw))).catch(() => {});
  return loaded;
}

const update = async (change: (p: VoiceProfile) => VoiceProfile) => { await loadVoiceProfile(); await save(change(structuredCloneSafe(signal.get()))); };
const structuredCloneSafe = (p: VoiceProfile): VoiceProfile => JSON.parse(JSON.stringify(p)) as VoiceProfile;

/* ───────────── public API ───────────── */

export const getVoiceProfile = () => signal.get();

export function useVoiceProfile(): VoiceProfile {
  return useSyncExternalStore(signal.subscribe, signal.get, signal.get);
}

/** Teach the app: "when I say `word` (Mushaf), Whisper hears `heardRaw` — that is correct". */
export function addVariant(input: { word: string; heard: string; surah?: number | undefined; ayah?: number | undefined;
  /** Phoneme engine: `expected` are the word's canonical phonemes, `heard` the recognized phonemes (kept as they are). */
  phonemes?: string | undefined }): Promise<boolean> {
  const expected = input.phonemes ?? normalizeArabic(input.word), heard = input.phonemes ? input.heard : normalizeArabic(input.heard);
  if (!expected || !heard || expected === heard) return Promise.resolve(false);
  return update((p) => {
    p.variants = p.variants.filter((v) => !(v.expected === expected && v.heard === heard));
    p.variants.push({ expected, heard, word: input.word, heardRaw: input.heard, surah: input.surah, ayah: input.ayah, added: new Date().toISOString() });
    p.variants = p.variants.slice(-MAX_VARIANTS);
    return p;
  }).then(() => true);
}

export const hasVariant = (word: string, heard: string) =>
  signal.get().variants.some((v) => v.expected === normalizeArabic(word) && v.heard === normalizeArabic(heard));

export const removeVariant = (expected: string, heard: string) =>
  update((p) => ({ ...p, variants: p.variants.filter((v) => !(v.expected === expected && v.heard === heard)) }));

export const setStrictness = (strictness: Strictness) => update((p) => ({ ...p, strictness }));

/** Speaking speed after a recitation (exponential average, ignores very short recordings). */
export function noteSpeakingRate(words: number, voicedSeconds: number): Promise<void> {
  if (voicedSeconds < 3 || words < 3) return Promise.resolve();
  const wps = Math.min(6, words / voicedSeconds);
  return update((p) => {
    p.wordsPerSecond = p.wordsPerSecond == null ? wps : p.wordsPerSecond * 0.7 + wps * 0.3;
    p.speedSamples += 1;
    return p;
  });
}

/**
 * Factor for the "no more words than could have been said" limits. Only ever loosens them (≥ 1): a fast
 * reciter gets room for more words per second, a slow one keeps the default protection.
 */
export function speedFactor(profile: VoiceProfile = signal.get()): number {
  if (profile.wordsPerSecond == null || profile.speedSamples < 2) return 1;
  return Math.min(1.8, Math.max(1, (profile.wordsPerSecond * 1.15) / BASE_WPS));
}

/** Accuracy of one recitation of a surah (called after every saved attempt). */
export function recordSurahAccuracy(surah: number, accuracy: number, verses: number, hifz: boolean, now = new Date()): Promise<void> {
  if (!Number.isFinite(accuracy) || verses <= 0) return Promise.resolve();
  return update((p) => {
    const list = p.accuracy[String(surah)] ?? [];
    list.push({ at: now.toISOString(), accuracy: Math.round(Math.max(0, Math.min(100, accuracy))), verses, hifz });
    p.accuracy[String(surah)] = list.slice(-MAX_POINTS_PER_SURAH);
    return p;
  });
}

/** Summary per surah: last, best, average of the last five, trend (last − first of the last five). */
export function surahAccuracySummary(profile: VoiceProfile) {
  return Object.entries(profile.accuracy)
    .filter(([, list]) => list.length)
    .map(([surah, list]) => {
      const recent = list.slice(-5);
      const avg = Math.round(recent.reduce((n, x) => n + x.accuracy, 0) / recent.length);
      return {
        surah: Number(surah),
        attempts: list.length,
        last: list[list.length - 1]!.accuracy,
        best: Math.max(...list.map((x) => x.accuracy)),
        average: avg,
        trend: recent.length > 1 ? recent[recent.length - 1]!.accuracy - recent[0]!.accuracy : 0,
        history: list.map((x) => x.accuracy),
      };
    })
    .sort((a, b) => a.surah - b.surah);
}

export const resetVoiceProfile = () => save(emptyProfile());

// Load once at start-up (memory fallback where IndexedDB is unavailable).
if (typeof window !== "undefined") void loadVoiceProfile();
