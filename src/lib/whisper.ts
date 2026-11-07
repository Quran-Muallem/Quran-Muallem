/**
 * On-device Whisper (Transformers.js): Arabic speech → text entirely on the phone / in the browser.
 * No audio is sent to any server and no API key is needed.
 *
 * - Model: Xenova/whisper-base (default, more accurate) or Xenova/whisper-tiny (lighter), 8-bit quantized.
 * - Runs in a Web Worker (src/lib/whisper.worker.ts) so the UI stays smooth.
 * - First use downloads the model once (≈ 40 MB tiny / ≈ 75 MB base) and caches it; afterwards it works
 *   offline. With `npm run models:whisper` the model is bundled into the app and nothing is downloaded at all.
 */
import { useSyncExternalStore } from "react";
import { createSignal } from "@/lib/storage";
import { assetUrl } from "@/lib/assets";
import { getSettings } from "@/lib/settings";
import type { WorkerConfig, WorkerRequest, WorkerResponse } from "@/lib/whisper.worker";
import { audioDebug, secs } from "@/lib/audioDebug";

/** Recordings are kept below this size (≈ 12 min at 16 kHz). */
export const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
/** Smaller than ~0.3 s of 16 kHz mono 16-bit audio: treated as an empty recording. */
export const MIN_AUDIO_BYTES = 9 * 1024;
export const SAMPLE_RATE = 16000;

export type WhisperModelId = "tiny" | "base";
export const WHISPER_MODELS: Record<WhisperModelId, { repo: string; approxMB: number }> = {
  tiny: { repo: "Xenova/whisper-tiny", approxMB: 40 },
  base: { repo: "Xenova/whisper-base", approxMB: 75 },
};

/**
 * Versions 11–13 offered an experimental Quran-trained Whisper (a community ONNX conversion, ≈ 120 MB).
 * On phones it could download completely and then never finish preparing (stuck at 99 %). The Quran-trained
 * engine is now the bundled Zipformer, so that model is gone; its cached files are deleted once.
 */
const OLD_QURAN_REPO = "omartariq612/tarteel-ai-whisper-tiny-ar-quran-onnx";
async function purgeOldQuranModel() {
  try {
    if (typeof caches === "undefined" || localStorage.getItem("hifz.quranModelPurged") === "1") return;
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) if (req.url.includes(OLD_QURAN_REPO)) await cache.delete(req);
    }
    localStorage.removeItem("hifz.quranModelFailed");
    localStorage.setItem("hifz.quranModelPurged", "1");
  } catch { /* nothing to clean up */ }
}
if (typeof window !== "undefined") setTimeout(() => { void purgeOldQuranModel(); }, 3000);

export type WhisperErrorCode = "model-download" | "unsupported" | "too-large" | "bad-audio" | "no-speech" | "failed";
export class WhisperError extends Error {
  readonly code: WhisperErrorCode;
  constructor(code: WhisperErrorCode, message?: string) { super(message ?? code); this.name = "WhisperError"; this.code = code; }
}

/* ------------------------------------------------------------------ */
/* Model loading state (for the UI)                                     */
/* ------------------------------------------------------------------ */

export type ModelState =
  | { status: "idle"; model: WhisperModelId | null; progress: 0 }
  | { status: "loading"; model: WhisperModelId; progress: number; loadedMB: number; totalMB: number;
      /** All files are downloaded; ONNX Runtime is preparing the model on the device. */
      preparing?: boolean }
  | { status: "ready"; model: WhisperModelId; progress: 100 }
  | { status: "error"; model: WhisperModelId; progress: number; message: string };

const state = createSignal<ModelState>({ status: "idle", model: null, progress: 0 });
export const getModelState = () => state.get();
const IDLE: ModelState = { status: "idle", model: null, progress: 0 };

/** Live model state: show a loading indicator while the model initializes the first time. */
export function useWhisperModel(): ModelState {
  return useSyncExternalStore(state.subscribe, state.get, () => IDLE);
}

const fileProgress = new Map<string, { loaded: number; total: number }>();
function onProgress(model: WhisperModelId, file: string, loaded: number, total: number) {
  if (!total) return;
  fileProgress.set(file, { loaded, total });
  let l = 0, t = 0;
  for (const p of fileProgress.values()) { l += p.loaded; t += p.total; }
  // Large .onnx files dominate; the estimate avoids the bar jumping back when a new file starts.
  const expected = Math.max(t, WHISPER_MODELS[model].approxMB * 1e6 * 0.9);
  const progress = Math.min(99, Math.round((l / expected) * 100));
  const cur = state.get();
  armWatchdog();
  if (cur.status === "loading" && progress < cur.progress) return;
  // Encoder and decoder downloaded completely: what remains is preparing them (no progress events).
  const onnx = [...fileProgress.keys()].filter((f) => f.endsWith(".onnx")).length;
  const preparing = onnx >= 2 && [...fileProgress.values()].every((p) => p.loaded >= p.total);
  state.set({ status: "loading", model, progress, loadedMB: Math.round(l / 1e6), totalMB: Math.round(expected / 1e6), preparing });
}

/**
 * Watchdog: preparing a model can fail silently on a phone (the WebView ends the worker when memory runs
 * out, and no error event arrives) — the bar would stay at 99 % forever. If nothing happens for
 * LOAD_STALL_MS while loading, the worker is restarted and the load reported as failed (with a retry button).
 */
const LOAD_STALL_MS = 150_000;
let watchdog: ReturnType<typeof setTimeout> | null = null;
function armWatchdog() {
  if (watchdog) clearTimeout(watchdog);
  watchdog = setTimeout(() => {
    watchdog = null;
    const cur = state.get();
    if (cur.status !== "loading") return;
    audioDebug("whisper load stalled", { model: cur.model, progress: cur.progress });
    worker?.terminate(); worker = null;
    const err = new WhisperError("model-download", "prepare-timeout");
    state.set({ status: "error", model: cur.model, progress: cur.progress, message: "prepare-timeout" });
    loadWaiters.forEach((w) => w.reject(err)); loadWaiters = [];
    pending.forEach((p) => p.reject(err)); pending.clear();
  }, LOAD_STALL_MS);
}
function disarmWatchdog() { if (watchdog) { clearTimeout(watchdog); watchdog = null; } }

/* ------------------------------------------------------------------ */
/* Worker                                                               */
/* ------------------------------------------------------------------ */

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
let loadWaiters: { resolve: () => void; reject: (e: Error) => void }[] = [];

function getWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") throw new WhisperError("unsupported");
  worker = new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;
    const model = state.get().model ?? currentModel();
    if (msg.type === "progress") onProgress(model, msg.file, msg.loaded, msg.total);
    else if (msg.type === "ready") {
      disarmWatchdog();
      if (state.get().status !== "ready") state.set({ status: "ready", model, progress: 100 });
      loadWaiters.forEach((w) => w.resolve()); loadWaiters = [];
    } else if (msg.type === "result") {
      pending.get(msg.id)?.resolve(msg.text); pending.delete(msg.id);
    } else if (msg.type === "error") {
      const err = new WhisperError(msg.phase === "load" ? "model-download" : "failed", msg.message);
      if (msg.phase === "load") {
        disarmWatchdog();
        state.set({ status: "error", model, progress: state.get().progress, message: msg.message });
        loadWaiters.forEach((w) => w.reject(err)); loadWaiters = [];
      }
      if (msg.id != null) { pending.get(msg.id)?.reject(err); pending.delete(msg.id); }
    }
  };
  worker.onerror = (e) => {
    const err = new WhisperError("unsupported", e.message);
    pending.forEach((p) => p.reject(err)); pending.clear();
    loadWaiters.forEach((w) => w.reject(err)); loadWaiters = [];
    state.set({ status: "error", model: currentModel(), progress: 0, message: e.message });
    worker?.terminate(); worker = null;
  };
  return worker;
}

const currentModel = (): WhisperModelId => (getSettings().whisperModel === "tiny" ? "tiny" : "base");

/** Bundled files are used only if they really exist (a dev server may answer missing files with HTML). */
const probes = new Map<string, Promise<boolean>>();
function exists(url: string, kind: "json" | "wasm"): Promise<boolean> {
  let p = probes.get(url);
  if (!p) {
    p = fetch(url, kind === "wasm" ? { method: "HEAD" } : {})
      .then(async (r) => {
        if (!r.ok) return false;
        const type = r.headers.get("content-type") ?? "";
        if (type.includes("text/html")) return false;
        if (kind === "json") { try { JSON.parse(await r.text()); return true; } catch { return false; } }
        return true;
      })
      .catch(() => false);
    probes.set(url, p);
  }
  return p;
}

async function workerConfig(model: WhisperModelId): Promise<WorkerConfig> {
  const abs = (path: string) => new URL(assetUrl(path), location.href).href;
  const repo = WHISPER_MODELS[model].repo;
  const [localModels, localWasm] = await Promise.all([
    exists(abs(`models/${repo}/config.json`), "json"),
    exists(abs("ort/ort-wasm-simd.wasm"), "wasm"),
  ]);
  return { model: repo, localModelPath: abs("models/"), localModels, wasmPath: localWasm ? abs("ort/") : null };
}

/**
 * Loads the model (downloading it the first time). Safe to call repeatedly; resolves when ready.
 * Call it early (e.g. when the user opens a recitation screen) so the first transcription is fast.
 */
export async function preloadWhisper(model: WhisperModelId = currentModel()): Promise<void> {
  const s = state.get();
  if (s.status === "ready" && s.model === model) return;
  if (!(s.status === "loading" && s.model === model)) {
    fileProgress.clear();
    state.set({ status: "loading", model, progress: 0, loadedMB: 0, totalMB: WHISPER_MODELS[model].approxMB });
    armWatchdog();
  }
  const w = getWorker();
  const done = new Promise<void>((resolve, reject) => loadWaiters.push({ resolve, reject }));
  w.postMessage({ type: "load", config: await workerConfig(model) } satisfies WorkerRequest);
  return done;
}

/* ------------------------------------------------------------------ */
/* Audio decoding                                                       */
/* ------------------------------------------------------------------ */

/** Parses a 16-bit PCM WAV (what our recorder produces) into mono Float32 samples. Null if not such a WAV. */
export function wavToFloat32(buf: ArrayBuffer): { samples: Float32Array; rate: number } | null {
  if (buf.byteLength < 44) return null;
  const v = new DataView(buf);
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") return null;
  let off = 12, rate = 0, channels = 0, bits = 0, format = 0;
  while (off + 8 <= buf.byteLength) {
    const id = tag(off), size = v.getUint32(off + 4, true), body = off + 8;
    if (id === "fmt ") { format = v.getUint16(body, true); channels = v.getUint16(body + 2, true); rate = v.getUint32(body + 4, true); bits = v.getUint16(body + 14, true); }
    if (id === "data") {
      if (format !== 1 || bits !== 16 || !channels || !rate) return null;
      const frames = Math.floor(Math.min(size, buf.byteLength - body) / (2 * channels));
      const out = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) sum += v.getInt16(body + (i * channels + c) * 2, true);
        out[i] = sum / channels / 32768;
      }
      return { samples: out, rate };
    }
    off = body + size + (size % 2);
  }
  return null;
}

/** Linear resampling (input is already low-passed by the recorder's averaging downsampler). */
export function resampleLinear(input: Float32Array, from: number, to = SAMPLE_RATE): Float32Array {
  if (from === to) return input;
  const out = new Float32Array(Math.max(1, Math.round((input.length * to) / from)));
  const step = from / to;
  for (let i = 0; i < out.length; i++) {
    const x = i * step, i0 = Math.floor(x), f = x - i0;
    out[i] = (input[i0] ?? 0) * (1 - f) + (input[Math.min(i0 + 1, input.length - 1)] ?? 0) * f;
  }
  return out;
}

/** Any recorded audio Blob → 16 kHz mono Float32Array (what Whisper expects). */
export async function decodeTo16k(audio: Blob): Promise<Float32Array> {
  const buf = await audio.arrayBuffer();
  const wav = wavToFloat32(buf);
  if (wav) return resampleLinear(wav.samples, wav.rate);
  // Other formats (webm/ogg/m4a): let the browser decode, then render at 16 kHz.
  const AC = (globalThis as unknown as { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext;
  if (!AC) throw new WhisperError("bad-audio");
  try {
    const decoded = await new AC(1, 1, SAMPLE_RATE).decodeAudioData(buf.slice(0));
    const off = new AC(1, Math.ceil(decoded.duration * SAMPLE_RATE), SAMPLE_RATE);
    const src = off.createBufferSource();
    src.buffer = decoded; src.connect(off.destination); src.start();
    return (await off.startRendering()).getChannelData(0);
  } catch {
    throw new WhisperError("bad-audio");
  }
}

/* ------------------------------------------------------------------ */
/* Transcription                                                        */
/* ------------------------------------------------------------------ */

/**
 * Scheduling. The worker runs one transcription at a time (a second ONNX run on the same session would
 * fail), so requests wait here:
 * - "final" requests (the whole recording after the user stops) run in order and always go first;
 * - only the newest "live" request is kept: a newer one replaces a waiting one (the replaced call rejects
 *   with an AbortError), so slow phones never build up a backlog and live text never lags further behind.
 * Recording does not depend on any of this: a slow or failed transcription never stops the microphone.
 */
type Job = { kind: "live" | "final"; run: () => Promise<string>; resolve: (t: string) => void; reject: (e: unknown) => void };
const finals: Job[] = [];
let waitingLive: Job | null = null;
let running = false;

const aborted = () => new DOMException("Aborted", "AbortError");

function pump() {
  if (running) return;
  const job = finals.shift() ?? waitingLive;
  if (!job) return;
  if (job === waitingLive) waitingLive = null;
  running = true;
  job.run().then(job.resolve, job.reject).finally(() => { running = false; pump(); });
}

export function scheduleTranscription(kind: Job["kind"], run: () => Promise<string>): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const job: Job = { kind, run, resolve, reject };
    if (kind === "final") {
      waitingLive?.reject(aborted()); waitingLive = null; // the final result supersedes any waiting live update
      finals.push(job);
    } else {
      waitingLive?.reject(aborted());
      waitingLive = job;
    }
    pump();
  });
}

/** Longest audio accepted (same limit as the recorder: ≈ 12 min). */
const MAX_SAMPLES = Math.floor((MAX_AUDIO_BYTES - 44) / 2);

/**
 * Transcribes Arabic speech given as mono samples (any rate; resampled to 16 kHz) on the device.
 * `kind: "live"` marks a partial update while recording (see scheduling above).
 * The first call loads the model (see useWhisperModel for progress).
 */
export async function transcribeSamples(input: Float32Array, { signal, kind = "final", rate = SAMPLE_RATE }: { signal?: AbortSignal; kind?: "live" | "final"; rate?: number } = {}): Promise<string> {
  const samples = rate === SAMPLE_RATE ? input : resampleLinear(input, rate);
  if (samples.length > MAX_SAMPLES) throw new WhisperError("too-large");
  if (samples.length < SAMPLE_RATE * 0.3) throw new WhisperError("bad-audio");
  if (signal?.aborted) throw aborted();
  const runWith = async (model: WhisperModelId): Promise<string> => {
    await preloadWhisper(model);
    if (signal?.aborted) throw aborted();
    const id = nextId++;
    const w = getWorker();
    const started = performance.now();
    const result = new Promise<string>((resolve, reject) => pending.set(id, { resolve, reject }));
    // The worker gets its own copy; the caller's buffer stays usable.
    const copy = samples.slice();
    w.postMessage({ type: "transcribe", id, config: await workerConfig(model), audio: copy } satisfies WorkerRequest, [copy.buffer]);
    // The worker cannot be interrupted, so the result is awaited even if the caller gave up; this keeps
    // the queue in step with the worker. An aborted caller simply ignores the text.
    const text = (await result).replace(/\s+/g, " ").trim();
    audioDebug(`whisper ${kind}`, { audioSeconds: secs(samples.length, SAMPLE_RATE), ms: Math.round(performance.now() - started), words: text ? text.split(" ").length : 0, model });
    return text;
  };
  const run = async (): Promise<string> => {
    if (signal?.aborted) throw aborted();
    const model = currentModel();
    const text = await runWith(model);
    if (signal?.aborted) throw aborted();
    if (!text) throw new WhisperError("no-speech");
    return text;
  };
  return scheduleTranscription(kind, run);
}

/**
 * Transcribes a recorded audio Blob (WAV from our recorder, or any format the browser can decode).
 * `askForKey` is accepted for compatibility and ignored: no key is needed.
 */
export async function transcribeArabic(audio: Blob, { signal, kind = "final" }: { signal?: AbortSignal; askForKey?: boolean; kind?: "live" | "final" } = {}): Promise<string> {
  if (audio.size > MAX_AUDIO_BYTES) throw new WhisperError("too-large");
  if (audio.size < MIN_AUDIO_BYTES) throw new WhisperError("bad-audio");
  audioDebug("decoding blob", { bytes: audio.size, type: audio.type });
  return transcribeSamples(await decodeTo16k(audio), { ...(signal ? { signal } : {}), kind });
}
