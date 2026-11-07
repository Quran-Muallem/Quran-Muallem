import { describe, expect, it } from "vitest";
import { TAJWEED, searchTajweed, tajweedKey } from "@/data/tajweedData";

const all = TAJWEED.flatMap((c) => c.rules);
const ids = (q: string) => searchTajweed(q).flatMap((g) => g.rules.map((r) => r.id));

describe("tajweed data", () => {
  it("has the six categories with complete, unique rules", () => {
    expect(TAJWEED.map((c) => c.id)).toEqual(["noon", "meem", "madd", "makharij", "qalqalah", "tafkheem"]);
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length);
    for (const c of TAJWEED) {
      expect(c.titleAr && c.titleEn && c.introAr && c.introEn).toBeTruthy();
      for (const r of c.rules) {
        expect(r.titleAr && r.titleEn && r.summaryAr && r.summaryEn).toBeTruthy();
        expect(r.examples.length).toBeGreaterThan(0);
        expect((r.pointsAr ?? []).length).toBe((r.pointsEn ?? []).length);
      }
    }
  });
  it("highlights only text that is in the example", () => {
    for (const r of all) for (const e of r.examples) for (const m of e.mark ?? []) {
      if (!e.ar.includes(m)) throw new Error(`${r.id}: "${m}" not in "${e.ar}"`);
    }
  });
  it("covers the requested rules", () => {
    for (const id of ["izhar-halqi", "idgham-ghunnah", "idgham-no-ghunnah", "iqlab", "ikhfa-haqiqi", "ikhfa-shafawi", "idgham-shafawi", "izhar-shafawi",
      "madd-tabii", "madd-muttasil", "madd-munfasil", "madd-lazim", "qalqalah-sughra", "qalqalah-kubra", "ra-tafkheem", "ra-tarqeeq", "lam-jalalah"]) {
      expect(all.some((r) => r.id === id)).toBe(true);
    }
  });
});

describe("tajweed search (offline)", () => {
  it("finds rules in Arabic with or without diacritics, hamzah forms and the article", () => {
    expect(ids("الإقلاب")).toContain("iqlab");
    expect(ids("اقلاب")).toContain("iqlab");
    expect(ids("القلقلة")).toEqual(expect.arrayContaining(["qalqalah-sughra", "qalqalah-kubra"]));
    expect(ids("لفظ الجلالة")).toContain("lam-jalalah");
  });
  it("finds rules in English and transliteration", () => {
    expect(ids("ikhfa")).toEqual(expect.arrayContaining(["ikhfa-haqiqi", "ikhfa-shafawi"]));
    expect(ids("Iqlāb")).toContain("iqlab");
    expect(ids("six counts")[0]).toBeTruthy();
    expect(ids("heavy ra")).toContain("ra-tafkheem");
  });
  it("finds rules by letter and example word", () => {
    expect(ids("الضالين")).toContain("madd-lazim");
    expect(ids("xyzzy")).toEqual([]);
    expect(ids("")).toHaveLength(all.length);
  });
  it("puts the matching category first", () => {
    expect(searchTajweed("qalqalah")[0]?.category.id).toBe("qalqalah");
    expect(searchTajweed("القلقلة")[0]?.category.id).toBe("qalqalah");
  });
  it("normalises search text", () => {
    expect(tajweedKey("الإِظْهَارُ")).toBe("الاظهار");
    expect(tajweedKey("Iẓhār ḥalqī")).toBe("izhar halqi");
  });
});
