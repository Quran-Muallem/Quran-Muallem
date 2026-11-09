import { describe, expect, it } from "vitest";
import { foldText, hadithLanguage, narratorOf, parseEdition, searchHadith } from "@/lib/hadith";

const raw = {
  metadata: { sections: { "0": "", "1": "Revelation", "2": "Belief" }, section_details: { "1": { hadithnumber_first: 1, hadithnumber_last: 2 }, "2": { hadithnumber_first: 3, hadithnumber_last: 3 } } },
  hadiths: [
    { hadithnumber: 1, text: "Narrated 'Umar bin Al-Khattab: The reward of deeds depends upon the intentions.", reference: { book: 1, hadith: 1 } },
    { hadithnumber: 2, text: "Narrated 'Aisha: The Divine Inspiration was revealed to him.", reference: { book: 1, hadith: 2 } },
    { hadithnumber: 3, text: "Narrated Abu Huraira: Faith consists of more than sixty branches.", reference: { book: 2, hadith: 1 } },
    { hadithnumber: 4, text: "", reference: { book: 2, hadith: 2 } },
  ],
};
const ar = parseEdition("bukhari", "ara", { hadiths: [{ hadithnumber: 1, text: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ" }] });

describe("hadith library", () => {
  it("parses an edition (sections without title and empty texts dropped)", () => {
    const b = parseEdition("bukhari", "eng", raw);
    expect(b.sections.map((s) => s.title)).toEqual(["Revelation", "Belief"]);
    expect(b.hadiths).toHaveLength(3);
    expect(b.sections[0]).toMatchObject({ first: 1, last: 2 });
  });

  it("searches words, narrators, numbers and Arabic without diacritics", () => {
    const b = parseEdition("bukhari", "eng", raw);
    expect(searchHadith([b], "intentions deeds").map((h) => h.hadith.n)).toEqual([1]);
    expect(searchHadith([b], "huraira", "narrator").map((h) => h.hadith.n)).toEqual([3]);
    expect(searchHadith([b], "inspiration", "narrator")).toEqual([]);
    expect(searchHadith([b], "3").map((h) => h.hadith.n)).toEqual([3]);
    expect(searchHadith([ar], "الاعمال بالنيات")).toHaveLength(1);
    expect(foldText("إِنَّمَا")).toBe("انما");
    expect(narratorOf(raw.hadiths[0]!.text)).toBe("Narrated 'Umar bin Al-Khattab");
  });

  it("chooses the hadith language (English where no edition exists)", () => {
    expect(hadithLanguage("ar")).toBe("ara");
    expect(hadithLanguage("tr")).toBe("tur");
    expect(hadithLanguage("de")).toBe("eng");
  });
});
