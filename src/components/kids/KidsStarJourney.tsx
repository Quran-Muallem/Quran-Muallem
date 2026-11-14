/**
 * v45 «رحلة الحفظ» (Kids Mode): a Surah tree from al-Fātiḥah through Juz ʿAmma (an-Nās → an-Nabaʾ, the order
 * children learn them) and Juz Tabārak. Every surah earns up to three stars from the real progress on this
 * device: ⭐ practised · ⭐⭐ read completely (silver badge) · ⭐⭐⭐ memorised (gold badge or every verse
 * memorised). New stars since the last visit pop in with a praise («أحسنت يا بطل!»).
 * `KidsPraiseToast` (mounted once in the app) cheers whenever a surah badge is earned in Kids Mode.
 */
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useBadges, onBadgeEarned } from "@/lib/badges";
import { useProgress } from "@/lib/progressStorage";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { successHaptic } from "@/lib/haptics";
import { PRAISE, praiseIn, useKidsMode } from "@/components/kids/KidsModeContext";
import { cn } from "@/lib/utils";

/** al-Fātiḥah, then Juz ʿAmma from an-Nās up, then Juz Tabārak from al-Mursalāt up. */
export const JOURNEY: number[] = [1, ...Array.from({ length: 37 }, (_, i) => 114 - i), ...Array.from({ length: 11 }, (_, i) => 77 - i)];
const SEEN_KEY = "qm.kids.stars.v1";

export function useSurahStars(): Record<number, number> {
  const progress = useProgress();
  const badges = useBadges();
  return useMemo(() => {
    const out: Record<number, number> = {};
    for (const s of JOURNEY) {
      const n = getSurahMeta(s)?.versesCount ?? 0;
      let practised = 0, memorised = 0;
      for (let a = 1; a <= n; a++) {
        const v = progress.verses[`${s}:${a}`];
        if (v) { practised++; if (v.status === "MEMORIZED") memorised++; }
      }
      const b = badges.earned[String(s)];
      out[s] = b?.goldAt || (n > 0 && memorised === n) ? 3 : b?.silverAt ? 2 : practised > 0 ? 1 : 0;
    }
    return out;
  }, [progress, badges]);
}

export function KidsStarJourney({ onOpenSurah }: { onOpenSurah?: (surah: number) => void }) {
  const { t, language } = useI18n();
  const stars = useSurahStars();
  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const [praise] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)]!);
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));

  // Stars earned since the last visit: animate them once and cheer.
  useEffect(() => {
    let seen: Record<string, number> = {};
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, number>; } catch { /* ignore */ }
    const news = new Set(JOURNEY.filter((s) => (stars[s] ?? 0) > (seen[String(s)] ?? 0)));
    if (news.size) { setFresh(news); void successHaptic(); }
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(stars)); } catch { /* ignore */ }
  }, [stars]);

  return (
    <div className="space-y-4" data-kids-journey={total}>
      <div className="qm-native-colors rounded-[20px] bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 p-5 text-center text-amber-950 shadow-lg">
        <p className="text-4xl" aria-hidden="true">🌟</p>
        <p className="mt-1 text-3xl font-black tabular-nums" data-kids-total="">{num(total)} ⭐</p>
        <p className={cn("mt-1 font-bold", language === "ar" ? "font-arabic text-xl" : "text-lg")} data-kids-praise="">
          {total > 0 ? praiseIn(praise, language) : t("kidsJourneyStart")}
        </p>
      </div>
      <p className="px-1 text-xs leading-relaxed text-emerald-100/70">{t("kidsJourneyHow")}</p>

      {/* the tree: a winding path of surahs */}
      <ol className="relative mx-auto max-w-sm space-y-3 py-2" data-kids-tree="">
        <span aria-hidden="true" className="absolute inset-y-0 start-1/2 w-1.5 -translate-x-1/2 rounded-full bg-emerald-700/40" />
        {JOURNEY.map((s, i) => {
          const st = stars[s] ?? 0;
          const meta = getSurahMeta(s);
          const side = i % 2 === 0 ? "me-auto" : "ms-auto";
          return (
            <li key={s} className={cn("relative flex w-[78%]", side)} data-kids-surah={s} data-kids-stars={st}>
              <button type="button" onClick={() => onOpenSurah?.(s)}
                className={cn("qm-native-colors flex w-full items-center gap-3 rounded-[20px] p-3 text-start shadow-md active:scale-[.98]",
                  st === 3 ? "bg-gradient-to-br from-amber-200 to-amber-300 text-amber-950" : st > 0 ? "bg-emerald-100 text-emerald-950" : "bg-white/80 text-emerald-950")}>
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-black", st === 3 ? "bg-amber-500 text-white" : "bg-emerald-600 text-white")}>{num(s)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-arabic text-lg leading-snug">{meta?.nameArabic}</span>
                  <span className="mt-0.5 flex gap-0.5 text-lg" aria-label={`${st}/3`}>
                    {[0, 1, 2].map((k) => (
                      <span key={k} className={cn(k < st ? "" : "opacity-20 grayscale", k < st && fresh.has(s) && "kids-star")} style={k < st && fresh.has(s) ? { animationDelay: `${k * 180}ms` } : undefined}>⭐</span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Kids Mode: a big friendly cheer whenever a surah badge is earned. */
export function KidsPraiseToast() {
  const { on } = useKidsMode();
  const { language } = useI18n();
  const [show, setShow] = useState<{ surah: number; text: string } | null>(null);
  useEffect(() => onBadgeEarned((earned) => {
    const e = earned[0];
    if (!on || !e) return;
    setShow({ surah: e.surah, text: praiseIn(PRAISE[Math.floor(Math.random() * PRAISE.length)]!, language) });
    void successHaptic();
    setTimeout(() => setShow(null), 4500);
  }), [on, language]);
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[80] flex justify-center px-4" data-kids-toast={show.surah}>
      <div className="qm-native-colors flex items-center gap-3 rounded-[20px] bg-gradient-to-br from-amber-200 to-amber-400 px-5 py-4 text-amber-950 shadow-2xl animate-in zoom-in-50 fade-in duration-500">
        <span className="kids-star text-4xl" aria-hidden="true">⭐</span>
        <span>
          <span className={cn("block font-black", language === "ar" ? "font-arabic text-2xl" : "text-xl")}>{show.text}</span>
          <span className="block font-arabic text-base">سورة {getSurahMeta(show.surah)?.nameArabic}</span>
        </span>
      </div>
    </div>
  );
}

export default KidsStarJourney;
