import { describe, expect, it, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  DEFAULT_HOME_TILES, HOME_TILES_KEY, getHomeTiles, isPinned, moveTile, pinTile, placeTile, reloadHomeTiles,
  resetHomeTiles, togglePin, unpinTile,
} from "@/lib/homeLayoutStore";
import { EXIT_WINDOW_MS, nativeBack, useNavigationHistory, useReaderState } from "@/lib/useNavigationHistory";
import { backStackDepth, useBackLayer } from "@/lib/backStack";
import { TOAST_EVENT } from "@/lib/appToast";
import { readFileSync } from "node:fs";

const back = () => act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 5)); });

describe("v57 personal Home layout (qm_custom_home_tiles)", () => {
  beforeEach(() => { localStorage.clear(); reloadHomeTiles(); });

  it("starts with the five v52 destinations", () => {
    expect(getHomeTiles()).toEqual(DEFAULT_HOME_TILES);
  });

  it("pins a menu item at the end, once, and persists it", () => {
    expect(pinTile("hadith")).toBe(true);
    expect(pinTile("hadith")).toBe(false);
    expect(getHomeTiles().at(-1)).toBe("hadith");
    expect(JSON.parse(localStorage.getItem(HOME_TILES_KEY)!)).toContain("hadith");
    reloadHomeTiles();
    expect(isPinned("hadith")).toBe(true);
  });

  it("toggles, moves (↑ / ↓), places (drag) and resets", () => {
    expect(togglePin("qibla")).toBe(true);
    expect(togglePin("qibla")).toBe(false);
    moveTile("recite", -1);
    expect(getHomeTiles().slice(0, 2)).toEqual(["recite", "read"]);
    moveTile("recite", -1); // already first: no-op
    expect(getHomeTiles()[0]).toBe("recite");
    placeTile("stories", 0);
    expect(getHomeTiles()[0]).toBe("stories");
    unpinTile("read");
    expect(isPinned("read")).toBe(false);
    resetHomeTiles();
    expect(getHomeTiles()).toEqual(DEFAULT_HOME_TILES);
  });

  it("ignores unknown ids and duplicates from storage", () => {
    localStorage.setItem(HOME_TILES_KEY, JSON.stringify(["kids", "nope", "kids", "search"]));
    reloadHomeTiles();
    expect(getHomeTiles()).toEqual(["kids", "search"]);
    localStorage.setItem(HOME_TILES_KEY, "{broken");
    reloadHomeTiles();
    expect(getHomeTiles()).toEqual(DEFAULT_HOME_TILES);
  });

  it("«Delete all my data» covers the key (qm_ prefix)", () => {
    expect(readFileSync("src/lib/dataReset.ts", "utf8")).toMatch(/"qm_"/);
    expect(HOME_TILES_KEY.startsWith("qm_")).toBe(true);
  });
});

describe("v57 screen history (Android / browser back)", () => {
  it("steps back through the tabs visited, then releases at Home", async () => {
    const { result } = renderHook(() => {
      const [tab, setTab] = useState("home");
      useNavigationHistory({ current: tab, keyOf: (s) => s, restore: setTab, root: "home" });
      return { tab, setTab };
    });
    act(() => result.current.setTab("mushaf"));
    await tick();
    act(() => result.current.setTab("practice"));
    await tick();
    act(() => result.current.setTab("hub:prayer"));
    await tick();
    expect(backStackDepth()).toBe(1);
    back();
    expect(result.current.tab).toBe("practice");
    await tick();
    back();
    expect(result.current.tab).toBe("mushaf");
    await tick();
    back();
    expect(result.current.tab).toBe("home");
    await tick();
    expect(backStackDepth()).toBe(0); // at the root: the native exit hint takes over
  });

  it("a tab visited again moves to the top instead of looping", async () => {
    const { result } = renderHook(() => {
      const [tab, setTab] = useState("home");
      useNavigationHistory({ current: tab, keyOf: (s) => s, restore: setTab, root: "home" });
      return { tab, setTab };
    });
    for (const t of ["mushaf", "practice", "mushaf"]) { act(() => result.current.setTab(t)); await tick(); }
    back();
    expect(result.current.tab).toBe("practice");
    await tick();
    back();
    expect(result.current.tab).toBe("home");
    await tick();
  });

  it("an open sheet closes before the screen steps back", async () => {
    const calls: string[] = [];
    const { result } = renderHook(() => {
      const [tab, setTab] = useState("home");
      const [sheet, setSheet] = useState(false);
      useNavigationHistory({ current: tab, keyOf: (s) => s, restore: (s) => { calls.push(`screen:${s}`); setTab(s); }, root: "home" });
      useBackLayer(sheet, () => { calls.push("sheet"); setSheet(false); });
      return { setTab, setSheet };
    });
    act(() => result.current.setTab("khatma"));
    await tick();
    act(() => result.current.setSheet(true));
    await tick();
    back();
    await tick();
    back();
    await tick();
    expect(calls).toEqual(["sheet", "screen:home"]);
  });
});

describe("v57 readers return to the list at the same place", () => {
  it("remembers the list scroll position and restores it on back", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(window, "scrollY", { value: 640, configurable: true });
    const { result } = renderHook(() => useReaderState<string>());
    act(() => result.current[1]("musa"));
    expect(result.current[0]).toBe("musa");
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
    await tick();
    back();
    expect(result.current[0]).toBeNull();
    expect(scrollTo).toHaveBeenCalledWith(0, 640);
    scrollTo.mockRestore();
    await tick();
  });
});

describe("v57 native back at the root", () => {
  it("first press shows the hint, a second press within 2 s exits", () => {
    const toasts: string[] = [];
    const on = (e: Event) => toasts.push((e as CustomEvent).detail.message);
    window.addEventListener(TOAST_EVENT, on);
    const exit = vi.fn();
    expect(nativeBack({ exitHint: () => "اضغط رجوع مرة أخرى للخروج", canExit: true, exit, now: 10_000 })).toBe("hint");
    expect(toasts).toEqual(["اضغط رجوع مرة أخرى للخروج"]);
    expect(nativeBack({ exitHint: () => "x", canExit: true, exit, now: 10_000 + EXIT_WINDOW_MS + 1 })).toBe("hint");
    expect(exit).not.toHaveBeenCalled();
    expect(nativeBack({ exitHint: () => "x", canExit: true, exit, now: 10_000 + EXIT_WINDOW_MS + 500 })).toBe("exit");
    expect(exit).toHaveBeenCalledTimes(1);
    window.removeEventListener(TOAST_EVENT, on);
  });

  it("closes the top layer first, never exits while something is open", async () => {
    const closed = vi.fn();
    const exit = vi.fn();
    const h = renderHook(() => useBackLayer(true, closed));
    await tick();
    expect(nativeBack({ exitHint: () => "", canExit: true, exit })).toBe("layer");
    await tick();
    expect(closed).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();
    h.unmount();
    await tick();
  });
});
