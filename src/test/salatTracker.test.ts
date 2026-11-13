import { describe, expect, it } from "vitest";
import fs from "fs";
import { SalatPrayerTracker, findPhrase, promptSpan, salatVerse, trailingErrors, type SalatEvent } from "@/lib/SalatPrayerTracker";
import type { LiveMatch, LiveStatus } from "@/lib/quranMatcher";

const lex = JSON.parse(fs.readFileSync("public/models/quran_phonemes.json", "utf8")).surahs as string[][][];
const ph = (s: number, a: number) => lex[s - 1]![a - 1]!.join("");
const fatiha = () => Array.from({ length: 7 }, (_, i) => ph(1, i + 1)).join("");
const state = (ev: SalatEvent[]) => ev.find((e) => e.type === "state");
const rebase = (ev: SalatEvent[]) => ev.find((e): e is Extract<SalatEvent, { type: "rebase" }> => e.type === "rebase")?.pos;
const match = (statuses: LiveStatus[], cursor: number, done = false): LiveMatch => ({
  statuses, cursor, done, counts: { correct: 0, warning: 0, error: 0, extra: 0 }, recited: statuses.filter((s) => s === "CORRECT").length, total: statuses.length, accuracy: 100, heard: [],
});

describe("Salat Mode phrases", () => {
  it("finds the end of al-Fātiḥah, the takbīr and the opening of a rakʿah in phonemes", () => {
    const f = fatiha();
    const end = findPhrase("phonemes", f, ["fatihaEnd"])!;
    expect(end.end).toBe(f.length);
    expect(findPhrase("phonemes", "سُبحَاانَرَببِيَلعَظِۦۦۦۦم" + "ءَللَااهُءَكبَر", ["takbir"])).toBeTruthy();
    expect(findPhrase("phonemes", "سَمِعَللَااهُلِمَنحَمِدَه", ["samiAllah"])).toBeTruthy();
    expect(findPhrase("phonemes", ph(1, 2), ["basmala", "hamdala"])?.id).toBe("hamdala");
  });
  it("finds them in plain Arabic text (Whisper)", () => {
    expect(findPhrase("text", "صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين", ["fatihaEnd"])).toBeTruthy();
    expect(findPhrase("text", "قل هو الله أحد الله أكبر", ["takbir"])).toBeTruthy();
    expect(findPhrase("text", "قل هو الله أحد الله الصمد", ["takbir"])).toBeNull();
  });
  it("hears no takbīr in ordinary verses with «الله»", () => {
    for (const [s, a] of [[112, 1], [112, 2], [2, 255], [59, 22], [24, 35]] as const) expect(findPhrase("phonemes", ph(s, a), ["takbir", "samiAllah"])).toBeNull();
  });
});

describe("SalatPrayerTracker", () => {
  it("runs a whole rakʿah: Fātiḥah → surah → takbīr → next rakʿah", () => {
    const t = new SalatPrayerTracker();
    expect(state(t.start(0))).toMatchObject({ state: "RECITING_FATIHA", rakah: 1 });
    // Part of al-Fātiḥah: nothing happens, and no prompt ever.
    expect(t.onTranscript("phonemes", ph(1, 1) + ph(1, 2), 1000)).toEqual([]);
    expect(t.tick({ now: 60_000, match: match(["PENDING"], 0) })).toEqual([]);
    // «ولا الضالين» heard, but the transcript ends there: wait for a quiet moment …
    expect(t.onTranscript("phonemes", fatiha() + "ءَاامِۦۦۦۦن", 30_000)).toEqual([]);
    expect(t.tick({ now: 30_500 })).toEqual([]);
    const done = t.tick({ now: 31_000 });
    expect(state(done)).toMatchObject({ state: "ACTIVE_SURAH_TRACKING" });
    expect(rebase(done)).toBe((fatiha() + "ءَاامِۦۦۦۦن").length);
    // The pause while the next surah is chosen: no prompt (nothing located yet).
    expect(t.tick({ now: 40_000, match: match(["PENDING"], 0) })).toEqual([]);
    t.onLocated({ surah: 112, ayah: 1 }, 41_000);
    // Located, but not a word recited yet: no prompt.
    expect(t.tick({ now: 50_000, match: match(["PENDING", "PENDING"], 0), voiced: 0 })).toEqual([]);
    // 4 words recited, then silence.
    const st: LiveStatus[] = ["CORRECT", "CORRECT", "CORRECT", "CORRECT", "PENDING", "PENDING"];
    t.onTranscript("phonemes", ph(112, 1), 51_000);
    expect(t.tick({ now: 51_000, match: match(st, 4), voiced: 1 })).toEqual([]);
    expect(t.tick({ now: 53_000, match: match(st, 4), voiced: 0 })).toEqual([]);
    expect(t.tick({ now: 54_600, match: match(st, 4), voiced: 0 })).toEqual([{ type: "prompt", token: 4, reason: "stall", mode: "words" }]);
    // Not again at once …
    expect(t.tick({ now: 58_000, match: match(st, 4), voiced: 0 })).toEqual([]);
    // … but voice right now blocks a prompt.
    expect(t.tick({ now: 80_000, match: match(st, 4), voiced: 1.2 })).toEqual([]);
    // Takbīr: muted.
    const tk = t.onTranscript("phonemes", ph(112, 1) + "ءَللَااهُءَكبَر", 81_000, { tokens: ["قُلْ", "هُوَ", "ٱللَّهُ", "أَحَدٌ"], cursor: 4 });
    expect(state(tk)).toMatchObject({ state: "IN_RUKU_OR_SUJUD" });
    expect(t.tick({ now: 200_000, match: match(st, 4), voiced: 0 })).toEqual([]);
    // Next rakʿah begins with the basmala.
    const next = t.onTranscript("phonemes", "سُبحَاانَرَببِيَلعَظِۦۦۦۦم" + ph(1, 1), 220_000);
    expect(state(next)).toMatchObject({ state: "RECITING_FATIHA", rakah: 2 });
    expect(rebase(next)).toBe("سُبحَاانَرَببِيَلعَظِۦۦۦۦم".length);
  });

  it("does not take a recited «اللهُ أكبر» (29:45) for a takbīr", () => {
    const t = new SalatPrayerTracker();
    t.start(0); t.onTranscript("phonemes", fatiha() + ph(29, 45).slice(0, 12), 1000);
    expect(t.state).toBe("ACTIVE_SURAH_TRACKING");
    t.onLocated({ surah: 29, ayah: 45 }, 2000);
    const ev = t.onTranscript("phonemes", ph(29, 45), 3000, { tokens: ["وَلَذِكْرُ", "ٱللَّهِ", "أَكْبَرُ", "وَٱللَّهُ"], cursor: 3 });
    expect(state(ev)).toBeUndefined();
    expect(t.state).toBe("ACTIVE_SURAH_TRACKING");
  });

  it("prompts the opening words after a slip into another verse and a 2 s pause", () => {
    const t = new SalatPrayerTracker({ silenceMs: 5000 });
    t.start(0); t.onTranscript("phonemes", fatiha(), 1000); t.tick({ now: 2000 }); t.onLocated({ surah: 2, ayah: 1 }, 1000);
    const st: LiveStatus[] = ["CORRECT", "CORRECT", "ERROR", "ERROR", "PENDING"];
    t.onTranscript("phonemes", "x", 2000);
    expect(t.tick({ now: 2000, match: match(st, 4), voiced: 1 })).toEqual([]);
    expect(t.tick({ now: 4100, match: match(st, 4), voiced: 0 })).toEqual([{ type: "prompt", token: 2, reason: "mistake", mode: "words" }]);
    expect(t.tick({ now: 4500, match: match(st, 4), voiced: 0 })).toEqual([]);
  });

  it("never prompts at the end of the surah", () => {
    const t = new SalatPrayerTracker();
    t.start(0); t.onTranscript("phonemes", fatiha(), 1000); t.tick({ now: 2000 }); t.onLocated({ surah: 112, ayah: 1 }, 1000);
    t.tick({ now: 1500, match: match(["CORRECT"], 0), voiced: 1 });
    expect(t.tick({ now: 60_000, match: match(["CORRECT"], 1, true), voiced: 0 })).toEqual([]);
  });

  it("falls back when «ولا الضالين» was not heard: the next surah located ends the Fātiḥah", () => {
    const t = new SalatPrayerTracker();
    t.start(0);
    expect(state(t.fatihaPassed(5000, 120))).toMatchObject({ state: "ACTIVE_SURAH_TRACKING" });
    expect(t.fatihaPassed(6000, 0)).toEqual([]);
  });

  it("builds prompts of 2–3 words or the whole verse", () => {
    const v = [salatVerse(112, 1, ["قُلْ", "هُوَ", "ٱللَّهُ", "أَحَدٌ"]), salatVerse(112, 2, ["ٱللَّهُ", "ٱلصَّمَدُ"])];
    expect(promptSpan(v, 1, "words", "stall")).toMatchObject({ ayah: 1, fromWord: 2, toWord: 4, text: "هُوَ ٱللَّهُ أَحَدٌ" });
    expect(promptSpan(v, 4, "words", "stall")).toMatchObject({ ayah: 2, fromWord: 1, toWord: 2 });
    expect(promptSpan(v, 3, "words", "mistake")).toMatchObject({ ayah: 1, fromWord: 1, toWord: 3 });
    expect(promptSpan(v, 5, "ayah", "stall")).toMatchObject({ ayah: 2, fromWord: 1, toWord: 2 });
    expect(promptSpan(v, 9, "words", "stall")).toBeNull();
    expect(trailingErrors(["CORRECT", "ERROR", "ERROR", "PENDING"], 3)).toBe(2);
  });

  it("knows rukūʿ from the tasbīḥ when the takbīr was too quiet", () => {
    const t = new SalatPrayerTracker();
    t.start(0); t.onTranscript("phonemes", fatiha(), 1000); t.tick({ now: 2000 }); t.onLocated({ surah: 112, ayah: 1 }, 2000);
    expect(state(t.onTranscript("phonemes", ph(112, 1) + "سُبحَاانَرَببِيَلعَظِۦۦۦۦم", 9000))).toMatchObject({ state: "IN_RUKU_OR_SUJUD" });
  });

  it("starts the next rakʿah when al-Fātiḥah begins again without a heard takbīr", () => {
    const t = new SalatPrayerTracker();
    t.start(0); t.onTranscript("phonemes", fatiha(), 1000); t.tick({ now: 2000 }); t.onLocated({ surah: 112, ayah: 1 }, 2000);
    const ev = t.onTranscript("phonemes", ph(112, 1) + ph(112, 2) + ph(1, 1) + ph(1, 2), 30_000, { tokens: ["قُلْ", "هُوَ", "ٱللَّهُ", "أَحَدٌ", "ٱللَّهُ", "ٱلصَّمَدُ"], cursor: 6 });
    expect(state(ev)).toMatchObject({ state: "RECITING_FATIHA", rakah: 2 });
    expect(rebase(ev)).toBe((ph(112, 1) + ph(112, 2)).length);
  });

  it("does not prompt after sounds that matched nothing (perhaps a quiet takbīr)", () => {
    const t = new SalatPrayerTracker();
    t.start(0); t.onTranscript("phonemes", fatiha(), 1000); t.tick({ now: 2000 }); t.onLocated({ surah: 112, ayah: 1 }, 2000);
    const st: LiveStatus[] = ["CORRECT", "CORRECT", "PENDING", "PENDING"];
    t.onTranscript("phonemes", "قُلهُوَ", 3000);
    t.tick({ now: 3000, match: match(st, 2), voiced: 1 });
    t.onTranscript("phonemes", "قُلهُوَءَللَاا", 6000); // heard, cursor did not move
    expect(t.tick({ now: 6100, match: match(st, 2), voiced: 0 })).toEqual([]);
    expect(t.tick({ now: 20_000, match: match(st, 2), voiced: 0 })).toEqual([]);
  });
});

describe("SalatPrayerTracker × motion sensors (v43)", () => {
  const lex2 = JSON.parse(fs.readFileSync("public/models/quran_phonemes.json", "utf8")).surahs as string[][][];
  const p = (s: number, a: number) => lex2[s - 1]![a - 1]!.join("");
  const fat = () => Array.from({ length: 7 }, (_, i) => p(1, i + 1)).join("");

  it("ignores the opening takbīr before al-Fātiḥah", () => {
    const t = new SalatPrayerTracker();
    t.start(0);
    expect(t.onTranscript("phonemes", "ءَللَااهُءَكبَر", 500)).toEqual([]);
    expect(t.state).toBe("RECITING_FATIHA");
    expect(t.onTranscript("text", "الله اكبر", 600)).toEqual([]);
    // … but a takbīr after al-Fātiḥah (its end not heard clearly) still means rukūʿ.
    expect(t.onTranscript("phonemes", "ءَللَااهُءَكبَر" + p(1, 2) + p(1, 3) + "ءَللَااهُءَكبَر", 900).find((e) => e.type === "state")).toMatchObject({ state: "IN_RUKU_OR_SUJUD" });
  });

  it("mutes when the sensors see rukūʿ / sujūd and restarts al-Fātiḥah on standing up", () => {
    const t = new SalatPrayerTracker();
    t.start(0); t.onTranscript("phonemes", fat(), 1000); t.tick({ now: 2000 });
    expect(t.state).toBe("ACTIVE_SURAH_TRACKING");
    expect(t.motionMute(3000, 40).find((e) => e.type === "state")).toMatchObject({ state: "IN_RUKU_OR_SUJUD" });
    expect(t.motionMute(3500, 0)).toEqual([]);
    const up = t.motionNewRakah(60_000, 12, 2);
    expect(up.find((e) => e.type === "state")).toMatchObject({ state: "RECITING_FATIHA", rakah: 2 });
    // Speech was first: only the number is taken over.
    expect(t.motionNewRakah(61_000, 30, 2)).toEqual([{ type: "state", state: "RECITING_FATIHA", rakah: 2 }]);
  });

  it("stays passive after al-Fātiḥah in a Fātiḥah-only rakʿah", () => {
    const t = new SalatPrayerTracker();
    t.start(0); t.setPassive(true);
    t.onTranscript("phonemes", fat(), 1000); t.tick({ now: 2000 });
    expect(t.state).toBe("ACTIVE_SURAH_TRACKING");
    t.onLocated({ surah: 112, ayah: 1 }, 2000);
    const st: LiveStatus[] = ["CORRECT", "CORRECT", "PENDING"];
    t.onTranscript("phonemes", "قُلهُوَ", 3000);
    t.tick({ now: 3000, match: match(st, 2), voiced: 1 });
    expect(t.tick({ now: 30_000, match: match(st, 2), voiced: 0 })).toEqual([]);
  });
});
