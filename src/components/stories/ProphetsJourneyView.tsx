/**
 * v48 «رحلة الأنبياء عبر الزمن»: a winding storybook trail from Adam (عليه السلام) to Muhammad ﷺ.
 * Glowing stations alternate left/right along a golden path; each shows the Prophet's name, an era badge,
 * a star when completed, and a bouncing «تابع الرحلة» pointer where the reader left off. Muhammad ﷺ is the
 * radiant final station.
 */
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PROPHETS, continueStation, storyLang, useStoryProgress } from "@/lib/stories";
import { toArabicDigits } from "@/lib/quranService";
import type { StoryLook } from "@/components/stories/StoryReaderView";

const ROW = 150;
const xOf = (i: number) => (i % 2 === 0 ? 24 : 76);

export function ProphetsJourneyView({ look, kids, onOpen }: { look: StoryLook; kids: boolean; onOpen: (id: string) => void }) {
  const { t, language } = useI18n();
  const L = storyLang(language);
  const rtl = L === "ar";
  const p = useStoryProgress();
  const here = continueStation(p);
  const doneCount = PROPHETS.filter((s) => p.done[s.id]).length;
  const num = (n: number) => (rtl ? toArabicDigits(n) : String(n));
  const H = PROPHETS.length * ROW;
  // a smooth winding path through all station centres (x in %, y in px; the SVG stretches horizontally)
  const pts = PROPHETS.map((_, i) => [xOf(i), i * ROW + ROW / 2] as const);
  const seg = (a: readonly [number, number], b: readonly [number, number]) => `C ${a[0]} ${a[1] + ROW * 0.55}, ${b[0]} ${b[1] - ROW * 0.55}, ${b[0]} ${b[1]}`;
  const path = pts.reduce((d, pt, i) => (i === 0 ? `M ${pt[0]} ${pt[1]}` : `${d} ${seg(pts[i - 1]!, pt)}`), "");
  const donePath = pts.reduce((d, pt, i) => (i === 0 || !p.done[PROPHETS[i - 1]!.id] ? (i === 0 ? `M ${pt[0]} ${pt[1]}` : d) : `${d} ${seg(pts[i - 1]!, pt)}`), "");
  const gold = kids ? "var(--kd-mango)" : "#d4af37";

  return (
    <div className="space-y-4" dir={rtl ? "rtl" : "ltr"} data-prophets-journey={doneCount}>
      <div className={cn(look.card, "flex items-center gap-3 p-4")}>
        <span className="text-4xl" aria-hidden="true">🗺️</span>
        <div className="min-w-0 flex-1">
          <p className={cn("font-black leading-snug", rtl ? "font-arabic text-xl" : "text-lg")}>{t("storiesJourneyTab")}</p>
          <p className={cn("text-sm", look.soft)}>{t("storiesJourneySub")}</p>
        </div>
        <span className="shrink-0 rounded-full px-3 py-1.5 text-sm font-black tabular-nums" style={{ background: kids ? "var(--kd-sun)" : "rgba(212,175,55,.2)", color: kids ? "#3b2300" : undefined }}>
          ⭐ {num(doneCount)}/{num(PROPHETS.length)}
        </span>
      </div>

      <div className="relative mx-auto max-w-md" style={{ height: H }} data-journey-map="">
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none">
          <path d={path} fill="none" stroke={gold} strokeOpacity=".35" strokeWidth="10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={path} fill="none" stroke={gold} strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {donePath.includes("C") && <path d={donePath} fill="none" stroke={gold} strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {PROPHETS.map((s, i) => {
          const left = xOf(i) < 50;
          const done = !!p.done[s.id];
          const isHere = s.id === here;
          const top = i * ROW + ROW / 2;
          return (
            <div key={s.id} className="absolute inset-x-0" style={{ top: top - 44, height: 88 }} data-station={s.id} data-station-done={done ? "" : undefined}>
              {isHere && (
                <span className="kd-bounce absolute z-10 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black text-white shadow-md"
                  style={{ left: `${xOf(i)}%`, top: -30, transform: `translateX(${xOf(i) < 50 ? "-20%" : "-85%"})`, background: kids ? "var(--kd-coral)" : "var(--accent)", color: kids ? "#fff" : "var(--accent-foreground)" }} data-continue-here="">
                  {t("storiesContinue")} 👇
                </span>
              )}
              <button type="button" onClick={() => onOpen(s.id)} aria-label={s.name[L]}
                className={cn("absolute flex h-[88px] w-[88px] -translate-x-1/2 flex-col items-center justify-center rounded-full text-3xl shadow-lg transition active:scale-95", isHere && "ring-4")}
                style={{
                  left: `${xOf(i)}%`,
                  background: s.final ? "radial-gradient(circle at 35% 30%, #fff7cc, #f7c948 55%, #c98a00)" : done ? `radial-gradient(circle at 35% 30%, #fffbe6, ${gold})` : kids ? "var(--kd-cream)" : "var(--card)",
                  border: `4px solid ${s.final || done ? "#b7860b" : gold}`,
                  boxShadow: s.final ? "0 0 0 6px rgba(247,201,72,.35), 0 0 34px rgba(247,201,72,.9)" : done ? "0 0 18px rgba(247,201,72,.65)" : undefined,
                  ["--tw-ring-color" as string]: kids ? "var(--kd-coral)" : "var(--accent)",
                }}>
                <span aria-hidden="true" className="leading-none">{s.final ? "🕋" : s.emoji.split(/(?=\p{Extended_Pictographic})/u)[0]}</span>
                <span className="mt-0.5 text-[0.7rem] font-black" style={{ color: s.final || done ? "#3b2300" : undefined }}>{num(i + 1)}</span>
                {s.final && <span aria-hidden="true" className="absolute -top-4 text-2xl">👑</span>}
                {done && !s.final && <span aria-hidden="true" className="kids-star absolute -end-1 -top-1 text-xl">⭐</span>}
              </button>
              <button type="button" onClick={() => onOpen(s.id)} data-station-card={s.id}
                className={cn(look.card, "absolute top-1/2 flex -translate-y-1/2 flex-col p-2.5 text-start active:scale-[.98]", s.final && "ring-2 ring-[#d4af37]")}
                style={left ? { left: "42%", right: "2%" } : { left: "2%", right: "42%" }}>
                <span className={cn("font-black leading-snug", rtl ? "font-arabic text-lg" : "text-[0.95rem]")}>{s.name[L]}</span>
                <span className={cn("mt-0.5 line-clamp-2 text-xs leading-snug", look.soft)}>{s.era[L]}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProphetsJourneyView;
