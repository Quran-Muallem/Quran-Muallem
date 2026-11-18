/**
 * v57 personal Home screen: which shortcut tiles the Home shows, in which order. The user reorders them
 * in the Home's edit mode and pins more from the burger menu (📌). Stored on the device only
 * (localStorage `qm_custom_home_tiles`; «Delete all my data» clears it with the other `qm_` keys).
 *
 * The catalog is the single list of destinations a tile can open — the burger menu rows and the Home
 * tiles both point at these ids, so a pinned row and its tile always do the same thing.
 */
import { useSyncExternalStore } from "react";
import { updateSettings } from "@/lib/settings";
import type { CopyKey } from "@/lib/i18n";

export const HOME_TILES_KEY = "qm_custom_home_tiles";

export type HomeTileId =
  | "read" | "recite" | "companion" | "tajweed" | "stories"
  | "prophets" | "khatma" | "prayer" | "qibla" | "adhkar" | "hadith" | "reciters" | "recordings"
  | "search" | "adhan" | "reminders" | "kids";

const emit = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));
const STORIES_TAB_KEY = "qm.stories.tab";
const storiesAt = (tab: "prophets" | "quran" | null) => () => {
  if (tab) { try { localStorage.setItem(STORIES_TAB_KEY, tab); } catch { /* ignore */ } }
  emit("qm:open-hub", "stories");
};

export type HomeTileDef = { id: HomeTileId; title: CopyKey; sub: CopyKey; open: () => void };

/** Every destination, in the order the «+ Add» picker lists them. */
export const HOME_TILE_CATALOG: readonly HomeTileDef[] = [
  { id: "read", title: "homeReadTitle", sub: "homeReadSub", open: () => emit("qm:open-mushaf") },
  { id: "recite", title: "homeReciteTitle", sub: "homeReciteSub", open: () => emit("qm:go", "practice") },
  { id: "companion", title: "homeCompanionTitle", sub: "homeCompanionSub", open: () => emit("qm:open-companion") },
  { id: "tajweed", title: "homeTajweedTitle", sub: "homeTajweedSub", open: () => emit("qm:open-hub", "tajweed") },
  { id: "stories", title: "homeStoriesTitle", sub: "homeStoriesSub", open: storiesAt(null) },
  { id: "prophets", title: "storiesJourneyTab", sub: "tileProphetsSub", open: storiesAt("prophets") },
  { id: "khatma", title: "navKhatma", sub: "menuKhatmaSub", open: () => emit("qm:go", "khatma") },
  { id: "prayer", title: "hubPrayer", sub: "hubPrayerSub", open: () => emit("qm:open-hub", "prayer") },
  { id: "adhan", title: "menuAdhanTitle", sub: "menuAdhanSub", open: () => emit("qm:open-hub", "prayer") },
  { id: "qibla", title: "navQibla", sub: "hubQiblaSub", open: () => emit("qm:open-hub", "qibla") },
  { id: "adhkar", title: "hubAdhkar", sub: "hubAdhkarSub", open: () => emit("qm:open-hub", "adhkar") },
  { id: "hadith", title: "hubHadith", sub: "hubHadithSub", open: () => emit("qm:open-hub", "hadith") },
  { id: "reciters", title: "hubReciters", sub: "hubRecitersSub", open: () => emit("qm:open-hub", "reciters") },
  { id: "recordings", title: "hubRecordings", sub: "hubRecordingsSub", open: () => emit("qm:open-hub", "recordings") },
  { id: "search", title: "searchTitle", sub: "menuSearchSub", open: () => emit("qm:open-search") },
  { id: "reminders", title: "tileRemindersTitle", sub: "tileRemindersSub", open: () => emit("qm:open-settings", "reminders") },
  { id: "kids", title: "kidsSwitchTitle", sub: "kidsSwitchSub", open: () => void updateSettings({ kidsMode: true }) },
];
const IDS = new Set<string>(HOME_TILE_CATALOG.map((t) => t.id));
export const homeTileDef = (id: HomeTileId) => HOME_TILE_CATALOG.find((t) => t.id === id)!;

/** The v52 Home: the five destinations of the bento grid. */
export const DEFAULT_HOME_TILES: readonly HomeTileId[] = ["read", "recite", "companion", "tajweed", "stories"];

function read(): HomeTileId[] {
  try {
    const raw = localStorage.getItem(HOME_TILES_KEY);
    if (!raw) return [...DEFAULT_HOME_TILES];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [...DEFAULT_HOME_TILES];
    // unknown ids (an older / newer app version) are dropped, duplicates removed
    return [...new Set(list.filter((x): x is HomeTileId => typeof x === "string" && IDS.has(x)))];
  } catch { return [...DEFAULT_HOME_TILES]; }
}

let current: HomeTileId[] | null = null;
const listeners = new Set<() => void>();
const snapshot = () => (current ??= read());

function write(next: HomeTileId[]) {
  current = next;
  try { localStorage.setItem(HOME_TILES_KEY, JSON.stringify(next)); } catch { /* storage full / blocked: still in memory */ }
  listeners.forEach((l) => l());
}

export const getHomeTiles = (): readonly HomeTileId[] => snapshot();
export const isPinned = (id: HomeTileId) => snapshot().includes(id);
export const setHomeTiles = (ids: readonly HomeTileId[]) => write([...new Set(ids.filter((x) => IDS.has(x)))]);
/** Adds a tile at the end (no-op when it is already there). Returns true when it was added. */
export function pinTile(id: HomeTileId): boolean {
  if (isPinned(id)) return false;
  write([...snapshot(), id]);
  return true;
}
export const unpinTile = (id: HomeTileId) => write(snapshot().filter((x) => x !== id));
/** Pins or unpins; returns the new state. */
export function togglePin(id: HomeTileId): boolean {
  if (isPinned(id)) { unpinTile(id); return false; }
  pinTile(id);
  return true;
}
/** Moves a tile one place earlier (-1) or later (+1). */
export function moveTile(id: HomeTileId, dir: -1 | 1) {
  const list = [...snapshot()];
  const i = list.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j]!, list[i]!];
  write(list);
}
/** Puts a tile at `index` (drag and drop). */
export function placeTile(id: HomeTileId, index: number) {
  const list = snapshot().filter((x) => x !== id);
  list.splice(Math.max(0, Math.min(index, list.length)), 0, id);
  write(list);
}
export const resetHomeTiles = () => write([...DEFAULT_HOME_TILES]);
/** Re-reads storage (after «Delete all my data», or in tests). */
export function reloadHomeTiles() { current = null; listeners.forEach((l) => l()); }

const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === HOME_TILES_KEY) reloadHomeTiles(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
};
export const useHomeTiles = (): readonly HomeTileId[] => useSyncExternalStore(subscribe, snapshot, snapshot);
export const usePinned = (id: HomeTileId) => useHomeTiles().includes(id);
