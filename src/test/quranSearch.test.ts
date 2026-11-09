import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMushaf } from "@/lib/mushafData";
import { findSurahs, search } from "@/lib/quranSearch";

const dir = path.resolve(__dirname, "../../public/mushaf");
const m = buildMushaf(JSON.parse(readFileSync(`${dir}/layout.json`, "utf8")), JSON.parse(readFileSync(`${dir}/words.json`, "utf8")));

describe("Quran search", () => {
  it("finds surahs by name and number", () => {
    expect(findSurahs("Al-Baqarah")[0]?.id).toBe(2);
    expect(findSurahs("baqara")[0]?.id).toBe(2);
    expect(findSurahs("البقرة")[0]?.id).toBe(2);
    expect(findSurahs("Yasin")[0]?.id).toBe(36);
    expect(search(m, "2").results).toEqual([{ kind: "surah", surah: 2 }]);
    expect(search(m, "٣٦").results).toEqual([{ kind: "surah", surah: 36 }]);
  });

  it("finds a verse", () => {
    expect(search(m, "2:255").results).toEqual([{ kind: "verse", surah: 2, ayah: 255 }]);
    expect(search(m, "Al-Baqarah 255").results).toEqual([{ kind: "verse", surah: 2, ayah: 255 }]);
    expect(search(m, "البقرة ٢٥٥").results).toEqual([{ kind: "verse", surah: 2, ayah: 255 }]);
    expect(search(m, "Ayah 255").results).toEqual([{ kind: "verse", surah: 2, ayah: 255 }]);
    expect(search(m, "2:300").results).toEqual([]);
  });

  it("finds Arabic words in the Uthmani text, spelling-tolerant", () => {
    const kursi = search(m, "الحي القيوم").results.filter((r) => r.kind === "text");
    expect(kursi.some((r) => r.surah === 2 && r.ayah === 255)).toBe(true);
    const salah = search(m, "الصلاة").results.filter((r) => r.kind === "text");
    expect(salah.some((r) => r.surah === 2 && r.ayah === 3)).toBe(true);
    const hit = salah.find((r) => r.surah === 2 && r.ayah === 3);
    expect(hit && hit.kind === "text" ? hit.words : []).toEqual([5]);
    expect(search(m, "ب").results.filter((r) => r.kind === "text").length).toBe(0);
  });
});
