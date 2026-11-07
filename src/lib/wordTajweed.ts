/**
 * Tajweed features visible in one Uthmani (Madani Mushaf) word, read from its marks — shown in the word
 * popover. Deliberately simple and only from the word itself (rules that depend on the next word, such as
 * idghām or ikhfāʾ across words, are not guessed).
 */
export type WordFeature = "wasl" | "maddLong" | "daggerAlif" | "ghunna" | "shadda" | "qalqalah" | "iqlab" | "sakt";

const QALQALAH = new Set(["ق", "ط", "ب", "ج", "د"]);
const SUKUN = new Set(["ْ", "ۡ"]);
const MARK = /[ؐ-ًؚ-ٰٟۖ-ۭ]/;

export function wordFeatures(word: string): WordFeature[] {
  const cs = [...word];
  const out = new Set<WordFeature>();
  cs.forEach((c, i) => {
    if (c === "ٱ") out.add("wasl");
    if (c === "ٓ") out.add("maddLong");                 // maddah sign: a lengthened madd (4–6 counts)
    if (c === "ٰ") out.add("daggerAlif");
    if (c === "ۢ" || c === "ۭ") out.add("iqlab");    // small meem: nūn / tanwīn turned into mīm
    if (c === "ۜ") out.add("sakt");                       // small sīn: a short pause without breath
    if (c === "ّ") {
      // shadda belongs to the last letter before it
      let j = i - 1;
      while (j >= 0 && MARK.test(cs[j]!)) j--;
      out.add(cs[j] === "ن" || cs[j] === "م" ? "ghunna" : "shadda");
    }
    if (QALQALAH.has(c)) {
      let j = i + 1, sukun = false;
      while (j < cs.length && MARK.test(cs[j]!)) { if (SUKUN.has(cs[j]!)) sukun = true; j++; }
      if (sukun) out.add("qalqalah");
    }
  });
  return [...out];
}
