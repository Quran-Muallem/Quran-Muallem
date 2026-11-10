/**
 * Whether a recitation is being recorded right now (Mushaf or Recite screen), and what waits for its end.
 *
 *  - The surah-completion sound (vibration + chime) is never played while the microphone is on: a surah
 *    finished mid-recording only queues it; it plays when the recording ends — after the 2-second silence at
 *    the surah end, or when the reader presses stop (v29).
 *  - Badge celebrations are queued while recording and shown one after another once the microphone is off
 *    (`BadgeCelebration` reads `useMicActive`).
 */
import { useSyncExternalStore } from "react";
import { createSignal } from "@/lib/storage";
import { celebrateSurah } from "@/lib/surahCompletion";

const mic = createSignal(false);
let pending = false;
let celebrate: () => void = celebrateSurah;

/** Tests: replace the sound / vibration. */
export function setCelebrator(fn: () => void) { celebrate = fn; }

export const isMicActive = () => mic.get();
export function useMicActive(): boolean { return useSyncExternalStore(mic.subscribe, mic.get, mic.get); }

/** Called by the reciting views whenever their microphone goes on or off. */
export function setMicActive(on: boolean) {
  if (mic.get() === on) return;
  mic.set(on);
  if (!on && pending) { pending = false; celebrate(); }
}

/** A surah was completed: celebrate now when not recording, else once the recording has ended. */
export function celebrateWhenStopped() {
  if (mic.get()) pending = true;
  else celebrate();
}
