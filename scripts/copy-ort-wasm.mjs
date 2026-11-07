#!/usr/bin/env node
/**
 * Copies the ONNX Runtime WebAssembly files used by Transformers.js into public/ort/,
 * so on-device Whisper does not load them from a CDN (works offline inside the app).
 * Runs automatically after `npm install` (postinstall).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
const candidates = [
  "node_modules/@xenova/transformers/node_modules/onnxruntime-web/dist",
  "node_modules/onnxruntime-web/dist",
  "node_modules/@xenova/transformers/dist",
];
const src = candidates.find((d) => existsSync(d) && readdirSync(d).some((f) => /^ort-wasm.*\.wasm$/.test(f)));
if (!src) { console.log("• ort-wasm files not found (is @xenova/transformers installed?) – skipped"); process.exit(0); }
mkdirSync("public/ort", { recursive: true });
const files = readdirSync(src).filter((f) => /^ort-wasm.*\.wasm$/.test(f));
for (const f of files) copyFileSync(`${src}/${f}`, `public/ort/${f}`);
console.log(`✓ copied ${files.length} ONNX Runtime wasm files from ${src} to public/ort/`);
