import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildMushaf } from "@/lib/mushafData";
import { mainPart, recordingParts } from "@/lib/recordingParts";
import { HIZB_STARTS, addRecent, hizbOfPage, memorizedShare } from "@/lib/mushafNav";
import { parseTime } from "@/lib/dailyReminder";
import { celebrateWhenStopped, setCelebrator, setMicActive } from "@/lib/recordingActivity";
import { DEFAULT_SETTINGS, cleanSettings } from "@/lib/settings";

const dir = "public/mushaf";
const layout = JSON.parse(readFileSync(`${dir}/layout.json`, "utf8"));
const words = JSON.parse(readFileSync(`${dir}/words.json`, "utf8"));
const m = buildMushaf(layout, words);

describe("v29 Quran text", () => {
  it("84:21 ends after «يسجدون ۩», on the line after «وإذا قرئ»", () => {
    const lines = m.page(589).filter((l) => l.type === "text") as { type: "text"; segments: { surah: number; ayah: number; from: number; to: number; endsVerse: boolean }[] }[];
    const i = lines.findIndex((l) => l.segments.some((s) => s.surah === 84 && s.ayah === 21 && s.from === 1));
    expect(lines[i]!.segments.find((s) => s.ayah === 21)).toMatchObject({ from: 1, to: 2, endsVerse: false });
    expect(lines[i]!.segments.some((s) => s.ayah === 21 && s.from === 0)).toBe(false);
    expect(lines[i + 1]!.segments[0]).toMatchObject({ surah: 84, ayah: 21, from: 3, to: 6, endsVerse: true });
    expect(m.words(84, 21).join(" ")).toContain("يَسْجُدُونَ ۩");
  });

  it("every verse of the whole Quran: all words once, exactly one verse-end marker at its last word", () => {
    const seen = new Map<string, number[]>(), ends = new Map<string, number>();
    for (let p = 1; p <= 604; p++) for (const l of m.page(p)) {
      if (l.type !== "text") continue;
      l.segments.forEach((s, i) => {
        const k = `${s.surah}:${s.ayah}`;
        if (s.from > 0) for (let w = s.from; w <= s.to; w++) seen.set(k, [...(seen.get(k) ?? []), w]);
        if (s.endsVerse) {
          ends.set(k, (ends.get(k) ?? 0) + 1);
          if (s.from === 0) expect(i, `marker of ${k} must start its line`).toBe(0);
          else expect(s.to, `end of ${k}`).toBe(m.words(s.surah, s.ayah).length);
        }
      });
    }
    for (let s = 1; s <= 114; s++) for (let a = 1; a <= m.versesCount(s); a++) {
      const k = `${s}:${a}`, n = m.words(s, a).length;
      expect(seen.get(k), k).toEqual(Array.from({ length: n }, (_, i) => i + 1));
      expect(ends.get(k), k).toBe(1);
    }
  });

  it("corrected words (checked against Quran.com's Uthmani text)", () => {
    expect(m.words(11, 13)[2]!.startsWith("\u0671")).toBe(true); // ٱفْتَرَىٰهُ (alif wasla, dagger alif)
    expect(m.words(11, 13)[2]).toContain("\u0670");
    expect(m.words(80, 25)[0]!.startsWith("\u0623")).toBe(true); // أَنَّا (hamza on alif)
    expect(m.words(27, 26).join(" ")).not.toContain("‏");
  });
});

describe("v29 recordings per page / surah", () => {
  const w = (key: string, status: "CORRECT" | "WARNING" | "ERROR" | "PENDING") => ({ key, status });
  it("groups recited verses by surah, skips saved ones and PENDING words", () => {
    const parts = recordingParts([
      w("78:39:1", "CORRECT"), w("78:40:1", "CORRECT"), w("78:40:2", "ERROR"),
      w("79:1:1", "CORRECT"), w("79:2:1", "WARNING"), w("79:3:1", "PENDING"),
    ], new Set(["78:39"]));
    expect(parts.map((p) => [p.surah, p.fromAyah, p.toAyah])).toEqual([[78, 40, 40], [79, 1, 2]]);
    expect(parts[0]!.accuracy).toBe(50);
    expect(parts[1]!.accuracy).toBe(75);
    expect(mainPart(parts)?.surah).toBe(78);
  });
  it("nothing recited → no part", () => {
    expect(recordingParts([w("1:1:1", "PENDING")])).toEqual([]);
    expect(mainPart([])).toBeNull();
  });
});

describe("v29 completion sound and badges wait for the microphone", () => {
  it("plays only after the recording stopped", () => {
    let n = 0;
    setCelebrator(() => { n++; });
    setMicActive(true);
    celebrateWhenStopped();
    expect(n).toBe(0);
    setMicActive(false);
    expect(n).toBe(1);
    celebrateWhenStopped(); // not recording → at once
    expect(n).toBe(2);
  });
});

describe("v29 Mushaf header", () => {
  it("60 ahzab; page 589 (Al-Inshiqaq) is juz 30, hizb 59; page 1 hizb 1; page 604 hizb 60", () => {
    expect(HIZB_STARTS).toHaveLength(60);
    expect(hizbOfPage(m, 589)).toBe(59);
    expect(m.juzOfPage(589)).toBe(30);
    expect(hizbOfPage(m, 1)).toBe(1);
    expect(hizbOfPage(m, 604)).toBe(60);
    expect(hizbOfPage(m, m.pageOf(2, 75))).toBe(2);
    expect(m.juzStartVerse(30)).toEqual([78, 1]);
  });
  it("recently read: one card per surah, newest first", () => {
    const a = addRecent([], { surah: 83, ayah: 35, page: 589, at: "1" });
    const b = addRecent(a, { surah: 2, ayah: 38, page: 7, at: "2" });
    const c = addRecent(b, { surah: 83, ayah: 1, page: 587, at: "3" });
    expect(c.map((r) => [r.surah, r.page])).toEqual([[83, 587], [2, 7]]);
  });
  it("memorization share of a surah", () => {
    expect(memorizedShare({ verses: { "1:1": { status: "MEMORIZED" }, "1:2": { status: "NEEDS_REVISION" }, "2:1": { status: "MEMORIZED" } } } as never, 1, 7)).toBeCloseTo(1 / 7);
  });
});

describe("v29 settings", () => {
  it("new switches have defaults and survive cleaning", () => {
    const s = cleanSettings({ ...DEFAULT_SETTINGS, completionSound: "x", dailyReminderTime: "bad" } as never);
    expect(s.completionSound).toBe(true);
    expect(s.autoStopSurahEnd).toBe(true);
    expect(s.dailyReminderTime).toBe("20:00");
  });
  it("reminder time parsing", () => {
    expect(parseTime("06:30")).toEqual({ hour: 6, minute: 30 });
    expect(parseTime("24:00")).toBeNull();
  });
});
