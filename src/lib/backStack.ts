/**
 * v53.1 Android back button / back gesture.
 *
 * Capacitor's WebView calls `history.back()` on the hardware back button while the WebView can go back,
 * otherwise it closes the app. So while any layer (menu, settings sheet, sub-page, hub section, story…) is
 * open we keep exactly one "guard" history entry; its `popstate` closes the top-most layer instead of
 * leaving the app. Layers closed by tapping (✕, ‹ Back) remove the guard again, so history never grows.
 */
import { useEffect, useRef } from "react";

type Layer = { id: number; fn: () => void };
const stack: Layer[] = [];
let guarded = false;
let ignoreNext = false;
let scheduled = false;
let seq = 0;

function sync() {
  scheduled = false;
  if (typeof window === "undefined") return;
  if (stack.length > 0 && !guarded) {
    window.history.pushState({ qmBack: true }, "");
    guarded = true;
  } else if (stack.length === 0 && guarded) {
    guarded = false;
    ignoreNext = true;
    window.history.back();
  }
}
function schedule() {
  if (scheduled) return;
  scheduled = true;
  // after React has run every cleanup + effect of the commit (menu closes and settings opens together)
  setTimeout(sync, 0);
}

let listening = false;
function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("popstate", () => {
    if (ignoreNext) { ignoreNext = false; return; }
    guarded = false; // the guard entry was consumed by this back press
    const top = stack[stack.length - 1];
    if (top) top.fn();
    schedule(); // still layers open (or a sub-page stepped back) → re-arm the guard
  });
}

/** While `active`, the Android back button calls `onBack` (top-most active layer wins). */
export function useBackLayer(active: boolean, onBack: () => void) {
  const fn = useRef(onBack);
  fn.current = onBack;
  useEffect(() => {
    if (!active) return;
    listen();
    const layer: Layer = { id: ++seq, fn: () => fn.current() };
    stack.push(layer);
    schedule();
    return () => {
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      schedule();
    };
  }, [active]);
}

/** Test helper. */
export const backStackDepth = () => stack.length;
