import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Download, Heart, Loader2, Pause, Play, Search, SkipBack, SkipForward, Trash2, X } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { getSurahMeta } from "@/lib/quranService";
import { formatBytes } from "@/lib/reciterManager";
import {
  HUB_RECITERS, cancelMoshafDownload, deleteMoshaf, deleteSurahFile, downloadMoshaf, downloadSurahFile, downloadedReciterIds,
  getHubReciter, getMoshaf, moshafDownloadState, moshafSurahs, searchReciters, surahDownloadState, moshafKey, toggleFavorite,
  useFavorites, useSurahDownloads, type HubReciter, type Moshaf,
} from "@/lib/recitersHub";
import { next, playSurah, previous, seek, setHubPlayerLanguage, toggle, useHubPlayer } from "@/lib/hubPlayer";

/** Avatar letter: first letter of the family name (السديس → س). */
const initialOf = (name: string) => (name.trim().split(/\s+/).at(-1) ?? name).replace(/^ال/, "").charAt(0);

type Tab = "all" | "fav" | "downloaded";
const TABS: { id: Tab; emoji: string; label: "recAll" | "recFav" | "recDownloaded" }[] = [
  { id: "all", emoji: "🎙️", label: "recAll" },
  { id: "fav", emoji: "❤️", label: "recFav" },
  { id: "downloaded", emoji: "📥", label: "recDownloaded" },
];

/**
 * المقرئين — the reciters library: all / favourites / downloaded, live search, every riwaya of a Sheikh,
 * favourite heart and offline download with progress; a Sheikh opens his surah list. Plays whole surahs on
 * and on (screen off too) with the lock-screen player.
 */
export function RecitersHubView() {
  const { t, language } = useI18n();
  useEffect(() => setHubPlayerLanguage(language), [language]);
  useSurahDownloads();
  const favorites = useFavorites();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const moshafOf = (r: HubReciter) => getMoshaf(r, chosen[r.id] ?? r.moshaf[0]!.id);

  const list = useMemo(() => {
    const base = tab === "fav" ? HUB_RECITERS.filter((r) => favorites.includes(r.id))
      : tab === "downloaded" ? HUB_RECITERS.filter((r) => downloadedReciterIds().includes(r.id))
      : HUB_RECITERS;
    return searchReciters(base, query);
  }, [tab, query, favorites, useSurahDownloads()]); // eslint-disable-line react-hooks/exhaustive-deps

  const opened = open != null ? getHubReciter(open) : undefined;
  if (opened) {
    return (
      <>
        <ReciterDetail r={opened} m={moshafOf(opened)} onMoshaf={(id) => setChosen({ ...chosen, [opened.id]: id })} onBack={() => setOpen(null)} />
        <MiniPlayer />
      </>
    );
  }

  return (
    <div className="pb-28" data-reciters-hub="">
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl p-1" style={{ background: "rgba(0,0,0,.2)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.35)}` }} role="tablist">
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} data-rec-tab={x.id} onClick={() => setTab(x.id)}
            className={cn("flex items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-xs font-semibold transition", tab === x.id ? "text-emerald-950" : "text-emerald-100/80")}
            style={tab === x.id ? { background: GOLD_GRADIENT } : undefined}>
            <span aria-hidden="true">{x.emoji}</span><span className="truncate">{t(x.label)}</span>
          </button>
        ))}
      </div>

      <label className="mt-3 flex items-center gap-2 rounded-2xl bg-black/25 px-3" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.35)}` }}>
        <Search className="h-4 w-4 shrink-0" style={{ color: GOLD_LIGHT }} />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("recSearch")} aria-label={t("recSearch")} data-rec-search=""
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-emerald-50 outline-none placeholder:text-emerald-100/45" />
      </label>

      {list.length === 0 && (
        <p className="mt-6 text-center text-sm text-emerald-100/70" data-rec-empty-list="">
          {query ? t("recNoResults") : tab === "fav" ? t("recNoneFav") : t("recNoneDownloaded")}
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {list.map((r) => {
          const m = moshafOf(r), fav = favorites.includes(r.id);
          return (
            <li key={r.id} className="rounded-2xl p-3" style={{ background: "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }} data-reciter={r.id}>
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => setOpen(r.id)} className="flex min-w-0 flex-1 items-start gap-3 text-start" data-rec-open={r.id}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-arabic text-lg text-emerald-950" style={{ background: GOLD_GRADIENT }} aria-hidden="true">{initialOf(r.ar)}</span>
                  <span className="min-w-0">
                    <span className="block font-arabic text-lg leading-snug text-emerald-50">{r.ar}</span>
                    {language !== "ar" && <span className="block truncate text-xs text-emerald-100/65">{r.en}</span>}
                  </span>
                </button>
                <button type="button" onClick={() => void toggleFavorite(r.id)} aria-pressed={fav} aria-label={t(fav ? "recFavRemove" : "recFavAdd")} data-rec-fav={r.id}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: alpha(GOLD, 0.12) }}>
                  <Heart className="h-5 w-5" style={{ color: fav ? "#f43f5e" : GOLD_LIGHT }} fill={fav ? "#f43f5e" : "none"} />
                </button>
                <DownloadRing r={r} m={m} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5" dir="rtl">
                {r.moshaf.map((x) => (
                  <button key={x.id} type="button" onClick={() => setChosen({ ...chosen, [r.id]: x.id })} aria-pressed={x.id === m.id} data-rec-riwaya={x.id}
                    className="rounded-full px-2.5 py-1 font-arabic text-[0.78rem] leading-tight"
                    style={x.id === m.id ? { background: alpha(GOLD, 0.3), color: "#fff", boxShadow: `inset 0 0 0 1px ${GOLD}` } : { background: "rgba(255,255,255,.06)", color: "rgba(236,253,245,.75)" }}>
                    {x.ar}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-center text-[0.7rem] text-emerald-100/50">{t("recSourceCredit")}</p>
      <MiniPlayer />
    </div>
  );
}

/** Round download button of a riwaya: progress ring while it downloads, ✓ when the whole Mushaf is there. */
function DownloadRing({ r, m }: { r: HubReciter; m: Moshaf }) {
  const { t } = useI18n();
  const d = moshafDownloadState(r, m);
  const frac = d.total ? (d.done + (d.current?.status === "downloading" && d.current.total ? d.current.received / d.current.total : 0)) / d.total : 0;
  const full = d.done === d.total;
  const click = () => {
    if (d.running) cancelMoshafDownload(r, m);
    else if (!full && window.confirm(t("recDownloadAllWarn"))) void downloadMoshaf(r, m).catch(() => {});
  };
  const C = 2 * Math.PI * 17;
  return (
    <button type="button" onClick={click} aria-label={d.running ? t("recCancel") : t("recDownloadAll")} data-rec-download={moshafKey(r, m)} data-progress={Math.round(frac * 100)}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: alpha(GOLD, 0.12) }}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="17" fill="none" stroke={alpha(GOLD, 0.2)} strokeWidth="3" />
        {frac > 0 && <circle cx="20" cy="20" r="17" fill="none" stroke={full ? "#22c55e" : GOLD} strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />}
      </svg>
      {full ? <Check className="h-4 w-4 text-emerald-300" /> : d.running ? <X className="h-4 w-4" style={{ color: GOLD_LIGHT }} /> : <Download className="h-4 w-4" style={{ color: GOLD_LIGHT }} />}
    </button>
  );
}

function ReciterDetail({ r, m, onMoshaf, onBack }: { r: HubReciter; m: Moshaf; onMoshaf: (id: number) => void; onBack: () => void }) {
  const { t, language } = useI18n();
  const dir = language === "ar" || language === "ur" ? "rtl" : "ltr";
  const player = useHubPlayer();
  const favorites = useFavorites();
  const fav = favorites.includes(r.id);
  const d = moshafDownloadState(r, m);
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  const n = (x: number) => (language === "ar" ? x.toLocaleString("ar-EG") : String(x));
  return (
    <div className="pb-28" data-reciter-detail={r.id}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t("back")} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: alpha(GOLD, 0.12), color: GOLD_LIGHT }}><Back className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <h2 className="font-arabic text-2xl leading-tight" style={{ color: GOLD_LIGHT }}>{r.ar}</h2>
          {language !== "ar" && <p className="text-xs text-emerald-100/65">{r.en}</p>}
        </div>
        <button type="button" onClick={() => void toggleFavorite(r.id)} aria-pressed={fav} aria-label={t(fav ? "recFavRemove" : "recFavAdd")}
          className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: alpha(GOLD, 0.12) }}>
          <Heart className="h-5 w-5" style={{ color: fav ? "#f43f5e" : GOLD_LIGHT }} fill={fav ? "#f43f5e" : "none"} />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" dir="rtl">
        {r.moshaf.map((x) => (
          <button key={x.id} type="button" onClick={() => onMoshaf(x.id)} aria-pressed={x.id === m.id} data-rec-riwaya={x.id}
            className="rounded-full px-3 py-1.5 font-arabic text-sm"
            style={x.id === m.id ? { background: GOLD_GRADIENT, color: "#022c22" } : { background: "rgba(255,255,255,.06)", color: "rgba(236,253,245,.8)" }}>{x.ar}</button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-black/20 p-3 text-xs text-emerald-100/80" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
        <span className="min-w-0 flex-1">
          <span className="block">{t("recSurahCount").replace("{n}", n(d.done))} / {n(d.total)}{d.bytes ? ` · ${formatBytes(d.bytes)}` : ""}</span>
          {(d.running || (d.done > 0 && d.done < d.total)) && (
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/10" data-rec-total-bar={Math.round(frac(d) * 100)}>
              <span className="block h-full rounded-full transition-[width]" style={{ width: `${Math.max(2, frac(d) * 100)}%`, background: GOLD_GRADIENT }} />
            </span>
          )}
        </span>
        {d.running ? (
          <button type="button" onClick={() => cancelMoshafDownload(r, m)} className="rounded-xl px-3 py-2 font-semibold" style={{ background: alpha(GOLD, 0.18), color: GOLD_LIGHT }} data-rec-cancel="">{t("recCancel")}</button>
        ) : d.done < d.total ? (
          <button type="button" onClick={() => { if (window.confirm(t("recDownloadAllWarn"))) void downloadMoshaf(r, m).catch(() => {}); }} className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }} data-rec-download-all="">
            <Download className="h-4 w-4" />{t("recDownloadAll")}
          </button>
        ) : null}
        {d.done > 0 && !d.running && (
          <button type="button" onClick={() => void deleteMoshaf(r, m)} aria-label={t("recDeleteAll")} title={t("recDeleteAll")} className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(239,68,68,.18)", color: "#fca5a5" }}><Trash2 className="h-4 w-4" /></button>
        )}
      </div>

      <ul className="mt-3 divide-y divide-white/5 rounded-2xl bg-black/15" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.25)}` }}>
        {moshafSurahs(m).map((s) => {
          const meta = getSurahMeta(s)!;
          const isCur = player?.reciterId === r.id && player.moshafId === m.id && player.surah === s;
          const st = surahDownloadState(moshafKey(r, m), s);
          return (
            <li key={s} className="flex items-center gap-2 px-2.5 py-2" data-rec-surah-row={s}>
              <button type="button" onClick={() => (isCur ? toggle() : void playSurah(r, m, s))} aria-label={`${t(isCur && player?.playing ? "recPause" : "recPlay")} · ${meta.nameSimple}`} data-rec-play={s}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={isCur ? { background: GOLD_GRADIENT, color: "#022c22" } : { background: alpha(GOLD, 0.14), color: GOLD_LIGHT }}>
                {isCur && player?.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isCur && player?.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <span className="w-7 shrink-0 text-center text-xs text-emerald-100/55">{n(s)}</span>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-arabic text-base", isCur ? "text-amber-200" : "text-emerald-50")}>سورة {meta.nameArabic}</span>
                {language !== "ar" && st.status !== "downloading" && <span className="block truncate text-[0.7rem] text-emerald-100/55">{meta.nameSimple}</span>}
                {st.status === "downloading" && <ProgressLine received={st.received} total={st.total} surah={s} />}
                {st.status === "error" && <span className="block truncate text-[0.68rem] text-red-200" data-rec-surah-error={s}>{t("recDownloadFailed")}{st.message ? ` (${st.message.slice(0, 60)})` : ""}</span>}
                {isCur && player?.failed && <span className="block truncate text-[0.68rem] text-red-200" data-rec-play-error={s}>{t("recPlayFailed")}</span>}
              </span>
              {st.status === "complete" ? (
                <button type="button" onClick={() => void deleteSurahFile(r, m, s)} aria-label={t("recDeleteSurah")} data-rec-surah-delete={s} className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-300"><Check className="h-4 w-4" /></button>
              ) : st.status === "downloading" ? (
                <span className="w-10 text-center text-xs font-semibold tabular-nums text-amber-200">{st.total ? `${Math.round((st.received / st.total) * 100)}%` : <Loader2 className="mx-auto h-4 w-4 animate-spin" />}</span>
              ) : (
                <button type="button" onClick={() => void downloadSurahFile(r, m, s).catch(() => {})} aria-label={t("recDownloadSurah")} data-rec-surah-download={s}
                  className={cn("flex h-8 w-8 items-center justify-center rounded-lg", st.status === "error" ? "text-red-300" : "")} style={st.status === "error" ? undefined : { color: GOLD_LIGHT }}><Download className="h-4 w-4" /></button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-center text-[0.7rem] text-emerald-100/50">{t("recSourceCredit")}</p>
    </div>
  );
}

/** Whole riwaya: finished surahs plus the share of the one downloading now. */
const frac = (d: { done: number; total: number; current?: { status: string; received?: number; total?: number } | undefined }) =>
  d.total ? Math.min(1, (d.done + (d.current?.status === "downloading" && d.current.total ? (d.current.received ?? 0) / d.current.total : 0)) / d.total) : 0;

/** «Lädt 42 % (3,4 MB / 8,1 MB)» with a bar — the same on Android and in the browser. */
function ProgressLine({ received, total, surah }: { received: number; total: number; surah: number }) {
  const { t, language } = useI18n();
  const mb = (b: number) => `${(b / 1e6).toLocaleString(language === "ar" ? "ar-EG" : language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
  const pct = total ? Math.min(100, Math.round((received / total) * 100)) : null;
  return (
    <span className="mt-1 block" data-rec-surah-progress={surah} data-percent={pct ?? ""}>
      <span className="block truncate text-[0.7rem] tabular-nums text-amber-200">
        {pct != null ? t("recDownloadingOf").replace("{p}", String(pct)).replace("{a}", mb(received)).replace("{b}", mb(total)) : received > 0 ? `${mb(received)} …` : t("recConnecting")}
      </span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
        <span className={cn("block h-full rounded-full transition-[width]", pct == null && "w-1/3 animate-pulse")} style={{ ...(pct != null ? { width: `${Math.max(3, pct)}%` } : {}), background: GOLD_GRADIENT }} />
      </span>
    </span>
  );
}

/** Player bar: Sheikh · surah · verse, previous / play-pause / next and a seekable timeline. */
function MiniPlayer() {
  const { t, language } = useI18n();
  const p = useHubPlayer();
  if (!p) return null;
  const r = getHubReciter(p.reciterId), meta = getSurahMeta(p.surah);
  const time = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const ar = language === "ar" || language === "ur";
  return (
    <div className="fixed inset-x-3 z-40 mx-auto max-w-md rounded-2xl p-2.5 shadow-2xl" style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)", background: "linear-gradient(180deg,#064e3b,#022c22)", boxShadow: `0 10px 30px rgba(0,0,0,.5), inset 0 0 0 1px ${alpha(GOLD, 0.5)}` }} data-hub-player="">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-emerald-50" data-hub-player-title="">{t("mediaByReciter").replace("{name}", ar ? r?.ar ?? "" : r?.en ?? "")}</p>
          <p className="truncate text-xs text-emerald-100/70">
            {t("mediaSurah").replace("{surah}", ar ? meta?.nameArabic ?? "" : meta?.nameSimple ?? "")}
            {p.ayah != null && <span data-hub-player-ayah={p.ayah}> · {t("mediaAyah").replace("{ayah}", language === "ar" ? p.ayah.toLocaleString("ar-EG") : String(p.ayah))}</span>}
          </p>
        </div>
        <button type="button" onClick={previous} aria-label={t("recPrev")} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: GOLD_LIGHT }} data-hub-prev=""><SkipBack className="h-5 w-5 rtl:rotate-180" /></button>
        <button type="button" onClick={toggle} aria-label={t(p.playing ? "recPause" : "recPlay")} className="flex h-11 w-11 items-center justify-center rounded-full text-emerald-950" style={{ background: GOLD_GRADIENT }} data-hub-toggle="">
          {p.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : p.playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button type="button" onClick={next} aria-label={t("recNext")} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: GOLD_LIGHT }} data-hub-next=""><SkipForward className="h-5 w-5 rtl:rotate-180" /></button>
      </div>
      {p.failed && <p className="mt-1 text-[0.7rem] leading-snug text-red-200" role="alert" data-hub-player-error="">{t("recPlayFailed")}</p>}
      <div className="mt-1 flex items-center gap-2 text-[0.65rem] tabular-nums text-emerald-100/60" dir="ltr">
        <span>{time(p.position)}</span>
        <input type="range" min={0} max={Math.max(1, p.duration)} step={1} value={Math.min(p.position, p.duration || 0)} onChange={(e) => seek(Number(e.target.value))} aria-label="progress"
          className="h-1 flex-1 accent-amber-400" data-hub-seek="" />
        <span>{time(p.duration)}</span>
      </div>
    </div>
  );
}

export default RecitersHubView;
