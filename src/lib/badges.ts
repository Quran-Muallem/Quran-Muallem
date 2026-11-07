/**
 * Surah reward badges, stored only on this device.
 *
 * - Silver (قراءة · READING): every word of the whole surah was read aloud from the text
 *   (Reading mode, words visible), and the surah's last word was just completed.
 * - Gold (تسميع · MEMORIZATION): every word of the whole surah was recited from memory
 *   (Memorization mode, words hidden; a word revealed with the hint does not count), and the
 *   surah's last word was just completed.
 *
 * A word is "completed" when the alignment engine judged it correct or almost correct (green or
 * orange). Coverage is collected per mode and per Mushaf word over any number of pages and
 * sessions, in the Mushaf and on the Recite screen alike — long surahs can be completed over days.
 * A badge is checked ONLY at the moment the surah's last word is completed in that mode
 * (`completeSurah`); there is no timer and no accuracy shortcut.
 */
import { useEffect, useSyncExternalStore } from "react";
import { createSignal, kv } from "@/lib/storage";
import { SURAH_META } from "@/lib/quranService";

export type BadgeTier = "silver" | "gold";
/** The two recitation modes, shared by the Mushaf and the Recite screen. */
export type RecitationMode = "READING" | "MEMORIZATION";
export const tierOf = (mode: RecitationMode): BadgeTier => (mode === "MEMORIZATION" ? "gold" : "silver");

export type SurahBadgeRecord = { silverAt?: string; goldAt?: string };

/** surah → ayah → one character per Mushaf word: "1" completed, "0" not yet. */
export type Coverage = Record<string, Record<string, string>>;

export type BadgeState = {
  version: 2;
  coverage: Record<RecitationMode, Coverage>;
  /** Earned badges per surah (silver and gold are independent). */
  earned: Record<string, SurahBadgeRecord>;
};

export type BadgeEarned = { surah: number; tier: BadgeTier; at: string };

/** One Mushaf word as judged in a recitation. */
export type WordResult = { surah: number; ayah: number; /** 1-based */ word: number; /** words in the ayah */ total: number; done: boolean };

export const emptyBadges = (): BadgeState => ({ version: 2, coverage: { READING: {}, MEMORIZATION: {} }, earned: {} });

const KEY = "hifz.badges.v1";
const versesOf = (surah: number) => SURAH_META[surah - 1]?.versesCount ?? 0;

/* ------------------------------------------------------------------ */
/* Pure rules (tested)                                                 */
/* ------------------------------------------------------------------ */

const earnedTier = (state: BadgeState, surah: number, tier: BadgeTier) => !!state.earned[String(surah)]?.[tier === "gold" ? "goldAt" : "silverAt"];

/** Adds completed words (never removes any). Surahs whose badge of this mode is earned are skipped. */
export function addWords(state: BadgeState, mode: RecitationMode, words: readonly WordResult[]): BadgeState {
  let next: BadgeState | null = null;
  for (const w of words) {
    if (!w.done || w.word < 1 || w.word > w.total || w.ayah < 1 || w.ayah > versesOf(w.surah)) continue;
    if (earnedTier(state, w.surah, tierOf(mode))) continue;
    const cur = (next ?? state).coverage[mode][String(w.surah)]?.[String(w.ayah)];
    let bits = cur && cur.length === w.total ? cur : "0".repeat(w.total); // a different word count → start the ayah again
    if (bits[w.word - 1] === "1" && bits === cur) continue;
    bits = bits.slice(0, w.word - 1) + "1" + bits.slice(w.word);
    next ??= { ...state, coverage: { ...state.coverage, [mode]: { ...state.coverage[mode] } } };
    const surahCov = { ...(next.coverage[mode][String(w.surah)] ?? {}) };
    surahCov[String(w.ayah)] = bits;
    next.coverage[mode][String(w.surah)] = surahCov;
  }
  return next ?? state;
}

/** Ayahs of a surah with every word completed in this mode. */
export function coveredAyahs(state: BadgeState, mode: RecitationMode, surah: number): number {
  const cov = state.coverage[mode][String(surah)] ?? {};
  let n = 0;
  for (let a = 1; a <= versesOf(surah); a++) { const b = cov[String(a)]; if (b && !b.includes("0")) n++; }
  return n;
}

/** Every word of the whole surah completed in this mode. */
export const surahComplete = (state: BadgeState, mode: RecitationMode, surah: number) => versesOf(surah) > 0 && coveredAyahs(state, mode, surah) === versesOf(surah);

/**
 * The surah's last word was just completed in `mode`: adds `words` (the recitation that reached it)
 * and awards the mode's badge if now every word of the surah is completed.
 */
export function completeSurahRule(state: BadgeState, mode: RecitationMode, surah: number, words: readonly WordResult[], now = new Date()): { state: BadgeState; earned: BadgeEarned | null } {
  let next = addWords(state, mode, words);
  const tier = tierOf(mode);
  const last = words.find((w) => w.surah === surah && w.ayah === versesOf(surah) && w.word === w.total);
  if (!last?.done || earnedTier(next, surah, tier) || !surahComplete(next, mode, surah)) return { state: next, earned: null };
  const at = now.toISOString();
  const rec = next.earned[String(surah)] ?? {};
  const coverage = { ...next.coverage, [mode]: { ...next.coverage[mode] } };
  delete coverage[mode][String(surah)];
  next = { ...next, coverage, earned: { ...next.earned, [String(surah)]: { ...rec, [tier === "gold" ? "goldAt" : "silverAt"]: at } } };
  return { state: next, earned: { surah, tier, at } };
}

/** How far a surah is towards each badge (ayahs fully completed per mode). */
export function surahBadgeProgress(state: BadgeState, surah: number) {
  const total = versesOf(surah);
  const earned = state.earned[String(surah)] ?? {};
  const read = earned.silverAt ? total : coveredAyahs(state, "READING", surah);
  const recited = earned.goldAt ? total : coveredAyahs(state, "MEMORIZATION", surah);
  return { total, read, recited, tier: (earned.goldAt ? "gold" : earned.silverAt ? "silver" : null) as BadgeTier | null };
}

export function badgeCounts(state: BadgeState) {
  let gold = 0, silver = 0;
  for (const r of Object.values(state.earned)) { if (r.goldAt) gold++; else if (r.silverAt) silver++; }
  return { gold, silver, total: gold + silver };
}

/** Most recently earned badges first. */
export function recentBadges(state: BadgeState, limit = 5): BadgeEarned[] {
  return Object.entries(state.earned)
    .map(([s, r]): BadgeEarned => ({ surah: Number(s), tier: r.goldAt ? "gold" : "silver", at: r.goldAt ?? r.silverAt ?? "" }))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit);
}

function sanitize(raw: unknown): BadgeState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as { version?: number; coverage?: Partial<Record<RecitationMode, unknown>>; earned?: Record<string, unknown> };
  if (s.version !== 1 && s.version !== 2) return null;
  const earned: Record<string, SurahBadgeRecord> = {};
  for (const [k, v] of Object.entries(s.earned ?? {})) {
    if (!/^\d{1,3}$/.test(k) || !v || typeof v !== "object") continue;
    const r: SurahBadgeRecord = {};
    const o = v as SurahBadgeRecord;
    if (typeof o.silverAt === "string") r.silverAt = o.silverAt;
    if (typeof o.goldAt === "string") r.goldAt = o.goldAt;
    earned[k] = r;
  }
  const coverage = { READING: {}, MEMORIZATION: {} } as Record<RecitationMode, Coverage>;
  // Version 1 had timer-based "read" pages: those never count (earned badges are kept).
  if (s.version === 2) for (const mode of ["READING", "MEMORIZATION"] as const) {
    for (const [surah, ayahs] of Object.entries((s.coverage?.[mode] ?? {}) as Record<string, unknown>)) {
      if (!/^\d{1,3}$/.test(surah) || !ayahs || typeof ayahs !== "object") continue;
      const out: Record<string, string> = {};
      for (const [a, bits] of Object.entries(ayahs as Record<string, unknown>)) if (/^\d{1,3}$/.test(a) && typeof bits === "string" && /^[01]{1,200}$/.test(bits)) out[a] = bits;
      coverage[mode][surah] = out;
    }
  }
  return { version: 2, coverage, earned };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const signal = createSignal<BadgeState>(emptyBadges());
const earnedListeners = new Set<(e: BadgeEarned[]) => void>();
let loaded: Promise<BadgeState> | null = null;
let writeChain: Promise<void> = Promise.resolve();
/** Only for tests: forget the loaded state. */
export function resetBadgesForTests() { loaded = null; signal.set(emptyBadges()); }

function save(next: BadgeState) {
  signal.set(next);
  writeChain = writeChain.then(() => kv.setJson(KEY, next)).catch(() => {});
}

/** Loads the badges (call once on app start). */
export function initBadges(): Promise<BadgeState> {
  loaded ??= kv.getJson<unknown>(KEY, null).then((raw) => {
    const st = sanitize(raw) ?? emptyBadges();
    signal.set(st);
    if ((raw as { version?: number } | null)?.version === 1) save(st);
    return st;
  });
  return loaded;
}

export const getBadges = () => signal.get();

/** Remembers the words completed in a recitation (end of a session or a page). */
export async function recordWords(mode: RecitationMode, words: readonly WordResult[]): Promise<void> {
  await initBadges();
  const next = addWords(signal.get(), mode, words);
  if (next !== signal.get()) save(next);
  await writeChain;
}

/**
 * The last word of `surah` was completed in `mode` (the only trigger for a badge). Returns the badge
 * just earned, if any, and announces it.
 */
export async function completeSurah(mode: RecitationMode, surah: number, words: readonly WordResult[]): Promise<BadgeEarned | null> {
  await initBadges();
  const { state, earned } = completeSurahRule(signal.get(), mode, surah, words);
  if (state !== signal.get()) save(state);
  if (earned) earnedListeners.forEach((l) => l([earned]));
  await writeChain;
  return earned;
}

/** Called with the badges just earned (not for quietly awarded ones). */
export function onBadgeEarned(listener: (earned: BadgeEarned[]) => void): () => void {
  earnedListeners.add(listener);
  return () => { earnedListeners.delete(listener); };
}

const EMPTY = emptyBadges();
export function useBadges(): BadgeState {
  const value = useSyncExternalStore(signal.subscribe, signal.get, () => EMPTY);
  useEffect(() => { void initBadges(); }, []);
  return value;
}
