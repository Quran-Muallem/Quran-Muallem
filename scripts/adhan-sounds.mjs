#!/usr/bin/env node
/**
 * Makes the Adhan sounds of the app from original recordings (needs ffmpeg):
 *   node scripts/adhan-sounds.mjs <id> <original file> [startSeconds] [endSeconds]
 * Writes
 *   public/adhan/<id>.mp3        mono, loudness −16 LUFS, silence trimmed (preview, web, Android channel sound)
 *   public/adhan/ios/<id>.caf    the first 29 s, IMA4 (iOS plays at most 30 s of a notification sound)
 * and `node scripts/adhan-sounds.mjs --silence` the 1-second silent sound of "vibration only".
 * Add the licence / author of every new recording to public/adhan/CREDITS.md and src/data/adhanVoices.ts.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const out = "public/adhan";
mkdirSync(`${out}/ios`, { recursive: true });
const ff = (...args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

if (process.argv[2] === "--silence") {
  ff("-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "1", "-c:a", "libmp3lame", "-b:a", "32k", `${out}/silence.mp3`);
  ff("-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono", "-t", "1", "-c:a", "adpcm_ima_qt", `${out}/ios/silence.caf`);
  process.exit(0);
}
const [id, src, start, end] = process.argv.slice(2);
if (!id || !src) { console.error("usage: node scripts/adhan-sounds.mjs <id> <file> [start] [end]"); process.exit(1); }
const cut = [...(start ? ["-ss", start] : []), ...(end ? ["-to", end] : [])];
const clean = "highpass=f=60,silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11";
ff(...cut, "-i", src, "-vn", "-ac", "1", "-ar", "44100", "-af", `${clean},afade=t=in:d=0.3`, "-c:a", "libmp3lame", "-b:a", "64k", `${out}/${id}.mp3`);
ff("-i", `${out}/${id}.mp3`, "-t", "29", "-ac", "1", "-ar", "22050", "-af", "afade=t=out:st=27:d=2", "-c:a", "adpcm_ima_qt", `${out}/ios/${id}.caf`);
console.log("✓", id);
