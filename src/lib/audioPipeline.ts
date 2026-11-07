/**
 * Stage 1 of the on-device recognition pipeline: voice activity detection (VAD) before Whisper.
 *
 *   microphone → record-wav.ts (16 kHz mono, rolling buffer) → trimSilence() → whisper.ts (worker)
 *              → quranMatcher.ts (alignment) → userAdaptation.ts (the user's voice profile)
 *
 * Whisper invents words in long silences (it tends to "continue" a famous text) and wastes time on them.
 * `trimSilence` removes the silence before the first and after the last voiced frame (keeping a short
 * margin so no consonant is cut) and shortens long pauses inside the recitation (breathing, turning a
 * page) to a natural length. Pure function: no Web Audio, runs anywhere, cheap (one pass over the samples).
 */

export type TrimOptions = {
  /** Margin kept before the first and after the last voiced frame. */
  padSeconds?: number;
  /** Pauses longer than this are shortened… */
  maxPauseSeconds?: number;
  /** …to this length. */
  keepPauseSeconds?: number;
};

export type TrimResult = {
  samples: Float32Array;
  /** Seconds of voice detected. */
  voicedSeconds: number;
  /** Seconds removed. */
  removedSeconds: number;
};

const FRAME_S = 0.03;
/** Never treat anything quieter than this as voice, never require more than VOICE_MAX to count as voice. */
const VOICE_MIN = 0.006, VOICE_MAX = 0.02;
/** Short gaps inside a word (stops like ب ت ك) are bridged so they never count as pauses. */
const HANGOVER_S = 0.15;
const FADE_S = 0.008;

function rms(a: Float32Array, from: number, to: number) {
  let sum = 0;
  for (let i = from; i < to; i++) sum += (a[i] ?? 0) * (a[i] ?? 0);
  return to > from ? Math.sqrt(sum / (to - from)) : 0;
}

/** Adaptive threshold: a few times the noise floor (the quietest fifth of the frames), within fixed limits. */
export function voiceThreshold(levels: readonly number[]): number {
  if (!levels.length) return VOICE_MAX;
  const sorted = [...levels].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.2)] ?? 0;
  return Math.min(VOICE_MAX, Math.max(VOICE_MIN, floor * 3));
}

/** Voiced flags per frame (with hangover), or null when there is no voice at all. */
export function detectVoice(samples: Float32Array, rate: number): { frame: number; voiced: boolean[] } | null {
  const frame = Math.max(1, Math.round(rate * FRAME_S));
  const levels: number[] = [];
  for (let i = 0; i < samples.length; i += frame) levels.push(rms(samples, i, Math.min(samples.length, i + frame)));
  const th = voiceThreshold(levels);
  const raw = levels.map((l) => l >= th);
  if (!raw.some(Boolean)) return null;
  const hang = Math.round(HANGOVER_S / FRAME_S);
  const voiced = raw.slice();
  let last = -Infinity;
  raw.forEach((v, i) => { if (v) last = i; else if (i - last <= hang) voiced[i] = true; });
  return { frame, voiced };
}

export function trimSilence(samples: Float32Array, rate: number, opts: TrimOptions = {}): TrimResult {
  const pad = Math.round((opts.padSeconds ?? 0.3) * rate);
  const maxPause = Math.round((opts.maxPauseSeconds ?? 1.2) * rate);
  const keepPause = Math.round((opts.keepPauseSeconds ?? 0.6) * rate);
  const vad = detectVoice(samples, rate);
  if (!vad) return { samples, voicedSeconds: 0, removedSeconds: 0 };
  const { frame, voiced } = vad;

  // Voiced runs in samples.
  const runs: [number, number][] = [];
  voiced.forEach((v, i) => {
    if (!v) return;
    const s = i * frame, e = Math.min(samples.length, (i + 1) * frame);
    const prev = runs[runs.length - 1];
    if (prev && prev[1] === s) prev[1] = e; else runs.push([s, e]);
  });
  const voicedSamples = runs.reduce((n, [s, e]) => n + e - s, 0);

  // Pieces to keep: margin around the voice, long pauses shortened to keepPause (half on each side).
  const pieces: [number, number][] = [];
  let start = Math.max(0, runs[0]![0] - pad);
  for (let r = 0; r < runs.length - 1; r++) {
    const gapFrom = runs[r]![1], gapTo = runs[r + 1]![0];
    if (gapTo - gapFrom > maxPause) {
      pieces.push([start, gapFrom + Math.floor(keepPause / 2)]);
      start = gapTo - Math.ceil(keepPause / 2);
    }
  }
  pieces.push([start, Math.min(samples.length, runs[runs.length - 1]![1] + pad)]);

  const total = pieces.reduce((n, [s, e]) => n + e - s, 0);
  if (total >= samples.length) return { samples, voicedSeconds: voicedSamples / rate, removedSeconds: 0 };
  const out = new Float32Array(total);
  const fade = Math.max(1, Math.round(FADE_S * rate));
  let o = 0;
  pieces.forEach(([s, e], k) => {
    out.set(samples.subarray(s, e), o);
    // Short fades at the joins avoid clicks that Whisper could hear as consonants.
    if (k > 0) for (let i = 0; i < fade && i < e - s; i++) out[o + i]! *= i / fade;
    if (k < pieces.length - 1) for (let i = 0; i < fade && i < e - s; i++) out[o + e - s - 1 - i]! *= i / fade;
    o += e - s;
  });
  return { samples: out, voicedSeconds: voicedSamples / rate, removedSeconds: (samples.length - total) / rate };
}

/* ───────────── streaming VAD gate (live engines) ───────────── */

/**
 * Streaming counterpart of `trimSilence` for the live phoneme engine: audio is pushed in blocks as it is
 * recorded; leading silence is dropped and every pause is cut down to `keepPauseSeconds`, so the
 * recognizer never spends time (or invents phonemes) on silence. Speech is never dropped: the threshold
 * adapts to the room's noise floor and a short hangover keeps word endings.
 */
export class VadGate {
  private readonly frame: number;
  private readonly keepPause: number;
  private readonly hang: number;
  private levels: number[] = [];
  private silentRun = 0;       // samples of silence since the last voice
  private started = false;
  private pending = new Float32Array(0);
  private sinceVoice = Infinity;

  constructor(private readonly rate: number, opts: { keepPauseSeconds?: number } = {}) {
    this.frame = Math.max(1, Math.round(rate * FRAME_S));
    this.keepPause = Math.round((opts.keepPauseSeconds ?? 0.6) * rate);
    this.hang = Math.round(HANGOVER_S * rate);
  }

  /** Feeds a block; returns the samples to pass on (possibly empty). */
  push(block: Float32Array): Float32Array {
    const buf = new Float32Array(this.pending.length + block.length);
    buf.set(this.pending); buf.set(block, this.pending.length);
    const whole = buf.length - (buf.length % this.frame);
    this.pending = buf.slice(whole);
    const out: Float32Array[] = [];
    for (let i = 0; i < whole; i += this.frame) {
      const f = buf.subarray(i, i + this.frame);
      const level = rms(f, 0, f.length);
      this.levels.push(level);
      if (this.levels.length > 400) this.levels.splice(0, this.levels.length - 400); // last ~12 s
      const voiced = level >= voiceThreshold(this.levels);
      if (voiced) { this.started = true; this.silentRun = 0; this.sinceVoice = 0; out.push(f); continue; }
      this.sinceVoice += f.length;
      if (!this.started) continue;
      // Hangover (word endings) and the first part of a pause pass; longer silence is dropped.
      if (this.sinceVoice <= this.hang || this.silentRun < this.keepPause) { this.silentRun += f.length; out.push(f); }
    }
    const n = out.reduce((s, f) => s + f.length, 0);
    const res = new Float32Array(n);
    let o = 0;
    for (const f of out) { res.set(f, o); o += f.length; }
    return res;
  }

  /** True once any voice was seen. */
  get heardVoice() { return this.started; }
}

/* ───────────── Kaldi-compatible log-mel filterbank (Zipformer front end) ───────────── */

/**
 * 80-bin Kaldi "fbank" exactly as k2/icefall/sherpa-onnx compute it for the Zipformer models:
 * 16 kHz, 25 ms Povey window every 10 ms, DC removal, pre-emphasis 0.97, 512-point power spectrum,
 * mel bins from 20 Hz to 7600 Hz (high_freq = −400), natural log, no dither, snip_edges = false
 * (the first frame is centred on sample 80, edges are mirrored). A Slaney/librosa mel front end
 * roughly doubles this model's error rate, so the details matter.
 *
 * Streaming: `accept()` audio as it arrives, `takeFrames()` returns every frame that is complete;
 * `finish()` adds the frames that need the mirrored end of the signal.
 */
export const FBANK = { rate: 16000, frameLength: 400, frameShift: 160, fft: 512, bins: 80, lowHz: 20, highHz: 16000 / 2 - 400, preemph: 0.97 } as const;

const melScale = (hz: number) => 1127 * Math.log(1 + hz / 700);
let melBanks: { start: number; weights: Float32Array }[] | null = null;
let poveyWindow: Float32Array | null = null;
const FLT_EPS = 1.1920928955078125e-7;

function banks() {
  if (melBanks) return melBanks;
  const { fft, bins, lowHz, highHz, rate } = FBANK;
  const lo = melScale(lowHz), hi = melScale(highHz), delta = (hi - lo) / (bins + 1);
  melBanks = [];
  for (let m = 0; m < bins; m++) {
    const left = lo + m * delta, center = left + delta, right = center + delta;
    let start = -1;
    const w: number[] = [];
    for (let i = 0; i < fft / 2; i++) {
      const x = melScale((i * rate) / fft);
      if (x > left && x < right) {
        if (start < 0) start = i;
        w.push(x <= center ? (x - left) / (center - left) : (right - x) / (right - center));
      } else if (start >= 0) break;
    }
    melBanks.push({ start: Math.max(0, start), weights: Float32Array.from(w) });
  }
  return melBanks;
}

function povey() {
  if (poveyWindow) return poveyWindow;
  const n = FBANK.frameLength;
  poveyWindow = new Float32Array(n);
  for (let i = 0; i < n; i++) poveyWindow[i] = Math.pow(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)), 0.85);
  return poveyWindow;
}

/** In-place radix-2 FFT of (re, im), length a power of two. */
function fftInPlace(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j]!, re[i]!]; [im[i], im[j]] = [im[j]!, im[i]!]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b]! * cr - im[b]! * ci, ti = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - tr; im[b] = im[a]! - ti; re[a] = re[a]! + tr; im[a] = im[a]! + ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/** One fbank frame from `frame` (frameLength samples, already extracted). */
export function fbankFrame(frame: ArrayLike<number>, out: Float32Array = new Float32Array(FBANK.bins)): Float32Array {
  const n = FBANK.frameLength, win = povey();
  const re = new Float64Array(FBANK.fft), im = new Float64Array(FBANK.fft);
  let mean = 0;
  for (let i = 0; i < n; i++) mean += frame[i]!;
  mean /= n;
  for (let i = 0; i < n; i++) re[i] = frame[i]! - mean;
  for (let i = n - 1; i > 0; i--) re[i] = re[i]! - FBANK.preemph * re[i - 1]!;
  re[0] = re[0]! - FBANK.preemph * re[0]!;
  for (let i = 0; i < n; i++) re[i] = re[i]! * win[i]!;
  fftInPlace(re, im);
  const b = banks();
  for (let m = 0; m < FBANK.bins; m++) {
    const { start, weights } = b[m]!;
    let e = 0;
    for (let k = 0; k < weights.length; k++) { const i = start + k; e += weights[k]! * (re[i]! * re[i]! + im[i]! * im[i]!); }
    out[m] = Math.log(Math.max(e, FLT_EPS));
  }
  return out;
}

export class KaldiFbank {
  /** Samples not yet needed by any finished frame; `base` is the absolute index of buf[0]. */
  private buf = new Float32Array(16000 * 4);
  private len = 0;
  private base = 0;
  /** The first samples, kept for the mirrored start of the first frames. */
  private head = new Float32Array(FBANK.frameLength);
  private headLen = 0;
  private done = 0;
  private finished = false;

  accept(block: ArrayLike<number>) {
    if (this.finished) return;
    if (this.len + block.length > this.buf.length) {
      const next = new Float32Array(Math.max(this.buf.length * 2, this.len + block.length));
      next.set(this.buf.subarray(0, this.len)); this.buf = next;
    }
    for (let i = 0; i < block.length; i++) {
      const v = block[i]!;
      this.buf[this.len++] = v;
      if (this.headLen < this.head.length) this.head[this.headLen++] = v;
    }
  }
  finish() { this.finished = true; }
  /** Frames returned so far. */
  get frames() { return this.done; }
  private get total() { return this.base + this.len; }

  private sample(j: number): number {
    const n = this.total;
    if (j < 0) j = -j - 1;                 // mirrored start (only the first frames)
    if (j >= n) j = 2 * n - 1 - j;         // mirrored end (only after finish())
    if (j < this.base) return this.head[j] ?? 0;
    return this.buf[j - this.base] ?? 0;
  }

  /** All frames that can be computed now (each Float32Array(80)). */
  takeFrames(): Float32Array[] {
    const { frameLength: L, frameShift: S } = FBANK;
    const n = this.total;
    const out: Float32Array[] = [];
    const last = this.finished ? Math.floor((n + S / 2) / S) : Infinity;
    const frame = new Float64Array(L);
    while (this.done < last) {
      const start = this.done * S + S / 2 - L / 2;
      if (!this.finished && start + L > n) break;
      for (let k = 0; k < L; k++) frame[k] = this.sample(start + k);
      out.push(fbankFrame(frame));
      this.done++;
    }
    // Drop samples no future frame needs (keeps memory flat for long recitations).
    const keepFrom = Math.max(0, this.done * S + S / 2 - L / 2);
    const drop = Math.min(this.len, keepFrom - this.base);
    if (drop > 16000) { this.buf.copyWithin(0, drop, this.len); this.len -= drop; this.base += drop; }
    return out;
  }
}
