import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Bookmark, Clock, CornerDownLeft, Search, X } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { type Mushaf } from "@/lib/mushafData";
import { SURAH_META, getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { directionFor, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useProgress } from "@/lib/progressStorage";
import { JUZ_COUNT, memorizedShare, useBookmarks, useRecentReads } from "@/lib/mushafNav";

import { parseGoTo, searchSurahs, surahMeaning, type GoToTarget } from "@/lib/goTo";
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(id); window.removeEventListener("keydown", onKey); };
  }, [open, surah, onClose]);
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
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 bg-black/70 animate-in fade-in" />
      <section role="dialog" aria-modal="true" aria-label={t("goTo")} data-goto-sheet=""
        className="qm-native-colors relative mx-2 my-[max(0.5rem,env(safe-area-inset-top))] flex w-full max-w-md flex-col overflow-hidden rounded-[1.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{ background: "#062b22", boxShadow: `0 0 0 1px ${alpha(GOLD, 0.6)}, 0 20px 50px -20px rgba(0,0,0,.8)`, maxHeight: "calc(100dvh - 1rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))" }}>
        {/* fixed top: title, search / jump, recently read, tabs */}
        <div className="shrink-0 space-y-3 px-4 pb-3 pt-4" style={{ background: "linear-gradient(180deg, #0a3d30, #062b22)" }}>
          <div className="flex items-center gap-2">
            <h2 className="flex-1 font-arabic text-xl" style={{ color: GOLD_LIGHT }}>{t("goTo")}</h2>
            <button type="button" onClick={onClose} aria-label={t("close")} className="flex h-9 w-9 items-center justify-center rounded-full text-amber-100 hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={submit} className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-5 w-5 text-amber-200" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} type="search" autoComplete="off" enterKeyHint="go" data-goto-surah-search=""
                placeholder={t("goToSearchAll")} aria-label={t("goToSurahName")}
                className="h-12 w-full rounded-2xl border bg-black/30 ps-11 pe-3 text-base text-white placeholder:text-[#D4E4DC]/80 focus:outline-none"
                style={{ borderColor: alpha(GOLD, 0.55) }} />
            </label>
            <button type="submit" disabled={!q.trim() || (!jump && !ids.length)} aria-label={t("goTo")}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-emerald-950 disabled:opacity-40" style={{ background: GOLD_GRADIENT }}>
              <CornerDownLeft className="h-5 w-5" />
            </button>
          </form>
          <p className="-mt-1 text-xs text-[#D4E4DC]" data-goto-hint="">
            {jump ? ("page" in jump ? `→ ${t("pageLabel")} ${num(jump.page)}` : `→ ${label(jump.surah)} ${num(jump.surah)}:${num(jump.ayah)}`) : q.trim() && /\d/.test(q) ? t("goToInvalid") : t("goToExample")}
          </p>

          {(recent.length > 0 || bookmarks.length > 0) && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-amber-200">{t("recentlyRead")}</p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" data-goto-chips="">
                {recent.map((r) => (
                  <button key={`r${r.surah}`} type="button" onClick={() => go({ page: r.page })} data-goto-recent-item={r.surah}
                    className="flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-start" style={{ background: "rgba(255,255,255,.06)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.45)}` }}>
                    <Clock className="h-4 w-4 shrink-0 text-amber-200" aria-hidden="true" />
                    <span>
                      <span className="block whitespace-nowrap font-arabic text-base leading-tight text-white">{label(r.surah)}</span>
                      <span className="block whitespace-nowrap text-[0.7rem] text-[#D4E4DC]">{num(r.surah)}:{num(r.ayah)} · {t("pageShort").replace("{n}", num(r.page))}</span>
                    </span>
                  </button>
                ))}
                {bookmarks.map((b) => (
                  <button key={`b${b.page}`} type="button" onClick={() => go({ page: b.page })} data-goto-bookmark={b.page}
                    className="flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-start text-emerald-950" style={{ background: GOLD_GRADIENT }}>
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

          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1">
            {(["surahs", "juz"] as const).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-goto-tab={k}
                className={cn("rounded-xl py-2 text-sm font-semibold", tab === k ? "text-emerald-950" : "text-emerald-50")} style={tab === k ? { background: GOLD_GRADIENT } : undefined}>
                {t(k === "surahs" ? "tabSurahs" : "tabJuzs")}
              </button>
            ))}
          </div>
        </div>

        {/* the full list */}
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3" data-goto-surah-list="">
          {tab === "surahs" ? (
            <ul data-goto-hits="">
              {ids.length === 0 && <li className="px-3 py-4 text-sm text-[#D4E4DC]">{t("goToSurahNone")}</li>}
              {ids.map((id) => {
                const m = getSurahMeta(id)!;
                const share = shares[id - 1] ?? 0;
                const here = id === surah;
                return (
                  <li key={id}>
                    <button type="button" data-goto-surah={id} onClick={() => go({ surah: id, ayah: 1 })}
                      className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start", here ? "bg-amber-300/15" : "hover:bg-white/5")}
                      style={here ? { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.6)}` } : undefined}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-emerald-950" style={{ background: GOLD_GRADIENT }}>{num(id)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-arabic text-xl leading-snug text-white">{ar ? `سورة ${m.nameArabic}` : m.nameSimple}</span>
                        <span className="block text-xs text-[#D4E4DC]">
                          {!ar && <>{m.nameArabic}{surahMeaning(id, language) ? ` · ${surahMeaning(id, language)}` : ""} · </>}
                          {num(m.versesCount)} {t("goToVerses")} · {t("pageShort").replace("{n}", num(mushaf?.surahStartPage(id) ?? 0))}
                        </span>
                        {share > 0 && (
                          <span className="mt-1.5 flex items-center gap-2" title={t("progressMemorized")}>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-emerald-400" style={{ width: `${Math.round(share * 100)}%` }} /></span>
                            <span className="text-[0.7rem] tabular-nums text-emerald-200">{num(Math.round(share * 100))}%</span>
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
                      style={{ background: here ? alpha(GOLD, 0.18) : "rgba(255,255,255,.05)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, here ? 0.7 : 0.25)}` }}>
                      <span className="block text-base font-semibold text-white">{t("juz")} {num(j)}</span>
                      <span className="block font-arabic text-sm text-[#D4E4DC]">{label(js)} {num(js)}:{num(ja)}</span>
                      <span className="block text-xs text-emerald-100/60">{t("pageShort").replace("{n}", num(jp))}</span>
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

export default GoToModal;
