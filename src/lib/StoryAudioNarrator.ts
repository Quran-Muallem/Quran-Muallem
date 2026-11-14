/**
 * v48 multilingual read-aloud for the stories: Arabic (MSA), German and English. Native text-to-speech in the
 * app (@capacitor-community/text-to-speech), the Web Speech API in the browser. Reads paragraph by paragraph
 * so the screen can highlight and scroll to the paragraph being spoken; pause = stop and resume from that
 * paragraph (TTS engines cannot pause mid-sentence reliably). Speed: 0.8 (slow, for kids) · 1.0 · 1.2.
 */
import { Capacitor } from "@capacitor/core";
import type { StoryLang } from "@/lib/stories";

const LOCALE: Record<StoryLang, string> = { ar: "ar-SA", de: "de-DE", en: "en-US" };
export const NARRATION_RATES = [0.8, 1, 1.2] as const;
export type NarrationRate = (typeof NARRATION_RATES)[number];
export type NarratorState = "idle" | "playing" | "paused";

const native = () => Capacitor.isNativePlatform();
const synth = () => (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;

/** Native TTS runs a little faster than the web voice at the same number. */
const nativeRate = (r: number) => r * 0.9;

async function speakOne(text: string, lang: StoryLang, rate: number): Promise<void> {
  if (native()) {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    await TextToSpeech.speak({ text, lang: LOCALE[lang], rate: nativeRate(rate), pitch: 1, volume: 1, category: "playback" });
    return;
  }
  const s = synth();
  if (!s) throw new Error("no speech");
  await new Promise<void>((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LOCALE[lang]; u.rate = rate;
    const v = s.getVoices().find((x) => x.lang.toLowerCase().startsWith(lang));
    if (v) u.voice = v;
    u.onend = () => resolve(); u.onerror = (e) => (e.error === "interrupted" || e.error === "canceled" ? resolve() : reject(new Error(e.error)));
    s.speak(u);
  });
}

async function hush() {
  if (native()) { try { const { TextToSpeech } = await import("@capacitor-community/text-to-speech"); await TextToSpeech.stop(); } catch { /* ignore */ } }
  try { synth()?.cancel(); } catch { /* ignore */ }
}

/** Reads a list of paragraphs aloud; `onIndex` reports the paragraph being spoken (-1 when finished/stopped). */
export class StoryAudioNarrator {
  private run = 0;
  index = 0;
  state: NarratorState = "idle";
  constructor(private paragraphs: string[], private lang: StoryLang, public rate: NarrationRate, private on: { index: (i: number) => void; state: (s: NarratorState) => void; done?: () => void; error?: () => void }) {}

  private set(s: NarratorState) { this.state = s; this.on.state(s); }

  async play(from = this.index) {
    const id = ++this.run;
    await hush();
    this.set("playing");
    for (let i = from; i < this.paragraphs.length; i++) {
      if (id !== this.run) return;
      this.index = i; this.on.index(i);
      try { await speakOne(this.paragraphs[i]!, this.lang, this.rate); }
      catch { if (id === this.run) { this.set("idle"); this.on.index(-1); this.on.error?.(); } return; }
    }
    if (id !== this.run) return;
    this.index = 0; this.set("idle"); this.on.index(-1); this.on.done?.();
  }
  async pause() { this.run++; await hush(); this.set("paused"); }
  async restart() { this.index = 0; await this.play(0); }
  async setRate(r: NarrationRate) { this.rate = r; if (this.state === "playing") await this.play(this.index); }
  async stop() { this.run++; this.index = 0; await hush(); this.set("idle"); this.on.index(-1); }
}
