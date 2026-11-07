import { describe, expect, it } from "vitest";
import { encodeWav } from "@/lib/record-wav";
import { resampleLinear, wavToFloat32 } from "@/lib/whisper";

describe("on-device Whisper audio input", () => {
  it("decodes the recorder's 16-bit WAV back to Float32 samples", async () => {
    const tone = new Float32Array(1600).map((_, i) => Math.sin(i / 5) * 0.5);
    const wav = wavToFloat32(await encodeWav([tone], 16000).arrayBuffer());
    expect(wav?.rate).toBe(16000);
    expect(wav?.samples.length).toBe(1600);
    expect(Math.abs((wav?.samples[10] ?? 0) - (tone[10] ?? 0))).toBeLessThan(0.001);
  });
  it("rejects non-WAV data", () => {
    expect(wavToFloat32(new TextEncoder().encode("not a wav file at all, definitely not a wav").buffer as ArrayBuffer)).toBe(null);
  });
  it("resamples 48 kHz to 16 kHz", () => {
    const y = resampleLinear(new Float32Array(48000).fill(0.25), 48000);
    expect(y.length).toBe(16000);
    expect(y[8000]).toBeCloseTo(0.25, 5);
  });
});
