import { describe, it, expect, beforeEach } from "vitest";
import { matchLive } from "@/lib/quranMatcher";
import { combineLock, lockComplete, lockSegment, restartAnchors, startLock } from "@/lib/correctionLock";
import { firstNewError } from "@/lib/liveMistakes";
import { creditRecitationStars, KIDS_STARS_KEY, resetKidsStarsCache } from "@/lib/kidsRecitationStars";

// Al-Baqarah 2:2 has a waqf sign (ۛ) after «فيه»; the matcher ignores it as a word.
const V = ["ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ", "ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ"];
// flat tokens: 0 ذلك 1 الكتاب 2 لا 3 ريب 4 ۛ 5 فيه 6 ۛ 7 هدى 8 للمتقين | 9 الذين 10 يؤمنون 11 بالغيب
const K = 8; // mistake on «للمتقين»

function lockAfterMistake() {
  const before = matchLive("ذلك الكتاب لا ريب فيه هدى للمؤمنين", V);
  return { before, lock: startLock(before, V, K)! };
}
const run = (said: string, lock: ReturnType<typeof lockAfterMistake>["lock"]) => combineLock(V, lock, matchLive(said, lockSegment(V, null, lock).targets));

describe("v56 – waqf / ayah-start restart anchors", () => {
  it("finds verse start, the word after the last waqf, and the mistake", () => {
    expect(restartAnchors(V, K)).toEqual([0, 7, 8]);
    expect(restartAnchors(V, 3)).toEqual([0, 3]); // no waqf before word 3
  });
  for (const [name, said] of [
    ["the verse start", "ذلك الكتاب لا ريب فيه هدى للمتقين"],
    ["after the last waqf", "هدى للمتقين"],
    ["the corrected word", "للمتقين"],
  ] as const) {
    it(`restart from ${name}: re-aligns without new mistakes and completes the verse`, () => {
      const { before, lock } = lockAfterMistake();
      const announced = new Set(before.statuses.map((s, i) => (s === "ERROR" ? i : -1)).filter((i) => i >= 0));
      const m = run(said, lock);
      expect(m.statuses[K]).toBe("CORRECT");
      expect(m.statuses.slice(0, K).includes("ERROR")).toBe(false);
      expect(firstNewError(m.statuses, announced)).toBe(-1); // never interrupts again
      expect(lockComplete(matchLive(said, lockSegment(V, null, lock).targets), lock)).toBe(true);
      expect(m.cursor).toBe(9);
      expect(m.statuses.slice(9)).toEqual(["PENDING", "PENDING", "PENDING"]);
    });
  }
  it("while re-reading the run-up the cursor follows the reciter, nothing turns red", () => {
    const { before, lock } = lockAfterMistake();
    const announced = new Set<number>([K]);
    const m = run("ذلك الكتاب لا", lock);
    expect(m.cursor).toBe(3);
    expect(m.statuses.slice(0, K).includes("ERROR")).toBe(false);
    expect(firstNewError(m.statuses, announced)).toBe(-1);
    expect(before.statuses[K]).toBe("ERROR");
  });
});

describe("v56 – kids stars persist", () => {
  beforeEach(() => { localStorage.clear(); resetKidsStarsCache(); });
  it("saves max(existing, new) under qm_kids_surah_stars and survives a restart", () => {
    creditRecitationStars(1, 4);
    creditRecitationStars(1, 2);
    creditRecitationStars(112, 5);
    resetKidsStarsCache(); // «restart»
    expect(JSON.parse(localStorage.getItem(KIDS_STARS_KEY)!)).toEqual({ 1: 4, 112: 5 });
  });
  it("migrates v55 results", () => {
    localStorage.setItem("qm.kids.reciteStars.v1", JSON.stringify({ 113: 3 }));
    resetKidsStarsCache();
    expect(creditRecitationStars(113, 3)).toBe(0);
    expect(creditRecitationStars(113, 5)).toBe(2);
    expect(JSON.parse(localStorage.getItem(KIDS_STARS_KEY)!)).toEqual({ 113: 5 });
  });
});
