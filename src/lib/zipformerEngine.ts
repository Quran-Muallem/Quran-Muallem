/**
 * Stage 2 — on-device phoneme recognition with Quran-Lab's streaming Zipformer (100 % offline).
 *
 *   recorder (16 kHz) → VadGate (audioPipeline.ts) → this module → zipformer.worker.ts (ONNX Runtime Web)
 *   → phoneme tokens → quranAlignment.ts (word states) → userAdaptation.ts
 *
 * The model files are bundled with the app, nothing is downloaded:
 *   /models/zipformer_p_arabic_v3.1.int8.onnx  (72.7 MB, NPL-1.2 licence)
 *   /models/tokens.txt                         (251 phoneme symbols, blank = 250)
 *   /models/quran_phonemes.json                (Hafs phonemes of every word, for the alignment)
 * If any of them is missing the engine reports "unavailable" and the app keeps using Whisper.
 *
 * Licence (NPL-1.2): free use only — never charge for the model or any feature it powers — and the app
 * must say that automatic tajweed feedback can be wrong and does not replace a qualified teacher.
 */
import { useSyncExternalStore } from "react";
import { assetUrl } from "@/lib/assets";
import { createSignal } from "@/lib/storage";
import type { DecodedToken } from "./zipformerCore";
import { tokensToPhonemes } from "./zipformerCore";
import type { ZfConfig, ZfRequest, ZfResponse } from "./zipformer.worker";

export const ZIPFORMER_FILES = {
  model: "models/zipformer_p_arabic_v3.1.int8.onnx",
  tokens: "models/tokens.txt",
  phonemes: "models/quran_phonemes.json",
} as const;
export const ZIPFORMER_MB = 73;
/** No progress and not ready for this long while loading → treated as failed (Whisper is used). */
const LOAD_STALL_MS = 120_000;

export type ZipformerState =
  | { status: "unknown" }
  | { status: "unavailable" }
  | { status: "idle" }
  | { status: "loading"; progress: number }
  | { status: "ready"; backend: string }
  | { status: "error"; message: string };

const state = createSignal<ZipformerState>({ status: "unknown" });
export const getZipformerState = () => state.get();
export function useZipformerState(): ZipformerState {
  return useSyncExternalStore(state.subscribe, state.get, state.get);
}

const abs = (path: string) => new URL(assetUrl(path), location.href).href;

/** Are the bundled files there? (A dev server may answer missing files with its HTML page.) */
let availability: Promise<boolean> | null = null;
export function zipformerAvailable(): Promise<boolean> {
  availability ??= (async () => {
    if (typeof window === "undefined" || typeof Worker === "undefined") return false;
    const ok = async (path: string) => {
      try {
        const r = await fetch(abs(path), { method: "HEAD" });
        return r.ok && !(r.headers.get("content-type") ?? "").includes("text/html");
      } catch { return false; }
    };
    const all = (await Promise.all(Object.values(ZIPFORMER_FILES).map(ok))).every(Boolean);
    const failed = failedBefore();
    if (state.get().status === "unknown") state.set(!all ? { status: "unavailable" } : failed ? { status: "error", message: failed } : { status: "idle" });
    return all && !failed;
  })();
  return availability;
}

export class ZipformerError extends Error {
  constructor(readonly code: "unavailable" | "load" | "run", message: string) { super(message); }
}

let worker: Worker | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<(r: ZfResponse) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./zipformer.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<ZfResponse>) => {
    const r = e.data;
    if (r.type === "progress") state.set({ status: "loading", progress: r.total ? r.loaded / r.total : 0 });
    if (r.type === "ready") state.set({ status: "ready", backend: r.backend });
    if (r.type === "error" && r.phase === "load") state.set({ status: "error", message: r.message });
    listeners.forEach((l) => l(r));
  };
  worker.onerror = (e) => {
    state.set({ status: "error", message: e.message || "worker failed" });
    listeners.forEach((l) => l({ type: "error", phase: "load", message: e.message || "worker failed" }));
    worker?.terminate(); worker = null; loading = null;
  };
  return worker;
}

/** Loads the model (from the app's own files). Safe to call repeatedly. */
export function preloadZipformer(): Promise<void> {
  loading ??= (async () => {
    if (!(await zipformerAvailable())) throw new ZipformerError("unavailable", "model files not bundled");
    const w = getWorker();
    const done = new Promise<void>((resolve, reject) => {
      const l = (r: ZfResponse) => {
        if (r.type === "ready") { listeners.delete(l); resolve(); }
        if (r.type === "error" && r.phase === "load") { listeners.delete(l); reject(new ZipformerError("load", r.message)); }
      };
      listeners.add(l);
    });
    if (state.get().status !== "ready") state.set({ status: "loading", progress: 0 });
    const localWasm = await fetch(abs("ort/ort-wasm-simd.wasm"), { method: "HEAD" }).then((r) => r.ok).catch(() => false);
    const config: ZfConfig = { modelUrl: abs(ZIPFORMER_FILES.model), tokensUrl: abs(ZIPFORMER_FILES.tokens), wasmPath: localWasm ? abs("ort/") : null };
    w.postMessage({ type: "load", config } satisfies ZfRequest);
    // Watchdog: a phone can end the worker without any error (memory); never wait forever.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stalled = new Promise<never>((_, reject) => {
      const arm = () => { clearTimeout(timer); timer = setTimeout(() => reject(new ZipformerError("load", "prepare-timeout")), LOAD_STALL_MS); };
      arm();
      const l = (r: ZfResponse) => { if (r.type === "progress") arm(); };
      listeners.add(l);
      void done.finally(() => listeners.delete(l)).catch(() => {});
    });
    try { await Promise.race([done, stalled]); }
    catch (e) {
      if (e instanceof ZipformerError && e.message === "prepare-timeout") { worker?.terminate(); worker = null; markZipformerFailed("prepare-timeout"); }
      throw e;
    } finally { clearTimeout(timer); }
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

/** The model could not load or run on this device: the app uses Whisper from now on (until retried). */
const FAILED_KEY = "hifz.zipformerFailed";
export function markZipformerFailed(message: string) {
  state.set({ status: "error", message });
  try { localStorage.setItem(FAILED_KEY, message.slice(0, 200)); } catch { /* ignore */ }
}
export function retryZipformer() {
  try { localStorage.removeItem(FAILED_KEY); } catch { /* ignore */ }
  loading = null; availability = null;
  state.set({ status: "unknown" });
  void zipformerAvailable();
}
function failedBefore(): string | null { try { return localStorage.getItem(FAILED_KEY); } catch { return null; } }

let nextId = 1;

/**
 * One streaming recitation. Push audio as it is recorded; `onUpdate` receives the phoneme string so far
 * (live, roughly every half second of speech); `finish()` resolves with the complete phoneme string.
 */
export class ZipformerSession {
  readonly id = nextId++;
  private tokens: DecodedToken[] = [];
  private closed = false;
  private finalWaiter: { resolve: (s: string) => void; reject: (e: Error) => void } | null = null;
  private failure: ZipformerError | null = null;
  private readonly listener: (r: ZfResponse) => void;
  /** Real-time factor reported by the worker (< 1 = faster than real time). */
  rtf = 0;

  constructor(private onUpdate: (phonemes: string, tokens: readonly DecodedToken[]) => void) {
    this.listener = (r) => {
      if (r.type === "tokens" && r.id === this.id) {
        this.tokens.push(...r.tokens);
        this.rtf = r.rtf;
        const text = tokensToPhonemes(this.tokens);
        if (!this.closed || r.final) this.onUpdate(text, this.tokens);
        if (r.final) { this.finalWaiter?.resolve(text); this.dispose(); }
      }
      if (r.type === "error" && (r.id === this.id || r.phase === "load")) {
        this.failure = new ZipformerError(r.phase, r.message);
        this.finalWaiter?.reject(this.failure);
        this.dispose();
      }
    };
  }

  async start() {
    await preloadZipformer();
    listeners.add(this.listener);
    getWorker().postMessage({ type: "start", id: this.id } satisfies ZfRequest);
  }

  push(samples: Float32Array) {
    if (this.closed || !samples.length) return;
    getWorker().postMessage({ type: "audio", id: this.id, samples } satisfies ZfRequest, [samples.buffer]);
  }

  finish(): Promise<string> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.closed) return Promise.resolve(tokensToPhonemes(this.tokens));
    this.closed = true;
    const p = new Promise<string>((resolve, reject) => { this.finalWaiter = { resolve, reject }; });
    getWorker().postMessage({ type: "finish", id: this.id } satisfies ZfRequest);
    return p;
  }

  cancel() {
    if (worker) worker.postMessage({ type: "cancel", id: this.id } satisfies ZfRequest);
    this.closed = true;
    this.finalWaiter?.reject(new ZipformerError("run", "cancelled"));
    this.dispose();
  }

  get decoded(): readonly DecodedToken[] { return this.tokens; }

  private dispose() { listeners.delete(this.listener); this.finalWaiter = null; }
}
