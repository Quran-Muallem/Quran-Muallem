import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMushaf, TOTAL_PAGES } from "@/lib/mushafData";
import { SURAH_META } from "@/lib/quranService";

const dir = path.resolve(__dirname, "../../public/mushaf");
const m = buildMushaf(JSON.parse(readFileSync(`${dir}/layout.json`, "utf8")), JSON.parse(readFileSync(`${dir}/words.json`, "utf8")));

describe("Madani Mushaf layout", () => {
  it("has 604 pages of at most 15 lines", () => {
    for (let p = 1; p <= TOTAL_PAGES; p++) expect(m.page(p).length).toBeLessThan(16);
  });
  it("covers all 6236 verses with their word counts", () => {
    let verses = 0;
    for (const s of SURAH_META) { expect(m.versesCount(s.id)).toBe(s.versesCount); verses += s.versesCount; }
    expect(verses).toBe(6236);
  });
  it("puts known verses on their printed pages", () => {
    expect(m.pageOf(1, 1)).toBe(1);
    expect(m.pageOf(2, 1)).toBe(2);
    expect(m.pageOf(2, 255)).toBe(42);
    expect(m.surahStartPage(18)).toBe(293);
    expect(m.surahStartPage(36)).toBe(440);
    expect(m.surahStartPage(67)).toBe(562);
    expect(m.surahStartPage(114)).toBe(604);
    expect(m.juzStartPage(30)).toBe(582);
    expect(m.juzOfPage(300)).toBe(15);
  });
  it("lists page verses in reading order", () => {
    const v = m.pageVerses(3);
    expect(v[0]).toMatchObject({ surah: 2, ayah: 6, startsOnPage: true });
    expect(v.at(-1)).toMatchObject({ surah: 2, ayah: 16, endsOnPage: true });
  });
  it("starts every surah except At-Tawbah with a Basmala line", () => {
    const p187 = m.page(187).map((l) => l.type);
    expect(p187.indexOf("header")).toBeGreaterThan(-1);
    expect(p187[p187.indexOf("header") + 1]).toBe("text");
    expect(m.page(2).map((l) => l.type).slice(0, 2)).toEqual(["header", "basmala"]);
  });
});
