import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Bookmark, Clock, CornerDownLeft, Search, X } from "lucide-react";
import { type Mushaf } from "@/lib/mushafData";
import { SURAH_META, getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { directionFor, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progressStorage";
import { JUZ_COUNT, memorizedShare, useBookmarks, useRecentReads } from "@/lib/mushafNav";

import { parseGoTo, searchSurahs, surahMeaning, type GoToTarget } from "@/lib/goTo";
import { useDismissLayer } from "@/lib/backStack";
export { parseGoTo, type GoToTarget };

/**
 * «اذهب إلى» (v32): opens straight on the list of ALL surahs (full names, large and readable). On top:
 * the search field (filters the list while typing; Enter opens the first hit) with a page / «surah:verse»
 * jump in the same row, then the recently read surahs and bookmarks as chips, then Surahs / Ajzāʾ.
 */
export function GoToModal({ open, page, surah, mushaf, onClose, onGo }: {
  open: boolean; page: number; surah: number; mushaf?: Mushaf | null | undefined; onClose: () => void; onGo: (t: GoToTarget) => void;
}) {
  const { t, language } = useI18n();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"surahs" | "juz">("surahs");
  const recent = useRecentReads();
  const bookmarks = useBookmarks();
  const progress = useProgress();
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setQ(""); setTab("surahs");
    // Scroll the surah being read into view.
    const id = setTimeout(() => listRef.current?.querySelector(`[data-goto-surah="${surah}"]`)?.scrollIntoView({ block: "center" }), 60);
    return () => clearTimeout(id);
  }, [open, surah]);
  useDismissLayer(open, onClose); // Escape + Android back
  const shares = useMemo(() => (open ? SURAH_META.map((m) => memorizedShare(progress, m.id, m.versesCount)) : []), [open, progress]);
  if (!open) return null;

  const ar = language === "ar" || language === "ur";
  const num = (n: number) => (ar ? toArabicDigits(n) : String(n));
  const go = (target: GoToTarget | null) => { if (target) { onGo(target); onClose(); } };
  // A number («589», «18:10») jumps; text filters the surahs.
  const jump = q.trim() && /^[\d٠-٩۰-۹\s:：.,/-]+$/.test(q.trim()) ? parseGoTo(q) : null;
  const ids = q.trim() && !jump ? searchSurahs(q, 114) : SURAH_META.map((m) => m.id);
  const label = (id: number) => (ar ? getSurahMeta(id)?.nameArabic : getSurahMeta(id)?.nameSimple) ?? String(id);
  const submit = (e: FormEvent) => { e.preventDefault(); if (jump) go(jump); else if (ids[0]) go({ surah: ids[0], ayah: 1 }); };

  return (
    <div className="fixed inset-0 z-[60] flex justify-center" dir={directionFor(language)} lang={language}>
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 bg-[rgba(4,20,15,.55)] backdrop-blur-[3px] animate-in fade-in" />
      <section role="dialog" aria-modal="true" aria-label={t("goTo")} data-goto-sheet=""
        className="relative mx-2 my-[max(0.5rem,env(safe-area-inset-top))] flex w-full max-w-md flex-col overflow-hidden rounded-[1.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{ background: "var(--sx-sheet)", color: "var(--sx-ink)", boxShadow: "0 0 0 1px var(--sx-card-top), 0 30px 60px -20px rgba(0,0,0,.55)", maxHeight: "calc(100dvh - 1rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))" }}>
        {/* fixed top: title, search / jump, recently read, tabs */}
        <div className="shrink-0 space-y-3 px-4 pb-3 pt-4" style={{ background: "var(--sx-sheet-top)", borderBottom: "1px solid var(--sx-card-border)" }}>
          <div className="flex items-center gap-2">
            <h2 className="flex-1 font-arabic text-2xl font-extrabold" style={{ color: "var(--sx-ink)" }}>{t("goTo")}</h2>
            <button type="button" onClick={onClose} aria-label={t("close")} className="sx-chip flex h-11 w-11 items-center justify-center rounded-2xl"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={submit} className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5" style={{ color: "var(--sx-gold)" }} aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} type="search" autoComplete="off" enterKeyHint="go" data-goto-surah-search=""
                placeholder={t("goToSearchAll")} aria-label={t("goToSurahName")}
                className="h-[52px] w-full rounded-2xl border-0 ps-11 pe-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[color:var(--sx-gold)] placeholder:text-[color:var(--sx-ink-soft)]"
                style={{ background: "var(--sx-card)", color: "var(--sx-ink)", boxShadow: "inset 0 0 0 1.5px var(--sx-card-top), var(--sx-card-shadow)" }} />
            </label>
            <button type="submit" disabled={!q.trim() || (!jump && !ids.length)} aria-label={t("goTo")}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl text-[#1b1300] disabled:opacity-40" style={{ background: "linear-gradient(135deg,#f3d27a,#d4af37)" }}>
              <CornerDownLeft className="h-5 w-5" />
            </button>
          </form>
          <p className="-mt-1 text-[0.85rem] sx-ink-soft" data-goto-hint="">
            {jump ? ("page" in jump ? `→ ${t("pageLabel")} ${num(jump.page)}` : `→ ${label(jump.surah)} ${num(jump.surah)}:${num(jump.ayah)}`) : q.trim() && /\d/.test(q) ? t("goToInvalid") : t("goToExample")}
          </p>

          {(recent.length > 0 || bookmarks.length > 0) && (
            <div>
              <p className="mb-1.5 text-[0.85rem] font-bold" style={{ color: "var(--sx-gold-soft)" }}>{t("recentlyRead")}</p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" data-goto-chips="">
                {recent.map((r) => (
                  <button key={`r${r.surah}`} type="button" onClick={() => go({ page: r.page })} data-goto-recent-item={r.surah}
                    className="flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-start" style={{ background: "var(--sx-card)", boxShadow: "inset 0 0 0 1px var(--sx-card-top), var(--sx-card-shadow)" }}>
                    <Clock className="h-4 w-4 shrink-0" style={{ color: "var(--sx-gold)" }} aria-hidden="true" />
                    <span>
                      <span className="block whitespace-nowrap font-arabic text-base font-bold leading-tight sx-ink">{label(r.surah)}</span>
                      <span className="block whitespace-nowrap text-[0.72rem] sx-ink-soft">{num(r.surah)}:{num(r.ayah)} • {t("pageShort").replace("{n}", num(r.page))}</span>
                    </span>
                  </button>
                ))}
                {bookmarks.map((b) => (
                  <button key={`b${b.page}`} type="button" onClick={() => go({ page: b.page })} data-goto-bookmark={b.page}
                    className="flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-start text-[#1b1300]" style={{ background: "linear-gradient(135deg,#f3d27a,#d4af37)" }}>
                    <Bookmark className="h-4 w-4 shrink-0 fill-current" aria-hidden="true" />
                    <span>
                      <span className="block whitespace-nowrap font-arabic text-base leading-tight">{label(b.surah)}</span>
                      <span className="block whitespace-nowrap text-[0.7rem]">{t("pageShort").replace("{n}", num(b.page))}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div role="tablist" className="sx-chip grid grid-cols-2 gap-1 rounded-full p-1">
            {(["surahs", "juz"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-goto-tab={k}
                className={cn("min-h-[44px] rounded-full py-2 text-[0.98rem] font-extrabold transition", tab === k ? "text-[#1b1300] shadow-[0_6px_16px_-8px_rgba(212,175,55,.9)]" : "sx-ink-soft")} style={tab === k ? { background: "linear-gradient(135deg,#f3d27a,#d4af37)" } : undefined}>
                {t(k === "surahs" ? "tabSurahs" : "tabJuzs")}
              </button>
            ))}
          </div>
        </div>

        {/* the full list */}
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3" data-goto-surah-list="">
          {tab === "surahs" ? (
            <ul data-goto-hits="">
              {ids.length === 0 && <li className="px-3 py-4 text-sm sx-ink-soft">{t("goToSurahNone")}</li>}
              {ids.map((id) => {
                const m = getSurahMeta(id)!;
                const share = shares[id - 1] ?? 0;
                const here = id === surah;
                return (
                  <li key={id}>
                    <button type="button" data-goto-surah={id} onClick={() => go({ surah: id, ayah: 1 })}
                      className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition active:scale-[.99]", !here && "hover:bg-[var(--sx-chip)]")}
                      style={here ? { background: "var(--sx-card)", boxShadow: "inset 0 0 0 2px var(--sx-gold), var(--sx-card-shadow)" } : undefined}>
                      <SurahStar n={num(id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-arabic text-xl font-bold leading-snug sx-ink">{ar ? `سورة ${m.nameArabic}` : m.nameSimple}</span>
                        <span className="block text-[0.8rem] sx-ink-soft">
                          {!ar && <>{m.nameArabic}{surahMeaning(id, language) ? ` · ${surahMeaning(id, language)}` : ""} · </>}
                          {num(m.versesCount)} {t("goToVerses")} • {t("pageShort").replace("{n}", num(mushaf?.surahStartPage(id) ?? 0))}
                        </span>
                        {share > 0 && (
                          <span className="mt-1.5 flex items-center gap-2" title={t("progressMemorized")}>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--sx-chip)]"><span className="block h-full rounded-full bg-[linear-gradient(90deg,#1d9a6c,#d4af37)]" style={{ width: `${Math.round(share * 100)}%` }} /></span>
                            <span className="text-[0.72rem] font-bold tabular-nums" style={{ color: "var(--sx-primary)" }}>{num(Math.round(share * 100))}%</span>
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="grid grid-cols-2 gap-2 px-1 pt-1" data-goto-juz-list="">
              {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((j) => {
                const [js, ja] = mushaf?.juzStartVerse(j) ?? [1, 1];
                const jp = mushaf?.juzStartPage(j) ?? 1;
                const here = mushaf ? mushaf.juzOfPage(page) === j : false;
                return (
                  <li key={j}>
                    <button type="button" data-goto-juz={j} onClick={() => go({ page: jp })}
                      className="w-full rounded-2xl px-3 py-3 text-start"
                      style={{ background: "var(--sx-card)", boxShadow: here ? "inset 0 0 0 2px var(--sx-gold), var(--sx-card-shadow)" : "inset 0 0 0 1px var(--sx-card-border), var(--sx-card-shadow)" }}>
                      <span className="block text-base font-extrabold sx-ink">{t("juz")} {num(j)}</span>
                      <span className="block font-arabic text-sm sx-ink-soft">{label(js)} {num(js)}:{num(ja)}</span>
                      <span className="block text-xs sx-ink-soft opacity-80">{t("pageShort").replace("{n}", num(jp))}</span>
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

/** Surah number inside a small gold eight-point star (rub el hizb). */
function SurahStar({ n }: { n: string }) {
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center text-[0.85rem] font-extrabold text-[#1b1300]">
      <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect x="8" y="8" width="28" height="28" rx="3" fill="#e9c35a" />
        <rect x="8" y="8" width="28" height="28" rx="3" fill="#d4af37" transform="rotate(45 22 22)" />
        <circle cx="22" cy="22" r="11" fill="#f6dd8d" />
      </svg>
      <span className="relative">{n}</span>
    </span>
  );
}

export default GoToModal;
