/**
 * Runtime-independent core of the Zipformer phoneme engine (Stage 2): streaming state handling and CTC
 * decoding for Quran-Lab's `zipformer_p_arabic_v3.1.int8.onnx` (k2-fsa streaming CTC Zipformer2,
 * sherpa-onnx export). The ONNX session is injected, so the same code runs in the Web Worker
 * (onnxruntime-web) and in tests.
 *
 * Model contract (read from the model file):
 *   input  x [N, 61, 80] fbank frames (chunk of 48 new frames + 13 frames of right context),
 *          per-layer caches (16 layers in 6 stacks) + embed_states [N,128,3,19] + processed_lens [N]
 *   output log_probs [N, 12, 251] (40 ms per frame) + "new_<cache>" for every cache input
 *   tokens 251 phoneme symbols (tokens.txt), blank = 250 (NOT 0)
 */
import { FBANK, KaldiFbank } from "./audioPipeline";

export const ZIPFORMER = {
  chunkFrames: 61,
  shiftFrames: 48,
  vocab: 251,
  blank: 250,
  /** Output frame duration (4× subsampling of 10 ms frames). */
  frameSeconds: 0.04,
  /** Silence appended at the end so the last chunk is decoded (sherpa-onnx uses 0.66 s). */
  tailPaddingSeconds: 0.66,
  // From the model's metadata (sherpa-onnx computes the cache shapes from the same values).
  numEncoderLayers: [2, 2, 3, 4, 3, 2],
  encoderDims: [192, 256, 384, 512, 384, 256],
  leftContextLen: [256, 128, 64, 32, 64, 128],
  queryHeadDims: [32, 32, 32, 32, 32, 32],
  valueHeadDims: [12, 12, 12, 12, 12, 12],
  numHeads: [4, 4, 4, 8, 4, 4],
  cnnModuleKernels: [31, 31, 15, 15, 15, 31],
} as const;

export type TensorLike = { data: Float32Array | BigInt64Array; dims: readonly number[] };
export type SessionLike = { run(feeds: Record<string, TensorLike>): Promise<Record<string, TensorLike>> };
export type TensorFactory = {
  float(data: Float32Array, dims: number[]): TensorLike;
  int64(data: BigInt64Array, dims: number[]): TensorLike;
};

/** Names and zero shapes of every state input (batch size 1). */
export function stateSpecs(): { name: string; dims: number[]; int64?: boolean }[] {
  const z = ZIPFORMER, out: { name: string; dims: number[]; int64?: boolean }[] = [];
  let layer = 0;
  z.numEncoderLayers.forEach((count, s) => {
    const left = z.leftContextLen[s]!, dim = z.encoderDims[s]!, heads = z.numHeads[s]!;
    const pad = (z.cnnModuleKernels[s]! - 1) / 2;
    for (let k = 0; k < count; k++, layer++) {
      out.push({ name: `cached_key_${layer}`, dims: [left, 1, z.queryHeadDims[s]! * heads] });
      out.push({ name: `cached_nonlin_attn_${layer}`, dims: [1, 1, left, (dim * 3) / 4] });
      out.push({ name: `cached_val1_${layer}`, dims: [left, 1, z.valueHeadDims[s]! * heads] });
      out.push({ name: `cached_val2_${layer}`, dims: [left, 1, z.valueHeadDims[s]! * heads] });
      out.push({ name: `cached_conv1_${layer}`, dims: [1, dim, pad] });
      out.push({ name: `cached_conv2_${layer}`, dims: [1, dim, pad] });
    }
  });
  out.push({ name: "embed_states", dims: [1, 128, 3, 19] });
  out.push({ name: "processed_lens", dims: [1], int64: true });
  return out;
}

/** tokens.txt ("<symbol> <id>" per line, sherpa-onnx format) → symbol per id. */
export function parseTokens(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^(.*\S)?\s+(\d+)\s*$/.exec(line) ?? /^(\S+)\s+(\d+)$/.exec(line);
    if (!m) continue;
    out[Number(m[2])] = m[1] ?? " ";
  }
  for (let i = 0; i < out.length; i++) out[i] ??= "";
  return out;
}

export type DecodedToken = { id: number; symbol: string; /** seconds from the start of the stream */ time: number; /** probability of the winning symbol */ prob: number };

/** Greedy CTC over log-probabilities [frames × vocab]: argmax, collapse repeats, drop blanks. */
export function ctcGreedy(logProbs: Float32Array, frames: number, vocab: number, blank: number, state: { prev: number; frame: number }, tokens: readonly string[]): DecodedToken[] {
  const out: DecodedToken[] = [];
  for (let t = 0; t < frames; t++) {
    let best = 0, bestV = -Infinity;
    const o = t * vocab;
    for (let v = 0; v < vocab; v++) { const x = logProbs[o + v]!; if (x > bestV) { bestV = x; best = v; } }
    if (best !== blank && best !== state.prev) out.push({ id: best, symbol: tokens[best] ?? "", time: (state.frame + t) * ZIPFORMER.frameSeconds, prob: Math.exp(bestV) });
    state.prev = best;
  }
  state.frame += frames;
  return out;
}

/**
 * One recitation: audio in (16 kHz), phoneme tokens out, chunk by chunk as soon as 61 frames are ready.
 * No language model — the output is what the model hears, not what it expects.
 */
export class ZipformerStream {
  private fbank = new KaldiFbank();
  private pending: Float32Array[] = [];   // fbank frames not yet consumed
  private states: Record<string, TensorLike>;
  private ctc = { prev: -1, frame: 0 };
  private busy: Promise<void> = Promise.resolve();
  readonly tokens: DecodedToken[] = [];
  /** Milliseconds spent in the model (for the real-time factor). */
  computeMs = 0;
  chunks = 0;

  constructor(private session: SessionLike, private tensors: TensorFactory, private symbols: readonly string[]) {
    this.states = {};
    for (const s of stateSpecs()) {
      const size = s.dims.reduce((a, b) => a * b, 1);
      this.states[s.name] = s.int64 ? tensors.int64(new BigInt64Array(size), s.dims) : tensors.float(new Float32Array(size), s.dims);
    }
  }

  /** Adds audio; resolves once every complete chunk has been decoded. */
  accept(samples: Float32Array): Promise<DecodedToken[]> {
    this.fbank.accept(samples);
    return this.enqueue();
  }

  /** End of the recitation: pads with silence and decodes the rest. */
  finish(): Promise<DecodedToken[]> {
    this.fbank.accept(new Float32Array(Math.round(ZIPFORMER.tailPaddingSeconds * FBANK.rate)));
    this.fbank.finish();
    return this.enqueue();
  }

  private enqueue(): Promise<DecodedToken[]> {
    const run = this.busy.then(() => this.drain());
    this.busy = run.then(() => undefined, () => undefined);
    return run;
  }

  private async drain(): Promise<DecodedToken[]> {
    this.pending.push(...this.fbank.takeFrames());
    const fresh: DecodedToken[] = [];
    const { chunkFrames: T, shiftFrames: SH, vocab, blank } = ZIPFORMER;
    while (this.pending.length >= T) {
      const x = new Float32Array(T * FBANK.bins);
      for (let i = 0; i < T; i++) x.set(this.pending[i]!, i * FBANK.bins);
      const started = Date.now();
      const out = await this.session.run({ ...this.states, x: this.tensors.float(x, [1, T, FBANK.bins]) });
      this.computeMs += Date.now() - started;
      this.chunks++;
      for (const name of Object.keys(this.states)) {
        const next = out[`new_${name}`];
        if (!next) throw new Error(`model output new_${name} missing`);
        this.states[name] = next;
      }
      const lp = out["log_probs"];
      if (!lp) throw new Error("model output log_probs missing");
      const frames = lp.dims[1] ?? 0;
      fresh.push(...ctcGreedy(lp.data as Float32Array, frames, vocab, blank, this.ctc, this.symbols));
      this.pending.splice(0, SH);
    }
    this.tokens.push(...fresh);
    return fresh;
  }

  /** Real-time factor so far (model time ÷ audio time); < 1 means faster than real time. */
  get rtf() { return this.chunks ? this.computeMs / 1000 / (this.chunks * ZIPFORMER.shiftFrames * 0.01) : 0; }
}

/** Phoneme string of decoded tokens (the symbols joined; word-piece markers removed). */
export const tokensToPhonemes = (tokens: readonly DecodedToken[]) => tokens.map((t) => t.symbol.replace(/[▁_]/g, "")).join("");
