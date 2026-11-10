import { useCallback, useEffect, useRef, useState } from "react";
import { recordWav, type Recording } from "./record-wav";
import { trimSilence, VadGate } from "./audioPipeline";
import { markZipformerFailed, preloadZipformer, ZipformerSession } from "./zipformerEngine";
import { noteSpeakingRate, speedFactor } from "./userAdaptation";
import { preloadWhisper, transcribeSamples, WhisperError, type WhisperErrorCode } from "./whisper";
import type { CopyKey } from "./i18n";

export type RecorderError = Extract<CopyKey,
  "errMic" | "errNoMic" | "errEmpty" | "errSilent" | "errTooLarge" | "errNoSpeech" | "errFailed" | "errModelDownload" | "errModelUnsupported">;

const whisperErrorKey: Record<WhisperErrorCode, RecorderError> = {
  "model-download": "errModelDownload",
  unsupported: "errModelUnsupported",
  "too-large": "errTooLarge",
  "bad-audio": "errEmpty",
  "no-speech": "errNoSpeech",
  failed: "errFailed",
};

export function errorForMicrophone(error: unknown): RecorderError {
  const name = error instanceof DOMException ? error.name : "";
  return name === "NotAllowedError" || name === "SecurityError" ? "errMic" : "errNoMic";
}

/**
 * Whisper sometimes continues a famous text beyond what was recited. A transcript cannot contain more
 * words than the speaker had time to say: live updates allow ~2.2 words per second of actual voice,
 * the final result (whole recording, far less prone to this) a generous 4.
 */
export function capToSpokenWords(text: string, voicedSeconds: number, wordsPerSecond: number, slack: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const max = Math.max(1, Math.floor(voicedSeconds * wordsPerSecond) + slack);
  return words.length > max ? words.slice(0, max).join(" ") : text.trim();
}
const LIVE_WPS = 2.2, FINAL_WPS = 4;

/**
 * Live mode, rolling window. While recording, the newest part of the recording (the "window", at most
 * LIVE_WINDOW_S) is transcribed again and again, LIVE_GAP_MS after the previous update finished. When the
 * window is full it is closed at the quietest 100 ms frame of its last few seconds (a pause between words,
 * never in the middle of a word), its text is kept, and the next window starts there with a short overlap.
 * Each live update therefore costs the same however long the recitation gets (the old code re-sent the
 * whole recording every 4 s, became slower and slower, and gave up after 120 s), and pauses never stop
 * anything. The final result is still computed from the whole recording when the user stops.
 */
const LIVE_WINDOW_S = 24;    // Whisper's own window is 30 s
const LIVE_CUT_SEARCH_S = 4; // look for a pause in the last 4 s of a full window
const LIVE_OVERLAP_S = 0.3;  // the next window starts just before the cut
const LIVE_GAP_MS = 1200;    // pause between live updates
const LIVE_FIRST_S = 1.5;    // first update once this much was recorded

const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const norm = (w: string) => w.replace(ARABIC_MARKS, "").replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");

/** Joins the text of a closed window with the next one, dropping words repeated in the overlap. */
export function stitchTranscripts(before: string, after: string): string {
  const a = before.trim().split(/\s+/).filter(Boolean), b = after.trim().split(/\s+/).filter(Boolean);
  if (!a.length) return b.join(" ");
  if (!b.length) return a.join(" ");
  for (let k = Math.min(6, a.length, b.length); k > 0; k--) {
    if (a.slice(-k).every((w, i) => norm(w) === norm(b[i] ?? ""))) return [...a, ...b.slice(k)].join(" ");
  }
  return [...a, ...b].join(" ");
}

/**
 * Records from the microphone and transcribes with Whisper on the device (no server, no key).
 * With `live`, the recording so far is re-transcribed every few seconds so words can be highlighted while reciting.
 */
export type KeptAudio = { blob: Blob; seconds: number };

/**
 * `keepAudio`: also keep the recording (compressed) so the user can listen back; fetch it with
 * `takeAudio()` after the recording ended.
 */
/**
 * `engine: "zipformer"`: Quran-Lab's streaming phoneme model instead of Whisper. The transcript is then a
 * phoneme string (match it with `matchLivePhonemes`), updated live about every half second, and the
 * audio is streamed to the model while reciting, so the final result is ready right after stopping.
 * If the model fails to load or run, this recitation falls back to Whisper (and the engine is marked
 * failed, so the app keeps using Whisper).
 */
export type TranscriptKind = "text" | "phonemes";
export function useTranscribingRecorder(onTranscript: (text: string, final: boolean, kind: TranscriptKind) => void, { live = false, keepAudio = false, engine = "whisper" }: { live?: boolean; keepAudio?: boolean; engine?: "whisper" | "zipformer" } = {}) {
  const [recording, setRecording] = useState(false);
  /** Recording paused by the user: the session (transcript, word states, phoneme stream) is kept. */
  const [paused, setPaused] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<RecorderError | null>(null);
  const handle = useRef<Recording | null>(null);
  const abort = useRef<AbortController | null>(null);
  const liveAbort = useRef<AbortController | null>(null);
  const starting = useRef(false);
  const kept = useRef<Promise<KeptAudio | null> | null>(null);
  /** First sample of the part not yet handed out by `cut()` (one page / surah of a long recording). */
  const segStart = useRef(0);
  const keepRef = useRef(keepAudio);
  keepRef.current = keepAudio;
  const callback = useRef(onTranscript);
  callback.current = onTranscript;
  const liveRef = useRef(live);
  liveRef.current = live;
  const engineRef = useRef(engine);
  engineRef.current = engine;
  /** The running phoneme stream (zipformer engine) and how far the recording was fed to it. */
  const zf = useRef<{ session: ZipformerSession; vad: VadGate; fed: number; failed: boolean; timer: ReturnType<typeof setInterval> | null } | null>(null);
  const stopStream = () => { const z = zf.current; if (z?.timer) clearInterval(z.timer); zf.current = null; return z; };

  useEffect(() => () => { handle.current?.cancel(); abort.current?.abort(); liveAbort.current?.abort(); stopStream()?.session.cancel(); }, []);

  /** Feeds everything recorded since the last call through the VAD gate into the phoneme stream. */
  const feed = (active: Recording, upTo = active.totalSamples()) => {
    const z = zf.current;
    if (!z || z.failed || upTo <= z.fed) return;
    const block = active.samples(z.fed, upTo);
    z.fed = upTo;
    const voiced = z.vad.push(block);
    if (voiced.length) z.session.push(voiced);
  };

  // Live partial transcripts while recording (rolling window, see above).
  useEffect(() => {
    if (!recording || !live || zf.current) return;
    const active = handle.current;
    if (!active) return;
    let stopped = false;
    let committed = "";   // text of closed windows
    let windowStart = 0;  // first sample of the open window
    let timer: ReturnType<typeof setTimeout> | undefined;
    const rate = active.sampleRate;
    const schedule = (ms = LIVE_GAP_MS) => { if (!stopped) timer = setTimeout(() => { void tick(); }, ms); };
    const tick = async () => {
      if (stopped || handle.current !== active) return;
      const total = active.totalSamples();
      const full = total - windowStart >= LIVE_WINDOW_S * rate;
      // Close a full window at a pause; otherwise transcribe the open window up to now.
      const end = full ? active.quietestPoint(windowStart + (LIVE_WINDOW_S - LIVE_CUT_SEARCH_S) * rate, windowStart + LIVE_WINDOW_S * rate) : total;
      if (!full && (total < LIVE_FIRST_S * rate || active.voicedSecondsBetween(windowStart, total) < 0.4)) { schedule(); return; }
      const controller = new AbortController();
      liveAbort.current = controller;
      try {
        // Stage 1 (VAD): leading/trailing silence removed, long pauses shortened.
        const raw = await transcribeSamples(trimSilence(active.samples(windowStart, end), rate).samples, { signal: controller.signal, kind: "live", rate });
        if (stopped || handle.current !== active) return;
        const text = capToSpokenWords(raw, active.voicedSecondsBetween(windowStart, end), LIVE_WPS * speedFactor(), 2);
        if (full) { committed = stitchTranscripts(committed, text); windowStart = Math.max(0, end - LIVE_OVERLAP_S * rate); }
        const shown = full ? committed : stitchTranscripts(committed, text);
        setTranscript(shown); callback.current(shown, false, "text");
      } catch (e) {
        if (e instanceof WhisperError && (e.code === "model-download" || e.code === "unsupported")) { setError(whisperErrorKey[e.code]); return; }
        // A window without recognisable speech: move on instead of retrying it forever.
        if (full && e instanceof WhisperError && e.code === "no-speech") windowStart = Math.max(0, end - LIVE_OVERLAP_S * rate);
      }
      schedule(full ? 0 : LIVE_GAP_MS);
    };
    schedule(LIVE_FIRST_S * 1000);
    return () => { stopped = true; clearTimeout(timer); liveAbort.current?.abort(); };
  }, [recording, live]);

  /** The phoneme engine failed: remember it (the app switches to Whisper) and finish this recitation with Whisper. */
  const audioFallback = (z: NonNullable<typeof zf.current>, e: unknown) => {
    z.failed = true; if (z.timer) clearInterval(z.timer); z.session.cancel();
    markZipformerFailed(e instanceof Error ? e.message : String(e));
  };

  const finish = async () => {
    const active = handle.current;
    if (!active) return;
    handle.current = null;
    setRecording(false); setPaused(false);
    liveAbort.current?.abort();
    let samples: Float32Array;
    // Final result: generous limit (whole duration counts), so a soft voice never loses real words.
    const finalSeconds = Math.max(active.voicedSeconds() * FINAL_WPS, active.duration() * 2.5) / FINAL_WPS;
    const seconds = active.duration();
    const voiced = active.voicedSeconds();
    try { samples = active.stopSamples(); } catch (e) { setError(e instanceof Error && e.message === "silentRecording" ? "errSilent" : "errEmpty"); kept.current = null; return; }
    const from = Math.min(segStart.current, samples.length);
    segStart.current = 0;
    const partSeconds = Math.max(0, seconds - from / active.sampleRate);
    kept.current = active.keptAudio(samples.subarray(from)).then((blob) => (blob ? { blob, seconds: partSeconds } : null)).catch(() => null);
    const controller = new AbortController();
    abort.current = controller;
    setTranscribing(true);
    // Phoneme engine: feed the rest of the recording, then flush the stream.
    const z = stopStream();
    if (z && !z.failed) {
      try {
        if (z.fed < samples.length) { const voiced = z.vad.push(samples.subarray(z.fed)); z.fed = samples.length; if (voiced.length) z.session.push(voiced); }
        const phonemes = await z.session.finish();
        if (controller.signal.aborted) return;
        setTranscript(phonemes);
        callback.current(phonemes, true, "phonemes");
        if (abort.current === controller) { abort.current = null; setTranscribing(false); }
        return;
      } catch (e) {
        if (controller.signal.aborted) return;
        audioFallback(z, e); // …and transcribe this recitation with Whisper below
      }
    }
    try {
      // The whole recording; Transformers.js splits it into 30 s windows with 5 s overlap itself.
      const clean = trimSilence(samples, active.sampleRate).samples;
      const text = capToSpokenWords(await transcribeSamples(clean, { signal: controller.signal, kind: "final", rate: active.sampleRate }), finalSeconds, FINAL_WPS * speedFactor(), 4);
      setTranscript(text);
      callback.current(text, true, "text");
      // Stage 4: learn the user's speaking speed (words per second of actual voice).
      void noteSpeakingRate(text.split(/\s+/).filter(Boolean).length, voiced).catch(() => {});
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof WhisperError ? whisperErrorKey[e.code] : "errFailed");
    } finally {
      if (abort.current === controller) { abort.current = null; setTranscribing(false); }
    }
  };

  const toggle = async () => {
    if (transcribing || starting.current) return;
    if (handle.current) return finish();
    setError(null); setTranscript("");
    if (engineRef.current === "zipformer") void preloadZipformer().catch(() => {});
    starting.current = true;
    try {
      // Ends only by the user, the size limit or the system taking the microphone — never by a pause.
      kept.current = null;
      segStart.current = 0;
      handle.current = await recordWav(() => { void finish(); }, () => { void finish(); }, { keepAudio: keepRef.current });
      setRecording(true);
      const active = handle.current;
      if (engineRef.current === "zipformer" && active.sampleRate === 16000) {
        // Stream to the phoneme model while reciting; audio recorded while it loads is fed afterwards.
        const session = new ZipformerSession((phonemes) => { if (handle.current === active) { setTranscript(phonemes); callback.current(phonemes, false, "phonemes"); } });
        // v29: 1.6 s of every pause reach the model (was 0.6 s): the streaming model needs that much trailing
        // audio to emit a surah's LAST words while the reader is silent — else the end was only judged once
        // the next speech arrived, and the 2-second stop at a surah end could not happen.
        const z = { session, vad: new VadGate(active.sampleRate, { keepPauseSeconds: 1.6 }), fed: 0, failed: false, timer: null as ReturnType<typeof setInterval> | null };
        zf.current = z;
        session.start().then(() => {
          if (zf.current !== z || handle.current !== active) return;
          feed(active);
          z.timer = setInterval(() => { if (handle.current === active) feed(active); }, 250);
        }).catch((e) => { if (zf.current === z) audioFallback(z, e); void preloadWhisper().catch(() => {}); });
      } else void preloadWhisper().catch(() => {});
    } catch (e) {
      setError(errorForMicrophone(e));
    } finally {
      starting.current = false;
    }
  };

  const cancel = useCallback(() => {
    stopStream()?.session.cancel();
    handle.current?.cancel(); handle.current = null; kept.current = null;
    abort.current?.abort(); liveAbort.current?.abort();
    setRecording(false); setPaused(false); setTranscribing(false); setTranscript(""); setError(null);
  }, []);
  /** Pause / resume the running recitation without ending it. */
  const pause = useCallback(() => { const h = handle.current; if (!h) return; h.pause(); setPaused(true); }, []);
  const resume = useCallback(() => { const h = handle.current; if (!h) return; h.resume(); setPaused(false); }, []);

  const getLevel = useCallback(() => handle.current?.level() ?? 0, []);
  /** Seconds recorded so far (for a live timer). */
  const elapsed = useCallback(() => handle.current?.duration() ?? 0, []);
  /** The finished recording (once); null if none was kept. */
  const takeAudio = useCallback(async (): Promise<KeptAudio | null> => { const k = kept.current; kept.current = null; return k ? await k : null; }, []);
  /**
   * While recording: hands out the audio since the previous cut (a finished page or surah) as its own
   * recording; the microphone and the recognizer go on without a break. Null when not recording.
   */
  const cut = useCallback(async (): Promise<KeptAudio | null> => {
    const h = handle.current;
    if (!h) return null;
    const from = segStart.current, to = h.totalSamples();
    segStart.current = to;
    const seconds = (to - from) / h.sampleRate;
    if (seconds < 0.5) return null;
    const blob = await h.rotateKept(h.samples(from, to)).catch(() => null);
    return blob ? { blob, seconds } : null;
  }, []);
  /** Seconds of voice heard in the last `seconds` (0 when not recording). */
  const voicedLast = useCallback((seconds: number) => {
    const h = handle.current;
    if (!h) return 0;
    const to = h.totalSamples();
    return h.voicedSecondsBetween(Math.max(0, to - Math.round(seconds * h.sampleRate)), to);
  }, []);
  return { recording, paused, pause, resume, transcribing, transcript, error, getLevel, elapsed, takeAudio, cut, voicedLast, cancel, toggle: () => { void toggle(); } };
}
