import { ChevronDown, Loader2, Pause, Play, Repeat } from "lucide-react";
import { GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { getReciter, type Reciter } from "@/lib/reciterManager";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Short Arabic name used for the monogram (family name without the article). */
const SHORT: Record<string, string> = {
  alafasy: "العفاسي", abdulbasit: "عبد الباسط", husary: "الحصري", minshawi: "المنشاوي", maher: "المعيقلي",
  sudais: "السديس", shuraym: "الشريم", ghamdi: "الغامدي", shatri: "الشاطري", dossari: "الدوسري",
};
export const reciterShortName = (r: Reciter) => SHORT[r.id] ?? r.nameArabic;
const initial = (r: Reciter) => reciterShortName(r).replace(/^ال/, "").replace(/^عبد ال/, "").charAt(0);

/**
 * Monogram avatar of a Sheikh: the first letter of his family name in gold calligraphy.
 * (No photographs: the app shows no pictures of people.)
 */
export function ReciterAvatar({ reciter, selected = false, className }: { reciter: Reciter; selected?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("relative flex shrink-0 items-center justify-center rounded-full font-arabic leading-none", className)}
      style={{ background: selected ? GOLD_GRADIENT : "radial-gradient(circle at 35% 30%, #0f5a45, #052e23)", boxShadow: `inset 0 0 0 1.5px ${selected ? "#fff6" : alpha(GOLD_LIGHT, 0.75)}`, color: selected ? "#052e23" : GOLD_LIGHT }}>
      <span className="translate-y-[0.06em] text-[1.35em]">{initial(reciter)}</span>
    </span>
  );
}



/**
 * The Sheikh player for a screen's top row (Mushaf and Recite): ▶/⏸ · the Sheikh (opens the reciter list)
 * · optional repeat. Kept at the top so listening / switching never needs scrolling.
 */
export function SheikhControls({ reciterId, playing, loading, failed = false, onToggle, onReciter, repeat, onRepeat, detail, compact = false, className }: {
  reciterId: string; playing: boolean; loading: boolean; failed?: boolean;
  onToggle: () => void; onReciter: () => void;
  repeat?: boolean | undefined; onRepeat?: (() => void) | undefined;
  /** Second line under the name (e.g. "Playing Ayah 3"). */
  detail?: string | undefined;
  /** Mushaf top row: avatar and buttons only, no name. */
  compact?: boolean;
  className?: string;
}) {
  const { t, language } = useI18n();
  const r = getReciter(reciterId);
  const name = language === "ar" ? r.nameArabic : r.nameEnglish;
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 rounded-full p-1", !compact && "pe-2", className)}
      style={{ background: "linear-gradient(135deg, #064e3b, #022c22)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.6)}` }}>
      <button type="button" onClick={onToggle} aria-label={playing ? t("pause") : t("play")} data-sheikh-play=""
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-950" style={{ background: GOLD_GRADIENT }}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>
      <button type="button" onClick={onReciter} aria-haspopup="dialog" aria-label={`${t("reciterChange")}: ${name}`} title={name}
        className="flex min-w-0 flex-1 items-center gap-2 text-start">
        <ReciterAvatar reciter={r} selected={playing} className="h-8 w-8 text-sm" />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[#ecfdf5]">{name}</span>
            <span className={cn("block truncate text-[0.7rem]", failed ? "text-red-300" : "")} style={failed ? undefined : { color: alpha(GOLD_LIGHT, 0.85) }}>
              {failed ? t("audioError") : detail ?? (playing ? t("reciterPlaying") : t("reciterChange"))}
            </span>
          </span>
        )}
        {!compact && <ChevronDown className="h-4 w-4 shrink-0" style={{ color: GOLD_LIGHT }} />}
      </button>
      {onRepeat && (
        <button type="button" onClick={onRepeat} aria-pressed={!!repeat} aria-label={t("repeat")}
          className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", repeat ? "bg-amber-300/25 text-amber-200" : "text-emerald-100/60")}>
          <Repeat className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
