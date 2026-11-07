/** Entry point of the Capacitor (iOS/Android) build: renders the app without the web server. */
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./routes/index";
import { registerServiceWorker } from "./lib/pwa";

// Start in the saved theme (before React renders) to avoid a flash of the default colours.
try { const t = localStorage.getItem("hifz.theme"); if (t === "light" || t === "dark") document.documentElement.dataset["theme"] = t; } catch { /* ignore */ }

const el = document.getElementById("root");
if (el) createRoot(el).render(<StrictMode><App /></StrictMode>);
registerServiceWorker();
