import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings: SpeechRecognition is not part of TypeScript's lib.dom. */
interface RecognitionAlternative { transcript: string; confidence: number }
interface RecognitionResult { readonly length: number; readonly isFinal: boolean; [index: number]: RecognitionAlternative | undefined }
interface RecognitionResultList { readonly length: number; [index: number]: RecognitionResult | undefined }
interface RecognitionEvent extends Event { readonly resultIndex: number; readonly results: RecognitionResultList }
interface RecognitionErrorEvent extends Event { readonly error: string }
interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type RecognitionConstructor = new () => Recognition;

function getRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export type SpeechErrorCode =
  | "not-allowed"   // microphone / speech service permission denied (fatal)
  | "audio-capture" // no microphone (fatal)
  | "network"       // speech service unreachable (retried automatically)
  | "unsupported"   // browser has no SpeechRecognition
  | "unknown";

export interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag. Default: Arabic (Saudi Arabia). */
  lang?: string;
  /** Give up after this many restarts in a row that produced no speech result. */
  maxRestartFailures?: number;
  /** Called on every interim/final update with the full transcript so far. */
  onTranscript?: (liveTranscript: string, isFinal: boolean) => void;
}

/**
 * Real-time speech recognition via the browser's Web Speech API (Chrome, Edge, Safari; not Firefox).
 * Listening is continuous: the browser ends sessions on its own (silence, network blips, time limits),
 * so while `isListening` is true the hook restarts the service with a short backoff and keeps accumulating text.
 * Note: Chrome sends the audio to Google's speech service.
 */
export function useSpeechRecognition({ lang = "ar-SA", maxRestartFailures = 5, onTranscript }: UseSpeechRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState(false); // resolved after mount to keep SSR and hydration identical
  const [isSupportChecked, setIsSupportChecked] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<SpeechErrorCode | null>(null);

  const recognition = useRef<Recognition | null>(null);
  const wantListening = useRef(false);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const committed = useRef("");        // text of sessions that already ended
  const sessionFinal = useRef("");     // finalized text of the running session
  const sessionInterim = useRef("");
  const sessionOffset = useRef(0);     // results to ignore after resetTranscript() mid-session
  const resultCount = useRef(0);
  const startedAt = useRef(0);
  const gotResult = useRef(false);
  const failures = useRef(0);
  const callback = useRef(onTranscript);
  callback.current = onTranscript;

  useEffect(() => { setIsSupported(getRecognitionConstructor() !== undefined); setIsSupportChecked(true); }, []);

  const publish = useCallback(() => {
    const final = [committed.current, sessionFinal.current].filter(Boolean).join(" ").trim();
    const interim = sessionInterim.current.trim();
    setFinalTranscript(final);
    setInterimTranscript(interim);
    callback.current?.([final, interim].filter(Boolean).join(" "), interim === "");
  }, []);

  const teardown = useCallback(() => {
    clearTimeout(restartTimer.current);
    const current = recognition.current;
    recognition.current = null;
    if (current) {
      current.onresult = null; current.onerror = null; current.onend = null;
      try { current.abort(); } catch { /* already stopped */ }
    }
  }, []);

  const begin = useCallback(() => {
    const Ctor = getRecognitionConstructor();
    if (!Ctor || !wantListening.current) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    sessionFinal.current = ""; sessionInterim.current = ""; sessionOffset.current = 0; resultCount.current = 0;
    gotResult.current = false;
    startedAt.current = Date.now();

    rec.onresult = event => {
      let final = "";
      let interim = "";
      resultCount.current = event.results.length;
      // A session's result list only grows, so rebuild from the start each time (skipping anything before a reset).
      for (let i = sessionOffset.current; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result?.[0]?.transcript ?? "";
        if (result?.isFinal) final += `${text} `; else interim += text;
      }
      sessionFinal.current = final.trim();
      sessionInterim.current = interim;
      gotResult.current = true;
      failures.current = 0;
      setError(current => (current === "network" ? null : current));
      publish();
    };

    rec.onerror = event => {
      switch (event.error) {
        case "no-speech":
        case "aborted":
          break; // normal; onend restarts
        case "not-allowed":
        case "service-not-allowed":
          wantListening.current = false; setIsListening(false); setError("not-allowed");
          break;
        case "audio-capture":
          wantListening.current = false; setIsListening(false); setError("audio-capture");
          break;
        case "network":
          setError("network");
          break;
        default:
          setError("unknown");
      }
    };

    rec.onend = () => {
      // Keep what was heard, even a last interim phrase the service never finalized.
      const heard = [sessionFinal.current, sessionInterim.current.trim()].filter(Boolean).join(" ");
      if (heard) committed.current = [committed.current, heard].filter(Boolean).join(" ");
      sessionFinal.current = ""; sessionInterim.current = "";
      publish();
      if (recognition.current === rec) recognition.current = null;
      if (!wantListening.current) { setIsListening(false); return; }

      // Auto-restart. Sessions that die at once without any result count as failures and back off.
      const quick = !gotResult.current && Date.now() - startedAt.current < 1500;
      failures.current = quick ? failures.current + 1 : 0;
      if (failures.current > maxRestartFailures) {
        wantListening.current = false; setIsListening(false);
        setError(current => current ?? "network");
        return;
      }
      restartTimer.current = setTimeout(begin, Math.min(200 * 2 ** failures.current, 3000));
    };

    recognition.current = rec;
    try { rec.start(); } catch { /* start() throws if a session is already running; onend will retry */ }
  }, [lang, maxRestartFailures, publish]);

  const startListening = useCallback(() => {
    if (!getRecognitionConstructor()) { setError("unsupported"); return; }
    if (wantListening.current) return;
    wantListening.current = true;
    failures.current = 0;
    setError(null);
    setIsListening(true);
    begin();
  }, [begin]);

  const stopListening = useCallback(() => {
    wantListening.current = false;
    clearTimeout(restartTimer.current);
    setIsListening(false);
    try { recognition.current?.stop(); } catch { /* not running */ } // stop() still delivers pending results, then onend commits them
  }, []);

  const resetTranscript = useCallback(() => {
    committed.current = ""; sessionFinal.current = ""; sessionInterim.current = "";
    sessionOffset.current = resultCount.current; // a running session keeps its old results; ignore them from now on
    setFinalTranscript(""); setInterimTranscript("");
  }, []);

  useEffect(() => () => { wantListening.current = false; teardown(); }, [teardown]);

  const liveTranscript = [finalTranscript, interimTranscript].filter(Boolean).join(" ");
  return { isSupported, isSupportChecked, isListening, liveTranscript, finalTranscript, interimTranscript, error, startListening, stopListening, resetTranscript };
}
