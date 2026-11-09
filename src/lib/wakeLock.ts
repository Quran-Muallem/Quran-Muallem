/**
 * Keeps the screen on while the Mushaf is open or a recitation / the Sheikh's audio runs.
 * Screen Wake Lock API (Android WebView / Chrome, iOS 16.4+ Safari and WKWebView). The lock is dropped by
 * the system whenever the app goes to the background, so it is requested again when it comes back.
 * Several screens can ask at once: the screen stays on while at least one of them wants it.
 */
import { useEffect } from "react";

type Sentinel = { release: () => Promise<void>; released?: boolean; addEventListener?: (t: "release", cb: () => void) => void };
type WakeLockApi = { request: (type: "screen") => Promise<Sentinel> };

const holders = new Set<symbol>();
let sentinel: Sentinel | null = null;
let pending: Promise<void> | null = null;

const api = (): WakeLockApi | null =>
  typeof navigator !== "undefined" && "wakeLock" in navigator ? (navigator as unknown as { wakeLock: WakeLockApi }).wakeLock : null;

async function acquire() {
  const wl = api();
  if (!wl || sentinel || pending || typeof document === "undefined" || document.visibilityState !== "visible") return;
  pending = wl.request("screen").then((s) => {
    if (!holders.size) { void s.release().catch(() => {}); return; }
    sentinel = s;
    s.addEventListener?.("release", () => { if (sentinel === s) sentinel = null; });
  }).catch(() => { /* not allowed (battery saver, no user gesture yet): try again on the next visibility change */ })
    .finally(() => { pending = null; });
  await pending;
}

function release() {
  const s = sentinel;
  sentinel = null;
  void s?.release().catch(() => {});
}

let listening = false;
function listen() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && holders.size) void acquire(); });
  // Some browsers grant the lock only after a user gesture: retry on the first tap.
  document.addEventListener("pointerdown", () => { if (holders.size && !sentinel) void acquire(); }, { passive: true });
}

/** Keeps the screen awake while `active` is true (for as long as the component is mounted). */
export function useKeepAwake(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const me = Symbol("wake");
    holders.add(me);
    listen();
    void acquire();
    return () => { holders.delete(me); if (!holders.size) release(); };
  }, [active]);
}

export const wakeLockSupported = () => !!api();
