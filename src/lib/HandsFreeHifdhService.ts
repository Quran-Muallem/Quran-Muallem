/**
 * v45 «المراجعة الحرة» — hands-free, on-the-go Hifdh (phone in the pocket, screen off, earphones / car).
 *
 *   IDLE_LISTENING ──3–4 consecutive words of a verse (≥ 85 %, anywhere in the 114 surahs)──▶ ACTIVE_MEMORIZATION
 *         ▲                                                                                        │
 *         └──────────────── 15 s / 30 s of complete silence (the recited verses are logged) ───────┘
 *
 *  - The noise gate is the verse locator itself (`ayahLocator`: ≥ 26 core characters ≈ 3–4 words, ≥ 85 %
 *    similarity, unique place): street / car noise and conversation never lock on.
 *  - ACTIVE: word-by-word tracking; a silence ≥ the delay (default 3.5 s) after recited words → the Sheikh
 *    plays the next 2–3 words (or the whole verse) — «يفتح عليك»; a run of wrong words (a similar verse,
 *    mutashābihāt) + a 2 s pause → the correct continuation (the opening of the expected verse).
 *  - After the idle time without any voice → back to IDLE_LISTENING; what was recited goes to the log.
 *
 * Pure logic (no React, no audio); prompt rules shared with the Salat Mode (`trailingErrors`, `promptSpan`).
 * The view (HandsFreeHifdhView) feeds matches, voice activity and the clock and acts on the events.
 */
import { MISTAKE_PAUSE_MS, MISTAKE_RUN, trailingErrors, type PromptMode } from "@/lib/SalatPrayerTracker";
import type { LiveMatch } from "@/lib/quranMatcher";

export type HandsFreeState = "OFF" | "IDLE_LISTENING" | "ACTIVE_MEMORIZATION";
export type HandsFreeConfig = { silenceMs: number; promptMode: PromptMode; idleMs: number };
export const DEFAULT_HANDSFREE: HandsFreeConfig = { silenceMs: 3500, promptMode: "words", idleMs: 15_000 };
export const IDLE_OPTIONS_MS = [15_000, 30_000] as const;

export type HandsFreeLogEntry = { at: number; surah: number; fromAyah: number; toAyah: number; words: number; prompts: number };

export type HandsFreeEvent =
  | { type: "state"; state: HandsFreeState }
  /** Locked onto a surah (soft chime + haptic). */
  | { type: "locked"; surah: number; ayah: number }
  | { type: "prompt"; token: number; reason: "stall" | "mistake"; mode: PromptMode }
  /** Back to listening: the recited verses for the log (null when nothing was recited). */
  | { type: "idle"; entry: HandsFreeLogEntry | null };

export class HandsFreeTracker {
  state: HandsFreeState = "OFF";
  config: HandsFreeConfig;
  located: { surah: number; ayah: number } | null = null;
  private lastSpeechAt = 0;
  private progressAt = 0;
  private lastPromptAt = 0;
  private lastCursor = -1;
  private promptsAtCursor = 0;
  private mistakePromptedAt = -1;
  private recited = false;
  private prompts = 0;
  private maxAyah = 0;
  private words = 0;

  constructor(config: Partial<HandsFreeConfig> = {}) { this.config = { ...DEFAULT_HANDSFREE, ...config }; }
  setConfig(c: Partial<HandsFreeConfig>) { this.config = { ...this.config, ...c }; }

  start(now: number): HandsFreeEvent[] { return this.enterIdle(now); }
  stop(now: number): HandsFreeEvent[] {
    const entry = this.state === "ACTIVE_MEMORIZATION" ? this.entry(now) : null;
    this.state = "OFF"; this.located = null;
    return [...(entry ? [{ type: "idle" as const, entry }] : []), { type: "state", state: "OFF" }];
  }

  private enterIdle(now: number): HandsFreeEvent[] {
    this.state = "IDLE_LISTENING"; this.located = null;
    this.lastSpeechAt = now; this.progressAt = now; this.lastPromptAt = 0;
    this.lastCursor = -1; this.promptsAtCursor = 0; this.mistakePromptedAt = -1;
    this.recited = false; this.prompts = 0; this.maxAyah = 0; this.words = 0;
    return [{ type: "state", state: "IDLE_LISTENING" }];
  }

  /** The transcript grew (voice heard). */
  heard(now: number) { this.lastSpeechAt = now; }

  /** The locator found a verse (3–4 words, ≥ 85 %): lock on (from idle) or follow a jump. */
  onLocated(at: { surah: number; ayah: number }, now: number): HandsFreeEvent[] {
    if (this.state === "OFF") return [];
    const first = this.state === "IDLE_LISTENING";
    if (!first && this.located && this.located.surah !== at.surah) {
      // Moved on to another surah: log the finished part first.
      const entry = this.entry(now);
      this.enterIdle(now);
      this.state = "ACTIVE_MEMORIZATION"; this.located = at; this.maxAyah = at.ayah;
      return [{ type: "idle", entry }, { type: "state", state: "ACTIVE_MEMORIZATION" }, { type: "locked", ...at }];
    }
    this.state = "ACTIVE_MEMORIZATION";
    this.located = at;
    if (first) this.maxAyah = at.ayah;
    this.lastCursor = -1; this.promptsAtCursor = 0; this.mistakePromptedAt = -1; this.progressAt = now; this.lastSpeechAt = now;
    return first ? [{ type: "state", state: "ACTIVE_MEMORIZATION" }, { type: "locked", ...at }] : [];
  }

  /**
   * Clock / match update. `ayahOfToken(i)` maps a flat target token to its verse number (for the log);
   * `voiced`: seconds of voice in the last `silenceMs` (VAD).
   */
  tick(o: { now: number; match?: LiveMatch | null; voiced?: number; prompting?: boolean; ayahOfToken?: (token: number) => number | null }): HandsFreeEvent[] {
    const { now, match, voiced, prompting } = o;
    if (this.state !== "ACTIVE_MEMORIZATION") return [];
    if (prompting) { this.lastSpeechAt = now; return []; }
    if (match && match.cursor !== this.lastCursor) {
      if (this.lastCursor >= 0 && match.cursor > this.lastCursor) this.recited = true;
      if (match.recited > 0) this.recited = true;
      // The first match after locking only sets the start (no progress yet unless words were recited).
      if (this.lastCursor >= 0 || match.recited > 0) { this.progressAt = now; this.promptsAtCursor = 0; }
      this.lastCursor = match.cursor;
      this.words = Math.max(this.words, match.recited);
      const a = match.cursor > 0 ? o.ayahOfToken?.(match.cursor - 1) : null;
      if (a) this.maxAyah = Math.max(this.maxAyah, a);
    }
    const quietFor = now - Math.max(this.lastSpeechAt, this.progressAt, this.lastPromptAt);
    const quiet = voiced == null || voiced < 0.35;

    // Complete silence for the idle time → back to listening, log what was recited.
    if (quiet && now - Math.max(this.lastSpeechAt, this.progressAt, this.lastPromptAt) >= this.config.idleMs) {
      const entry = this.entry(now);
      return [{ type: "idle", entry }, ...this.enterIdle(now)];
    }
    if (!match || !this.recited || match.done) return [];

    const run = trailingErrors(match.statuses, match.cursor);
    if (run >= MISTAKE_RUN && quiet && quietFor >= MISTAKE_PAUSE_MS && this.mistakePromptedAt !== match.cursor) {
      this.mistakePromptedAt = match.cursor; this.lastPromptAt = now; this.prompts++;
      return [{ type: "prompt", token: match.cursor - run, reason: "mistake", mode: this.config.promptMode }];
    }
    const lastWasRecitation = this.progressAt >= this.lastSpeechAt - 1500;
    const triedAgain = this.promptsAtCursor === 0 || this.lastSpeechAt > this.lastPromptAt;
    if (quiet && quietFor >= this.config.silenceMs && lastWasRecitation && triedAgain && this.promptsAtCursor < 2) {
      this.promptsAtCursor++; this.lastPromptAt = now; this.prompts++;
      return [{ type: "prompt", token: match.cursor, reason: "stall", mode: this.config.promptMode }];
    }
    return [];
  }

  /** Manual «repeat the last prompt» (headset button): the prompt for the current place again. */
  repeat(now: number, match: LiveMatch | null | undefined): HandsFreeEvent[] {
    if (this.state !== "ACTIVE_MEMORIZATION" || !match) return [];
    this.lastPromptAt = now; this.prompts++;
    return [{ type: "prompt", token: match.cursor, reason: "stall", mode: this.config.promptMode }];
  }

  private entry(now: number): HandsFreeLogEntry | null {
    if (!this.located || !this.recited) return null;
    return { at: now, surah: this.located.surah, fromAyah: this.located.ayah, toAyah: Math.max(this.located.ayah, this.maxAyah), words: this.words, prompts: this.prompts };
  }
}

/* ───────────── log (this device only) ───────────── */

const LOG_KEY = "hifz.handsfree.log.v1";
export function loadHandsFreeLog(): HandsFreeLogEntry[] {
  try { const v = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]") as HandsFreeLogEntry[]; return Array.isArray(v) ? v : []; } catch { return []; }
}
export function addHandsFreeLog(e: HandsFreeLogEntry): HandsFreeLogEntry[] {
  const list = [e, ...loadHandsFreeLog()].slice(0, 200);
  try { localStorage.setItem(LOG_KEY, JSON.stringify(list)); } catch { /* private mode */ }
  return list;
}

/* ───────────── audio devices / routing ───────────── */

export type AudioRoute = "auto" | "bluetooth" | "speaker";
export type AudioDevice = { kind: "bluetooth" | "wired" | "phone" | "other"; name: string; input: boolean; output: boolean };
const BT_NAME = /bluetooth|airpods|buds|headset|hands-?free|bt[\s-]|\bcar\b|jabra|bose|sony|beats|galaxy buds/i;

/** Connected audio devices: native list in the Android app, `enumerateDevices` labels elsewhere. */
export async function listAudioDevices(): Promise<AudioDevice[]> {
  try {
    const { backgroundAudio } = await import("@/lib/audioPlayback");
    const p = await backgroundAudio();
    if (p) return (await p.audioDevices()).devices;
  } catch { /* fall back to the web */ }
  try {
    const list = await navigator.mediaDevices?.enumerateDevices?.() ?? [];
    return list.filter((d) => d.kind !== "videoinput").map((d) => ({
      kind: BT_NAME.test(d.label) ? "bluetooth" : /speaker|lautsprecher|built-?in|default/i.test(d.label) ? "phone" : "other",
      name: d.label, input: d.kind === "audioinput", output: d.kind === "audiooutput",
    }));
  } catch { return []; }
}

export const hasBluetooth = (ds: readonly AudioDevice[]) => ds.some((d) => d.kind === "bluetooth");

/** Applies the route (Android app: microphone via the Bluetooth headset / car, or the phone). */
export async function applyAudioRoute(route: AudioRoute): Promise<boolean> {
  try {
    const { backgroundAudio } = await import("@/lib/audioPlayback");
    const p = await backgroundAudio();
    if (!p) return route === "auto";
    return (await p.setAudioRoute({ route })).ok;
  } catch { return false; }
}
