import { beforeEach, describe, expect, it } from "vitest";
import {
  addWords, badgeCounts, completeSurah, completeSurahRule, emptyBadges, getBadges, initBadges, onBadgeEarned, recentBadges,
  recordWords, resetBadgesForTests, surahBadgeProgress, type BadgeEarned, type WordResult,
} from "@/lib/badges";
import { recordAttempt, resetProgress } from "@/lib/progressStorage";
import { practiceWordResults } from "@/lib/surahCompletion";
import { SURAH_BADGES, surahBadge } from "@/lib/surahBadges";
import { BADGE_ICONS } from "@/lib/badgeIconData";

// al-Ikhlāṣ: 4 ayahs with 4, 2, 4, 5 words.
const IKHLAS = [4, 2, 4, 5];
/** Word results for ayahs [from..to] of al-Ikhlāṣ; `skip` = "a:w" words not completed. */
function ikhlas(from = 1, to = 4, skip: string[] = []): WordResult[] {
  const out: WordResult[] = [];
  for (let a = from; a <= to; a++) for (let w = 1; w <= IKHLAS[a - 1]!; w++) out.push({ surah: 112, ayah: a, word: w, total: IKHLAS[a - 1]!, done: !skip.includes(`${a}:${w}`) });
  return out;
}
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
describe("surah badge themes", () => {
  it("covers all 114 surahs with a unique, drawable symbol and titles", () => {
    expect(SURAH_BADGES).toHaveLength(114);
    expect(new Set(SURAH_BADGES.map((b) => b.icon)).size).toBe(114);
    for (const b of SURAH_BADGES) {
      expect(BADGE_ICONS[b.icon]).toMatch(/<(path|circle|rect|line|polyline|polygon|ellipse)/);
      expect(b.titleAr.length).toBeGreaterThan(1);
      expect(b.titleEn.length).toBeGreaterThan(1);
    }
    expect(surahBadge(1)?.icon).toBe("key");
    expect(surahBadge(22)?.icon).toBe("kaaba");
    expect(surahBadge(105)?.icon).toBe("elephant");
    expect(surahBadge(97)?.icon).toBe("moon-star");
  });
});

describe("badge rules (100 % of the words, granted only on the surah's last word)", () => {
  it("silver: every word read in READING mode, granted when the last word is completed", () => {
    const r = completeSurahRule(emptyBadges(), "READING", 112, ikhlas());
    expect(r.earned).toEqual(expect.objectContaining({ surah: 112, tier: "silver" }));
    expect(r.state.earned["112"]?.silverAt).toBeTruthy();
    expect(r.state.earned["112"]?.goldAt).toBeUndefined(); // reading never gives gold
    expect(r.state.coverage.READING["112"]).toBeUndefined();
  });

  it("gold: every word recited in MEMORIZATION mode (independent of silver)", () => {
    const r = completeSurahRule(emptyBadges(), "MEMORIZATION", 112, ikhlas());
    expect(r.earned?.tier).toBe("gold");
    expect(r.state.earned["112"]).toEqual({ goldAt: r.earned!.at });
    expect(badgeCounts(r.state)).toEqual({ gold: 1, silver: 0, total: 1 });
  });

  it("one missed word → no badge, even though the last word was completed", () => {
    const r = completeSurahRule(emptyBadges(), "READING", 112, ikhlas(1, 4, ["2:1"]));
    expect(r.earned).toBe(null);
    expect(surahBadgeProgress(r.state, 112)).toMatchObject({ total: 4, read: 3, recited: 0, tier: null });
  });

  it("no badge unless the trigger is the surah's last word", () => {
    expect(completeSurahRule(emptyBadges(), "READING", 112, ikhlas(1, 4, ["4:5"])).earned).toBe(null);
    expect(completeSurahRule(emptyBadges(), "READING", 112, ikhlas(1, 3)).earned).toBe(null);
  });

  it("coverage adds up over several sessions and pages; modes are separate", () => {
    let s = addWords(emptyBadges(), "READING", ikhlas(1, 2));
    s = addWords(s, "MEMORIZATION", ikhlas(3, 3));
    expect(completeSurahRule(s, "MEMORIZATION", 112, ikhlas(4, 4)).earned).toBe(null); // ayahs 1–2 were only read
    const r = completeSurahRule(s, "READING", 112, ikhlas(3, 4));
    expect(r.earned?.tier).toBe("silver");
  });

  it("a word completed later fixes an earlier miss", () => {
    let s = addWords(emptyBadges(), "READING", ikhlas(1, 4, ["3:2"]));
    s = addWords(s, "READING", [{ surah: 112, ayah: 3, word: 2, total: 4, done: true }]);
    expect(completeSurahRule(s, "READING", 112, ikhlas(4, 4)).earned?.tier).toBe("silver");
  });

  it("each badge is awarded once", () => {
    const s = completeSurahRule(emptyBadges(), "READING", 112, ikhlas()).state;
    expect(completeSurahRule(s, "READING", 112, ikhlas()).earned).toBe(null);
  });

  it("ignores impossible words", () => {
    const s = addWords(emptyBadges(), "READING", [{ surah: 112, ayah: 9, word: 1, total: 2, done: true }, { surah: 112, ayah: 1, word: 7, total: 4, done: true }]);
    expect(s.coverage.READING["112"]).toBeUndefined();
  });

  it("lists recent badges newest first", () => {
    let s = completeSurahRule(emptyBadges(), "MEMORIZATION", 112, ikhlas(), new Date("2026-01-01")).state;
    s = completeSurahRule(s, "READING", 108, range(3).flatMap((a) => range(2).map((w) => ({ surah: 108, ayah: a, word: w, total: 2, done: true }))), new Date("2026-02-01")).state;
    expect(recentBadges(s).map((b) => b.surah)).toEqual([108, 112]);
  });
});

describe("Recite screen words → Mushaf words", () => {
  it("counts a word printed with a waqf sign as one Mushaf word and skips waqf tokens otherwise", () => {
    const mushaf = (_s: number, a: number) => (a === 1 ? ["قُلْ", "هُوَ ۖ", "ٱللَّهُ"] : []);
    const ayat = [{ number: 1, text: "قُلْ هُوَ ۖ ٱللَّهُ" }, { number: 2, text: "ٱللَّهُ ۚ ٱلصَّمَدُ" }];
    const r = practiceWordResults(112, ayat, ["CORRECT", "WARNING", "CORRECT", "ERROR", "CORRECT", "CORRECT", "CORRECT"], mushaf, "READING", new Set());
    expect(r.map((w) => `${w.ayah}:${w.word}/${w.total}:${w.done ? 1 : 0}`)).toEqual(["1:1/3:1", "1:2/3:1", "1:3/3:0", "2:1/2:1", "2:2/2:1"]);
  });

  it("a hinted word does not count from memory", () => {
    const r = practiceWordResults(112, [{ number: 1, text: "قل هو" }], ["CORRECT", "CORRECT"], null, "MEMORIZATION", new Set([1]));
    expect(r.map((w) => w.done)).toEqual([true, false]);
  });
});

describe("badge store", () => {
  beforeEach(async () => { localStorage.clear(); await resetProgress(); resetBadgesForTests(); });

  it("never awards a badge from accuracy, progress or time alone", async () => {
    await initBadges();
    const heard: BadgeEarned[] = [];
    const off = onBadgeEarned((e) => heard.push(...e));
    await recordAttempt({ surahId: 112, mode: "MEMORIZATION_MODE", results: range(4).map((a) => ({ ayahId: a, accuracy: 100, correctWords: 3, totalWords: 3 })) });
    await recordWords("READING", ikhlas());
    off();
    expect(heard).toEqual([]);
    expect(getBadges().earned["112"]).toBeUndefined();
  });

  it("announces and saves the badge when the last word is completed", async () => {
    await initBadges();
    const heard: BadgeEarned[] = [];
    const off = onBadgeEarned((e) => heard.push(...e));
    await recordWords("MEMORIZATION", ikhlas(1, 3));
    expect(await completeSurah("MEMORIZATION", 112, ikhlas(4, 4))).toEqual(expect.objectContaining({ tier: "gold" }));
    off();
    expect(heard).toEqual([expect.objectContaining({ surah: 112, tier: "gold" })]);
    expect(JSON.parse(localStorage.getItem("hifz.badges.v1") ?? "{}").earned?.["112"]?.goldAt).toBeTruthy();
  });

  it("drops version-1 timer-based reading records but keeps earned badges", async () => {
    localStorage.setItem("hifz.badges.v1", JSON.stringify({ version: 1, read: { "113": [1, 2, 3] }, earned: { "1": { silverAt: "2026-01-01T00:00:00.000Z" } } }));
    const s = await initBadges();
    expect(s.version).toBe(2);
    expect(s.earned["1"]?.silverAt).toBeTruthy();
    expect(s.coverage.READING).toEqual({});
  });
});
