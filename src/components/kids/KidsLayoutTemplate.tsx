/**
 * v47 «وضع الأطفال» storybook template: a separate, joyful layout for children — sky / cream / turquoise /
 * mango / coral, clouds, stars and a crescent in the header, extra-round cards with a soft 3D bottom edge,
 * big buttons. Only four destinations: home, Kids Mushaf, tafsir & stories, star journey. No burger menu,
 * no account menu, no search; the gear opens the child-locked «إعدادات الأطفال».
 */
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/ornaments";

export type KidsTab = "home" | "mushaf" | "stories" | "tafsir" | "journey";

/** Soft clouds, stars and a crescent moon behind the header. */
export function KidsSkyMotif({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}>
      <g fill="#ffffff" style={{ opacity: "var(--kd-cloud, 0.9)" }}>
        <g className="kd-float" style={{ transformOrigin: "60px 40px" }}><ellipse cx="60" cy="44" rx="34" ry="14" /><ellipse cx="44" cy="36" rx="16" ry="12" /><ellipse cx="72" cy="32" rx="20" ry="15" /></g>
        <g className="kd-float" style={{ transformOrigin: "300px 104px", animationDelay: "1.2s" }}><ellipse cx="300" cy="108" rx="40" ry="14" /><ellipse cx="286" cy="99" rx="18" ry="12" /><ellipse cx="318" cy="96" rx="22" ry="15" /></g>
        <g opacity=".7"><ellipse cx="190" cy="132" rx="30" ry="9" /><ellipse cx="200" cy="125" rx="16" ry="9" /></g>
      </g>
      <g fill="var(--kd-mango)">
        <path className="kd-float" style={{ transformOrigin: "352px 34px" }} d="M352 18a20 20 0 1 0 14 34 16 16 0 1 1-14-34Z" />
        {[[140, 26, 7], [238, 46, 5], [110, 92, 4.5], [372, 82, 5], [22, 104, 4]].map(([x, y, r], i) => (
          <path key={i} className="kd-float" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${i * 0.6}s` }}
            d={`M${x} ${y! - r!}l${r! * 0.3} ${r! * 0.7} ${r! * 0.7} ${r! * 0.3}-${r! * 0.7} ${r! * 0.3}-${r! * 0.3} ${r! * 0.7}-${r! * 0.3}-${r! * 0.7}-${r! * 0.7}-${r! * 0.3} ${r! * 0.7}-${r! * 0.3}Z`} />
        ))}
      </g>
    </svg>
  );
}

const NAV: { id: KidsTab; emoji: string; key: "start" | "navMushaf" | "kidsNavStories" | "kidsNavTafsir" | "kidsNavJourney"; color: string }[] = [
  { id: "home", emoji: "🏠", key: "start", color: "var(--kd-turquoise)" },
  { id: "mushaf", emoji: "📗", key: "navMushaf", color: "var(--kd-turquoise)" },
  { id: "stories", emoji: "🗺️", key: "kidsNavStories", color: "#8b5cf6" },
  { id: "tafsir", emoji: "📚", key: "kidsNavTafsir", color: "var(--kd-coral)" },
  { id: "journey", emoji: "⭐", key: "kidsNavJourney", color: "var(--kd-mango)" },
];

export function KidsLayoutTemplate({ tab, onTab, onSettings, children }: { tab: KidsTab; onTab: (t: KidsTab) => void; onSettings: () => void; children: ReactNode }) {
  const { t, language } = useI18n();
  const ar = language === "ar";
  return (
    <div className="kd-root relative flex min-h-screen flex-col" data-kids-layout={tab}>
      <header className="relative overflow-hidden px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]"
        style={{ background: "linear-gradient(180deg, var(--kd-sky-2), var(--kd-sky))" }}>
        <KidsSkyMotif />
        <div className="relative flex items-center gap-3">
          <AppLogo className="h-12 w-12 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <p className={cn("truncate font-black leading-tight", ar ? "font-arabic text-2xl" : "text-xl")}>{ar ? "معلّم القرآن" : "Quran Muallem"}</p>
            <p className="truncate text-sm font-bold kd-ink-soft">{ar ? "للأطفال ⭐" : `${t("setKids")} ⭐`}</p>
          </div>
          <button type="button" onClick={onSettings} aria-label={t("kidsSettings")} data-kids-settings-open=""
            className="kd-btn kd-btn-soft h-14 w-14 shrink-0 !p-0 text-2xl">⚙️</button>
        </div>
      </header>
      <main key={tab} className="relative flex-1 px-4 pb-32 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">{children}</main>
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2" data-bottom-nav="kids">
        <div className="kd-card grid grid-cols-5 gap-0.5 !rounded-[28px] p-1.5">
          {NAV.map((n) => {
            const on = tab === n.id;
            return (
              <button key={n.id} type="button" onClick={() => onTab(n.id)} aria-current={on ? "page" : undefined} data-nav={n.id === "tafsir" ? "kidsTafsir" : n.id === "journey" ? "kidsJourney" : n.id}
                className={cn("flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[22px] py-2 text-[0.72rem] font-extrabold transition", on ? "text-white shadow-md" : "kd-ink-soft")}
                style={on ? { background: n.color } : undefined}>
                <span className={cn("text-2xl leading-none", on && "kd-bounce")} aria-hidden="true">{n.emoji}</span>
                <span className="max-w-full truncate">{t(n.key)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default KidsLayoutTemplate;
