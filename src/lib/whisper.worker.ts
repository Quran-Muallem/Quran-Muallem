/**
 * Web Worker running Whisper on the device with Transformers.js (ONNX Runtime / WebAssembly).
 * Audio never leaves the device. The model is downloaded once (or bundled with the app) and cached.
 */
import { env, pipeline } from "@xenova/transformers";

export type WorkerConfig = {
  model: string;           // e.g. "Xenova/whisper-base"
  localModelPath: string;  // absolute URL of the bundled models folder
  localModels: boolean;    // model files are bundled with the app
  wasmPath: string | null; // absolute URL of bundled ONNX Runtime .wasm files (null = library default)
};

export type WorkerRequest =
  | { type: "load"; config: WorkerConfig }
  | { type: "transcribe"; id: number; config: WorkerConfig; audio: Float32Array };

export type WorkerResponse =
  | { type: "progress"; file: string; loaded: number; total: number; status: string }
  | { type: "ready"; model: string }
  | { type: "result"; id: number; text: string }
  | { type: "error"; id?: number | undefined; phase: "load" | "run"; message: string };

type Transcriber = (audio: Float32Array, options: Record<string, unknown>) => Promise<{ text?: string } | { text?: string }[]>;

/** The worker global scope (typed minimally so this file also compiles with the DOM lib only). */
const ctx = self as unknown as { postMessage(message: WorkerResponse): void; onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null };
let loaded: { model: string; pipe: Promise<Transcriber> } | null = null;

function configure(c: WorkerConfig) {
  env.allowLocalModels = c.localModels;
  env.localModelPath = c.localModelPath;
  env.allowRemoteModels = true;   // first start without bundled model: download once from Hugging Face
  env.useBrowserCache = true;     // …then served from the browser cache, offline
  const wasm = env.backends.onnx.wasm as { numThreads?: number; wasmPaths?: string };
  wasm.numThreads = 1;            // multi-threading needs cross-origin isolation, which app WebViews don't have
  if (c.wasmPath) wasm.wasmPaths = c.wasmPath;
}

function getPipe(c: WorkerConfig): Promise<Transcriber> {
  if (loaded?.model === c.model) return loaded.pipe;
  configure(c);
  const pipe = pipeline("automatic-speech-recognition", c.model, {
    quantized: true,
    progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.file) ctx.postMessage({ type: "progress", file: p.file, loaded: p.loaded ?? 0, total: p.total ?? 0, status: p.status } satisfies WorkerResponse);
    },
  }) as unknown as Promise<Transcriber>;
  loaded = { model: c.model, pipe };
  pipe.catch(() => { if (loaded?.pipe === pipe) loaded = null; });
  return pipe;
}

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  let phase: "load" | "run" = "load";
  try {
    const transcribe = await getPipe(msg.config);
    if (msg.type === "load") { ctx.postMessage({ type: "ready", model: msg.config.model } satisfies WorkerResponse); return; }
    ctx.postMessage({ type: "ready", model: msg.config.model } satisfies WorkerResponse);
    phase = "run";
    const out = await transcribe(msg.audio, {
      language: "ar",
      task: "transcribe",
      chunk_length_s: 30,   // recordings longer than 30 s are processed in overlapping windows
      stride_length_s: 5,
      return_timestamps: false,
    });
    const text = (Array.isArray(out) ? out.map((o) => o.text ?? "").join(" ") : out.text ?? "").trim();
    ctx.postMessage({ type: "result", id: msg.id, text } satisfies WorkerResponse);
  } catch (err) {
    ctx.postMessage({ type: "error", id: msg.type === "transcribe" ? msg.id : undefined, phase, message: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse);
  }
};
