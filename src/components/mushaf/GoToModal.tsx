import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Bookmark, BookOpen, ChevronDown, Clock, CornerDownLeft, Hash, Search, X } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { TOTAL_PAGES, type Mushaf } from "@/lib/mushafData";
import { SURAH_META, getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { directionFor, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progressStorage";
import { JUZ_COUNT, memorizedShare, useBookmarks, useRecentReads } from "@/lib/mushafNav";

import { parseGoTo, searchSurahs, surahMeaning, type GoToTarget } from "@/lib/goTo";
export { parseGoTo, type GoToTarget };

/**
 * «اذهب إلى» (v30, own design — a centred card, not a copy of another app):
 *  1. surah search with autocomplete (Arabic, transliterated or translated name; Enter opens the first hit);
 *  2. jump to a page or to «surah:verse» (typed, or surah + verse pickers);
 *  3. small chips: bookmarks and recently read places;
 *  4. all surahs (with the memorization line) and the 30 ajzāʾ, folded.
 */
export function GoToModal({ open, page, surah, mushaf, onClose, onGo }: {
  open: boolean; page: number; surah: number; mushaf?: Mushaf | null | undefined; onClose: () => void; onGo: (t: GoToTarget) => void;
}) {
  const { t, language } = useI18n();
  const [name, setName] = useState("");
  const [quick, setQuick] = useState("");
  const [s, setS] = useState(surah);
  const [a, setA] = useState(1);
  const [list, setList] = useState<"surahs" | "juz" | null>(null);
  const recent = useRecentReads();
  const bookmarks = useBookmarks();
  const progress = useProgress();
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    setName(""); setQuick(""); setS(surah); setA(1); setList(null);
    const id = setTimeout(() => searchRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(id); window.removeEventListener("keydown", onKey); };
  }, [open, surah, onClose]);
  const shares = useMemo(() => (open ? SURAH_META.map((m) => memorizedShare(progress, m.id, m.versesCount)) : []), [open, progress]);
  if (!open) return null;

  const ar = language === "ar" || language === "ur";
  const num = (n: number) => (ar ? toArabicDigits(n) : String(n));
  const go = (target: GoToTarget | null) => { if (target) { onGo(target); onClose(); } };
  const hits = name.trim() ? searchSurahs(name, 6) : [];
  const parsed = quick.trim() ? parseGoTo(quick) : null;
  const count = getSurahMeta(s)?.versesCount ?? 1;
  const label = (id: number) => (ar ? getSurahMeta(id)?.nameArabic : getSurahMeta(id)?.nameSimple) ?? String(id);
  const submitQuick = (e: FormEvent) => { e.preventDefault(); go(parsed); };
  const pageOk = (n: number) => n >= 1 && n <= TOTAL_PAGES;

  const SurahRow = ({ id, compact = false }: { id: number; compact?: boolean }) => {
    const m = getSurahMeta(id)!;
    const share = shares[id - 1] ?? 0;
    return (
      <button type="button" data-goto-surah={id} onClick={() => go({ surah: id, ayah: 1 })}
        className={cn("group flex w-full items-center gap-3 rounded-2xl px-3 text-start transition hover:bg-white/5", compact ? "py-2" : "py-2.5")}>
        {/* number in an eight-point star */}
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center text-[0.7rem] font-semibold" style={{ color: GOLD_LIGHT }}>
          <span className="absolute inset-1 rotate-45 rounded-md" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.7)}` }} aria-hidden="true" />
          <span className="absolute inset-1 rounded-md" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.7)}` }} aria-hidden="true" />
          <span className="relative">{num(id)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate font-arabic text-lg leading-tight text-emerald-50">{m.nameArabic}</span>
            {!ar && <span className="truncate text-xs text-emerald-100/70">{m.nameSimple}{surahMeaning(id, language) ? ` · ${surahMeaning(id, language)}` : ""}</span>}
          </span>
          <span className="mt-1 flex items-center gap-2 text-[0.68rem] text-emerald-100/55">
            <span>{num(m.versesCount)} {t("goToVerses")}</span><span aria-hidden="true">•</span><span>{t("pageShort").replace("{n}", num(mushaf?.surahStartPage(id) ?? 0))}</span>
            {share > 0 && (
              <span className="ms-auto flex items-center gap-1" title={t("progressMemorized")}>
                <span className="h-1 w-12 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-emerald-400" style={{ width: `${Math.round(share * 100)}%` }} /></span>
                <span className="tabular-nums">{num(Math.round(share * 100))}%</span>
              </span>
            )}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto px-3 pb-6 pt-[max(1rem,env(safe-area-inset-top))]" dir={directionFor(language)} lang={language}>
      <button type="button" aria-label={t("close")} onClick={onClose} className="fixed inset-0 bg-black/65 backdrop-blur-[3px] animate-in fade-in" />
      <section role="dialog" aria-modal="true" aria-label={t("goTo")} data-goto-sheet=""
        className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ background: "linear-gradient(165deg, var(--hq-emerald) 0%, var(--hq-emerald-deep) 70%)", boxShadow: `0 0 0 1px ${alpha(GOLD, 0.55)}, 0 20px 50px -20px rgba(0,0,0,.8)` }}>
        {/* title band */}
        <div className="relative flex items-center gap-2 px-4 pb-2 pt-4">
          <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${alpha(GOLD, 0.8)})` }} aria-hidden="true" />
          <h2 className="font-arabic text-lg" style={{ color: GOLD_LIGHT }}>{t("goTo")}</h2>
          <span className="h-px flex-1" style={{ background: `linear-gradient(270deg, transparent, ${alpha(GOLD, 0.8)})` }} aria-hidden="true" />
          <button type="button" onClick={onClose} aria-label={t("close")} className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-amber-200 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3 px-4 pb-4">
          {/* 1 · surah search with autocomplete */}
          <div className="rounded-2xl p-1" style={{ background: "rgba(0,0,0,.22)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` }}>
            <label className="relative block">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5 text-amber-200" aria-hidden="true" />
              <input ref={searchRef} value={name} onChange={(e) => setName(e.target.value)} type="search" autoComplete="off" enterKeyHint="go"
                role="combobox" aria-expanded={hits.length > 0} aria-controls="goto-hits" data-goto-surah-search=""
                onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) { e.preventDefault(); go({ surah: hits[0], ayah: 1 }); } }}
                placeholder={t("goToSurahPlaceholder")} aria-label={t("goToSurahName")}
                className="h-12 w-full rounded-xl bg-transparent ps-11 pe-3 text-base text-emerald-50 placeholder:text-emerald-100/40 focus:outline-none" />
            </label>
            {name.trim() !== "" && (
              <ul id="goto-hits" role="listbox" className="mt-1 border-t pt-1" style={{ borderColor: alpha(GOLD, 0.2) }} data-goto-hits="">
                {hits.length === 0 && <li className="px-3 py-2 text-xs text-emerald-100/60">{t("goToSurahNone")}</li>}
                {hits.map((id) => <li key={id} role="option" aria-selected={false}><SurahRow id={id} compact /></li>)}
              </ul>
            )}
          </div>

          {/* 2 · page or verse */}
          <div className="rounded-2xl p-3" style={{ background: "rgba(0,0,0,.14)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.25)}` }} data-goto-section="page">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-200/90"><Hash className="h-3.5 w-3.5" aria-hidden="true" />{t("goToPageAyah")}</p>
            <form onSubmit={submitQuick} className="flex items-center gap-2">
              <input value={quick} onChange={(e) => setQuick(e.target.value)} inputMode="text" enterKeyHint="go" autoComplete="off" data-goto-quick=""
                placeholder={t("goToPlaceholder")} aria-label={t("goToPlaceholder")}
                className="h-11 min-w-0 flex-1 rounded-xl border border-amber-400/40 bg-black/25 px-3 text-base text-emerald-50 placeholder:text-emerald-100/40 focus:outline-none" />
              <button type="submit" disabled={!parsed} aria-label={t("goTo")} className="flex h-11 w-11 items-center justify-center rounded-xl text-emerald-950 disabled:opacity-40" style={{ background: GOLD_GRADIENT }}>
                <CornerDownLeft className="h-5 w-5" />
              </button>
            </form>
            <p className={cn("mt-1 min-h-[1rem] text-[0.7rem]", quick.trim() && !parsed ? "text-red-200" : "text-emerald-100/55")}>
              {!quick.trim() ? t("goToExample") : parsed ? ("page" in parsed ? `${t("pageLabel")} ${num(parsed.page)}` : `${label(parsed.surah)} ${num(parsed.surah)}:${num(parsed.ayah)}`) : t("goToInvalid")}
            </p>
            <div className="mt-1 grid grid-cols-[1fr_4.5rem_auto] items-end gap-2">
              <select value={s} onChange={(e) => { setS(Number(e.target.value)); setA(1); }} aria-label={t("surah")} className={field}>
                {SURAH_META.map((m) => <option key={m.id} value={m.id}>{ar ? `${toArabicDigits(m.id)}. ${m.nameArabic}` : `${m.id}. ${m.nameSimple}`}</option>)}
              </select>
              <select value={a} onChange={(e) => setA(Number(e.target.value))} aria-label={t("verse")} className={field}>
                {Array.from({ length: count }, (_, i) => <option key={i} value={i + 1}>{num(i + 1)}</option>)}
              </select>
              <button type="button" onClick={() => go({ surah: s, ayah: a })} className={goBtn} style={{ background: GOLD_GRADIENT }}>{t("goShort")}</button>
            </div>
          </div>

          {/* 3 · bookmarks and recently read as chips */}
          {(bookmarks.length > 0 || recent.length > 0) && (
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5" data-goto-chips="">
              {bookmarks.map((b) => (
                <button key={`b${b.page}`} type="button" onClick={() => go({ page: b.page })} data-goto-bookmark={b.page}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-emerald-950" style={{ background: GOLD_GRADIENT }}>
                  <Bookmark className="h-3.5 w-3.5 fill-current" aria-hidden="true" />{label(b.surah)} · {t("pageShort").replace("{n}", num(b.page))}
                </button>
              ))}
              {recent.map((r) => (
                <button key={`r${r.surah}`} type="button" onClick={() => go({ page: r.page })} data-goto-recent-item={r.surah}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-emerald-50" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.45)}`, background: "rgba(0,0,0,.18)" }}>
                  <Clock className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />{label(r.surah)} {num(r.surah)}:{num(r.ayah)}
                </button>
              ))}
            </div>
          )}

          {/* 4 · all surahs / ajzāʾ, folded */}
          <div className="grid grid-cols-2 gap-2">
            {(["surahs", "juz"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setList(list === k ? null : k)} aria-expanded={list === k} data-goto-tab={k}
                className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm text-emerald-50"
                style={{ background: list === k ? alpha(GOLD, 0.18) : "rgba(0,0,0,.14)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, list === k ? 0.7 : 0.25)}` }}>
                <BookOpen className="h-4 w-4 text-amber-200" aria-hidden="true" />{t(k === "surahs" ? "tabSurahs" : "tabJuzs")}
                <ChevronDown className={cn("h-4 w-4 text-amber-200 transition", list === k && "rotate-180")} aria-hidden="true" />
              </button>
            ))}
          </div>
          {list === "surahs" && (
            <ul className="max-h-[50dvh] overflow-y-auto overscroll-contain rounded-2xl" style={{ background: "rgba(0,0,0,.12)" }} data-goto-surah-list="">
              {SURAH_META.map((m) => <li key={m.id} className={cn(m.id === surah && "bg-amber-300/10")}><SurahRow id={m.id} /></li>)}
            </ul>
          )}
          {list === "juz" && (
            <ul className="grid grid-cols-3 gap-1.5" data-goto-juz-list="">
              {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((j) => {
                const [js, ja] = mushaf?.juzStartVerse(j) ?? [1, 1];
                const jp = mushaf?.juzStartPage(j) ?? 1;
                const here = mushaf ? mushaf.juzOfPage(page) === j : false;
                return (
                  <li key={j}>
                    <button type="button" data-goto-juz={j} onClick={() => pageOk(jp) && go({ page: jp })}
                      className="w-full rounded-xl px-2 py-2 text-center"
                      style={{ background: here ? alpha(GOLD, 0.18) : "rgba(0,0,0,.16)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, here ? 0.7 : 0.22)}` }}>
                      <span className="block text-sm font-semibold text-emerald-50">{t("juz")} {num(j)}</span>
                      <span className="block truncate text-[0.62rem] text-emerald-100/55">{label(js)} {num(ja)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

const field = "h-10 w-full rounded-xl border border-amber-400/40 bg-[var(--mf-page-deep)] px-2 text-sm text-emerald-50";
const goBtn = "h-10 rounded-xl px-4 text-sm font-semibold text-emerald-950 disabled:opacity-40";

export default GoToModal;
