import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KaldiFbank, VadGate } from "@/lib/audioPipeline";
import { ctcGreedy, parseTokens, stateSpecs, ZIPFORMER, ZipformerStream, type SessionLike, type TensorLike } from "@/lib/zipformerCore";
import { core, judgeWord, matchLivePhonemes, phonemeRefs, type PhonemeLexicon } from "@/lib/quranAlignment";
import { recognizerFor } from "@/lib/speechEngine";
import { setMatcherAdaptation } from "@/lib/quranMatcher";
import { adaptationFor, emptyProfile } from "@/lib/userAdaptation";

const ROOT = `${__dirname}/../..`;
const tone = (seconds: number) => Float32Array.from({ length: Math.round(16000 * seconds) }, (_, i) => 0.25 * Math.sin((2 * Math.PI * 440 * i) / 16000) + 0.05 * Math.sin((2 * Math.PI * 1234 * i) / 16000));

describe("Stage 1 · Kaldi fbank (Zipformer front end)", () => {
  it("matches the Kaldi reference (snip_edges=false, Povey window, 20–7600 Hz)", () => {
    const fb = new KaldiFbank();
    fb.accept(tone(1));
    fb.finish();
    const frames = fb.takeFrames();
    expect(frames).toHaveLength(100);
    // Reference values from a NumPy implementation of Kaldi's compute-fbank-feats.
    const ref: [number, number[]][] = [[0, [-5.8743, -1.2758, -1.5876, -2.5915, -8.1644]], [50, [-12.1673, -6.2054, -8.35, -14.4752, -15.9424]], [99, [-5.7468, -1.2431, -1.5941, -2.6079, -8.1836]]];
    for (const [f, vals] of ref) [0, 10, 20, 40, 79].forEach((bin, k) => expect(Math.abs(frames[f]![bin]! - vals[k]!)).toBeLessThan(2e-3));
  });
  it("streams: any block sizes give the same frames", () => {
    const x = tone(0.7);
    const a = new KaldiFbank(); a.accept(x); a.finish(); const whole = a.takeFrames();
    const b = new KaldiFbank(); const parts: Float32Array[] = [];
    for (let i = 0, k = 1; i < x.length; k++) { const n = (k * 37) % 900 + 1; b.accept(x.subarray(i, i + n)); i += n; parts.push(...b.takeFrames()); }
    b.finish(); parts.push(...b.takeFrames());
    expect(parts.length).toBe(whole.length);
    expect(Math.max(...parts.map((f, i) => Math.max(...f.map((v, j) => Math.abs(v - whole[i]![j]!)))))).toBeLessThan(1e-6);
  });
  it("VAD gate drops leading silence and shortens pauses, keeps voice", () => {
    const g = new VadGate(16000);
    const silence = new Float32Array(16000 * 2);
    expect(g.push(silence).length).toBe(0);
    const voice = tone(1);
    expect(g.push(voice).length).toBeGreaterThan(15000);
    expect(g.push(silence).length / 16000).toBeLessThan(0.8);
  });
});

describe("Stage 2 · Zipformer core", () => {
  it("reads tokens.txt (251 symbols, blank 250)", () => {
    const tokens = parseTokens(readFileSync(`${ROOT}/public/models/tokens.txt`, "utf8"));
    expect(tokens).toHaveLength(251);
    expect(tokens[250]).toBe("<blank>");
    expect(tokens[2]).toBe("ا");
    expect(tokens[247]).toBe("اااااا");
  });
  it("has the model's 98 state inputs", () => {
    const specs = stateSpecs();
    expect(specs).toHaveLength(98);
    expect(specs.find((s) => s.name === "cached_key_7")?.dims).toEqual([32, 1, 256]);
    expect(specs.find((s) => s.name === "cached_conv1_15")?.dims).toEqual([1, 256, 15]);
  });
  it("greedy CTC collapses repeats and drops the blank (250)", () => {
    const V = 4, lp = new Float32Array(6 * V).fill(-9);
    [1, 1, 3, 1, 2, 2].forEach((id, t) => { lp[t * V + id] = 0; });
    const out = ctcGreedy(lp, 6, V, 3, { prev: -1, frame: 0 }, ["a", "b", "c", "<blank>"]);
    expect(out.map((t) => t.symbol).join("")).toBe("bbc");
  });
  it("streams chunks of 61 frames, shifts by 48 and carries every state", async () => {
    const seen: string[] = [];
    let calls = 0;
    const session: SessionLike = {
      async run(feeds) {
        calls++;
        expect(feeds["x"]!.dims).toEqual([1, 61, 80]);
        expect(Object.keys(feeds)).toHaveLength(99);
        seen.push(String((feeds["processed_lens"]!.data as BigInt64Array)[0]));
        const out: Record<string, TensorLike> = {};
        for (const [k, v] of Object.entries(feeds)) if (k !== "x") out[`new_${k}`] = k === "processed_lens" ? { data: BigInt64Array.from([BigInt(calls)]), dims: [1] } : v;
        const lp = new Float32Array(12 * ZIPFORMER.vocab).fill(-9);
        for (let t = 0; t < 12; t++) lp[t * ZIPFORMER.vocab + (t === 5 ? 2 : ZIPFORMER.blank)] = 0;
        out["log_probs"] = { data: lp, dims: [1, 12, ZIPFORMER.vocab] };
        return out;
      },
    };
    const tensors = { float: (data: Float32Array, dims: number[]) => ({ data, dims }), int64: (data: BigInt64Array, dims: number[]) => ({ data, dims }) };
    const symbols = Array.from({ length: 251 }, (_, i) => (i === 2 ? "ا" : `<${i}>`));
    const zs = new ZipformerStream(session, tensors, symbols);
    await zs.accept(tone(1.2));
    await zs.finish();
    expect(calls).toBeGreaterThanOrEqual(3);
    expect(seen.slice(0, 3)).toEqual(["0", "1", "2"]); // the state of one chunk feeds the next
    expect(zs.tokens.every((t) => t.symbol === "ا")).toBe(true);
    expect(zs.tokens).toHaveLength(calls);
  });
});

describe("Stage 3 · phoneme alignment", () => {
  const lex = JSON.parse(readFileSync(`${ROOT}/public/models/quran_phonemes.json`, "utf8")) as PhonemeLexicon;
  const mushaf = JSON.parse(readFileSync(`${ROOT}/public/mushaf/words.json`, "utf8")) as { surahs: string[][][] };
  const words = (s: number, a: number) => mushaf.surahs[s - 1]![a - 1]!;
  const targets = [1, 2, 3].map((a) => words(1, a).join(" "));
  const refs = [1, 2, 3].flatMap((a) => phonemeRefs(lex, 1, a, words(1, a)));
  const exact = "بِسمِ للَااهِ ررَحمَاانِ ررَحِۦۦۦۦم ءَلحَمدُ لِللَااهِ رَببِ لعَاالَمِۦۦۦۦن ءَررَحمَاانِ ررَحِۦۦۦۦم";

  it("has phonemes for every Mushaf word, idghām split per word", () => {
    expect(lex.surahs).toHaveLength(114);
    expect(lex.surahs[0]![0]).toEqual(["بِسمِ", "للَااهِ", "ررَحمَاانِ", "ررَحِۦۦۦۦم"]);
    expect(lex.surahs[1]![4]![3]).toBe("ممممِ"); // 2:5 مِّن in "هُدًى مِّن رَّبِّهِمْ"
    let empty = 0;
    lex.surahs.forEach((s, si) => s.forEach((a, ai) => { expect(a.length).toBe(words(si + 1, ai + 1).length); empty += a.filter((p) => !p).length; }));
    expect(empty).toBe(0);
  });
  it("judges words: exact, live (last word pending), wrong word, skipped word", () => {
    setMatcherAdaptation({});
    expect(matchLivePhonemes(exact, targets, refs, { final: true }).statuses.every((s) => s === "CORRECT")).toBe(true);
    const live = matchLivePhonemes("بِسمِ للَااهِ ررَحمَاانِ ررَحِۦۦۦۦم ءَلحَمدُ لِلل", targets, refs);
    expect(live.statuses.slice(0, 6)).toEqual(["CORRECT", "CORRECT", "CORRECT", "CORRECT", "CORRECT", "PENDING"]);
    expect(live.cursor).toBe(5);
    const wrong = matchLivePhonemes("بِسمِ للَااهِ ررَحمَاانِ ررَزِۦۦۦۦق", targets, refs, { final: true });
    expect(wrong.statuses[3]).toBe("ERROR");
    expect(wrong.heard[3]).toBe("ررَزِۦۦۦۦق");
    const skipped = matchLivePhonemes("بِسمِ ررَحمَاانِ ررَحِۦۦۦۦم", targets, refs, { final: true });
    expect(skipped.statuses.slice(0, 4)).toEqual(["CORRECT", "ERROR", "CORRECT", "CORRECT"]);
  });
  it("madd length: a little longer/shorter is fine, 6 → 2 counts is a warning", () => {
    expect(core("لَااااااممممِ")).toBe("لَامِ");
    expect(judgeWord("للَااهِ", "للَاهِ").status).toBe("CORRECT");
    expect(judgeWord("ءَلحَمدُ", "ءَلحَمدِ").status).toBe("WARNING");
    expect(judgeWord("لَااااااممممِۦۦۦۦۦۦم", "لَاامِۦۦم").status).toBe("WARNING");
    expect(judgeWord("ررَحِۦۦۦۦم", "ررَزِۦۦۦۦق").status).toBe("ERROR");
  });
  it("a word in the voice profile is accepted the way the user says it", () => {
    setMatcherAdaptation(adaptationFor({ ...emptyProfile(), variants: [{ expected: "ررَحِۦۦۦۦم", heard: "ررَزِۦۦۦۦق", word: "ٱلرَّحِيمِ", heardRaw: "ررَزِۦۦۦۦق", added: "" }] }));
    expect(matchLivePhonemes("بِسمِ للَااهِ ررَحمَاانِ ررَزِۦۦۦۦق", targets, refs, { final: true }).statuses[3]).toBe("CORRECT");
    setMatcherAdaptation({});
  });
  it("uses the phoneme engine only when chosen, available and its table is loaded", () => {
    expect(recognizerFor("zipformer", "ready", true)).toBe("zipformer");
    expect(recognizerFor("zipformer", "idle", false)).toBe("whisper");
    expect(recognizerFor("zipformer", "error", true)).toBe("whisper");
    expect(recognizerFor("zipformer", "unavailable", true)).toBe("whisper");
    expect(recognizerFor("whisper", "ready", true)).toBe("whisper");
  });
});
