import { ChevronDown } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
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

/** Animated "audio wave" bars; still when nothing plays. */
export function AudioWave({ active, className }: { active: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex h-4 items-end gap-[2px]", className)}>
      {[0.55, 1, 0.7, 0.9].map((h, i) => (
        <span key={i} className={cn("w-[3px] rounded-full", active && "reciter-wave")}
          style={{ height: `${h * 100}%`, background: GOLD_LIGHT, opacity: active ? 1 : 0.55, animationDelay: `${i * 0.13}s` }} />
      ))}
    </span>
  );
}

/**
 * Prominent Sheikh selector shown at the top of the Mushaf and the Recitation screen:
 * monogram · name · audio wave. Opens the reciter list.
 */
export function ReciterPill({ reciterId, playing, onOpen, className }: { reciterId: string; playing: boolean; onOpen: () => void; className?: string }) {
  const { t, language } = useI18n();
  const r = getReciter(reciterId);
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-label={`${t("reciterChange")}: ${language === "ar" ? r.nameArabic : r.nameEnglish}`}
      className={cn("flex w-full items-center gap-3 rounded-full py-1.5 pe-4 ps-1.5 text-start transition active:scale-[.99]", className)}
      style={{ background: "linear-gradient(135deg, #064e3b, #022c22)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.7)}, 0 6px 18px -8px rgba(0,0,0,.7)` }}>
      <ReciterAvatar reciter={r} className="h-9 w-9 text-base" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-emerald-50">{language === "ar" ? r.nameArabic : r.nameEnglish}</span>
        <span className="block truncate text-[0.7rem]" style={{ color: alpha(GOLD_LIGHT, 0.85) }}>{playing ? t("reciterPlaying") : t("reciterChange")}</span>
      </span>
      <AudioWave active={playing} />
      <ChevronDown className="h-4 w-4 shrink-0" style={{ color: GOLD_LIGHT }} />
    </button>
  );
}
