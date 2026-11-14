/**
 * Multilingual read-aloud for the stories (v48) — v49: a warm storyteller. Picks the most natural voice on the
 * device (src/lib/storyVoice.ts), reads sentence by sentence with storyteller pauses (≈350–500 ms, 700 ms after
 * questions / exclamations) and, in Kids Mode, a warm tuning (pitch 1.08, rate × 0.92). The paragraph being
 * read is reported for highlighting; pause = stop and resume from that sentence. Speeds 0.8 · 1.0 · 1.2.
 * Languages: all 13 app languages (BCP-47 locale per language, see storyVoice.ts).
 */
import { hush, pauseAfter, speakSentence, storySentences, wait, PLAIN, STORYTELLER, type Tuning, type VoiceLang } from "@/lib/storyVoice";

export const NARRATION_RATES = [0.8, 1, 1.2] as const;
export type NarrationRate = (typeof NARRATION_RATES)[number];
export type NarratorState = "idle" | "playing" | "paused";

export class StoryAudioNarrator {
  private run = 0;
  private parts: string[][];
  index = 0;
  private sentence = 0;
  state: NarratorState = "idle";
  constructor(paragraphs: string[], private lang: VoiceLang, public rate: NarrationRate,
    private on: { index: (i: number) => void; state: (s: NarratorState) => void; done?: () => void; error?: () => void; paragraph?: (i: number) => void },
    private tuning: Tuning = PLAIN) {
    this.parts = paragraphs.map(storySentences);
  }
  static storyteller(kids: boolean): Tuning { return kids ? STORYTELLER : PLAIN; }

  private set(s: NarratorState) { this.state = s; this.on.state(s); }

  async play(from = this.index, sentence = from === this.index ? this.sentence : 0) {
    const id = ++this.run;
    await hush();
    this.set("playing");
    for (let i = from; i < this.parts.length; i++) {
      if (id !== this.run) return;
      if (i !== this.index || sentence === 0) this.on.paragraph?.(i);
      this.index = i; this.on.index(i);
      const ss = this.parts[i]!;
      for (let k = i === from ? sentence : 0; k < ss.length; k++) {
        if (id !== this.run) return;
        this.sentence = k;
        try { await speakSentence(ss[k]!, this.lang, this.rate, this.tuning); }
        catch { if (id === this.run) { this.set("idle"); this.on.index(-1); this.on.error?.(); } return; }
        if (id !== this.run) return;
        await wait(pauseAfter(ss[k]!) / this.rate);
      }
      this.sentence = 0;
      if (id === this.run && i < this.parts.length - 1) await wait(250 / this.rate); // a breath between paragraphs
    }
    if (id !== this.run) return;
    this.index = 0; this.sentence = 0; this.set("idle"); this.on.index(-1); this.on.done?.();
  }
  async pause() { this.run++; await hush(); this.set("paused"); }
  async restart() { this.index = 0; this.sentence = 0; await this.play(0, 0); }
  async setRate(r: NarrationRate) { this.rate = r; if (this.state === "playing") await this.play(this.index, this.sentence); }
  async stop() { this.run++; this.index = 0; this.sentence = 0; await hush(); this.set("idle"); this.on.index(-1); }
}
