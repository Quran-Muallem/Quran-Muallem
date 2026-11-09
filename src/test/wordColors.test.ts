import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMushaf } from "@/lib/mushafData";
import { normalizeArabic } from "@/lib/quranMatcher";
import {
  applyRecitation, colorsFor, extendRange, mergeLive, parseColors, passageTokenKeys, rangeOf, reachedVerses, serializeColors,
  type RecitedWord, type WordColorMap,
} from "@/lib/wordColors";
import { createRecitationStore } from "@/context/RecitationContext";

const w = (key: string, status: RecitedWord["status"], heard?: string): RecitedWord => ({ key, status, heard });

describe("persistent word colours", () => {
  it("keeps the colours of verses that were not recited again", () => {
    let map: WordColorMap = new Map();
    map = applyRecitation(map, [w("2:16:1", "CORRECT"), w("2:16:2", "ERROR", "حماني"), w("2:17:1", "WARNING")]);
    map = applyRecitation(map, [w("2:18:1", "CORRECT"), w("2:18:2", "PENDING")]);
    expect(map.get("2:16:2")).toEqual({ st: "ERROR", heard: "حماني" });
    expect(map.get("2:17:1")?.st).toBe("WARNING");
    expect(map.get("2:18:1")?.st).toBe("CORRECT");
    expect(map.has("2:18:2")).toBe(false);
  });

  it("replaces a verse as a whole when it is recited again", () => {
    let map: WordColorMap = applyRecitation(new Map(), [w("1:1:1", "ERROR"), w("1:1:2", "ERROR"), w("1:1:3", "ERROR")]);
    map = applyRecitation(map, [w("1:1:1", "CORRECT"), w("1:1:2", "PENDING"), w("1:1:3", "PENDING")]);
    expect([...colorsFor(map, ["1:1:1", "1:1:2", "1:1:3"])]).toEqual([["1:1:1", "CORRECT"]]);
  });

  it("does nothing when nothing was judged (stop right after start)", () => {
    const map: WordColorMap = applyRecitation(new Map(), [w("1:2:1", "CORRECT")]);
    expect(applyRecitation(map, [w("1:2:1", "PENDING")])).toBe(map);
  });

  it("only overlays live colours on the verses reached", () => {
    const map: WordColorMap = applyRecitation(new Map(), [w("2:16:1", "ERROR"), w("2:17:1", "ERROR")]);
    const keys = ["2:16:1", "2:16:2", "2:17:1"];
    const live = ["CORRECT", "PENDING", "PENDING"] as const;
    const reached = reachedVerses(keys, [...live], 1);
    expect([...reached]).toEqual(["2:16"]);
    const shown = mergeLive(map, keys, [...live], reached);
    expect(shown.get("2:16:1")).toBe("CORRECT");
    expect(shown.get("2:17:1")).toBe("ERROR"); // not reached yet: old colour stays
  });

  it("survives a save and load", () => {
    const map: WordColorMap = applyRecitation(new Map(), [w("114:1:1", "CORRECT"), w("114:1:2", "WARNING", "رب")]);
    const back = parseColors(JSON.parse(JSON.stringify(serializeColors(map))));
    expect([...back]).toEqual([...map]);
    expect(parseColors([["bad", "c"], ["1:1:1", "x"], 7]).size).toBe(0);
  });

  it("tracks the recited range across automatic page turns", () => {
    const p1 = rangeOf([w("2:16:1", "CORRECT"), w("2:17:3", "ERROR"), w("2:18:1", "PENDING")]);
    expect(p1).toEqual({ surah: 2, from: 16, to: 17 });
    expect(extendRange(p1, { surah: 2, from: 18, to: 24 })).toEqual({ surah: 2, from: 16, to: 24 });
    expect(extendRange(p1, { surah: 3, from: 1, to: 4 })).toEqual({ surah: 3, from: 1, to: 4 });
  });
});

describe("one colour store for both views", () => {
  it("Mushaf session → active range for the Recite view, then the Recite passage back", () => {
    const store = createRecitationStore({ persist: false });
    store.startSession();
    store.commitWords([w("2:16:1", "CORRECT"), w("2:16:2", "ERROR")], "RECITATION_MODE", "mushaf", { continues: true });
    store.commitWords([w("2:20:1", "WARNING")], "RECITATION_MODE", "mushaf", { continues: true });
    store.endSession();
    expect(store.activeRange.get()).toMatchObject({ surah: 2, from: 16, to: 20, view: "mushaf" });
    store.commitWords([w("2:16:2", "CORRECT")], "MEMORIZATION_MODE", "practice");
    expect(store.activeRange.get()).toMatchObject({ surah: 2, from: 16, to: 16, view: "practice", mode: "MEMORIZATION_MODE" });
    expect(store.colors.get().get("2:16:2")?.st).toBe("CORRECT");
    expect(store.colors.get().has("2:16:1")).toBe(false); // verse 16 recited again as a whole
    expect(store.colors.get().get("2:20:1")?.st).toBe("WARNING");
  });

  it("maps Recite tokens to the Mushaf's word keys (waqf signs belong to their word)", () => {
    const dir = path.resolve(__dirname, "../../public/mushaf");
    const m = buildMushaf(JSON.parse(readFileSync(`${dir}/layout.json`, "utf8")), JSON.parse(readFileSync(`${dir}/words.json`, "utf8")));
    const ayat = [2, 3].map((a) => ({ number: a, text: m.words(2, a).join(" ") }));
    const keys = passageTokenKeys(2, ayat, (s, a) => m.words(s, a), (t) => !!normalizeArabic(t));
    expect(keys.length).toBe(ayat.reduce((n, a) => n + a.text.split(" ").length, 0));
    const named = keys.filter(Boolean);
    expect(named.length).toBe(m.words(2, 2).length + m.words(2, 3).length);
    expect(named[0]).toBe("2:2:1");
    expect(named.at(-1)).toBe(`2:3:${m.words(2, 3).length}`);
  });
});
