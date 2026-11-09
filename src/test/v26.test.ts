import { describe, expect, it } from "vitest";
import { pageReadyToTurn } from "@/lib/surahCompletion";
import { DUA_CATEGORIES, loadDuaLibrary, searchDuas } from "@/lib/duas";
import type { LiveStatus } from "@/lib/quranMatcher";

const st = (s: string) => s.split("").map((c): LiveStatus => (c === "c" ? "CORRECT" : c === "w" ? "WARNING" : c === "e" ? "ERROR" : "PENDING"));

describe("auto page turn while recording", () => {
  it("turns also when the last word was said wrongly or a few words were red", () => {
    expect(pageReadyToTurn(st("ccccccccce"), 9)).toBe(true);
    expect(pageReadyToTurn(st("cceeeceecc"), 9)).toBe(true);
  });
  it("does not turn on a stray jump or before the end", () => {
    expect(pageReadyToTurn(st("eeeeeeeeec"), 9)).toBe(false);
    expect(pageReadyToTurn(st("cccccccccp"), 9)).toBe(false);
  });
});

describe("duas & adhkar library", () => {
  it("has all 132 Hisn al-Muslim chapters plus the Quran duas, each in a category", async () => {
    const list = await loadDuaLibrary();
    expect(list.filter((e) => e.key.startsWith("h:"))).toHaveLength(132);
    expect(list.filter((e) => e.cat === "quran").length).toBeGreaterThanOrEqual(15);
    const cats = new Set(DUA_CATEGORIES.map((c) => c.id));
    for (const e of list) expect(cats.has(e.cat), e.key).toBe(true);
    expect(new Set(list.map((e) => e.key)).size).toBe(list.length);
  });
  it("has the dog-barking dua with tashkeel, translation and the Arabic reference", async () => {
    const e = (await loadDuaLibrary()).find((x) => x.key === "h:111")!;
    expect(e.ar).toBe("دعاء نباح الكلاب بالليل");
    expect(e.en).toMatch(/dog barking/);
    expect(e.texts[0]!.ar).toContain("نُبَاحَ الْكِلاَبِ");
    expect(e.texts[0]!.en).toMatch(/barking of dogs/);
    expect(e.texts[0]!.ref).toBe("أبو داود 4/ 327 وأحمد 3/ 306 وصححه الألباني في صحيح أبي داود3/ 961");
  });
  it("searches by title (Arabic without hamza / article, or English)", async () => {
    const list = await loadDuaLibrary();
    expect(searchDuas(list, "نباح")[0]!.key).toBe("h:111");
    expect(searchDuas(list, "دخول المسجد")[0]!.key).toBe("h:13");
    expect(searchDuas(list, "travel").some((e) => e.key === "h:96")).toBe(true);
    expect(searchDuas(list, "استخاره").some((e) => e.key === "h:26")).toBe(true);
  });
});
