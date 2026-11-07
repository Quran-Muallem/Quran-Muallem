import { describe, expect, it } from "vitest";
import { detectVoice, trimSilence } from "@/lib/audioPipeline";
import { compareWords, matchLive, setMatcherAdaptation } from "@/lib/quranMatcher";
import {
  adaptationFor, addVariant, emptyProfile, getVoiceProfile, learnedSwaps, letterSwaps, noteSpeakingRate,
  recordSurahAccuracy, removeVariant, resetVoiceProfile, setStrictness, speedFactor, surahAccuracySummary,
} from "@/lib/userAdaptation";

const RATE = 16000;
/** Silence (with faint noise) and "voice" (a 220 Hz tone) of the given lengths in seconds. */
function signal(parts: [kind: "s" | "v", seconds: number][]): Float32Array {
  const total = parts.reduce((n, [, s]) => n + Math.round(s * RATE), 0);
  const out = new Float32Array(total);
  let o = 0, seed = 1;
  for (const [kind, s] of parts) {
    const n = Math.round(s * RATE);
    for (let i = 0; i < n; i++) {
      seed = (seed * 16807) % 2147483647;
      const noise = ((seed / 2147483647) - 0.5) * 0.002;
      out[o + i] = kind === "v" ? 0.3 * Math.sin((2 * Math.PI * 220 * (o + i)) / RATE) + noise : noise;
    }
    o += n;
  }
  return out;
}

describe("Stage 1 · VAD trimming", () => {
  it("removes leading and trailing silence but keeps a margin", () => {
    const r = trimSilence(signal([["s", 2], ["v", 1.5], ["s", 3]]), RATE);
    expect(r.samples.length / RATE).toBeGreaterThan(1.5 + 0.5);
    expect(r.samples.length / RATE).toBeLessThan(1.5 + 0.9);
    expect(r.voicedSeconds).toBeGreaterThanOrEqual(1.4);
  });
  it("shortens long pauses inside the recitation, keeps short ones", () => {
    const long = trimSilence(signal([["v", 1], ["s", 4], ["v", 1]]), RATE);
    expect(long.samples.length / RATE).toBeLessThan(1 + 1 + 1.4);
    const short = trimSilence(signal([["v", 1], ["s", 0.8], ["v", 1]]), RATE);
    expect(short.samples.length).toBe(signal([["v", 1], ["s", 0.8], ["v", 1]]).length);
  });
  it("leaves pure silence untouched (Whisper reports no speech)", () => {
    const quiet = signal([["s", 2]]);
    expect(detectVoice(quiet, RATE)).toBe(null);
    expect(trimSilence(quiet, RATE).samples).toBe(quiet);
  });
});

describe("Stage 4 · voice profile", () => {
  it("accepts a learned variant only for that word and that heard form", () => {
    setMatcherAdaptation({});
    expect(compareWords("ٱلرَّحِيمِ", "الزحيق").status).toBe("ERROR");
    setMatcherAdaptation(adaptationFor({ ...emptyProfile(), variants: [{ expected: "الرحيم", heard: "الزحيق", word: "ٱلرَّحِيمِ", heardRaw: "الزحيق", added: "" }] }));
    expect(compareWords("ٱلرَّحِيمِ", "الزحيق").status).toBe("CORRECT");
    expect(compareWords("ٱلرَّحِيمِ", "الزحيف").status).toBe("ERROR");
    expect(compareWords("ٱلْعَلِيمُ", "الزحيق").status).toBe("ERROR");
    setMatcherAdaptation({});
  });

  it("learns an accent swap after two variants and applies it to other words", () => {
    expect(letterSwaps("قال", "كال")).toEqual(["ق>ك"]);
    const variants = [
      { expected: "قال", heard: "كال", word: "قَالَ", heardRaw: "كال", added: "" },
      { expected: "قلوب", heard: "كلوب", word: "قُلُوب", heardRaw: "كلوب", added: "" },
    ];
    expect(learnedSwaps(variants.slice(0, 1)).size).toBe(0);
    expect(learnedSwaps(variants).get("ق")).toEqual(["ك"]);
    setMatcherAdaptation(adaptationFor({ ...emptyProfile(), variants }));
    expect(compareWords("يَقُولُونَ", "يكولون").status).toBe("CORRECT");
    setMatcherAdaptation({});
  });

  it("strictness scales the near-match limit", () => {
    const target = "ٱلْمُسْتَقِيمَ", heard = "المستقين";
    setMatcherAdaptation(adaptationFor({ ...emptyProfile(), strictness: "normal" }));
    expect(compareWords(target, heard).status).toBe("WARNING");
    setMatcherAdaptation(adaptationFor({ ...emptyProfile(), strictness: "strict" }));
    expect(compareWords(target, heard).status).toBe("ERROR");
    setMatcherAdaptation({});
  });

  it("stores variants, strictness and accuracy, and turns the tapped word green", async () => {
    await resetVoiceProfile();
    const verse = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
    const before = matchLive("بسم الله الرحمن الزحيق", verse);
    expect(before.statuses[3]).toBe("ERROR");
    expect(before.heard[3]).toBe("الزحيق");
    expect(await addVariant({ word: "ٱلرَّحِيمِ", heard: "الزحيق", surah: 1, ayah: 1 })).toBe(true);
    expect(await addVariant({ word: "ٱلرَّحِيمِ", heard: "الرحيم" })).toBe(false); // already correct
    expect(matchLive("بسم الله الرحمن الزحيق", verse).statuses[3]).toBe("CORRECT");
    expect(getVoiceProfile().variants).toHaveLength(1);

    await setStrictness("lenient");
    expect(getVoiceProfile().strictness).toBe("lenient");

    await recordSurahAccuracy(1, 60, 7, false, new Date("2026-11-01"));
    await recordSurahAccuracy(1, 85.4, 7, true, new Date("2026-11-05"));
    const [s] = surahAccuracySummary(getVoiceProfile());
    expect(s).toMatchObject({ surah: 1, attempts: 2, last: 85, best: 85, trend: 25 });

    await removeVariant("الرحيم", "الزحيق");
    expect(matchLive("بسم الله الرحمن الزحيق", verse).statuses[3]).toBe("ERROR");
    await resetVoiceProfile();
  });

  it("learns the speaking pace and only ever loosens the word limits", async () => {
    await resetVoiceProfile();
    expect(speedFactor()).toBe(1);
    await noteSpeakingRate(40, 10); // 4 words/s, fast
    await noteSpeakingRate(40, 10);
    expect(speedFactor()).toBeGreaterThan(1.5);
    expect(speedFactor({ ...emptyProfile(), wordsPerSecond: 1, speedSamples: 5 })).toBe(1);
    await noteSpeakingRate(2, 1); // too short: ignored
    expect(getVoiceProfile().speedSamples).toBe(2);
    await resetVoiceProfile();
  });
});
