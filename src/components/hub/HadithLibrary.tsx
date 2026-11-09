import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, X } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { BOOKS, hadithLanguage, loadBook, narratorOf, searchHadith, type BookId, type Hadith, type HadithBook, type SearchScope } from "@/lib/hadith";
import { toArabicDigits } from "@/lib/quranService";
import { HADITH_ARABIC_TITLES } from "@/data/hadithArabicTitles";
import { isRtlText, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** "missing": the collection has no edition in this language → English is used. */
type Load = { status: "idle" } | { status: "missing" } | { status: "loading"; bytes: number } | { status: "ready"; book: HadithBook } | { status: "error" };
const PAGE = 25;

/**
 * 📚 Hadith library (كُتُب الحَديث): Sahih al-Bukhari and Sahih Muslim — chapters, every hadith, the Arabic
 * text next to the translation, and a search over both books (keyword, book, narrator, hadith number).
 */
export function HadithLibrary() {
  const { t, language } = useI18n();
  const lang = hadithLanguage(language);
  const [bookId, setBookId] = useState<BookId>("bukhari");
  const [books, setBooks] = useState<Record<string, Load>>({});
  const [retry, setRetry] = useState(0);
  const [section, setSection] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [searchBooks, setSearchBooks] = useState<"both" | BookId>("both");
  const [arabic, setArabic] = useState(language === "ar");
  const [shown, setShown] = useState(PAGE);
  const viewLang = arabic ? "ara" : lang;
  /** Arabic app language or the Arabic text switched on: titles, grades and filters only in Arabic. */
  const arabicUi = language === "ar" || arabic;
  const keyOf = (b: BookId, l: string) => `${b}|${l}`;

  const ensure = (b: BookId, l: string) => {
    const k = keyOf(b, l);
    const st = books[k]?.status;
    if (st === "missing") { ensure(b, "eng"); return; }
    if (st && st !== "error" && st !== "idle") return;
    setBooks((cur) => ({ ...cur, [k]: { status: "loading", bytes: 0 } }));
    loadBook(b, l, (bytes) => setBooks((cur) => (cur[k]?.status === "loading" ? { ...cur, [k]: { status: "loading", bytes } } : cur)))
      .then((book) => setBooks((cur) => ({ ...cur, [k]: { status: "ready", book } })))
      .catch(() => {
        // The app language has no edition of this book → English.
        if (l !== "eng" && l !== "ara") { setBooks((cur) => ({ ...cur, [k]: { status: "missing" } })); ensure(b, "eng"); return; }
        setBooks((cur) => ({ ...cur, [k]: { status: "error" } }));
      });
  };
  useEffect(() => { ensure(bookId, viewLang); }, [bookId, viewLang, retry]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const id = setTimeout(() => setDebounced(query), 250); return () => clearTimeout(id); }, [query]);
  // Searching needs the books in the reading language (both books unless one is chosen).
  useEffect(() => {
    if (!debounced.trim()) return;
    for (const b of searchBooks === "both" ? BOOKS.map((x) => x.id) : [searchBooks]) ensure(b, viewLang);
  }, [debounced, searchBooks, viewLang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setShown(PAGE); }, [debounced, scope, searchBooks, section, bookId]);

  const resolved = (b: BookId): HadithBook | null => {
    const own = books[keyOf(b, viewLang)];
    if (own?.status === "ready") return own.book;
    const en = books[keyOf(b, "eng")];
    return own?.status === "missing" && en?.status === "ready" ? en.book : null;
  };
  const current = resolved(bookId);
  const own = books[keyOf(bookId, viewLang)];
  const load = own?.status === "missing" ? books[keyOf(bookId, "eng")] : own;
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const bookName = (b: BookId) => { const x = BOOKS.find((y) => y.id === b)!; return language === "ar" ? x.ar : x.en; };

  const results = useMemo(() => {
    if (!debounced.trim()) return null;
    const list = (searchBooks === "both" ? BOOKS.map((x) => x.id) : [searchBooks]).map(resolved).filter((b): b is HadithBook => !!b);
    return { hits: searchHadith(list, debounced, scope, 300), searched: list.length };
  }, [debounced, scope, searchBooks, books]); // eslint-disable-line react-hooks/exhaustive-deps

  const sectionHadiths = useMemo(() => {
    if (!current || section == null) return [];
    const s = current.sections.find((x) => x.n === section);
    return current.hadiths.filter((h) => (s && s.first && s.last ? h.n >= s.first && h.n <= s.last : h.book === section));
  }, [current, section]);

  const loadingBox = (bytes: number) => (
    <p className="flex items-center justify-center gap-2 py-10 text-sm text-emerald-100/75">
      <Loader2 className="h-4 w-4 animate-spin" />{t("hadithDownloading")}{bytes > 0 && ` · ${(bytes / 1e6).toFixed(1)} MB`}
    </p>
  );

  return (
    <div className="space-y-3">
      {/* global search */}
      <label className="flex items-center gap-2 rounded-2xl border border-amber-400/50 bg-black/25 px-3">
        <Search className="h-5 w-5 shrink-0" style={{ color: GOLD_LIGHT }} aria-hidden="true" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" inputMode="search" enterKeyHint="search" placeholder={t("hadithSearch")} aria-label={t("hadithSearch")}
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-emerald-50 placeholder:text-emerald-100/45 focus:outline-none" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label={t("searchClear")} className="text-emerald-100/70"><X className="h-4 w-4" /></button>}
      </label>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {(["both", "bukhari", "muslim"] as const).map((b) => (
          <button key={b} type="button" onClick={() => setSearchBooks(b)} aria-pressed={searchBooks === b} className={chip(searchBooks === b)}>{b === "both" ? t("hadithBothBooks") : bookName(b)}</button>
        ))}
        <span className="mx-1 w-px bg-white/15" />
        {(["all", "narrator"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setScope(s)} aria-pressed={scope === s} className={chip(scope === s)}>{t(s === "all" ? "hadithInText" : "hadithNarrator")}</button>
        ))}
        {language !== "ar" && <button type="button" onClick={() => setArabic((a) => !a)} aria-pressed={arabic} className={cn(chip(arabic), "ms-auto font-arabic")}>العربية</button>}
      </div>

      {results ? (
        <section>
          <p className="mb-2 text-xs text-emerald-100/65">{results.searched ? t("hadithResults").replace("{n}", num(results.hits.length)) : ""}</p>
          {!results.searched && loadingBox(0)}
          {results.searched > 0 && !results.hits.length && <p className="py-6 text-center text-sm text-emerald-100/70">{t("searchNoResults")}</p>}
          <ul className="space-y-2">{results.hits.slice(0, shown).map((h) => <HadithCard key={`${h.book}-${h.hadith.n}`} hadith={h.hadith} book={bookName(h.book)} query={debounced} />)}</ul>
          {results.hits.length > shown && <button type="button" onClick={() => setShown((s) => s + PAGE)} className={moreBtn}>{t("showMore")}</button>}
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-black/20 p-1" role="tablist" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
            {BOOKS.map((b) => (
              <button key={b.id} type="button" role="tab" aria-selected={bookId === b.id} onClick={() => { setBookId(b.id); setSection(null); }}
                className={cn("rounded-xl py-2 font-arabic text-sm", bookId === b.id ? "font-semibold text-emerald-950" : "text-emerald-100/80")}
                style={bookId === b.id ? { background: GOLD_GRADIENT } : undefined}>{b.ar}</button>
            ))}
          </div>
          {!current && load?.status === "loading" && loadingBox(load.bytes)}
          {!current && load?.status === "error" && (
            <div className="py-6 text-center text-sm text-emerald-100/80">
              <p>{t(typeof navigator !== "undefined" && navigator.onLine === false ? "contentOffline" : "contentFailed")}</p>
              <button type="button" onClick={() => { setBooks((cur) => ({ ...cur, [keyOf(bookId, viewLang)]: { status: "idle" } })); setRetry((r) => r + 1); }}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-emerald-950"><RefreshCw className="h-4 w-4" />{t("retry")}</button>
            </div>
          )}
          {current && section == null && (
            <ul className="space-y-1.5">
              {current.sections.map((s) => (
                <li key={s.n}>
                  <button type="button" onClick={() => { setSection(s.n); window.scrollTo({ top: 0 }); }}
                    className="flex w-full items-center gap-3 rounded-xl bg-black/15 px-3 py-2.5 text-start hover:bg-white/5" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.2)}` }}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-amber-200" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.6)}` }}>{num(s.n)}</span>
                    <SectionTitle book={bookId} n={s.n} title={s.title} arabicOnly={arabicUi} />
                    {s.first > 0 && <span className="shrink-0 text-[0.7rem] text-emerald-100/50">{num(s.first)}–{num(s.last)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {current && section != null && (
            <section>
              <button type="button" onClick={() => setSection(null)} className="mb-2 flex items-center gap-1 text-sm text-amber-200">
                {language === "ar" || language === "ur" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}{t("hadithChapters")}
              </button>
              <h2 className="mb-2 text-base font-semibold" style={{ color: GOLD_LIGHT }}>
                <SectionTitle book={bookId} n={section} title={current.sections.find((x) => x.n === section)?.title ?? ""} arabicOnly={arabicUi} large />
              </h2>
              <ul className="space-y-2">{sectionHadiths.slice(0, shown).map((h) => <HadithCard key={h.n} hadith={h} book={bookName(bookId)} />)}</ul>
              {sectionHadiths.length > shown && <button type="button" onClick={() => setShown((s) => s + PAGE)} className={moreBtn}>{t("showMore")}</button>}
            </section>
          )}
        </>
      )}
      <p className="text-[0.7rem] leading-relaxed text-emerald-100/50">{t("hadithSourceNote")}</p>
    </div>
  );
}

function HadithCard({ hadith, book, query }: { hadith: Hadith; book: string; query?: string | undefined }) {
  const { language } = useI18n();
  const rtl = isRtlText(hadith.text);
  const narrator = narratorOf(hadith.text);
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  return (
    <li className="rounded-2xl bg-black/15 p-3" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.25)}` }} data-hadith={hadith.n}>
      <p className="mb-1 flex items-center gap-2 text-[0.72rem] text-amber-200/90">
        <span className="font-arabic">{book}</span><span>·</span><span>{num(hadith.n)}</span>
        {hadith.grades[0] && <span className="ms-auto rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-200/80">{rtl ? gradeArabic(hadith.grades[0]) : hadith.grades[0]}</span>}
      </p>
      {narrator && !rtl && <p className="mb-1 text-xs font-medium text-emerald-100/75">{narrator}</p>}
      <p dir={rtl ? "rtl" : "ltr"} className={cn("whitespace-pre-line leading-relaxed text-emerald-50", rtl ? "font-arabic text-[1.05rem] leading-loose" : "text-sm")}>
        {query ? highlight(hadith.text, query) : hadith.text}
      </p>
    </li>
  );
}

/**
 * A chapter (كتاب) title: the authentic Arabic name; in other languages with the edition's own title next
 * to it. `arabicOnly` (Arabic UI or Arabic text on) shows nothing but Arabic.
 */
function SectionTitle({ book, n, title, arabicOnly, large = false }: { book: BookId; n: number; title: string; arabicOnly: boolean; large?: boolean }) {
  const ar = HADITH_ARABIC_TITLES[book][n];
  if (!ar) return <span dir={isRtlText(title) ? "rtl" : "ltr"} className="min-w-0 flex-1 text-sm text-emerald-50">{title}</span>;
  return (
    <span className="min-w-0 flex-1">
      <span dir="rtl" lang="ar" className={cn("block font-arabic text-emerald-50", large ? "text-xl" : "text-[0.95rem]")}>{ar}</span>
      {!arabicOnly && title && <span className="block text-xs text-emerald-100/60">{title}</span>}
    </span>
  );
}

/** Hadith grades in Arabic. */
const GRADES: [RegExp, string][] = [[/sahih/i, "صحيح"], [/hasan/i, "حسن"], [/da.?if|weak/i, "ضعيف"], [/mawdu|fabricated/i, "موضوع"]];
const gradeArabic = (g: string) => GRADES.find(([re]) => re.test(g))?.[1] ?? g;

/** Marks the query's words in a (non-Arabic) text; Arabic is shown as is (its folding removes diacritics). */
function highlight(text: string, query: string) {
  const words = query.trim().split(/\s+/).filter((w) => w.length > 1 && !/[؀-ۿ]/.test(w)).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return text;
  const re = new RegExp(`(${words.join("|")})`, "gi");
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="rounded bg-amber-300/30 px-0.5 text-amber-50">{part}</mark> : part));
}

const chip = (on: boolean) => cn("rounded-full border px-2.5 py-1", on ? "border-amber-300 bg-amber-300/20 text-amber-100" : "border-amber-400/30 text-emerald-100/75");
const moreBtn = "mt-3 w-full rounded-xl border border-amber-400/40 py-2 text-sm text-amber-100";

export default HadithLibrary;
