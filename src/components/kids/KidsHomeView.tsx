/**
 * v47 Kids home: ONLY the three adventure cards — «مصحف الأطفال», «تفسير وقصص للأطفال», «رحلة النجوم للحفظ»
 * — big, illustrated and bouncy, plus the star counter.
 */
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toArabicDigits } from "@/lib/quranService";
import { useSurahStars } from "@/components/kids/KidsStarJourney";
import type { KidsTab } from "@/components/kids/KidsLayoutTemplate";

export function KidsHomeView({ userName, onGo }: { userName?: string | null; onGo: (t: KidsTab) => void }) {
  const { t, language } = useI18n();
  const ar = language === "ar";
  const stars = Object.values(useSurahStars()).reduce((a, b) => a + b, 0);
  const num = (n: number) => (ar ? toArabicDigits(n) : String(n));
  const cards: { id: KidsTab; emoji: string; deco: string; arTitle: string; title: string; sub: string; bg: string; edge: string }[] = [
    { id: "mushaf", emoji: "📗", deco: "✨", arTitle: "مصحف الأطفال", title: t("kidsMushafTitle"), sub: t("kidsTapAyahHint"), bg: "linear-gradient(135deg,#5eead4,#14b8a6)", edge: "#0d8f81" },
    { id: "stories", emoji: "🗺️", deco: "🕋", arTitle: "رحلة الأنبياء وقصص القرآن", title: t("storiesTitle"), sub: t("storiesJourneySub"), bg: "linear-gradient(135deg,#c4b5fd,#8b5cf6)", edge: "#6d28d9" },
    { id: "tafsir", emoji: "📚", deco: "🌙", arTitle: "تفسير وقصص للأطفال", title: t("kidsTafsirTitle"), sub: t("kidsCardStory"), bg: "linear-gradient(135deg,#fda4af,#fb7185)", edge: "#e04e66" },
    { id: "journey", emoji: "⭐", deco: "⭐", arTitle: "رحلة النجوم للحفظ", title: t("kidsJourneyTitle"), sub: t("kidsJourneySub"), bg: "linear-gradient(135deg,#fcd34d,#f59e0b)", edge: "#c97d00" },
  ];
  return (
    <div className="space-y-5" data-kids-home="">
      <div className="kd-card kd-pop flex items-center gap-3 p-4">
        <span className="kd-bounce text-4xl" aria-hidden="true">👋</span>
        <div className="min-w-0 flex-1">
          <p className={cn("font-black leading-snug", ar ? "font-arabic text-2xl" : "text-xl")}>{t("kidsHomeHello")}</p>
          {userName && <p className="truncate text-sm font-bold kd-ink-soft">{userName}</p>}
        </div>
        <span className="flex shrink-0 flex-col items-center rounded-[20px] px-3 py-1.5 font-black" style={{ background: "var(--kd-sun)", color: "#3b2300" }} data-kids-total="">
          <span className="text-2xl leading-none">⭐</span><span className="tabular-nums">{num(stars)}</span>
        </span>
      </div>
      <ul className="space-y-5">
        {cards.map((c, i) => (
          <li key={c.id} className="kd-pop" style={{ animationDelay: `${120 + i * 110}ms` }}>
            <button type="button" onClick={() => onGo(c.id)} data-kids-home-card={c.id}
              className="relative flex w-full items-center gap-4 overflow-hidden p-5 text-start text-white active:translate-y-[3px]"
              style={{ background: c.bg, borderRadius: 28, borderBottom: `6px solid ${c.edge}`, boxShadow: "0 14px 26px -16px rgba(30,58,95,.6)" }}>
              <span aria-hidden="true" className="absolute -end-3 -top-2 text-5xl opacity-30">{c.deco}</span>
              <span aria-hidden="true" className="kd-float flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-6xl shadow-inner" style={{ animationDelay: `${i * 0.7}s`, background: "rgba(255,255,255,.92)" }}>{c.emoji}</span>
              <span className="min-w-0 flex-1" style={{ textShadow: "0 1px 2px rgba(0,0,0,.18)" }}>
                <span className="block font-arabic text-[1.65rem] font-black leading-snug">{c.arTitle}</span>
                {!ar && <span className="block text-base font-extrabold">{c.title}</span>}
                <span className="mt-1 block text-sm font-semibold leading-relaxed opacity-95">{c.sub}</span>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-black" style={{ color: c.edge, background: "rgba(255,255,255,.95)" }}>{t("kidsLetsGo")} {ar ? "←" : "→"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default KidsHomeView;
