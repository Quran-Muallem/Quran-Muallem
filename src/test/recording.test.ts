import { describe, expect, it } from "vitest";
import { ChunkedBuffer, FRAME, FrameMeter, StreamResampler, downsample } from "@/lib/record-wav";
import { stitchTranscripts } from "@/lib/use-transcribing-recorder";
import { scheduleTranscription } from "@/lib/whisper";
import { speechEngineFor } from "@/lib/speechEngine";

const sine = (n: number, rate: number, hz = 440, amp = 0.5) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / rate));

describe("streaming resampler", () => {
  it("gives the same result in small blocks as in one piece (no drift at block borders)", () => {
    const input = sine(48000 * 3, 48000);
    const whole = downsample([input], 48000);
    const r = new StreamResampler(48000);
    const parts: number[] = [];
    for (let i = 0; i < input.length; i += 128) parts.push(...r.push(input.subarray(i, i + 128)));
    expect(whole.length).toBe(16000 * 3);
    expect(parts.length).toBe(whole.length);
    expect(Math.max(...parts.map((v, i) => Math.abs(v - (whole[i] ?? 0))))).toBeLessThan(1e-6);
  });
  it("handles 44.1 kHz", () => {
    const r = new StreamResampler(44100);
    let n = 0;
    for (let i = 0; i < 100; i++) n += r.push(new Float32Array(441)).length;
    expect(Math.abs(n - 16000)).toBeLessThanOrEqual(1);
  });
});

describe("continuous buffer", () => {
  it("keeps every sample across block borders and slices any range", () => {
    const b = new ChunkedBuffer(1000);
    for (let i = 0; i < 37; i++) b.push(Float32Array.from({ length: 97 }, (_, k) => i * 97 + k));
    expect(b.length).toBe(37 * 97);
    const s = b.slice(950, 2100);
    expect(s.length).toBe(1150);
    expect(s[0]).toBe(950);
    expect(s[s.length - 1]).toBe(2099);
    expect(b.slice().every((v, i) => v === i)).toBe(true);
  });
});

describe("pause detection", () => {
  it("finds the pause between two words and counts voiced time", () => {
    const m = new FrameMeter();
    m.push(sine(FRAME * 10, 16000));          // 1 s voice
    m.push(new Float32Array(FRAME * 3));      // 0.3 s pause
    m.push(sine(FRAME * 10, 16000));          // 1 s voice
    const cut = m.quietestPoint(0, FRAME * 23);
    expect(cut).toBeGreaterThanOrEqual(FRAME * 10);
    expect(cut).toBeLessThan(FRAME * 13);
    expect(m.voiced).toBe(20);
    expect(m.voicedSecondsBetween(0, FRAME * 13)).toBe(1);
  });
});

describe("stitching live windows", () => {
  it("drops words repeated in the overlap, ignoring diacritics", () => {
    expect(stitchTranscripts("بسم الله الرحمن", "الرحمن الرحيم")).toBe("بسم الله الرحمن الرحيم");
    expect(stitchTranscripts("الحمد لله رب", "ربّ العالمين")).toBe("الحمد لله رب العالمين");
    expect(stitchTranscripts("قل هو", "الله أحد")).toBe("قل هو الله أحد");
    expect(stitchTranscripts("", "الله أحد")).toBe("الله أحد");
  });
});

describe("transcription scheduling", () => {
  it("runs one job at a time, keeps only the newest live job and puts final results first", async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const job = (name: string, wait?: Promise<void>) => async () => { order.push(`start ${name}`); await wait; return name; };
    const first = scheduleTranscription("live", job("live1", gate));
    const live2 = scheduleTranscription("live", job("live2"));
    const live3 = scheduleTranscription("live", job("live3"));
    const final = scheduleTranscription("final", job("final"));
    const live4 = scheduleTranscription("live", job("live4"));
    await expect(live2).rejects.toThrow();
    await expect(live3).rejects.toThrow();
    release();
    expect(await first).toBe("live1");
    expect(await final).toBe("final");
    expect(await live4).toBe("live4");
    expect(order).toEqual(["start live1", "start final", "start live4"]);
  });
});

describe("speech engine", () => {
  const browser = { isSupportChecked: true, isSupported: true };
  it("always uses Whisper in the app, live for 'auto'", () => {
    expect(speechEngineFor({ speechEngine: "auto", whisperLive: false }, browser, true)).toEqual({ useWhisper: true, live: true });
    expect(speechEngineFor({ speechEngine: "whisper", whisperLive: false }, browser, true)).toEqual({ useWhisper: true, live: false });
  });
  it("uses on-device Whisper on the web too (no browser cloud recognizer)", () => {
    expect(speechEngineFor({ speechEngine: "auto", whisperLive: false }, browser, false)).toEqual({ useWhisper: true, live: true });
    expect(speechEngineFor({ speechEngine: "auto", whisperLive: false }, { isSupportChecked: true, isSupported: false }, false)).toEqual({ useWhisper: true, live: true });
  });
});
