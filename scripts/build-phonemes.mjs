#!/usr/bin/env node
/**
 * Builds public/models/quran_phonemes.json: the Hafs phonemes of every Mushaf word, for Stage 3
 * (src/lib/quranAlignment.ts).
 *
 * Input:  models-src/ordered_quran_phonemes.json (Quran-Lab, NPL-1.2): per ayah the phoneme words of
 *         continuous recitation, e.g. "1:1" → ["بِسمِ","للَااهِ","ررَحمَاانِ","ررَحِۦۦۦۦم"].
 *         public/mushaf/words.json: the Uthmani words the Mushaf shows.
 * Problem: the phoneme words do not always match the Mushaf words one to one — in connected recitation
 *         words merge (idghām: هُدًى مِّن رَّبِّهِمْ → "هُدَممممِررَببِهِم") and muqaṭṭaʿāt split
 *         (الٓمٓ → "ءَلِف" "لَاا…م"). This happens in 4,116 of 6,236 ayat.
 * Method: both sides are reduced to a consonant skeleton, aligned by edit distance, and every phoneme
 *         character is assigned to the Mushaf word its skeleton letter aligned with (vowels and madd marks
 *         follow the preceding letter). The result is one phoneme string per Mushaf word.
 * Output: { v, source, licence, surahs: [[ [word phonemes…] per ayah ] per surah] } — same shape as words.json.
 *         Licence: derived from Quran-Lab's data → NPL-1.2 (see public/models/LICENSE-NPL-1.2.txt).
 *
 * Usage: node scripts/build-phonemes.mjs [path/to/ordered_quran_phonemes.json]
 */
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2] ?? "models-src/ordered_quran_phonemes.json";
const phon = JSON.parse(readFileSync(src, "utf8"));
const mushaf = JSON.parse(readFileSync("public/mushaf/words.json", "utf8"));

// ── skeletons ──
const PH_MAP = { "ں": "ن", "۾": "م", "ۥ": "و", "ۦ": "ي", "ٲ": "ا" };
const PH_DROP = new Set(["َ", "ُ", "ِ", "ڇ", "ۜ", "۪", "ؙ", "ـ", " "]);
/** Phoneme string → [{ ch: skeleton letter, i: index in the phoneme string }]. */
export function phonemeSkeleton(s) {
  const out = [];
  [...s].forEach((c, i) => { if (PH_DROP.has(c)) return; out.push({ ch: PH_MAP[c] ?? c, i }); });
  return out;
}
const UT_HAMZA = new Set(["ء", "أ", "إ", "ؤ", "ئ"]);
/** Uthmani word → skeleton letters (approximate pronunciation: silent letters dropped). */
export function uthmaniSkeleton(w) {
  const cs = [...w], out = [];
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i], next = cs[i + 1];
    if (next === "۟" || next === "۠") { i++; continue; }        // marked silent (ـ۟)
    if (c === "ٱ") {                                                       // hamzat al-waṣl
      // ٱل before a sun letter (the letter after the lam carries a shadda): the lam is not pronounced.
      if (next === "ل" && cs[i + 2] !== "\u0652" && cs.slice(i + 3, i + 6).includes("\u0651") && /[\u0621-\u064A]/.test(cs[i + 2] ?? "")) i++;
      continue;
    }
    if (c === "آ") { out.push("ء", "ا"); continue; }
    if (UT_HAMZA.has(c)) { out.push("ء"); continue; }
    if (c === "ٰ") { out.push("ا"); continue; }                       // dagger alif
    if (c === "ى") { out.push(cs[i - 1] === "\u0650" ? "ي" : "ا"); continue; }  // يِى → ī, else ā
    if (c === "ة") { out.push("ت"); continue; }
    if (c === "ۢ" || c === "ۭ") { out.push("م"); continue; }    // small meem (iqlāb)
    if (c === "ۥ") { out.push("و"); continue; }                       // small waw
    if (c === "ۦ") { out.push("ي"); continue; }                       // small ya
    if (c === "ّ" && out.length) { out.push(out[out.length - 1]); continue; } // shadda doubles
    if (c === "ً" || c === "ٌ" || c === "ٍ") { out.push("ن"); continue; } // tanwīn
    if (/[ء-ي]/.test(c)) out.push(c);
  }
  return out;
}

const COST = (a, b) => (a === b ? 0 : (a === "ا" && (b === "و" || b === "ي")) || (b === "ا" && (a === "و" || a === "ي")) ? 0.6 : 1);

function editDistance(a, b) {
  const D = new Float64Array(b.length + 1).map((_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = D[0]; D[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = D[j];
      // An extra repeated phoneme letter (long madd, ghunna) is cheap.
      D[j] = Math.min(D[j] + 1, D[j - 1] + (b[j - 1] === b[j - 2] ? 0.3 : 1), prev + COST(a[i - 1], b[j - 1]));
      prev = t;
    }
  }
  return D[b.length];
}

/** Splits a phoneme word that several Mushaf words were merged into (idghām) by skeleton alignment. */
function splitMerged(words, pw) {
  const ph = phonemeSkeleton(pw);
  const ut = [];
  words.forEach((w, wi) => uthmaniSkeleton(w).forEach((ch) => ut.push({ ch, wi })));
  const n = ut.length, m = ph.length;
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const B = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) { D[i][0] = i; B[i][0] = 1; }
  for (let j = 1; j <= m; j++) { D[0][j] = j; B[0][j] = 2; }
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const d = D[i - 1][j - 1] + COST(ut[i - 1].ch, ph[j - 1].ch), u = D[i - 1][j] + 1, l = D[i][j - 1] + (ph[j - 1].ch === ph[j - 2]?.ch ? 0.5 : 1);
    if (d <= u && d <= l) { D[i][j] = d; B[i][j] = 0; } else if (u <= l) { D[i][j] = u; B[i][j] = 1; } else { D[i][j] = l; B[i][j] = 2; }
  }
  const wordOf = new Array(m).fill(-1);
  for (let i = n, j = m; i > 0 || j > 0;) {
    const b = B[i][j];
    if (b === 0) { wordOf[j - 1] = ut[i - 1].wi; i--; j--; } else if (b === 1) i--; else j--;
  }
  for (let j = 0; j < m; j++) if (wordOf[j] < 0) wordOf[j] = j > 0 ? wordOf[j - 1] : 0;
  for (let j = 1; j < m; j++) if (wordOf[j] < wordOf[j - 1]) wordOf[j] = wordOf[j - 1];
  // A doubled (idghām) letter belongs to the word that starts with it: move the boundary to the
  // start of a run of equal letters.
  for (let j = 1; j < m; j++) {
    if (wordOf[j] !== wordOf[j - 1] && ph[j].ch === ph[j - 1].ch) {
      let k = j - 1;
      while (k > 0 && ph[k - 1].ch === ph[j].ch && wordOf[k - 1] === wordOf[j - 1]) k--;
      // …unless that would leave the earlier word with nothing (مِّن مِّثْلِهِۦ → "ممممِ|ممممِثلِهِۦۦ"):
      // then cut the run after its first vowel.
      if (k === 0 || wordOf[k - 1] !== wordOf[j - 1]) {
        const chars = [...pw];
        const vowelBetween = (x) => chars.slice(ph[x - 1].i + 1, ph[x].i).some((c) => "َُِ".includes(c));
        let cut = -1;
        for (let x = k + 1; x <= j; x++) if (vowelBetween(x)) { cut = x; break; }
        k = cut >= 0 ? cut : j;
      }
      for (let x = k; x < j; x++) wordOf[x] = wordOf[j];
      for (let x = j; x < m && ph[x].ch === ph[j].ch && x < k; x++) wordOf[x] = wordOf[j - 1];
    }
  }
  const out = words.map(() => "");
  let k = 0, cur = wordOf[0] ?? 0;
  [...pw].forEach((c, i) => { if (k < m && ph[k].i === i) { cur = wordOf[k]; k++; } out[cur] += c; });
  return out;
}

/** Splits one ayah's phoneme words over its Mushaf words. */
export function splitAyah(words, phonemeWords) {
  const W = words.map(uthmaniSkeleton), P = phonemeWords.map((p) => phonemeSkeleton(p).map((x) => x.ch));
  const n = W.length, m = P.length, MAXK = 8;
  // Word-level alignment: groups of 1↔1, k Mushaf words ↔ 1 phoneme word (merged), 1 ↔ k (split).
  const cost = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(Infinity));
  const back = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  cost[0][0] = 0;
  const score = (ws, ps) => editDistance(ws.flat(), ps.flat());
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    const c0 = cost[i][j];
    if (!Number.isFinite(c0)) continue;
    for (let k = 1; k <= MAXK && i + k <= n; k++) if (j + 1 <= m) {
      const c = c0 + score(W.slice(i, i + k), [P[j]]) + (k > 1 ? 0.4 * (k - 1) : 0);
      if (c < cost[i + k][j + 1]) { cost[i + k][j + 1] = c; back[i + k][j + 1] = [k, 1]; }
    }
    for (let k = 2; k <= 6 && j + k <= m; k++) if (i + 1 <= n) {
      const c = c0 + score([W[i]], P.slice(j, j + k)) + 0.4 * (k - 1);
      if (c < cost[i + 1][j + k]) { cost[i + 1][j + k] = c; back[i + 1][j + k] = [1, k]; }
    }
  }
  // Fallback (never expected): split the whole ayah by letters.
  if (!Number.isFinite(cost[n][m])) return splitMerged(words, phonemeWords.join(""));
  const groups = [];
  for (let i = n, j = m; i > 0 || j > 0;) {
    const b = back[i][j];
    if (!b) throw new Error("no alignment");
    groups.unshift({ wi: i - b[0], wk: b[0], pj: j - b[1], pk: b[1] });
    i -= b[0]; j -= b[1];
  }
  const out = words.map(() => "");
  for (const g of groups) {
    const ws = words.slice(g.wi, g.wi + g.wk), ps = phonemeWords.slice(g.pj, g.pj + g.pk);
    const parts = g.wk === 1 ? [ps.join("")] : splitMerged(ws, ps.join(""));
    parts.forEach((p, k) => { out[g.wi + k] = p; });
  }
  return out;
}

const result = [];
let mismatched = 0, empty = 0;
const changedEqual = [];
mushaf.surahs.forEach((ayat, si) => {
  result.push(ayat.map((words, ai) => {
    const key = `${si + 1}:${ai + 1}`;
    const entry = phon[key];
    if (!entry) throw new Error(`missing ${key}`);
    const list = entry.aya_phonemes_list;
    const split = splitAyah(words, list);
    if (list.length !== words.length) mismatched++;
    else if (split.some((p, i) => p !== list[i])) changedEqual.push(key);
    empty += split.filter((p) => !p).length;
    return split;
  }));
});
writeFileSync("public/models/quran_phonemes.json", JSON.stringify({
  v: 1,
  source: "Quran-Lab ordered_quran_phonemes.json (Hafs ʿan ʿĀṣim, continuous recitation), split per Mushaf word by scripts/build-phonemes.mjs",
  licence: "NPL-1.2 (Quran-Lab No-Profit License) — see LICENSE-NPL-1.2.txt",
  surahs: result,
}));
console.log(`✓ public/models/quran_phonemes.json · ayat with merged/split words mapped: ${mismatched} · Mushaf words without own phonemes (fully merged): ${empty} · equal-count ayat re-split: ${changedEqual.length} ${changedEqual.slice(0, 12).join(" ")}`);
