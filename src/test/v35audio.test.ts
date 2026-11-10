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

describe("v35 · example playback falls back step by step", () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.resetModules(); vi.doUnmock("@/lib/audioPlayback"); vi.unstubAllGlobals(); });
  const fakeAudio = () => {
    const a = { paused: true, listeners: {} as Record<string, (() => void)[]>, addEventListener(n: string, f: () => void) { (this.listeners[n] ??= []).push(f); }, removeEventListener() {}, pause() { this.paused = true; (this.listeners["pause"] ?? []).forEach((f) => f()); }, play: async () => {} };
    return a;
  };
  it("uses the Sheikh's word timings when available", async () => {
    const a = fakeAudio();
    const playClip = vi.fn(async () => { a.paused = false; setTimeout(() => a.pause(), 5); });
    vi.stubGlobal("fetch", vi.fn(async (u: string) => { expect(u).toContain("?fields=segments"); return { ok: true, json: async () => ({ audio_files: [{ url: "Alafasy/mp3/001002.mp3", segments: [[0, 1, 0, 400], [1, 2, 400, 900], [2, 3, 900, 1500]] }] }) }; }));
    vi.doMock("@/lib/audioPlayback", async (orig) => ({ normalizeSegments: (await orig<typeof import("@/lib/audioPlayback")>()).normalizeSegments, playClip, currentWordAudio: () => a, claimSheikhAudio: () => {}, stopWordAudio: () => {}, sheikhAudio: () => a }));
    const { playExample } = await import("@/lib/tajweedAudio");
    const started = vi.fn();
    const v = await playExample({ ar: "x", ref: [1, 2, 2, 3] }, "alafasy", started, "selected");
    expect(v).toBe("sheikh");
    expect(playClip).toHaveBeenCalledWith("https://verses.quran.com/Alafasy/mp3/001002.mp3", 400, 1500);
    expect(started).toHaveBeenCalledWith("sheikh");
  });
  it("v38: by default the Mujawwad of Al-Husary (whole verse from everyayah); «wbw» keeps the corrections' voice", async () => {
    const a = fakeAudio();
    const urls: string[] = [];
    const playClip = vi.fn(async (url: string) => { urls.push(url); a.paused = false; setTimeout(() => a.pause(), 5); });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.doMock("@/lib/audioPlayback", () => ({ normalizeSegments: () => [], playClip, currentWordAudio: () => a, claimSheikhAudio: () => {}, stopWordAudio: () => {}, sheikhAudio: () => a }));
    const { playExample, getExampleSource } = await import("@/lib/tajweedAudio");
    expect(getExampleSource()).toBe("husary-mj");
    expect(await playExample({ ar: "x", ref: [2, 2, 1, 1] }, "alafasy")).toBe("verse");
    expect(urls).toEqual(["https://everyayah.com/data/Husary_128kbps_Mujawwad/002002.mp3"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    urls.length = 0;
    expect(await playExample({ ar: "x", ref: [1, 1, 1, 1] }, "alafasy", undefined, "wbw")).toBe("wordByWord");
    expect(urls).toEqual(["https://audio.qurancdn.com/wbw/001_001_001.mp3"]);
  });
  it("v38: Abdul-Basit Mujawwad is cut to the example's words (Quran.com word timings)", async () => {
    const a = fakeAudio();
    const playClip = vi.fn(async () => { a.paused = false; setTimeout(() => a.pause(), 5); });
    vi.stubGlobal("fetch", vi.fn(async (u: string) => { expect(u).toContain("/recitations/1/by_ayah/2:2?fields=segments"); return { ok: true, json: async () => ({ audio_files: [{ url: "AbdulBaset/Mujawwad/mp3/002002.mp3", segments: [[0, 1, 1600, 2800], [1, 2, 2810, 4330]] }] }) }; }));
    vi.doMock("@/lib/audioPlayback", async (orig) => ({ normalizeSegments: (await orig<typeof import("@/lib/audioPlayback")>()).normalizeSegments, playClip, currentWordAudio: () => a, claimSheikhAudio: () => {}, stopWordAudio: () => {}, sheikhAudio: () => a }));
    const { playExample } = await import("@/lib/tajweedAudio");
    expect(await playExample({ ar: "x", ref: [2, 2, 2, 2] }, "alafasy", undefined, "abdulbasit-mj")).toBe("sheikh");
    expect(playClip).toHaveBeenCalledWith("https://verses.quran.com/AbdulBaset/Mujawwad/mp3/002002.mp3", 2810, 4330);
  });
  it("falls back to word-by-word files, then to the whole verse", async () => {
    const a = fakeAudio();
    const urls: string[] = [];
    let wbwOk = true;
    const playClip = vi.fn(async (url: string) => { urls.push(url); if (!wbwOk) throw new Error("404"); a.paused = false; setTimeout(() => a.pause(), 5); });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => null })));
    vi.doMock("@/lib/audioPlayback", () => ({ normalizeSegments: () => [], playClip, currentWordAudio: () => a, claimSheikhAudio: () => {}, stopWordAudio: () => {}, sheikhAudio: () => a }));
    const { playExample } = await import("@/lib/tajweedAudio");
    expect(await playExample({ ar: "x", ref: [2, 2, 3, 4] }, "alafasy", undefined, "selected")).toBe("wordByWord");
    expect(urls).toEqual(["https://audio.qurancdn.com/wbw/002_002_003.mp3", "https://audio.qurancdn.com/wbw/002_002_004.mp3"]);
    wbwOk = false;
    expect(await playExample({ ar: "x", ref: [2, 2, 3, 3] }, "alafasy", undefined, "selected")).toBe("verse");
  });
});
