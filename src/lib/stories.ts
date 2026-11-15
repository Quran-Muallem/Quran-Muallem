/**
 * v48 «قصص القرآن وقصص الأنبياء»: the Prophets' journey (Adam → Muhammad ﷺ, chronological) and stories from
 * the Quran, each in Arabic / German / English with chapters, linked verses and a lesson. Progress (which
 * stations are completed, where the reader left off) is kept on this device.
 */
import part1 from "@/data/stories1.json";
import part2 from "@/data/stories2.json";
import part3 from "@/data/stories3.json";
import { useSyncExternalStore } from "react";

export type StoryLang = "ar" | "de" | "en" | "fr" | "es" | "tr" | "ur" | "id" | "ms" | "ru" | "bn" | "sq" | "bs";
export const STORY_LANGS: StoryLang[] = ["ar", "de", "en", "fr", "es", "tr", "ur", "id", "ms", "ru", "bn", "sq", "bs"];
export type Tri = Record<StoryLang, string>;
export type Story = {
  id: string; kind: "prophet" | "quran"; emoji: string; final?: boolean;
  name: Tri; era: Tri; ayat: [number, number, number][];
  chapters: { title: Tri; text: Tri }[]; lesson: Tri;
  /** v53 adult depth: historical context and deeper reflections (kids keep chapters + lesson). */
  context?: Tri; reflections?: Tri[];
};

type Overlay = { name?: string; era?: string; chapters?: { title: string; text: string }[]; lesson?: string; context?: string; reflections?: string[] };
/** v53: per-language texts (es, tr, ur, id, ms, ru, bn, sq, bs — and the adult context / reflections for every language). */
const OVERLAYS = import.meta.glob<{ default: Record<string, Overlay> }>("../data/storiesI18n/*.json", { eager: true });
const ALL = [...part1, ...part2, ...part3] as Story[];
for (const [path, mod] of Object.entries(OVERLAYS)) {
  const lang = path.slice(path.lastIndexOf("/") + 1, -5) as StoryLang;
  for (const s of ALL) {
    const o = mod.default[s.id];
    if (!o) continue;
    if (o.name) s.name[lang] = o.name;
    if (o.era) s.era[lang] = o.era;
    if (o.lesson) s.lesson[lang] = o.lesson;
    o.chapters?.forEach((c, i) => { const ch = s.chapters[i]; if (ch) { ch.title[lang] = c.title; ch.text[lang] = c.text; } });
    if (o.context) { s.context ??= {} as Tri; s.context[lang] = o.context; }
    o.reflections?.forEach((r, i) => { s.reflections ??= []; s.reflections[i] ??= {} as Tri; s.reflections[i]![lang] = r; });
  }
}
export const PROPHETS: Story[] = ALL.filter((s) => s.kind === "prophet");
export const QURAN_STORIES: Story[] = ALL.filter((s) => s.kind === "quran");
export const storyById = (id: string) => ALL.find((s) => s.id === id) ?? null;
/** UI language → narration/text language: v53 every app language has its own text (English only as last resort). */
export const storyLang = (language: string): StoryLang => ((STORY_LANGS as string[]).includes(language) ? (language as StoryLang) : "en");

/** The next station on the journey (prophets) or the next Quran story; null at the end. */
export function nextStory(id: string): Story | null {
  const list = storyById(id)?.kind === "quran" ? QURAN_STORIES : PROPHETS;
  const i = list.findIndex((s) => s.id === id);
  return i >= 0 && i < list.length - 1 ? list[i + 1]! : null;
}

/* ───────── progress ───────── */
type Progress = { done: Record<string, number>; last: string | null };
const KEY = "qm.stories.v1";
let cache: Progress | null = null;
const listeners = new Set<() => void>();
function read(): Progress {
  if (cache) return cache;
  try { const p = JSON.parse(localStorage.getItem(KEY) ?? "null") as Progress | null; cache = p && typeof p === "object" ? { done: p.done ?? {}, last: p.last ?? null } : { done: {}, last: null }; }
  catch { cache = { done: {}, last: null }; }
  return cache;
}
function write(p: Progress) {
  cache = p;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
export function markStoryOpened(id: string) { const p = read(); if (p.last !== id) write({ ...p, last: id }); }
export function markStoryDone(id: string) { const p = read(); if (!p.done[id]) write({ ...p, done: { ...p.done, [id]: Date.now() }, last: id }); }
export function useStoryProgress(): Progress {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, read, read);
}
/** Where the journey continues: the first station not completed (after the last one read). */
export function continueStation(p: Progress, list: Story[] = PROPHETS): string {
  const lastIdx = p.last ? list.findIndex((s) => s.id === p.last) : -1;
  const after = list.slice(Math.max(0, lastIdx)).find((s) => !p.done[s.id]);
  return (after ?? list.find((s) => !p.done[s.id]) ?? list[list.length - 1]!).id;
}
