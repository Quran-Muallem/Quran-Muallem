/**
 * v57 native back navigation — one model for Android hardware/gesture back, the browser's back and the
 * iOS edge swipe:
 *
 *   overlays (menu, sheets, settings pages, readers…)   backStack.ts layers, top-most first
 *   screens (tabs, hub sections, companion)               `useNavigationHistory` — the screens visited, in order
 *   root (Home, nothing open)                             Android: «press back again to exit», then App.exitApp()
 *
 * Every step back goes through `backStack.ts`, so a screen history step and a sheet closing use the same
 * guard entry in the browser history and the app never leaves by surprise.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { backStackDepth, popBackLayer, useBackLayer } from "@/lib/backStack";
import { showToast } from "@/lib/appToast";

const MAX_HISTORY = 12;

// The app restores scroll positions itself (screens and readers); the browser's own restoration on
// `popstate` would jump to wherever the guard entry was pushed.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  try { window.history.scrollRestoration = "manual"; } catch { /* ignore */ }
}

/**
 * The screens visited, newest last (the root screen is implicit). Back returns to the previous screen and
 * its scroll position; at the root the layer is released, so the root behaviour (exit hint) takes over.
 * A screen visited again moves to the top instead of being listed twice, so back never loops.
 *
 * @param current the screen shown now
 * @param keyOf   identity of a screen (two states with the same key are the same place)
 * @param restore shows a stored screen again
 * @param root    the root screen (Home)
 */
export function useNavigationHistory<S>({ current, keyOf, restore, root, enabled = true }: {
  current: S;
  keyOf: (s: S) => string;
  restore: (s: S) => void;
  root: S;
  enabled?: boolean;
}) {
  const key = keyOf(current);
  const rootKey = keyOf(root);
  const stack = useRef<S[]>([]);
  const fromBack = useRef(false);
  const scroll = useRef<Record<string, number>>({});
  const keyNow = useRef(key);
  keyNow.current = key;

  // Remember where each screen was scrolled to (the key changes in render, before the next scroll event).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => { scroll.current[keyNow.current] = window.scrollY; };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (key === rootKey) { stack.current = []; fromBack.current = false; return; }
    if (fromBack.current) { fromBack.current = false; return; }
    const s = stack.current.filter((x) => keyOf(x) !== key);
    s.push(current);
    stack.current = s.slice(-MAX_HISTORY);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = useCallback(() => {
    stack.current.pop();
    const prev = stack.current[stack.current.length - 1] ?? root;
    fromBack.current = true;
    restore(prev);
    const y = scroll.current[keyOf(prev)] ?? 0;
    // twice: the restored screen renders first, then its content may grow (lists, images)
    requestAnimationFrame(() => { window.scrollTo(0, y); requestAnimationFrame(() => window.scrollTo(0, y)); });
  }, [restore, root, keyOf]);

  useBackLayer(enabled && key !== rootKey, back);
  return { back, depth: () => stack.current.length };
}

/**
 * A list → reader pair inside one screen (story, hadith section, dua, reciter, kids tafsir): opening
 * remembers the list's scroll position and starts the reader at the top; back (Android, the reader's
 * ‹ button) returns to the same list at the same place.
 */
export function useReaderState<T>(initial: T | null = null) {
  const [open, setOpen] = useState<T | null>(initial);
  const listY = useRef(0);
  const restoreTo = useRef<number | null>(null);
  const isOpen = useRef(initial !== null);
  isOpen.current = open !== null;
  const openReader = useCallback((v: T) => {
    // the list's position is read before the reader scrolls to the top (a reader opened from a reader keeps it)
    if (!isOpen.current && typeof window !== "undefined") listY.current = window.scrollY;
    isOpen.current = true;
    setOpen(v);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);
  const close = useCallback(() => { restoreTo.current = listY.current; setOpen(null); }, []);
  useLayoutEffect(() => {
    if (open !== null || restoreTo.current === null) return;
    const y = restoreTo.current;
    restoreTo.current = null;
    window.scrollTo(0, y);
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [open]);
  useBackLayer(open !== null, close);
  return [open, openReader, close] as const;
}

/** Android: two back presses within this time at the root close the app. */
export const EXIT_WINDOW_MS = 2000;
let lastRootBack = 0;

/** One back step from a native source. Returns what happened (for tests). */
export function nativeBack(opts: { exitHint: () => string; canExit: boolean; exit: () => void; now?: number }): "layer" | "hint" | "exit" | "none" {
  if (backStackDepth() > 0 && popBackLayer()) return "layer";
  if (!opts.canExit) return "none";
  const now = opts.now ?? Date.now();
  if (now - lastRootBack < EXIT_WINDOW_MS) { lastRootBack = 0; opts.exit(); return "exit"; }
  lastRootBack = now;
  showToast(opts.exitHint(), EXIT_WINDOW_MS);
  return "hint";
}

/**
 * Installs the native back sources once (in the app shell):
 * - Android: the `@capacitor/app` backButton listener (it replaces the WebView's default «history back,
 *   else close the app»), with the double-press exit at the root.
 * - iOS: a swipe from the left screen edge steps back (the WebView has no back gesture of its own).
 */
export function useNativeBackNavigation(exitHint: () => string) {
  const hint = useRef(exitHint);
  hint.current = exitHint;
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const platform = Capacitor.getPlatform();
    const cleanups: (() => void)[] = [];
    if (platform === "android") {
      const h = CapApp.addListener("backButton", () => {
        nativeBack({ exitHint: () => hint.current(), canExit: true, exit: () => void CapApp.exitApp() });
      });
      cleanups.push(() => { void h.then((x) => x.remove()); });
    }
    if (platform === "ios") cleanups.push(installEdgeSwipe(() => { nativeBack({ exitHint: () => "", canExit: false, exit: () => {} }); }));
    return () => cleanups.forEach((c) => c());
  }, []);
}

/** iOS-style edge swipe: starts within 24 px of the left edge, mostly horizontal, at least 70 px. */
export function installEdgeSwipe(onBack: () => void): () => void {
  let start: { x: number; y: number } | null = null;
  const down = (e: TouchEvent) => { const t = e.touches[0]; start = t && t.clientX <= 24 ? { x: t.clientX, y: t.clientY } : null; };
  const up = (e: TouchEvent) => {
    const t = e.changedTouches[0];
    if (start && t) {
      const dx = t.clientX - start.x, dy = Math.abs(t.clientY - start.y);
      if (dx >= 70 && dy < 50) onBack();
    }
    start = null;
  };
  window.addEventListener("touchstart", down, { passive: true });
  window.addEventListener("touchend", up, { passive: true });
  return () => { window.removeEventListener("touchstart", down); window.removeEventListener("touchend", up); };
}
