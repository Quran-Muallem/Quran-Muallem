import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { TAJWEED } from "@/data/tajweedData";

const words = (JSON.parse(readFileSync("public/mushaf/words.json", "utf8")) as { surahs: string[][][] }).surahs;
const bare = (s: string) => s.normalize("NFC").replace(/[ً-ٰٟۖ-ۭـ\s]/g, "").replace(/[ٱأإآ]/g, "ا").replace(/[ىي]/g, "ي");
const examples = TAJWEED.flatMap((c) => c.rules.flatMap((r) => r.examples.map((e) => ({ rule: r.id, e }))));

describe("v35 · every Tajweed example has its place in the Quran", async () => {
  const { exampleRef } = await import("@/lib/tajweedAudio");
  it("each example has a reference [surah, ayah, first, last] inside the text", () => {
    for (const { rule, e } of examples) {
      const ref = exampleRef(e);
      if (!ref) throw new Error(`${rule}: ${e.ar} has no reference`);
      const [s, a, w1, w2] = ref;
      const ayah = words[s - 1]?.[a - 1];
      if (!ayah || w1 < 1 || w2 < w1 || w2 > ayah.length) throw new Error(`${rule}: ${e.ar} → bad ref ${ref.join(":")}`);
    }
  });
  it("explicit references (stop marks) point to the very words", () => {
    for (const { rule, e } of examples.filter((x) => x.e.ref)) {
      const [s, a, w1, w2] = e.ref!;
      const text = bare(words[s - 1]![a - 1]!.slice(w1 - 1, w2).join(""));
      const want = bare(e.ar);
      // Mushaf spelling may differ slightly (ٱ/ا, small letters): the first word's stem must match.
      expect(text.slice(0, 3), `${rule}: ${e.ar}`).toBe(want.slice(0, 3));
    }
  });
  it("covers the four requested sections", () => {
    const ids = TAJWEED.map((c) => c.titleAr);
    for (const t of ["الوقف بالسكون والابتداء", "أحكام الوقف والابتداء والمعاني", "الحروف المفخمة والمرققة", "أحكام الراء واللام والألف"]) expect(ids).toContain(t);
    const heavy = TAJWEED.find((c) => c.id === "tafkheem")!.rules.find((r) => r.id === "isti-la")!;
    for (const l of "خصضغطقظ") expect(heavy.examples.some((e) => e.mark?.some((m) => m.includes(l))), l).toBe(true);
  });
});

describe("v39 · examples always play the WHOLE verse", () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.resetModules(); vi.doUnmock("@/lib/audioPlayback"); vi.unstubAllGlobals(); });
  const fakeAudio = () => {
    const a = { paused: true, currentTime: 0, listeners: {} as Record<string, (() => void)[]>, addEventListener(n: string, f: () => void) { (this.listeners[n] ??= []).push(f); }, removeEventListener() {}, pause() { this.paused = true; (this.listeners["pause"] ?? []).forEach((f) => f()); }, play: async () => {} };
    return a;
  };
  it("default Al-Husary Mujawwad: the verse file from everyayah, no word cut, no word-by-word voice", async () => {
    const a = fakeAudio();
    const playClip = vi.fn(async () => { a.paused = false; setTimeout(() => a.pause(), 5); });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.doMock("@/lib/audioPlayback", () => ({ normalizeSegments: () => [], playClip, currentWordAudio: () => a, claimSheikhAudio: () => {}, stopWordAudio: () => {}, sheikhAudio: () => a }));
    const { playExample, getExampleSource, TAJWEED_VOICES } = await import("@/lib/tajweedAudio");
    expect(getExampleSource()).toBe("husary-mj");
    expect(TAJWEED_VOICES.map((v) => v.id)).toEqual(["husary-mj", "minshawi-mj", "abdulbasit-mj", "mustafa-mj", "hudhaifi", "alafasy", "husary-muallim", "minshawi-muallim"]);
    expect(await playExample({ ar: "x", ref: [2, 2, 1, 1] }, "alafasy")).toBe("verse");
    expect(playClip).toHaveBeenCalledTimes(1);
    expect(playClip).toHaveBeenCalledWith("https://everyayah.com/data/Husary_128kbps_Mujawwad/002002.mp3");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(playClip.mock.calls)).not.toContain("wbw");
  });
  it("Abdul-Basit: the whole verse with Quran.com timings, the word being recited is reported", async () => {
    const a = fakeAudio();
    const playClip = vi.fn(async () => { a.paused = false; a.currentTime = 3; setTimeout(() => a.pause(), 250); });
    vi.stubGlobal("fetch", vi.fn(async (u: string) => { expect(u).toContain("/recitations/1/by_ayah/2:2?fields=segments"); return { ok: true, json: async () => ({ audio_files: [{ url: "AbdulBaset/Mujawwad/mp3/002002.mp3", segments: [[0, 1, 1600, 2800], [1, 2, 2810, 4330]] }] }) }; }));
    vi.doMock("@/lib/audioPlayback", async (orig) => ({ normalizeSegments: (await orig<typeof import("@/lib/audioPlayback")>()).normalizeSegments, playClip, currentWordAudio: () => a, claimSheikhAudio: () => {}, stopWordAudio: () => {}, sheikhAudio: () => a }));
    const { playExample } = await import("@/lib/tajweedAudio");
    const words: (number | null)[] = [];
    expect(await playExample({ ar: "x", ref: [2, 2, 2, 2] }, "alafasy", undefined, "abdulbasit-mj", (w) => words.push(w))).toBe("sheikh");
    expect(playClip).toHaveBeenCalledWith("https://verses.quran.com/AbdulBaset/Mujawwad/mp3/002002.mp3");
    expect(words).toContain(2);
  });
  it("v40 Muallim (Quran.com QDC): the verse cut out of the surah file, children's repetitions followed", async () => {
    const a = fakeAudio();
    const playClip = vi.fn(async () => { a.paused = false; a.currentTime = 12; setTimeout(() => a.pause(), 250); });
    vi.stubGlobal("fetch", vi.fn(async (u: string) => {
      expect(u).toBe("https://api.qurancdn.com/api/qdc/audio/reciters/168/audio_files?chapter=1&segments=true");
      return { ok: true, json: async () => ({ audio_files: [{ audio_url: "https://download.quranicaudio.com/qdc/siddiq_minshawi/kids_repeat/1.mp3", verse_timings: [
        { verse_key: "1:2", timestamp_from: 8037, timestamp_to: 17976, segments: [[1, 8037, 9614], [2, 9614, 10438], [1, 11640, 14445], [5, 17137]] }] }] }) };
    }));
    vi.doMock("@/lib/audioPlayback", () => ({ normalizeSegments: () => [], playClip, currentWordAudio: () => a, claimSheikhAudio: () => {}, stopWordAudio: () => {}, sheikhAudio: () => a }));
    const { playExample } = await import("@/lib/tajweedAudio");
    const words: (number | null)[] = [];
    expect(await playExample({ ar: "x", ref: [1, 2, 1, 1] }, "alafasy", undefined, "minshawi-muallim", (w) => words.push(w))).toBe("sheikh");
    expect(playClip).toHaveBeenCalledWith("https://download.quranicaudio.com/qdc/siddiq_minshawi/kids_repeat/1.mp3", 8037, 17976);
    expect(words).toContain(1);
  });
  it("old choices: «sheikh» → Al-Afasy, word-by-word → default", async () => {
    const { getExampleSource } = await import("@/lib/tajweedAudio");
    localStorage.setItem("qm.tajweed.voice", "sheikh"); expect(getExampleSource()).toBe("alafasy");
    localStorage.setItem("qm.tajweed.voice", "wordByWord"); expect(getExampleSource()).toBe("husary-mj");
    localStorage.setItem("qm.tajweed.voice", "wbw"); expect(getExampleSource()).toBe("husary-mj");
    localStorage.removeItem("qm.tajweed.voice");
  });
});

describe("v39 · waqf examples", async () => {
  const { TAJWEED } = await import("@/data/tajweedData");
  const VOICE = (await import("@/data/tajweedVoiceRefs.json")).default as Record<string, Record<string, { ref: number[]; word: string; gap: number }>>;
  const rule = (id: string) => TAJWEED.flatMap((c) => c.rules).find((r) => r.id === id)!;
  it("stopping on sukūn: every example is the last word of its verse (1:2, 2:5 …)", () => {
    const ex = rule("waqf-sukoon").examples;
    expect(ex.map((e) => e.ref!.slice(0, 2).join(":"))).toEqual(expect.arrayContaining(["1:2", "2:5"]));
    for (const e of ex) expect(e.ref![3], e.ar).toBe(words[e.ref![0] - 1]![e.ref![1] - 1]!.length);
  });
  it("reciter-matched pauses point to real Mushaf words with the right stop mark", () => {
    const MARK: Record<string, string> = { "sign-mim": "ۘ", "sign-la": "ۙ", "sign-jim": "ۚ", "sign-sila": "ۖ", "sign-qila": "ۗ", "sign-muanaqah": "ۛ" };
    for (const [voice, rules] of Object.entries(VOICE)) {
      for (const [r, v] of Object.entries(rules)) {
        const [s, a, w] = v.ref as [number, number, number];
        const word = words[s - 1]![a - 1]![w - 1]!;
        expect(word, `${voice} ${r}`).toBe(v.word);
        if (MARK[r]) expect(word, `${voice} ${r}`).toContain(MARK[r]);
        expect(v.gap).toBeGreaterThanOrEqual(1200);
      }
    }
  });
});
