/** Entry point of the Capacitor (iOS/Android) build: renders the app without the web server. */
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./routes/index";
import { CrashBoundary, rememberCrash } from "./components/CrashBoundary";
import { registerServiceWorker } from "./lib/pwa";
import { applyTypography, cleanSettings, DEFAULT_SETTINGS } from "./lib/settings";

// Start in the saved theme (before React renders) to avoid a flash of the default colours.
try { const t = localStorage.getItem("hifz.theme"); if (t === "light" || t === "dark") document.documentElement.dataset["theme"] = t; } catch { /* ignore */ }
// v45: font scale / fonts / contrast / kids theme from the last run, before the first paint.
try { const ty = JSON.parse(localStorage.getItem("hifz.typography") ?? "null"); if (ty) applyTypography(cleanSettings({ ...DEFAULT_SETTINGS, ...ty })); } catch { /* ignore */ }
void import("@/lib/statusBarSync").then((m) => m.startStatusBarSync()).catch(() => {});

const el = document.getElementById("root");
// v54.1: last line of defence — an error outside the tabs shows a card with «reload» instead of a black screen.
const lang = (() => { try { return (JSON.parse(localStorage.getItem("hifz.settings") ?? "{}") as { language?: string }).language; } catch { return undefined; } })();
const rootCopy = lang === "ar"
  ? { title: "حدث خطأ غير متوقع", body: "لم نتمكن من عرض هذه الشاشة. أعد تحميل التطبيق.", retry: "حاول مرة أخرى", home: "إعادة التحميل" }
  : lang === "de"
    ? { title: "Etwas ist schiefgelaufen", body: "Dieser Bildschirm konnte nicht angezeigt werden. Bitte lade die App neu.", retry: "Erneut versuchen", home: "Neu laden" }
    : { title: "Something went wrong", body: "This screen could not be shown. Please reload the app.", retry: "Try again", home: "Reload" };
window.addEventListener("error", (e) => rememberCrash("window", e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => rememberCrash("promise", e.reason));
if (el) createRoot(el).render(<StrictMode><CrashBoundary area="root" full copy={rootCopy}><App /></CrashBoundary></StrictMode>);
registerServiceWorker();
