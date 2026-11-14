/**
 * v47 Kids home: ONLY the three adventure cards — «مصحف الأطفال», «تفسير وقصص للأطفال», «رحلة النجوم للحفظ»
 * — big, illustrated and bouncy, plus the star counter.
 */
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toArabicDigits } from "@/lib/quranService";
import { useSurahStars } from "@/components/kids/KidsStarJourney";
import type { KidsTab } from "@/components/kids/KidsLayoutTemplate";
import { KidsBadge, Sparkles, StarMeter, type KidsBadgeId } from "@/components/kids/KidsArt";

export function KidsHomeView({ userName, onGo }: { userName?: string | null; onGo: (t: KidsTab) => void }) {
  const { t, language } = useI18n();
  const ar = language === "ar";
  const stars = Object.values(useSurahStars()).reduce((a, b) => a + b, 0);
  const num = (n: number) => (ar ? toArabicDigits(n) : String(n));
  const cards: { id: KidsTab; badge: KidsBadgeId; emoji: string; deco: string; arTitle: string; title: string; sub: string; bg: string; edge: string }[] = [
    { id: "mushaf", badge: "mushaf", emoji: "📗", deco: "✨", arTitle: "مصحف الأطفال", title: t("kidsMushafTitle"), sub: t("kidsTapAyahHint"), bg: "linear-gradient(150deg,#6ee7d0 0%,#14b8a6 55%,#0e9f8f 100%)", edge: "#0d8f81" },
    { id: "stories", badge: "stories", emoji: "🗺️", deco: "🕋", arTitle: "رحلة الأنبياء وقصص القرآن", title: t("storiesTitle"), sub: t("storiesJourneySub"), bg: "linear-gradient(150deg,#c9b8ff 0%,#8b5cf6 55%,#7444e6 100%)", edge: "#6d28d9" },
    { id: "tafsir", badge: "tafsir", emoji: "📚", deco: "🌙", arTitle: "تفسير وقصص للأطفال", title: t("kidsTafsirTitle"), sub: t("kidsCardStory"), bg: "linear-gradient(150deg,#fdb4bd 0%,#fb7185 55%,#f2546f 100%)", edge: "#e04e66" },
    { id: "journey", badge: "journey", emoji: "⭐", deco: "⭐", arTitle: "رحلة النجوم للحفظ", title: t("kidsJourneyTitle"), sub: t("kidsJourneySub"), bg: "linear-gradient(150deg,#fde47a 0%,#f8b21a 55%,#ef9a06 100%)", edge: "#c97d00" },
  ];
  return (
    <div className="space-y-5" data-kids-home="">
      <div className="kd-card kd-3d kd-pop relative space-y-3 overflow-hidden p-4" style={{ background: "linear-gradient(160deg, var(--kd-cream) 55%, color-mix(in srgb, var(--kd-sun) 55%, var(--kd-cream)))" }}>
        <Sparkles count={3} seed={2} />
        <div className="relative flex items-center gap-3">
          <span className="kd-bounce text-4xl" aria-hidden="true">👋</span>
          <div className="min-w-0 flex-1">
            <p className={cn("font-black leading-snug", ar ? "font-arabic text-2xl" : "text-xl")}>{t("kidsHomeHello")}</p>
            {userName && <p className="truncate text-sm font-bold kd-ink-soft">{userName}</p>}
          </div>
          <span className="kd-3d flex shrink-0 flex-col items-center rounded-[20px] px-3 py-1.5 font-black" style={{ background: "linear-gradient(180deg,#ffe58a,#f59e0b)", color: "#3b2300" }} data-kids-total="">
            <span className="text-2xl leading-none">⭐</span><span className="tabular-nums">{num(stars)}</span>
          </span>
        </div>
        <StarMeter stars={stars} label={t("kidsStarMeter").replace("{n}", num(stars % 10 === 0 && stars > 0 ? 10 : stars % 10)).replace("{m}", num(10))} sub={t("kidsStarMeterSub")} />
      </div>
      <ul className="space-y-5">
        {cards.map((c, i) => (
          <li key={c.id} className="kd-pop" style={{ animationDelay: `${120 + i * 110}ms` }}>
            <button type="button" onClick={() => onGo(c.id)} data-kids-home-card={c.id}
              className="kd-3d relative flex w-full items-center gap-4 overflow-hidden p-5 text-start text-white transition active:translate-y-[4px]"
              style={{ background: c.bg, borderRadius: 30, borderBottom: `7px solid ${c.edge}` }}>
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 -start-8 h-32 w-32 rounded-full bg-white/15" />
              <span aria-hidden="true" className="pointer-events-none absolute -top-12 end-6 h-28 w-28 rounded-full bg-white/10" />
              <Sparkles count={4} seed={i} />
              <span className="kd-float relative shrink-0 drop-shadow-[0_8px_10px_rgba(0,0,0,.18)]" style={{ animationDelay: `${i * 0.7}s` }}>
                <KidsBadge id={c.badge} />
              </span>
              <span className="relative min-w-0 flex-1" style={{ textShadow: "0 1px 2px rgba(0,0,0,.2)" }}>
                <span className="block font-arabic text-[1.65rem] font-black leading-snug">{c.arTitle}</span>
                {!ar && <span className="block text-base font-extrabold">{c.title}</span>}
                <span className="mt-1 block text-sm font-semibold leading-relaxed opacity-95">{c.sub}</span>
                <span className="kd-3d mt-2 inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-black" style={{ color: c.edge, background: "rgba(255,255,255,.97)", textShadow: "none" }}>{t("kidsLetsGo")} {ar ? "←" : "→"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default KidsHomeView;
