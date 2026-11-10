import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Bookmark, ChevronLeft, ChevronRight, CornerDownLeft, Search, X } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { TOTAL_PAGES, type Mushaf } from "@/lib/mushafData";
import { SURAH_META, getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { directionFor, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progressStorage";
import { JUZ_COUNT, memorizedShare, useBookmarks, useRecentReads } from "@/lib/mushafNav";

import { latinDigits, parseGoTo, searchSurahs, surahMeaning, type GoToTarget } from "@/lib/goTo";
export { parseGoTo, type GoToTarget };

type Tab = "surahs" | "juz" | "bookmarks";

/**
 * «اذهب إلى» bottom sheet of the Mushaf (v29, opened from the header bar):
 *  - «قرأت مؤخرًا»: recently read places as cards (surah, surah:verse, page);
 *  - «اختر السورة والجزء»: tabs Surahs (with search and the memorization progress line), Juz, Bookmarks;
 *  - page / surah:verse jump (typed «17:111» or «589», or chosen from the lists).
 */
export function GoToModal({ open, page, surah, mushaf, onClose, onGo }: {
  open: boolean; page: number; surah: number; mushaf?: Mushaf | null | undefined; onClose: () => void; onGo: (t: GoToTarget) => void;
}) {
  const { t, language } = useI18n();
  const [quick, setQuick] = useState("");
  const [s, setS] = useState(surah);
  const [a, setA] = useState(1);
  const [p, setP] = useState(String(page));
  const [name, setName] = useState("");
  const [tab, setTab] = useState<Tab>("surahs");
  const recent = useRecentReads();
  const bookmarks = useBookmarks();
  const progress = useProgress();
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!open) return;
    setQuick(""); setName(""); setS(surah); setA(1); setP(String(page)); setTab("surahs");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // The surah being read in view.
    const id = setTimeout(() => listRef.current?.querySelector(`[data-goto-surah="${surah}"]`)?.scrollIntoView({ block: "center" }), 80);
    return () => { clearTimeout(id); window.removeEventListener("keydown", onKey); };
  }, [open, page, surah, onClose]);
  const shares = useMemo(() => (open ? SURAH_META.map((m) => memorizedShare(progress, m.id, m.versesCount)) : []), [open, progress]);
  if (!open) return null;

  const ar = language === "ar" || language === "ur";
  const num = (n: number) => (ar ? toArabicDigits(n) : String(n));
  const parsed = quick.trim() ? parseGoTo(quick) : null;
  const go = (target: GoToTarget | null) => { if (target) { onGo(target); onClose(); } };
  const submitQuick = (e: FormEvent) => { e.preventDefault(); go(parsed); };
  const count = getSurahMeta(s)?.versesCount ?? 1;
  const pageNo = Number(latinDigits(p));
  const hits = name.trim() ? searchSurahs(name, 114) : SURAH_META.map((m) => m.id);
  const surahLabel = (id: number) => (ar ? getSurahMeta(id)?.nameArabic : getSurahMeta(id)?.nameSimple) ?? String(id);
  const Chevron = directionFor(language) === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" dir={directionFor(language)} lang={language}>
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in" />
      <section role="dialog" aria-modal="true" aria-label={t("goTo")} data-goto-sheet=""
        className="relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-200"
        style={{ background: "linear-gradient(180deg, var(--hq-emerald), var(--hq-emerald-deep))", boxShadow: `inset 0 1px 0 ${alpha(GOLD, 0.6)}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-white/25" aria-hidden="true" />
        <div className="flex shrink-0 items-center px-4 pt-2">
          <h2 className="flex-1 text-base font-semibold text-amber-100">{t("recentlyRead")}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="text-amber-200"><X className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {/* قرأت مؤخرًا */}
          <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1" data-goto-recent="">
            {recent.length === 0 && <p className="text-xs text-emerald-100/60">{t("recentlyReadNone")}</p>}
            {recent.map((r, i) => (
              <button key={`${r.surah}-${r.page}`} type="button" onClick={() => go({ page: r.page })} data-goto-recent-item={r.surah}
                className="flex w-44 shrink-0 items-stretch overflow-hidden rounded-2xl text-start"
                style={{ background: i === 0 ? alpha(GOLD, 0.16) : "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 ${i === 0 ? 1.5 : 1}px ${alpha(GOLD_LIGHT, i === 0 ? 0.8 : 0.3)}` }}>
                <span className="min-w-0 flex-1 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-arabic text-base text-emerald-50">{surahLabel(r.surah)}</span>
                    <span className="shrink-0 rounded-md px-1.5 text-[0.65rem] tabular-nums text-amber-100" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}>{num(r.surah)}:{num(r.ayah)}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-emerald-100/70">{t("pageShort").replace("{n}", num(r.page))}</span>
                </span>
                <span className="flex w-7 shrink-0 items-center justify-center text-amber-200" style={{ background: i === 0 ? alpha(GOLD, 0.2) : "rgba(255,255,255,.04)" }}><Chevron className="h-4 w-4" /></span>
              </button>
            ))}
          </div>

          {/* اختر السورة والجزء */}
          <h3 className="mt-4 text-base font-semibold text-amber-100">{t("chooseSurahJuz")}</h3>
          <div role="tablist" className="mt-2 grid grid-cols-3 gap-1.5">
            {(["surahs", "juz", "bookmarks"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-goto-tab={k}
                className={cn("flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 py-2 text-[0.8rem]", tab === k ? "font-semibold text-emerald-950" : "text-emerald-50")}
                style={tab === k ? { background: GOLD_GRADIENT } : { background: "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
                {k === "bookmarks" && <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />}
                {t(k === "surahs" ? "tabSurahs" : k === "juz" ? "tabJuzs" : "tabBookmarks")}
              </button>
            ))}
          </div>

          {tab === "surahs" && (
            <>
              <label className="relative mt-3 block">
                <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-amber-200/70" aria-hidden="true" />
                <input value={name} onChange={(e) => setName(e.target.value)} type="search" autoComplete="off" enterKeyHint="go" data-goto-surah-search=""
                  onKeyDown={(e) => { if (e.key === "Enter" && name.trim() && hits[0]) { e.preventDefault(); go({ surah: hits[0], ayah: 1 }); } }}
                  placeholder={t("goToSurahPlaceholder")} aria-label={t("goToSurahName")}
                  className="h-11 w-full rounded-xl border border-amber-400/40 bg-black/25 ps-9 pe-3 text-base text-emerald-50 placeholder:text-emerald-100/40 focus:outline-none" />
              </label>
              <p className="mt-2 text-[0.7rem] text-emerald-100/55">{t("progressMemorized")}</p>
              <ul ref={listRef} role="listbox" aria-label={t("tabSurahs")} className="mt-1 space-y-1.5">
                {hits.length === 0 && <li className="px-3 py-2 text-xs text-emerald-100/60">{t("goToSurahNone")}</li>}
                {hits.map((id) => {
                  const m = getSurahMeta(id)!;
                  const share = shares[id - 1] ?? 0;
                  const here = id === surah;
                  return (
                    <li key={id}>
                      <button type="button" role="option" aria-selected={here} data-goto-surah={id} onClick={() => go({ surah: id, ayah: 1 })}
                        className="relative w-full overflow-hidden rounded-xl px-3 pb-3 pt-2 text-start"
                        style={{ background: here ? alpha(GOLD, 0.14) : "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, here ? 0.7 : 0.22)}` }}>
                        <span className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>{num(id)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-emerald-50">{ar ? m.nameArabic : m.nameSimple}{!ar && surahMeaning(id, language) ? <span className="text-emerald-100/60"> · {surahMeaning(id, language)}</span> : null}</span>
                            <span className="block text-[0.7rem] text-emerald-100/60">{num(m.versesCount)} {t("goToVerses")} · {t("pageShort").replace("{n}", num(mushaf?.surahStartPage(id) ?? 0))}</span>
                          </span>
                          <span className="shrink-0 font-arabic text-2xl leading-none" style={{ color: GOLD_LIGHT }}>{m.nameArabic}</span>
                        </span>
                        {/* memorization progress */}
                        <span className="absolute inset-x-0 bottom-0 h-1 bg-white/10" aria-hidden="true">
                          <span className="block h-full" style={{ width: `${Math.round(share * 100)}%`, background: "linear-gradient(90deg,#34d399,#10b981)" }} />
                        </span>
                        <span className="sr-only">{Math.round(share * 100)}%</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {tab === "juz" && (
            <ul className="mt-3 grid grid-cols-2 gap-1.5" data-goto-juz-list="">
              {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((j) => {
                const [js, ja] = mushaf?.juzStartVerse(j) ?? [1, 1];
                const jp = mushaf?.juzStartPage(j) ?? 1;
                const here = mushaf ? mushaf.juzOfPage(page) === j : false;
                return (
                  <li key={j}>
                    <button type="button" data-goto-juz={j} onClick={() => go({ page: jp })}
                      className="w-full rounded-xl px-3 py-2 text-start"
                      style={{ background: here ? alpha(GOLD, 0.14) : "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, here ? 0.7 : 0.22)}` }}>
                      <span className="block text-sm font-semibold text-emerald-50">{t("juz")} {num(j)}</span>
                      <span className="block truncate text-[0.7rem] text-emerald-100/60">{surahLabel(js)} {num(js)}:{num(ja)} · {t("pageShort").replace("{n}", num(jp))}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {tab === "bookmarks" && (
            <ul className="mt-3 space-y-1.5" data-goto-bookmarks="">
              {bookmarks.length === 0 && <li className="rounded-xl bg-black/15 p-3 text-xs leading-relaxed text-emerald-100/70">{t("noBookmarks")}</li>}
              {bookmarks.map((b) => (
                <li key={b.page}>
                  <button type="button" onClick={() => go({ page: b.page })} data-goto-bookmark={b.page}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start" style={{ background: "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.22)}` }}>
                    <Bookmark className="h-4 w-4 shrink-0 fill-current text-amber-300" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm text-emerald-50">{surahLabel(b.surah)} {num(b.surah)}:{num(b.ayah)}</span>
                    <span className="shrink-0 text-xs text-emerald-100/60">{t("pageShort").replace("{n}", num(b.page))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* page / verse jump */}
          <div className="my-4 h-px" style={{ background: alpha(GOLD, 0.35) }} />
          <p className="mb-1.5 text-xs font-semibold text-amber-200/90" data-goto-section="page">{t("goToPageAyah")}</p>
          <form onSubmit={submitQuick} className="flex items-center gap-2">
            <input value={quick} onChange={(e) => setQuick(e.target.value)} inputMode="text" enterKeyHint="go" autoComplete="off"
              placeholder={t("goToPlaceholder")} aria-label={t("goToPlaceholder")} data-goto-quick=""
              className="h-11 min-w-0 flex-1 rounded-xl border border-amber-400/50 bg-black/25 px-3 text-base text-emerald-50 placeholder:text-emerald-100/45 focus:outline-none" />
            <button type="submit" disabled={!parsed} aria-label={t("goTo")} className="flex h-11 w-11 items-center justify-center rounded-xl text-emerald-950 disabled:opacity-40" style={{ background: GOLD_GRADIENT }}>
              <CornerDownLeft className="h-5 w-5" />
            </button>
          </form>
          <p className={cn("mt-1 min-h-[1rem] text-xs", quick.trim() && !parsed ? "text-red-200" : "text-emerald-100/60")}>
            {!quick.trim() ? t("goToExample") : parsed ? ("page" in parsed ? `${t("pageLabel")} ${num(parsed.page)}` : `${getSurahMeta(parsed.surah)?.nameSimple ?? ""} ${num(parsed.surah)}:${num(parsed.ayah)}`) : t("goToInvalid")}
          </p>
          <div className="mt-2 grid grid-cols-[1fr_5rem_auto] items-end gap-2">
            <label className="text-xs text-emerald-100/70">{t("surah")}
              <select value={s} onChange={(e) => { setS(Number(e.target.value)); setA(1); }} className={field}>
                {SURAH_META.map((m) => <option key={m.id} value={m.id}>{ar ? `${toArabicDigits(m.id)}. ${m.nameArabic}` : `${m.id}. ${m.nameSimple}`}</option>)}
              </select>
            </label>
            <label className="text-xs text-emerald-100/70">{t("verse")}
              <select value={a} onChange={(e) => setA(Number(e.target.value))} className={field}>
                {Array.from({ length: count }, (_, i) => <option key={i} value={i + 1}>{num(i + 1)}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => go({ surah: s, ayah: a })} className={goBtn} style={{ background: GOLD_GRADIENT }}>{t("goShort")}</button>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2">
            <label className="text-xs text-emerald-100/70">{t("pageLabel")} (1–{num(TOTAL_PAGES)})
              <input value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" className={field} data-goto-page-input="" />
            </label>
            <button type="button" disabled={!(pageNo >= 1 && pageNo <= TOTAL_PAGES)} onClick={() => go({ page: pageNo })} className={goBtn} style={{ background: GOLD_GRADIENT }}>{t("goShort")}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

const field = "mt-1 h-10 w-full rounded-xl border border-amber-400/40 bg-[var(--mf-page-deep)] px-2 text-sm text-emerald-50";
const goBtn = "h-10 rounded-xl px-4 text-sm font-semibold text-emerald-950 disabled:opacity-40";

export default GoToModal;
