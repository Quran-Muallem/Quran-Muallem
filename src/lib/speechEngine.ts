/**
 * Which speech engine a recitation uses — always on the device, 100 % offline:
 *  - "zipformer": Quran-Lab's streaming phoneme model (bundled in /models/), judged by phoneme alignment;
 *  - "whisper":   on-device Whisper (text), the fallback when the phoneme model is missing or fails.
 *
 * The browser's own speech recognition (webkitSpeechRecognition) is no longer used anywhere: in Chrome it
 * sends the audio to Google's servers, and on phones it ends sessions on its own after short pauses.
 * The "auto" setting of older versions now simply means "live word feedback on".
 * (`browser` and `native` are kept in the signature for the callers; they no longer change the result.)
 */
import { useEffect } from "react";
import { useSettings, type AppSettings } from "@/lib/settings";
import { useZipformerState, zipformerAvailable } from "@/lib/zipformerEngine";
import { loadQuranPhonemes, usePhonemeLexicon } from "@/lib/quranAlignment";

export function speechEngineFor(settings: Pick<AppSettings, "speechEngine" | "whisperLive">, _browser?: { isSupportChecked: boolean; isSupported: boolean }, _native?: boolean) {
  const live = settings.whisperLive || settings.speechEngine === "auto";
  return { useWhisper: true as const, live };
}

export type Recognizer = "zipformer" | "whisper";

/** Pure decision (exported for tests). */
export function recognizerFor(choice: Recognizer, status: string, lexiconLoaded: boolean): Recognizer {
  return choice === "zipformer" && lexiconLoaded && (status === "idle" || status === "loading" || status === "ready") ? "zipformer" : "whisper";
}

/**
 * The engine a recitation uses now: the Zipformer phoneme model when chosen, bundled, not failed on this
 * device, and its phoneme table loaded; otherwise Whisper. Starts the (cheap, local) availability checks.
 */
export function useRecognizer(): Recognizer {
  const settings = useSettings();
  const zf = useZipformerState();
  const lexicon = usePhonemeLexicon();
  const wanted = settings.recognizer === "zipformer";
  useEffect(() => {
    if (!wanted) return;
    void zipformerAvailable().then((ok) => (ok ? loadQuranPhonemes() : undefined)).catch(() => {});
  }, [wanted]);
  return recognizerFor(settings.recognizer, zf.status, !!lexicon);
}
