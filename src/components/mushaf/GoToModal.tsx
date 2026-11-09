import { useEffect, useRef, useState, type FormEvent } from "react";
import { CornerDownLeft, X } from "lucide-react";
import { GOLD, GOLD_GRADIENT, alpha } from "@/components/ornaments";
import { TOTAL_PAGES } from "@/lib/mushafData";
import { SURAH_META, getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { directionFor, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { latinDigits, parseGoTo, searchSurahs, surahMeaning, type GoToTarget } from "@/lib/goTo";
export { parseGoTo, type GoToTarget };

/** "Go to" dialog of the Mushaf: a page, or a surah and verse (also typed as 17:111). */
export function GoToModal({ open, page, surah, onClose, onGo }: { open: boolean; page: number; surah: number; onClose: () => void; onGo: (t: GoToTarget) => void }) {
  const { t, language } = useI18n();
  const [quick, setQuick] = useState("");
  const [s, setS] = useState(surah);
  const [a, setA] = useState(1);
  const [p, setP] = useState(String(page));
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    setQuick(""); setName(""); setS(surah); setA(1); setP(String(page));
    const id = setTimeout(() => input.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(id); window.removeEventListener("keydown", onKey); };
  }, [open, page, surah, onClose]);
  if (!open) return null;

  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const parsed = quick.trim() ? parseGoTo(quick) : null;
  const go = (target: GoToTarget | null) => { if (target) { onGo(target); onClose(); } };
  const submitQuick = (e: FormEvent) => { e.preventDefault(); go(parsed); };
  const count = getSurahMeta(s)?.versesCount ?? 1;
  const pageNo = Number(latinDigits(p));
  const hits = searchSurahs(name, 8);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[max(4.5rem,env(safe-area-inset-top))]" dir={directionFor(language)} lang={language}>
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in" />
      <section role="dialog" aria-modal="true" aria-label={t("goTo")}
        className="relative w-full max-w-sm rounded-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{ background: "linear-gradient(180deg, var(--hq-emerald), var(--hq-emerald-deep))", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.6)}` }}>
        <div className="mb-3 flex items-center">
          <h2 className="flex-1 text-base font-semibold text-amber-100">{t("goTo")}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="text-amber-200"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submitQuick} className="flex items-center gap-2">
          <input ref={input} value={quick} onChange={(e) => setQuick(e.target.value)} inputMode="text" enterKeyHint="go" autoComplete="off"
            placeholder={t("goToPlaceholder")} aria-label={t("goToPlaceholder")}
            className="h-11 min-w-0 flex-1 rounded-xl border border-amber-400/50 bg-black/25 px-3 text-base text-emerald-50 placeholder:text-emerald-100/45 focus:outline-none" />
          <button type="submit" disabled={!parsed} aria-label={t("goTo")} className="flex h-11 w-11 items-center justify-center rounded-xl text-emerald-950 disabled:opacity-40" style={{ background: GOLD_GRADIENT }}>
            <CornerDownLeft className="h-5 w-5" />
          </button>
        </form>
        <p className={cn("mt-1 min-h-[1rem] text-xs", quick.trim() && !parsed ? "text-red-200" : "text-emerald-100/60")}>
          {!quick.trim() ? t("goToExample") : parsed ? ("page" in parsed ? `${t("pageLabel")} ${num(parsed.page)}` : `${getSurahMeta(parsed.surah)?.nameSimple ?? ""} ${num(parsed.surah)}:${num(parsed.ayah)}`) : t("goToInvalid")}
        </p>

        <div className="my-3 h-px" style={{ background: alpha(GOLD, 0.35) }} />
        {/* Surah by name: autocomplete; choosing one opens the first page of the surah */}
        <label className="block text-xs text-emerald-100/70">{t("goToSurahName")}
          <input value={name} onChange={(e) => setName(e.target.value)} type="search" autoComplete="off" enterKeyHint="go" data-goto-surah-search=""
            onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) { e.preventDefault(); go({ surah: hits[0], ayah: 1 }); } }}
            placeholder={t("goToSurahPlaceholder")} className={cn(field, "text-base placeholder:text-emerald-100/40")} />
        </label>
        {name.trim() && (
          <ul role="listbox" aria-label={t("goToSurahName")} className="mt-1 max-h-56 overflow-y-auto rounded-xl bg-black/25 p-1" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
            {hits.length === 0 && <li className="px-3 py-2 text-xs text-emerald-100/60">{t("goToSurahNone")}</li>}
            {hits.map((id) => {
              const m = getSurahMeta(id)!;
              return (
                <li key={id}>
                  <button type="button" role="option" aria-selected="false" data-goto-surah={id} onClick={() => go({ surah: id, ayah: 1 })}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm text-emerald-50 hover:bg-white/5 active:bg-white/10">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-emerald-950" style={{ background: GOLD_GRADIENT }}>{num(id)}</span>
                    <span className="font-arabic text-base">{m.nameArabic}</span>
                    {language !== "ar" && <span className="min-w-0 truncate text-emerald-100/70">{m.nameSimple}{surahMeaning(id, language) ? ` · ${surahMeaning(id, language)}` : ""}</span>}
                    <span className="ms-auto shrink-0 text-[0.7rem] text-emerald-100/50">{num(m.versesCount)} {t("goToVerses")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="my-3 h-px" style={{ background: alpha(GOLD, 0.2) }} />
        <div className="grid grid-cols-[1fr_5rem_auto] items-end gap-2">
          <label className="text-xs text-emerald-100/70">{t("surah")}
            <select value={s} onChange={(e) => { setS(Number(e.target.value)); setA(1); }} className={field}>
              {SURAH_META.map((m) => <option key={m.id} value={m.id}>{language === "ar" ? `${toArabicDigits(m.id)}. ${m.nameArabic}` : `${m.id}. ${m.nameSimple}`}</option>)}
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
            <input value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" className={field} />
          </label>
          <button type="button" disabled={!(pageNo >= 1 && pageNo <= TOTAL_PAGES)} onClick={() => go({ page: pageNo })} className={goBtn} style={{ background: GOLD_GRADIENT }}>{t("goShort")}</button>
        </div>
      </section>
    </div>
  );
}

const field = "mt-1 h-10 w-full rounded-xl border border-amber-400/40 bg-[var(--mf-page-deep)] px-2 text-sm text-emerald-50";
const goBtn = "h-10 rounded-xl px-4 text-sm font-semibold text-emerald-950 disabled:opacity-40";

export default GoToModal;
