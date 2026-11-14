/**
 * v46: the home screen in Kids Mode — ONLY the three children's areas as big, colourful cards:
 * «مصحف الأطفال», «تفسير للأطفال», «رحلة النجوم للحفظ». (Adult widgets — آية اليوم, واصل من حيث توقفت,
 * statistics — are not shown.)
 */
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/ornaments";
import { KidsModePill } from "@/components/kids/KidsModePill";
import { useSurahStars } from "@/components/kids/KidsStarJourney";
import { openKidsMushaf, openKidsSection } from "@/components/kids/kidsNav";
import { toArabicDigits } from "@/lib/quranService";

export function KidsHome({ userName }: { userName?: string | null }) {
  const { t, language } = useI18n();
  const ar = language === "ar";
  const stars = Object.values(useSurahStars()).reduce((a, b) => a + b, 0);
  const cards = [
    { id: "mushaf", emoji: "📗", arTitle: "مصحف الأطفال", title: t("kidsMushafTitle"), sub: t("kidsMushafSub"), cls: "from-emerald-300 to-emerald-500 text-emerald-950", go: openKidsMushaf },
    { id: "kidsTafsir", emoji: "📚", arTitle: "تفسير للأطفال", title: t("kidsTafsirTitle"), sub: t("kidsTafsirSub"), cls: "from-sky-200 to-sky-400 text-sky-950", go: () => openKidsSection("kidsTafsir") },
    { id: "kidsJourney", emoji: "🌟", arTitle: "رحلة النجوم للحفظ", title: t("kidsJourneyTitle"), sub: t("kidsJourneySub"), cls: "from-amber-200 to-amber-400 text-amber-950", go: () => openKidsSection("kidsJourney") },
  ] as const;
  return (
    <div className="space-y-5" data-kids-home="">
      <header className="flex items-center gap-3">
        <AppLogo className="h-14 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={cn("font-bold leading-snug", ar ? "font-arabic text-2xl" : "text-xl")}>{t("kidsHomeHello")}</p>
          {userName && <p className="truncate text-sm text-muted-foreground">{userName}</p>}
        </div>
      </header>
      <KidsModePill wide />
      <ul className="grid grid-cols-1 gap-4">
        {cards.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={c.go} data-kids-home-card={c.id}
              className={cn("qm-native-colors relative flex w-full items-center gap-4 overflow-hidden rounded-[20px] bg-gradient-to-br p-5 text-start shadow-lg active:scale-[.99]", c.cls)}>
              <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] bg-white/45 text-5xl shadow-inner">{c.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-arabic text-2xl font-bold leading-snug">{c.arTitle}</span>
                {!ar && <span className="block text-base font-bold">{c.title}</span>}
                <span className="mt-1 block text-sm leading-relaxed opacity-85">{c.sub}</span>
                {c.id === "kidsJourney" && <span className="mt-1.5 inline-block rounded-full bg-white/60 px-2.5 py-0.5 text-sm font-black tabular-nums">{ar ? toArabicDigits(stars) : stars} ⭐</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default KidsHome;
