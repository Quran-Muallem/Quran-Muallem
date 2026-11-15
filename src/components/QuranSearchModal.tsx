import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Loader2, Search, X } from "lucide-react";
import { GOLD_LIGHT } from "@/components/ornaments";
import { loadMushaf, type Mushaf } from "@/lib/mushafData";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { search, type SearchResult } from "@/lib/quranSearch";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { SanctuarySheet } from "@/components/SanctuarySheet";

/** Where a result leads: the verse (or the surah's first page) in the Mushaf, with the found words marked. */
export type SearchTarget = { surahId: number; ayah?: number | undefined; words?: number[] | undefined };

/**
 * Global Quran search (header, Mushaf top row, burger menu): surah by name or number, a verse
 * ("2:255", "Al-Baqarah 255", "Ayah 255") or Arabic words in the whole Uthmani text — offline.
 */
export function QuranSearchModal({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (t: SearchTarget) => void }) {
  const { t, language } = useI18n();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [mushaf, setMushaf] = useState<Mushaf | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    setQuery(""); setDebounced("");
    void loadMushaf().then(setMushaf).catch(() => {});
    const focus = setTimeout(() => input.current?.focus(), 300); // after the sheet has mounted and slid in
    return () => clearTimeout(focus);
  }, [open]);
  useEffect(() => { const id = setTimeout(() => setDebounced(query), 180); return () => clearTimeout(id); }, [query]);
  const outcome = useMemo(() => search(mushaf, debounced), [mushaf, debounced]);
  if (!open) return null;

  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const name = (s: number) => { const m = getSurahMeta(s); return m ? (language === "ar" ? m.nameArabic : m.nameSimple) : String(s); };
  const pick = (r: SearchResult) => {
    onSelect(r.kind === "surah" ? { surahId: r.surah } : r.kind === "verse" ? { surahId: r.surah, ayah: r.ayah } : { surahId: r.surah, ayah: r.ayah, words: r.words });
    onClose();
  };
  const preview = (r: Exclude<SearchResult, { kind: "surah" }>) => {
    const words = mushaf?.words(r.surah, r.ayah) ?? [];
    if (!words.length) return null;
    const hit = new Set(r.kind === "text" ? r.words : []);
    // Around the first hit: a few words before and after, so long verses stay one or two lines.
    const first = r.kind === "text" ? Math.max(1, (r.words[0] ?? 1) - 4) : 1;
    const last = Math.min(words.length, first + 13);
    return (
      <p dir="rtl" lang="ar" className="mt-1 font-quran text-lg leading-loose text-emerald-50/90">
        {first > 1 && "… "}
        {words.slice(first - 1, last).map((w, i) => (
          <span key={i} className={cn(hit.has(first + i) && "rounded bg-amber-300/25 px-0.5 text-amber-100")}>{w}{" "}</span>
        ))}
        {last < words.length && "…"}
      </p>
    );
  };
  const textLoading = !mushaf && /[؀-ۿ]/.test(debounced);

  // v56.3: the shared full-screen sub-view (‹ back · title · ✕, Android back) instead of an own top sheet
  return (
    <SanctuarySheet open={open} onClose={onClose} title={t("searchTitle")}>
      <div className="sticky top-0 z-10 -mx-1 -mt-1 bg-[var(--sx-sheet)] px-1 pb-3 pt-1">
        <label className="flex min-w-0 items-center gap-2 rounded-2xl border border-amber-400/50 bg-black/25 px-3">
          <Search className="h-5 w-5 shrink-0" style={{ color: GOLD_LIGHT }} aria-hidden="true" />
          <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} type="text" inputMode="search" enterKeyHint="search" autoComplete="off" spellCheck={false}
            placeholder={t("searchPlaceholder")} aria-label={t("searchTitle")}
            className="h-12 min-w-0 flex-1 bg-transparent text-base text-emerald-50 placeholder:text-emerald-100/45 focus:outline-none" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label={t("searchClear")} className="text-emerald-100/70"><X className="h-4 w-4" /></button>}
        </label>
      </div>
      <div>
          {!debounced.trim() && <p className="px-1 text-sm leading-relaxed text-emerald-100/70">{t("searchHint")}</p>}
          {debounced.trim() && !outcome.results.length && !textLoading && <p className="px-1 py-6 text-center text-sm text-emerald-100/70">{t("searchNoResults")}</p>}
          {textLoading && <p className="flex items-center justify-center gap-2 py-6 text-sm text-emerald-100/70"><Loader2 className="h-4 w-4 animate-spin" />{t("loadingSurah")}</p>}
          <ul className="space-y-1.5">
            {outcome.results.map((r) => (
              <li key={`${r.kind}:${r.surah}:${"ayah" in r ? r.ayah : 0}`}>
                <button type="button" onClick={() => pick(r)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-start hover:bg-black/35">
                  {r.kind === "surah" ? (
                    <span className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 shrink-0" style={{ color: GOLD_LIGHT }} />
                      <span className="min-w-0 flex-1 text-sm text-emerald-50">{num(r.surah)}. {getSurahMeta(r.surah)?.nameSimple}
                        <span className="text-emerald-100/60"> · {num(getSurahMeta(r.surah)?.versesCount ?? 0)} {t("verses")}</span></span>
                      <span className="font-arabic text-lg" style={{ color: GOLD_LIGHT }}>{getSurahMeta(r.surah)?.nameArabic}</span>
                    </span>
                  ) : (
                    <>
                      <span className="text-xs font-medium" style={{ color: GOLD_LIGHT }}>{name(r.surah)} · {num(r.surah)}:{num(r.ayah)}</span>
                      {preview(r)}
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {outcome.more && <p className="px-1 pt-2 text-center text-xs text-emerald-100/60">{t("searchMore")}</p>}
      </div>
    </SanctuarySheet>
  );
}

export default QuranSearchModal;
