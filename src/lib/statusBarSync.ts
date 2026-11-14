/**
 * v46: keeps the Android / iOS status-bar icons readable. The app draws edge-to-edge, so whatever is under the
 * status bar decides: light content (the parchment Mushaf page, the light and kids themes) → dark icons,
 * dark content (emerald theme, black screens) → light icons. We sample the colour actually painted at the top
 * of the screen, so every screen and theme is covered without each one having to report its colours.
 */
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from "@capacitor/core";

const COLOR = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/;

function parse(c: string): { l: number; a: number } | null {
  const m = COLOR.exec(c);
  if (!m) return null;
  let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  if (!Number.isFinite(a)) a = 1;
  const ch = [m[1], m[2], m[3]].map((v) => { const x = parseFloat(v!) / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return { l: 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!, a };
}

/** Relative luminance (0 = black, 1 = white) of what is painted at (x, y), or null if it cannot be told. */
export function luminanceAt(x: number, y: number): number | null {
  if (typeof document === "undefined") return null;
  let el: Element | null = document.elementFromPoint(x, y);
  while (el) {
    const st = getComputedStyle(el);
    const bg = parse(st.backgroundColor);
    if (bg && bg.a >= 0.5) return bg.l;
    // gradients / images: use their first colour stop
    const img = st.backgroundImage;
    if (img && img !== "none") { const g = parse(img); if (g && g.a >= 0.5) return g.l; }
    el = el.parentElement;
  }
  const body = parse(getComputedStyle(document.body).backgroundColor);
  return body ? body.l : null;
}

let last: SystemBarsStyle | null = null;

export function syncStatusBar() {
  if (typeof window === "undefined") return;
  const samples = [0.2, 0.5, 0.8].map((f) => luminanceAt(window.innerWidth * f, 6)).filter((v): v is number => v !== null);
  if (!samples.length) return;
  const lum = samples.reduce((a, b) => a + b, 0) / samples.length;
  const style = lum > 0.4 ? SystemBarsStyle.Light : SystemBarsStyle.Dark; // Light = dark icons on a light background
  document.documentElement.dataset["statusBar"] = style === SystemBarsStyle.Light ? "dark-icons" : "light-icons";
  if (style === last) return;
  last = style;
  if (!Capacitor.isNativePlatform()) return;
  void SystemBars.setStyle({ style, bar: SystemBarType.StatusBar }).catch(() => { last = null; });
}

/** Starts watching: theme/tab changes, scrolling and a slow heartbeat for anything else. */
export function startStatusBarSync() {
  if (typeof window === "undefined") return;
  let t: number | undefined;
  const soon = () => { window.clearTimeout(t); t = window.setTimeout(syncStatusBar, 120); };
  new MutationObserver(soon).observe(document.documentElement, { attributes: true });
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: false });
  window.addEventListener("scroll", soon, { passive: true, capture: true });
  window.addEventListener("resize", soon);
  window.setInterval(() => { if (document.visibilityState === "visible") syncStatusBar(); }, 1500);
  soon();
}
