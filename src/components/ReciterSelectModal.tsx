import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check, CloudDownload, Loader2, Search, Trash2, X, WifiOff } from "lucide-react";
import { ReciterAvatar, reciterShortName } from "@/components/ReciterPill";
import { matchesReciter } from "@/lib/reciterSearch";
import { GoldDialog, GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import {
  RECITERS, cancelDownload, deleteSurahDownload, downloadSurahOffline, downloadedSurahs, downloadsVersion, formatBytes,
  getDownloadState, loadDownloads, subscribeDownloads, type DownloadState,
} from "@/lib/reciterManager";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { isNativePlatform } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Re-render on any download progress. */
function useDownloads() {
  useSyncExternalStore(subscribeDownloads, downloadsVersion, () => 0);
  useEffect(() => { void loadDownloads(); }, []);
}

/**
 * Sheikh selection: the 10 reciters with monogram, Arabic and English name, offline status and a
 * quick search; each can download the current surah for offline listening (per-surah progress).
 * The choice is global (settings): Mushaf and Recitation screen use the same Sheikh.
 */
export function ReciterSelectModal({ open, onOpenChange, selectedId, onSelect, surah }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  /** Surah whose download is offered (the one being read). */
  surah: number;
}) {
  const { t, language } = useI18n();
  useDownloads();
  const meta = getSurahMeta(surah);
  const surahName = meta ? (language === "ar" ? meta.nameArabic : meta.nameSimple) : "";
  const [query, setQuery] = useState("");
  useEffect(() => { if (!open) setQuery(""); }, [open]);
  const list = useMemo(() => RECITERS.filter((r) => matchesReciter(r, query)), [query]);

  return (
    <GoldDialog open={open} onOpenChange={onOpenChange} title={t("reciterTitle")}
      description={`${t("reciterSub")} · ${t("surah")} ${surahName}`} className="max-w-md">
      <label className="mb-3 flex items-center gap-2 rounded-full bg-black/25 px-3.5 py-2" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` }}>
        <Search className="h-4 w-4 shrink-0 text-amber-200/80" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("reciterSearch")} aria-label={t("reciterSearch")}
          className="min-w-0 flex-1 bg-transparent text-sm text-emerald-50 placeholder:text-emerald-100/45 focus:outline-none" />
      </label>
      {list.length === 0 && <p className="py-6 text-center text-sm text-emerald-100/60">{t("reciterNone")}</p>}
      <ul className="max-h-[55vh] space-y-2 overflow-y-auto" role="radiogroup" aria-label={t("reciterTitle")}>
        {list.map((r) => {
          const state = getDownloadState(r.id, surah);
          const selected = r.id === selectedId;
          const count = downloadedSurahs(r.id).length;
          return (
            <li key={r.id}>
              <div className={cn("flex items-center gap-3 rounded-2xl p-2.5 transition", selected ? "bg-black/30" : "bg-black/10 hover:bg-black/20")}
                style={{ boxShadow: `inset 0 0 0 1px ${selected ? GOLD_LIGHT : alpha(GOLD, 0.33)}` }}>
                <button type="button" role="radio" aria-checked={selected} onClick={() => onSelect(r.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-start">
                  <span className="relative">
                    <ReciterAvatar reciter={r} selected={selected} className="h-11 w-11 text-lg" />
                    {selected && <Check className="absolute -bottom-0.5 -end-0.5 h-4 w-4 rounded-full bg-emerald-950 p-0.5 text-amber-300" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-emerald-50">{language === "ar" ? r.nameArabic : r.nameEnglish}</span>
                    <span className="block truncate text-xs text-emerald-100/60">
                      {language === "ar" ? r.nameEnglish : reciterShortName(r)}
                    </span>
                    <span className={cn("mt-0.5 flex items-center gap-1 text-[0.68rem]", count > 0 || state.status === "complete" ? "text-emerald-300" : "text-emerald-100/45")}>
                      {count > 0 || state.status === "complete" ? <Check className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {count > 0 ? `${t("downloadedCount")} ${language === "ar" ? toArabicDigits(count) : count}` : t("reciterStreamOnly")}
                    </span>
                  </span>
                </button>
                <DownloadControl reciterId={r.id} surah={surah} state={state} />
              </div>
              {state.status === "downloading" && <ProgressBar done={state.done} total={state.total} />}
              {state.status === "error" && (
                <p className="mt-1 px-2 text-xs text-red-200">{isNativePlatform() ? t("downloadFailed") : t("downloadWebUnsupported")}</p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-emerald-100/55">
        <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t("downloadNote")}
      </p>
    </GoldDialog>
  );
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mt-1.5 flex items-center gap-2 px-2" dir="ltr">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/30">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: GOLD_GRADIENT }} />
      </div>
      <span className="w-20 text-end text-[0.7rem] tabular-nums text-amber-100/80">{done}/{total} · {pct}%</span>
    </div>
  );
}

function DownloadControl({ reciterId, surah, state }: { reciterId: string; surah: number; state: DownloadState }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const btn = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-amber-300";

  if (state.status === "downloading") {
    return (
      <button type="button" onClick={() => cancelDownload(reciterId, surah)} aria-label={t("downloadCancel")} className={cn(btn, "text-amber-200 hover:bg-white/10")}>
        <span className="relative flex h-6 w-6 items-center justify-center">
          <Loader2 className="absolute h-6 w-6 animate-spin" />
          <X className="h-3 w-3" />
        </span>
      </button>
    );
  }
  if (state.status === "complete") {
    return confirming ? (
      <button type="button" onClick={() => { setConfirming(false); void deleteSurahDownload(reciterId, surah); }} onBlur={() => setConfirming(false)}
        className="shrink-0 rounded-full bg-red-900/60 px-3 py-1.5 text-xs text-red-100 hover:bg-red-900">
        {t("downloadDelete")} · {formatBytes(state.bytes)}
      </button>
    ) : (
      <button type="button" onClick={() => setConfirming(true)} aria-label={`${t("downloadDone")} — ${t("downloadDelete")}`} title={formatBytes(state.bytes)}
        className={cn(btn, "text-emerald-300 hover:bg-white/10")}>
        <span className="relative"><Check className="h-5 w-5" /><Trash2 className="absolute -bottom-1 -end-2 h-3 w-3 opacity-60" /></span>
      </button>
    );
  }
  return (
    <button type="button" onClick={() => { void downloadSurahOffline(reciterId, surah).catch(() => {}); }} aria-label={t("downloadSurah")}
      className={cn(btn, "text-amber-200 hover:bg-white/10")}>
      <CloudDownload className="h-5 w-5" />
    </button>
  );
}

export default ReciterSelectModal;
