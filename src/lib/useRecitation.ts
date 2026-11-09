import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matchLive, type LiveMatch } from "@/lib/quranMatcher";
import { useSpeechRecognition, type SpeechErrorCode } from "@/lib/useSpeechRecognition";
import { useTranscribingRecorder } from "@/lib/use-transcribing-recorder";
import { useSettings } from "@/lib/settings";
import { speechEngineFor, useRecognizer } from "@/lib/speechEngine";
import { matchLivePhonemes } from "@/lib/quranAlignment";
import type { CopyKey } from "@/lib/i18n";
import { useVoiceProfile } from "@/lib/userAdaptation";
import { useMistakeHaptics } from "@/lib/useMistakeHaptics";

const speechErrorKey = (code: SpeechErrorCode | null): CopyKey | null =>
  code === "not-allowed" ? "errMic" : code === "audio-capture" ? "errNoMic" : code === "network" ? "errSpeechNetwork" : code === "unsupported" ? "errUnsupported" : code ? "errFailed" : null;

/**
 * Live recitation against target verses (one string per verse). Uses the browser's live speech
 * recognition where available, otherwise Whisper on the device (optionally live).
 * `onSessionEnd` fires once after each recitation with the final match.
 */
export function useRecitation(targets: readonly string[], { onSessionEnd, phonemeRefs }: {
  onSessionEnd?: (m: LiveMatch) => void;
  /** Canonical phonemes per flat target token (quranAlignment.phonemeRefs); enables the phoneme engine. */
  phonemeRefs?: readonly (string | null)[] | null;
} = {}) {
  const settings = useSettings();
  const speech = useSpeechRecognition({ lang: "ar-SA" });
  const { useWhisper, live } = speechEngineFor(settings, speech);
  const recognizer = useRecognizer();
  const phonemes = recognizer === "zipformer" && !!phonemeRefs;
  const [whisperText, setWhisperText] = useState("");
  /** Which engine produced `whisperText` (a recitation that fell back to Whisper yields text). */
  const [textEngine, setTextEngine] = useState<"phonemes" | "text">("text");
  // The recording is kept (compressed, on the device) so the user can listen back to it.
  const whisper = useTranscribingRecorder((t, _final, kind) => { setWhisperText(t); setTextEngine(kind); },
    { live, keepAudio: true, engine: phonemes ? "zipformer" : "whisper" });
  const { stopListening, resetTranscript, startListening } = speech;

  const fullTranscript = useWhisper ? whisperText : speech.liveTranscript;
  // After an automatic page turn the recording goes on; the new page is matched against what was said
  // after the turn only (`rebase`). Phonemes only grow; Whisper text is cut by word count.
  const [base, setBase] = useState<{ kind: "phonemes" | "text"; chars: number; words: number } | null>(null);
  const transcript = useMemo(() => {
    if (!base) return fullTranscript;
    if (base.kind === "phonemes") return fullTranscript.slice(base.chars);
    return fullTranscript.trim().split(/\s+/).slice(base.words).join(" ");
  }, [fullTranscript, base]);
  // Re-judged when the voice profile changes (a word added to it turns green at once).
  const profile = useVoiceProfile();
  const match = useMemo(() => (useWhisper && textEngine === "phonemes" && phonemeRefs
    ? matchLivePhonemes(transcript, targets, phonemeRefs, { final: !whisper.recording })
    : matchLive(transcript, targets)), [transcript, targets, profile, textEngine, phonemeRefs, whisper.recording]); // eslint-disable-line react-hooks/exhaustive-deps
  const listening = useWhisper ? whisper.recording : speech.isListening;
  const processing = useWhisper && whisper.transcribing;

  const reset = useCallback(() => { stopListening(); resetTranscript(); setWhisperText(""); whisper.cancel(); setBase(null); }, [stopListening, resetTranscript, whisper.cancel]);
  const latestFull = useRef({ text: fullTranscript, kind: textEngine });
  latestFull.current = { text: fullTranscript, kind: textEngine };
  /** Keep recording, but judge only what is said from now on (used for the automatic page turn). */
  const rebase = useCallback(() => {
    const { text, kind } = latestFull.current;
    setBase({ kind, chars: text.length, words: text.trim() ? text.trim().split(/\s+/).length : 0 });
  }, []);

  /**
   * Keep recording, but judge from `pos` of the current transcript on (raw phoneme characters / words) —
   * used when the verse was detected elsewhere in the Quran and the Mushaf jumped there.
   */
  const rebaseBy = useCallback((pos: number) => {
    const { text, kind } = latestFull.current;
    setBase((cur) => {
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      if (kind === "phonemes") { const chars = (cur?.kind === "phonemes" ? cur.chars : 0) + pos; return { kind, chars, words }; }
      return { kind, chars: text.length, words: Math.min(words, (cur?.kind === "text" ? cur.words : 0) + pos) };
    });
  }, []);

  // Session end → callback with the final match.
  const session = useRef(false);
  const latest = useRef(match);
  latest.current = match;
  const endCb = useRef(onSessionEnd);
  endCb.current = onSessionEnd;
  useEffect(() => { if (listening) session.current = true; }, [listening]);
  // A short, light vibration when a word turns red/orange while reciting (never interrupts recognition).
  const forgetMistakes = useMistakeHaptics(match.statuses, listening);
  useEffect(() => {
    if (listening || processing || !session.current) return;
    const timer = setTimeout(() => { session.current = false; endCb.current?.(latest.current); }, useWhisper ? 0 : 900);
    return () => clearTimeout(timer);
  }, [listening, processing, useWhisper]);

  // Stop automatically once everything was recited — only for the browser recognizer, only on final
  // (not interim) text, and only if nothing new arrives for a moment. Whisper never stops by itself:
  // a live result can be wrong, and the user decides when they are done.
  const finalOnly = !useWhisper && speech.interimTranscript === "";
  useEffect(() => {
    if (useWhisper || !match.done || !listening || !finalOnly) return;
    const timer = setTimeout(() => stopListening(), 1500);
    return () => clearTimeout(timer);
  }, [match.done, listening, finalOnly, useWhisper, transcript, stopListening]);

  const toggle = useCallback(() => {
    if (useWhisper) { if (!whisper.recording) { setWhisperText(""); setBase(null); } whisper.toggle(); return; }
    if (speech.isListening) stopListening();
    else { if (latest.current.done || latest.current.recited) resetTranscript(); startListening(); }
  }, [useWhisper, whisper, speech.isListening, stopListening, resetTranscript, startListening]);

  return {
    /** "phonemes" while the Zipformer engine judges this recitation. */
    engine: textEngine,
    match, transcript, listening, rebase, rebaseBy, forgetMistakes,
    /** What `transcript` holds: Zipformer phonemes or Arabic text (Whisper / browser recognizer). */
    transcriptKind: (useWhisper && textEngine === "phonemes" ? "phonemes" : "text") as "phonemes" | "text", processing, useWhisper, reset, toggle,
    /** Paused recitation (on-device engines): state and colours kept, recognition goes on after `resume`. */
    paused: useWhisper && whisper.paused,
    canPause: useWhisper,
    pause: whisper.pause,
    resume: whisper.resume,
    error: useWhisper ? whisper.error : speechErrorKey(speech.error),
    getLevel: useWhisper ? whisper.getLevel : undefined,
    /** Seconds recorded so far (Whisper engines; 0 for the browser recognizer). */
    elapsed: whisper.elapsed,
    /** The last finished recording, once (null with the browser recognizer, which gives no audio). */
    takeAudio: whisper.takeAudio,
    supportChecked: speech.isSupportChecked,
  };
}
