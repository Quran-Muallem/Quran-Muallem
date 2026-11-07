#!/usr/bin/env node
/**
 * Optional: bundles the Whisper model into the app (public/models/…), so even the very first
 * recognition works without internet. Makes the app ≈ 40 MB (tiny) / ≈ 75 MB (base) larger.
 *
 *   npm run models:whisper            # base
 *   npm run models:whisper -- tiny    # tiny
 *   npm run models:whisper -- both
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
const arg = process.argv[2] ?? "base";
const models = arg === "both" ? ["tiny", "base"] : [arg];
const FILES = [
  "config.json", "generation_config.json", "preprocessor_config.json", "tokenizer.json", "tokenizer_config.json",
  "onnx/encoder_model_quantized.onnx", "onnx/decoder_model_merged_quantized.onnx",
];
for (const m of models) {
  const repo = `Xenova/whisper-${m}`;
  for (const f of FILES) {
    const out = `public/models/${repo}/${f}`;
    if (existsSync(out)) { console.log(`= ${out}`); continue; }
    const url = `https://huggingface.co/${repo}/resolve/main/${f}`;
    const res = await fetch(url);
    if (!res.ok) { console.error(`✗ ${url}: HTTP ${res.status}`); process.exit(1); }
    mkdirSync(out.slice(0, out.lastIndexOf("/")), { recursive: true });
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(`✓ ${out}`);
  }
}
console.log("Done. Rebuild the app (npm run cap:sync) to include the model.");
