/**
 * Installable web app (PWA): registers the service worker (public/sw.js) on the web — never inside
 * the iOS/Android apps — and asks it to store the speech model for offline use.
 */
const isNative = () => !!(globalThis as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || isNative()) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;
  const env = (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env;
  if (env?.["DEV"]) return; // no caching while developing
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).then(async () => {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage("warm");
    }).catch(() => { /* the app works without it */ });
  });
}

/** True when started from the Home Screen (iOS) or as an installed app. */
export const isStandalone = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
