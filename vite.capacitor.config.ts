/**
 * Static single-page build for the iOS/Android app (Capacitor needs plain files, no server).
 * The web version keeps using vite.config.ts (TanStack Start); both render the same <App />.
 *
 *   bun run build:app   →  dist-app/  (Capacitor webDir)
 *   bun run dev:app     →  local preview of the app build
 *   bun run build:pwa   →  the same files as an installable web app (GitHub Pages, iOS Home Screen)
 */
import { defineConfig, type Plugin } from "vite";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "dist-app");

/**
 * PWA / GitHub Pages: lists every built file in precache.json (the service worker caches them on
 * install, so the app opens offline) and adds 404.html + .nojekyll for GitHub Pages.
 */
function pwa(): Plugin {
  const list = (dir: string, prefix = ""): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? list(path.join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`]);
  return {
    name: "quran-muallem-pwa",
    apply: "build",
    closeBundle() {
      const assets = path.join(outDir, "assets");
      // Every built JS/CSS/worker file (workers are separate bundles, so read them from disk).
      const files = existsSync(assets) ? list(assets, "assets/").filter((f) => !f.endsWith(".map")).sort() : [];
      const version = createHash("sha256").update(files.join("|")).digest("hex").slice(0, 12);
      writeFileSync(path.join(outDir, "precache.json"), JSON.stringify({ version, files }));
      // A changed sw.js makes browsers install the new version (and its new file list).
      const sw = path.join(outDir, "sw.js");
      if (existsSync(sw)) writeFileSync(sw, `${readFileSync(sw, "utf8")}\n// build ${version}\n`);
      if (existsSync(path.join(outDir, "index.html"))) copyFileSync(path.join(outDir, "index.html"), path.join(outDir, "404.html"));
      writeFileSync(path.join(outDir, ".nojekyll"), "");
    },
  };
}

export default defineConfig({
  root: path.join(root, "app"),
  base: "./",
  envDir: root,
  publicDir: path.join(root, "public"),
  plugins: [react(), tailwindcss(), pwa()],
  resolve: { alias: { "@": path.join(root, "src") } },
  server: { port: 5174, fs: { allow: [root] } },
  worker: { format: "es" },
  optimizeDeps: { exclude: ["@xenova/transformers"] },
  build: {
    outDir,
    emptyOutDir: true,
    target: ["es2020", "safari14", "chrome90"],
    chunkSizeWarningLimit: 1500,
  },
});
