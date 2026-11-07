/** Quick search in the reciter list (Arabic or English, tolerant of diacritics and the article). */
const AR_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u0640]/g;
/** Search key: lower-case Latin, Arabic without diacritics and with unified letter forms. */
export const searchKey = (s: string) => s.toLowerCase().replace(AR_MARKS, "").replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^a-z0-9\u0621-\u064A ]/g, "").replace(/\s+/g, " ").trim();
export const matchesReciter = (r: { nameArabic: string; nameEnglish: string; id: string }, query: string) => {
  const q = searchKey(query);
  if (!q) return true;
  const hay = searchKey(`${r.nameArabic} ${r.nameEnglish} ${r.id}`);
  return q.split(" ").every((part) => hay.includes(part) || hay.includes(part.replace(/^ال/, "")));
};
