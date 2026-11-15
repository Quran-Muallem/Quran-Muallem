import { describe, it, expect } from "vitest";
import { matchLive } from "@/lib/quranMatcher";
import { combineLock, lockSegment, startLock } from "@/lib/correctionLock";
import { kidsStarsFor, creditRecitationStars } from "@/lib/kidsRecitationStars";

const T = ["قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ", "مِن شَرِّ مَا خَلَقَ"];

describe("v55 – Ayah Correction Lock", () => {
  const before = matchLive("قل اعوذ بكلب الفلق", T); // word 2 wrong
  it("starts at the mistaken word and freezes what came before", () => {
    const l = startLock(before, T, 2)!;
    expect(l).toMatchObject({ k: 2, verse: 0, verseStart: 0, verseEnd: 3, locked: true });
    expect(l.frozen).toEqual(before.statuses.slice(0, 2));
  });
  it("while locked nothing of the next verse is judged, nothing of this verse turns red", () => {
    const l = startLock(before, T, 2)!;
    const seg = lockSegment(T, null, l);
    expect(seg.targets).toEqual(T); // v56: the whole verse + the next one as look-ahead (never judged while locked)
    // the reciter jumps ahead without repeating: no red cascade, cursor stays on the corrected word
    const m = combineLock(T, l, matchLive("من شر", seg.targets));
    expect(m.statuses.slice(2)).toEqual(["PENDING", "PENDING", "PENDING", "PENDING", "PENDING", "PENDING"]);
    expect(m.cursor).toBe(2);
    expect(m.done).toBe(false);
  });
  it("repeat + finish the verse → cursor moves to the next verse; release keeps the speech", () => {
    const l = startLock(before, T, 2)!;
    const said = "برب الفلق من شر";
    const locked = combineLock(T, l, matchLive(said, lockSegment(T, null, l).targets));
    expect(locked.statuses.slice(2, 4)).toEqual(["CORRECT", "CORRECT"]);
    expect(locked.statuses.slice(4)).toEqual(["PENDING", "PENDING", "PENDING", "PENDING"]);
    expect(locked.cursor).toBe(4);
    const free = { ...l, locked: false };
    const m = combineLock(T, free, matchLive(said, lockSegment(T, null, free).targets));
    expect(m.statuses.slice(4, 6)).toEqual(["CORRECT", "CORRECT"]);
    expect(m.cursor).toBe(6);
  });
});

describe("v55 – forgiving kids stars", () => {
  it("maps the share of matched words to 1–5 stars", () => {
    expect([0, 0.29, 0.3, 0.49, 0.5, 0.69, 0.7, 0.84, 0.85, 1].map(kidsStarsFor)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it("keeps the best result per surah and credits only the improvement", () => {
    localStorage.removeItem("qm.kids.reciteStars.v1");
    expect(creditRecitationStars(113, 3)).toBe(3);
    expect(creditRecitationStars(113, 2)).toBe(0);
    expect(creditRecitationStars(113, 5)).toBe(2);
  });
});
