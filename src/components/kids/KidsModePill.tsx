/**
 * v46: the always-visible «وضع الأطفال» switch (next to the app logo on the home screen and at the top of the
 * burger menu) — bright, with a star and a child, so parents and children find it at once.
 */
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useKidsMode } from "@/components/kids/KidsModeContext";

export function KidsModePill({ className, wide = false }: { className?: string; wide?: boolean }) {
  const { t, language } = useI18n();
  const kids = useKidsMode();
  return (
    <button type="button" role="switch" aria-checked={kids.on} onClick={() => kids.set(!kids.on)} data-kids-pill={kids.on ? "on" : "off"}
      className={cn("qm-native-colors flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-bold shadow-md transition active:scale-95",
        kids.on ? "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 ring-2 ring-amber-200" : "bg-gradient-to-br from-amber-200 to-amber-300 text-amber-950",
        wide && "w-full justify-between rounded-[20px] px-4 py-3 text-base", className)}>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className={cn(kids.on && "kids-star")}>⭐</span>
        <span aria-hidden="true">🧒</span>
        <span className={cn(language === "ar" && "font-arabic")}>{language === "ar" ? "وضع الأطفال" : t("setKids")}</span>
      </span>
      <span aria-hidden="true" className={cn("relative h-5 w-9 shrink-0 rounded-full transition", kids.on ? "bg-emerald-600" : "bg-amber-950/25")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", kids.on ? "start-[1.15rem]" : "start-0.5")} />
      </span>
    </button>
  );
}

export default KidsModePill;
