/**
 * Microphone recording for on-device Whisper.
 *
 * Why recordings used to break off after a few seconds, and what this file does about it:
 *
 * 1. Capture on the audio thread. The old recorder used a ScriptProcessorNode, whose callback runs on the
 *    main (UI) thread. When that thread was busy (live Whisper updates every 4 s re-encoded the whole
 *    recording to WAV and decoded it again; React re-rendered the Mushaf page) audio blocks were dropped,
 *    so the recording had gaps from the first live update on. Now an AudioWorklet copies the microphone
 *    samples on the audio rendering thread and posts them in small batches; nothing is lost while the UI
 *    is busy. ScriptProcessorNode remains only as a fallback for WebViews without AudioWorklet.
 * 2. Keep one continuous buffer. Samples are resampled to 16 kHz as they arrive (streaming box filter)
 *    and appended to a chunked buffer. Nothing is ever cleared while recording; live updates read a
 *    window of it (`samples(from, to)`) without copying the whole recording.
 * 3. Pauses never end a recording. Silence is only measured (per 100 ms frame) to tell speech from noise
 *    and to find quiet points for cutting live windows. Only the user (or the size limit, ≈ 12 min, or the
 *    microphone being taken away by the system) ends a recording.
 * 4. The AudioContext is resumed if the system suspends it (iOS "interrupted", Android audio focus).
 */
import { MAX_AUDIO_BYTES, MIN_AUDIO_BYTES, SAMPLE_RATE } from "./whisper";
import { audioDebug, secs } from "./audioDebug";

/** RMS (0..1) below which a 100 ms frame counts as silence / room noise. */
const VOICE_RMS = 0.02;
/** Minimum voiced time for a recording to count as speech. */
const MIN_VOICED_SECONDS = 0.25;
/** Analysis frame: 100 ms at 16 kHz. */
export const FRAME = SAMPLE_RATE / 10;

const rms = (data: Float32Array) => {
  let sum = 0;
  for (const value of data) sum += value * value;
  return Math.sqrt(sum / Math.max(1, data.length));
};

export { encodeWav } from "./wav";
import { encodeWav } from "./wav";

/** Whisper works at 16 kHz. */
export const TARGET_RATE = SAMPLE_RATE;

/** One-shot downsampling of whole chunks (kept for callers outside the recorder). */
export function downsample(chunks: readonly Float32Array[], fromRate: number, toRate = TARGET_RATE): Float32Array {
  const r = new StreamResampler(fromRate, toRate);
  const parts = chunks.map((c) => r.push(c));
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/**
 * Streaming box-filter downsampler: each output sample is the average of the input samples in its
 * span (cheap anti-aliasing). Keeps its position between blocks, so block borders add no clicks or drift.
 */
export class StreamResampler {
  private readonly ratio: number;
  private next: number;
  private consumed = 0;
  private sum = 0;
  private count = 0;
  constructor(readonly fromRate: number, readonly toRate = TARGET_RATE) {
    this.ratio = fromRate / toRate;
    this.next = this.ratio;
  }
  push(input: Float32Array): Float32Array {
    if (this.ratio <= 1) return input.slice();
    const out = new Float32Array(Math.ceil((input.length + this.count) / this.ratio) + 1);
    let n = 0;
    for (let i = 0; i < input.length; i++) {
      this.sum += input[i] ?? 0; this.count++; this.consumed++;
      if (this.consumed >= this.next) {
        out[n++] = this.sum / this.count;
        this.sum = 0; this.count = 0; this.next += this.ratio;
      }
    }
    return out.subarray(0, n);
  }
}

/** Append-only sample buffer in 10 s blocks: no reallocation of the whole recording as it grows. */
export class ChunkedBuffer {
  private blocks: Float32Array[] = [];
  private fill = 0;
  length = 0;
  constructor(private readonly blockSize = SAMPLE_RATE * 10) {}
  push(data: Float32Array) {
    let i = 0;
    while (i < data.length) {
      if (!this.blocks.length || this.fill === this.blockSize) { this.blocks.push(new Float32Array(this.blockSize)); this.fill = 0; }
      const block = this.blocks[this.blocks.length - 1]!;
      const n = Math.min(this.blockSize - this.fill, data.length - i);
      block.set(data.subarray(i, i + n), this.fill);
      this.fill += n; i += n; this.length += n;
    }
  }
  /** Copy of samples [from, to). */
  slice(from = 0, to = this.length): Float32Array {
    from = Math.max(0, Math.min(from, this.length)); to = Math.max(from, Math.min(to, this.length));
    const out = new Float32Array(to - from);
    let o = 0, pos = from;
    while (pos < to) {
      const b = Math.floor(pos / this.blockSize), off = pos % this.blockSize;
      const n = Math.min(this.blockSize - off, to - pos);
      out.set(this.blocks[b]!.subarray(off, off + n), o);
      o += n; pos += n;
    }
    return out;
  }
}

/** Per-100 ms loudness of the recording (for voice detection and finding pauses). */
export class FrameMeter {
  private pending = new Float32Array(FRAME);
  private fill = 0;
  /** RMS of every completed frame. */
  readonly levels: number[] = [];
  voiced = 0;
  push(data: Float32Array) {
    for (let i = 0; i < data.length; i++) {
      this.pending[this.fill++] = data[i] ?? 0;
      if (this.fill === FRAME) {
        const level = rms(this.pending);
        this.levels.push(level);
        if (level >= VOICE_RMS) this.voiced++;
        this.fill = 0;
      }
    }
  }
  /** Seconds with voice in samples [from, to). */
  voicedSecondsBetween(from: number, to: number) {
    let n = 0;
    for (let f = Math.floor(from / FRAME); f < Math.min(this.levels.length, Math.ceil(to / FRAME)); f++) if ((this.levels[f] ?? 0) >= VOICE_RMS) n++;
    return n / 10;
  }
  /** Sample index of the quietest frame in [from, to) — a pause, good for cutting without splitting a word. */
  quietestPoint(from: number, to: number): number {
    let best = Math.floor(from / FRAME), min = Infinity;
    for (let f = Math.floor(from / FRAME); f < Math.min(this.levels.length, Math.floor(to / FRAME)); f++) {
      const level = this.levels[f] ?? 0;
      if (level < min) { min = level; best = f; }
    }
    return best * FRAME + FRAME / 2;
  }
}

/** Copies microphone samples on the audio thread and posts them in batches of ~40 ms. */
const WORKLET = `
class HifzMicTap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === this.buf.length) { this.port.postMessage(this.buf, [this.buf.buffer]); this.buf = new Float32Array(2048); this.n = 0; }
    }
    return true;
  }
}
registerProcessor("hifz-mic-tap", HifzMicTap);`;

async function connectTap(context: AudioContext, source: MediaStreamAudioSourceNode, onBlock: (b: Float32Array) => void): Promise<{ disconnect: () => void; kind: string }> {
  if (context.audioWorklet && typeof AudioWorkletNode !== "undefined") {
    let url: string | null = null;
    try {
      url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
      await context.audioWorklet.addModule(url);
      const node = new AudioWorkletNode(context, "hifz-mic-tap", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
      node.port.onmessage = (e: MessageEvent<Float32Array>) => onBlock(e.data);
      // A silent gain keeps the graph pulled on every browser without playing the microphone back.
      const mute = context.createGain(); mute.gain.value = 0;
      source.connect(node); node.connect(mute); mute.connect(context.destination);
      return { kind: "worklet", disconnect: () => { node.port.onmessage = null; node.disconnect(); mute.disconnect(); } };
    } catch (e) {
      audioDebug("worklet unavailable, using ScriptProcessor", { error: String(e) });
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  }
  const node = context.createScriptProcessor(4096, 1, 1);
  node.onaudioprocess = (event) => onBlock(new Float32Array(event.inputBuffer.getChannelData(0)));
  source.connect(node); node.connect(context.destination);
  return { kind: "script-processor", disconnect: () => { node.onaudioprocess = null; node.disconnect(); } };
}

export type Recording = Awaited<ReturnType<typeof recordWav>>;

/** Compressed formats for keeping a recording, best first (Android WebView: Opus; iOS: AAC). */
const KEEP_TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm"];
export function keepMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return KEEP_TYPES.find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) ?? null;
}

/**
 * Records the same microphone stream compressed (≈ 32 kbit/s) for saving and listening back.
 * Started without a timeslice, so it yields exactly one complete file when stopped — no chunk
 * boundaries that could cut the audio.
 */
function startKeeper(stream: MediaStream) {
  const mimeType = keepMimeType();
  if (!mimeType) return null;
  try {
    const mr = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32_000 });
    const parts: Blob[] = [];
    const done = new Promise<Blob | null>((resolve) => {
      mr.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
      mr.onstop = () => resolve(parts.length ? new Blob(parts, { type: mr.mimeType || mimeType }) : null);
      mr.onerror = () => resolve(null);
    });
    mr.start();
    return {
      stop: () => { if (mr.state !== "inactive") mr.stop(); },
      pause: () => { if (mr.state === "recording") mr.pause(); },
      resume: () => { if (mr.state === "paused") mr.resume(); },
      done,
    };
  } catch { return null; }
}

/**
 * Starts recording. `onLimit` is called once when the size limit is reached, `onInterrupted` when the
 * system takes the microphone away (phone call, another app); both should finish the recording.
 */
export async function recordWav(onLimit: () => void, onInterrupted?: () => void, { keepAudio = false }: { keepAudio?: boolean } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });
  let keeper = keepAudio ? startKeeper(stream) : null;
  let context: AudioContext | undefined;
  try {
    context = new AudioContext();
    await context.resume();
    const audioContext = context;
    const source = audioContext.createMediaStreamSource(stream);
    // The analyser only reads the signal for the live meter; it is not connected to the speakers.
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6;
    const meterData = new Float32Array(analyser.fftSize);
    source.connect(analyser);

    const outRate = Math.min(TARGET_RATE, audioContext.sampleRate);
    const resampler = new StreamResampler(audioContext.sampleRate, outRate);
    const buffer = new ChunkedBuffer(outRate * 10);
    const frames = new FrameMeter();
    const maxSamples = Math.floor((MAX_AUDIO_BYTES - 44) / 2);
    let stopped = false, limited = false, paused = false, blocks = 0;
    const startedAt = performance.now();

    const tap = await connectTap(audioContext, source, (block) => {
      // Paused: nothing is added; the recording continues seamlessly on resume.
      if (stopped || limited || paused) return;
      blocks++;
      const pcm = resampler.push(block);
      if (buffer.length + pcm.length > maxSamples) { limited = true; audioDebug("size limit reached", { seconds: secs(buffer.length, outRate) }); onLimit(); return; }
      buffer.push(pcm); frames.push(pcm);
    });

    const resume = () => {
      if (stopped || audioContext.state === "running") return;
      audioDebug("audio context " + audioContext.state + ", resuming");
      void audioContext.resume().catch(() => {});
    };
    audioContext.addEventListener("statechange", resume);
    const track = stream.getAudioTracks()[0];
    const ended = () => { if (!stopped) { audioDebug("microphone track ended by the system", { seconds: secs(buffer.length, outRate) }); onInterrupted?.(); } };
    track?.addEventListener("ended", ended);
    audioDebug("recording started", { capture: tap.kind, deviceRate: audioContext.sampleRate, outRate });

    const cancel = () => {
      if (stopped) return;
      stopped = true;
      keeper?.stop(); // flush the compressed copy before the tracks end
      audioContext.removeEventListener("statechange", resume);
      track?.removeEventListener("ended", ended);
      stream.getTracks().forEach((t) => t.stop());
      tap.disconnect(); analyser.disconnect(); source.disconnect();
      void audioContext.close();
    };
    const toFile = (samples: Float32Array) => {
      const blob = encodeWav([samples], outRate);
      return new File([blob], "recording.wav", { type: "audio/wav" });
    };
    const isSpeech = () => frames.voiced / 10 >= MIN_VOICED_SECONDS;

    return {
      cancel,
      /**
       * Pause / resume: the microphone stays reserved, but nothing is recorded (also not in the kept copy);
       * on resume the samples go on where they stopped, so the recognizer sees one continuous recitation.
       */
      pause() { if (stopped || paused) return; paused = true; keeper?.pause(); if (track) track.enabled = false; },
      resume() { if (stopped || !paused) return; paused = false; if (track) track.enabled = true; keeper?.resume(); void audioContext.resume().catch(() => {}); },
      isPaused: () => paused,
      /** Sample rate of `samples()` (16 kHz, or lower on rare devices). */
      sampleRate: outRate,
      /** Current input loudness, 0..1, for a live meter. */
      level() {
        if (stopped || paused) return 0;
        analyser.getFloatTimeDomainData(meterData);
        return Math.min(1, rms(meterData) * 4);
      },
      /** Seconds recorded so far. */
      duration: () => buffer.length / outRate,
      /** Samples recorded so far (at `sampleRate`). */
      totalSamples: () => buffer.length,
      /** Seconds in which a voice was heard (pauses excluded); used to spot transcripts that are too long. */
      voicedSeconds: () => frames.voiced / 10,
      voicedSecondsBetween: (from: number, to: number) => frames.voicedSecondsBetween(from, to),
      /** A pause near the end of [from, to), for cutting live windows between words. */
      quietestPoint: (from: number, to: number) => frames.quietestPoint(from, to),
      /** Samples [from, to) of the recording so far, without stopping. */
      samples: (from?: number, to?: number) => buffer.slice(from, to),
      /** The recording so far as a WAV, without stopping. Null if too short or silent. */
      snapshot(): File | null {
        if (stopped || !isSpeech() || buffer.length < outRate * 0.8) return null;
        return toFile(buffer.slice());
      },
      /** Stops and returns the whole recording as 16 kHz samples. Throws "emptyRecording" / "silentRecording". */
      stopSamples(): Float32Array {
        if (stopped) throw new Error("emptyRecording");
        const all = buffer.slice();
        cancel();
        audioDebug("recording stopped", {
          seconds: secs(all.length, outRate), voicedSeconds: frames.voiced / 10, wavBytes: 44 + all.length * 2,
          wallSeconds: Math.round((performance.now() - startedAt) / 100) / 10, blocks, capture: tap.kind,
        });
        if (all.length < outRate * 0.3 || 44 + all.length * 2 < MIN_AUDIO_BYTES) throw new Error("emptyRecording");
        if (!isSpeech()) throw new Error("silentRecording");
        return all;
      },
      /**
       * After stopping: the recording to keep (compressed when the device supports it, else WAV).
       * Null when keepAudio was off.
       */
      async keptAudio(fallback?: Float32Array): Promise<Blob | null> {
        if (!keepAudio) return null;
        const blob = keeper ? await keeper.done : null;
        return blob ?? (fallback ? encodeWav([fallback], outRate) : null);
      },
      /** Stops and returns the whole recording as a WAV file. */
      stop(): File { return toFile(this.stopSamples()); },
      /**
       * Without stopping: closes the kept copy recorded so far (one finished page / surah) and starts a new
       * one on the same microphone stream — the recognizer's samples go on without a gap. `fallback` is used
       * when the device has no compressed recorder (then the samples are kept as WAV).
       */
      async rotateKept(fallback?: Float32Array): Promise<Blob | null> {
        if (!keepAudio || stopped) return null;
        const old = keeper;
        keeper = startKeeper(stream);
        if (paused) keeper?.pause();
        old?.stop();
        const blob = old ? await old.done : null;
        return blob ?? (fallback?.length ? encodeWav([fallback], outRate) : null);
      },
    };
  } catch (error) {
    keeper?.stop();
    stream.getTracks().forEach((t) => t.stop());
    void context?.close();
    throw error;
  }
}
