/**
 * Short interface sounds (v30, «الأصوات والتفاعل الحسي»), synthesised with Web Audio (no files):
 *  - a mistake (word turned red): soft tone, click or bell — only with the setting «صوت الخطأ» on;
 *  - start / stop of a recording session: rising / falling two-note tone (+ light vibration).
 * Quiet on purpose: they must not disturb the recitation (the microphone hears them too).
 */
import { getSettings } from "@/lib/settings";
import { tapHaptic } from "@/lib/haptics";

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

function note(freq: number, start: number, dur: number, gain: number, type: OscillatorType = "sine") {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export type MistakeSound = "tone" | "click" | "bell";
export function playMistakeSound(kind: MistakeSound = getSettings().mistakeSoundType) {
  if (kind === "click") note(1800, 0, 0.04, 0.12, "square");
  else if (kind === "bell") { note(880, 0, 0.5, 0.08); note(1320, 0, 0.35, 0.04); }
  else note(330, 0, 0.18, 0.1, "triangle");
}

/** Recording started (true) / stopped (false). */
export function sessionFeedback(started: boolean) {
  const s = getSettings();
  if (s.sessionSound) {
    if (started) { note(523, 0, 0.12, 0.07); note(784, 0.1, 0.16, 0.07); }
    else { note(784, 0, 0.12, 0.07); note(523, 0.1, 0.18, 0.07); }
  }
  if (s.sessionHaptic) void tapHaptic().catch(() => {});
}
