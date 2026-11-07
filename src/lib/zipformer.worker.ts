/**
 * Web Worker running Quran-Lab's streaming phoneme Zipformer on the device with ONNX Runtime Web.
 * Audio never leaves the device; the model and tokens are bundled with the app (/models/).
 *
 * Execution provider: WebGPU when this ONNX Runtime build and the browser offer it, otherwise WebAssembly.
 * (The int8 model's MatMulInteger / DynamicQuantizeLinear kernels run on the CPU in either case, so
 * WebAssembly is the normal path; one 0.48 s chunk costs ~30 ms natively, a few times that in WASM.)
 */
import * as ort from "onnxruntime-web";
import { parseTokens, ZipformerStream, type DecodedToken, type SessionLike, type TensorLike } from "./zipformerCore";

export type ZfConfig = { modelUrl: string; tokensUrl: string; wasmPath: string | null };

export type ZfRequest =
  | { type: "load"; config: ZfConfig }
  | { type: "start"; id: number }
  | { type: "audio"; id: number; samples: Float32Array }
  | { type: "finish"; id: number }
  | { type: "cancel"; id: number };

export type ZfResponse =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready"; backend: string }
  | { type: "tokens"; id: number; tokens: DecodedToken[]; final: boolean; rtf: number }
  | { type: "error"; id?: number | undefined; phase: "load" | "run"; message: string };

const ctx = self as unknown as { postMessage(message: ZfResponse): void; onmessage: ((e: MessageEvent<ZfRequest>) => void) | null };

let model: Promise<{ session: SessionLike; symbols: string[]; backend: string }> | null = null;
let stream: { id: number; zs: ZipformerStream } | null = null;

const tensors = {
  float: (data: Float32Array, dims: number[]) => new ort.Tensor("float32", data, dims) as unknown as TensorLike,
  int64: (data: BigInt64Array, dims: number[]) => new ort.Tensor("int64", data, dims) as unknown as TensorLike,
};

/** Web version: keep the model in the Cache Storage so it loads offline next time (the app has it locally anyway). */
const CACHE = "quran-muallem-zipformer-v3.1";
async function cachedResponse(url: string): Promise<Response> {
  try {
    const u = new URL(url);
    if (typeof caches !== "undefined" && u.protocol.startsWith("http") && u.hostname !== "localhost") {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(url);
      if (hit) return hit;
      const r = await fetch(url);
      if (r.ok) { void cache.put(url, r.clone()).catch(() => {}); }
      return r;
    }
  } catch { /* no cache storage: plain fetch */ }
  return fetch(url);
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const r = await cachedResponse(url);
  if (!r.ok) throw new Error(`model file missing (${r.status})`);
  const total = Number(r.headers.get("content-length") ?? 0);
  if (!r.body) return new Uint8Array(await r.arrayBuffer());
  const reader = r.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0, last = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); loaded += value.length;
    if (loaded - last > 1 << 20) { last = loaded; ctx.postMessage({ type: "progress", loaded, total }); }
  }
  const out = new Uint8Array(loaded);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  ctx.postMessage({ type: "progress", loaded, total: total || loaded });
  return out;
}

function load(c: ZfConfig) {
  model ??= (async () => {
    const env = ort.env as unknown as { wasm: { numThreads?: number; wasmPaths?: string; simd?: boolean }; webgpu?: unknown };
    env.wasm.numThreads = 1; // threads need cross-origin isolation, which app WebViews do not have
    if (c.wasmPath) env.wasm.wasmPaths = c.wasmPath;
    const [bytes, tokensText] = await Promise.all([fetchBytes(c.modelUrl), fetch(c.tokensUrl).then((r) => { if (!r.ok) throw new Error("tokens.txt missing"); return r.text(); })]);
    const symbols = parseTokens(tokensText);
    if (symbols.length !== 251) throw new Error(`tokens.txt has ${symbols.length} symbols, the model expects 251`);
    const gpu = typeof navigator !== "undefined" && "gpu" in navigator && env.webgpu !== undefined;
    const create = (providers: string[]) => ort.InferenceSession.create(bytes, { executionProviders: providers, graphOptimizationLevel: "all" });
    let session: ort.InferenceSession, backend = "wasm";
    if (gpu) {
      try { session = await create(["webgpu"]); backend = "webgpu"; } catch { session = await create(["wasm"]); }
    } else session = await create(["wasm"]);
    return { session: session as unknown as SessionLike, symbols, backend };
  })();
  model.catch(() => { model = null; });
  return model;
}

ctx.onmessage = async (e: MessageEvent<ZfRequest>) => {
  const msg = e.data;
  if (msg.type === "load") {
    try { const m = await load(msg.config); ctx.postMessage({ type: "ready", backend: m.backend }); }
    catch (err) { ctx.postMessage({ type: "error", phase: "load", message: err instanceof Error ? err.message : String(err) }); }
    return;
  }
  const id = msg.id;
  try {
    if (msg.type === "start") {
      if (!model) throw new Error("model not loaded");
      const m = await model;
      stream = { id, zs: new ZipformerStream(m.session, tensors, m.symbols) };
      return;
    }
    if (msg.type === "cancel") { if (stream?.id === id) stream = null; return; }
    const s = stream;
    if (!s || s.id !== id) return; // a cancelled or older recitation
    const fresh = msg.type === "audio" ? await s.zs.accept(msg.samples) : await s.zs.finish();
    if (stream?.id !== id) return;
    const final = msg.type === "finish";
    if (fresh.length || final) ctx.postMessage({ type: "tokens", id, tokens: fresh, final, rtf: s.zs.rtf });
    if (final) stream = null;
  } catch (err) {
    ctx.postMessage({ type: "error", id, phase: "run", message: err instanceof Error ? err.message : String(err) });
  }
};
