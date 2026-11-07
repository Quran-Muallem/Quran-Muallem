import { useEffect, useState } from "react";
import { BadgeMedal } from "@/components/badges/BadgeMedal";
import { GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { onBadgeEarned, type BadgeEarned } from "@/lib/badges";
import { successHaptic } from "@/lib/haptics";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { surahBadge } from "@/lib/surahBadges";
import { directionFor, useI18n } from "@/lib/i18n";

const SPARKS = Array.from({ length: 14 }, (_, i) => i);

/** Full-screen celebration when a surah badge is earned (gold first if several arrive at once). */
export function BadgeCelebration({ onShowAll }: { onShowAll: (surah: number) => void }) {
  const { t, language } = useI18n();
  const [queue, setQueue] = useState<BadgeEarned[]>([]);
  useEffect(() => onBadgeEarned((earned) => {
    setQueue((q) => [...q, ...earned].sort((a, b) => (a.tier === b.tier ? 0 : a.tier === "gold" ? -1 : 1)));
    void successHaptic();
  }), []);
  const current = queue[0];
  if (!current) return null;
  const more = queue.length - 1;
  const theme = surahBadge(current.surah);
  const meta = getSurahMeta(current.surah);
  const gold = current.tier === "gold";
  const close = () => setQueue((q) => q.slice(1));
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-live="polite"
      dir={directionFor(language)} lang={language} aria-label={t(gold ? "badgeNewGold" : "badgeNewSilver")}>
      <button type="button" aria-label={t("close")} onClick={close} className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" />
      <div key={`${current.surah}-${current.tier}`} className="relative w-full max-w-xs text-center animate-in fade-in zoom-in-90 duration-500">
        <div className="relative mx-auto h-56 w-56">
          {/* rotating rays */}
          <div className="badge-rays absolute inset-0 rounded-full"
            style={{ background: `repeating-conic-gradient(from 0deg, ${alpha(gold ? "#f3d27a" : "#e5ebf2", 0.28)} 0deg 9deg, transparent 9deg 24deg)`, maskImage: "radial-gradient(circle, #000 35%, transparent 70%)", WebkitMaskImage: "radial-gradient(circle, #000 35%, transparent 70%)" }} />
          <div className="absolute inset-6 rounded-full blur-2xl" style={{ background: alpha(gold ? "#f3d27a" : "#dfe6ee", 0.3) }} />
          {SPARKS.map((i) => (
            <span key={i} className="badge-spark absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
              style={{ background: gold ? GOLD_LIGHT : "#f1f5f9", ["--a" as string]: `${(360 / SPARKS.length) * i}deg`, animationDelay: `${(i % 5) * 0.12}s` }} />
          ))}
          <div className="badge-pop absolute inset-8"><BadgeMedal surah={current.surah} tier={current.tier} shine className="h-full w-full drop-shadow-[0_10px_30px_rgba(0,0,0,.5)]" /></div>
        </div>
        <p className="mt-2 text-sm font-semibold uppercase tracking-wide" style={{ color: gold ? GOLD_LIGHT : "#e5ebf2" }}>{t(gold ? "badgeNewGold" : "badgeNewSilver")}</p>
        <p className="mt-1 font-arabic text-3xl leading-snug text-white">{theme?.titleAr}</p>
        {language === "en" && <p className="text-sm text-emerald-50">{theme?.titleEn}</p>}
        <p className="mt-1 text-sm text-emerald-100/75">
          {t("surah")} {language === "ar" ? meta?.nameArabic : meta?.nameSimple} · {t(gold ? "badgeRecited" : "badgeRead")}
        </p>
        <p className="mt-3 font-arabic text-lg" style={{ color: GOLD_LIGHT }}>{t("badgeCongrats")}</p>
        {more > 0 && <p className="mt-1 text-xs text-emerald-100/60">+{num(more)} {t("badgeMore")}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => { const s = current.surah; setQueue([]); onShowAll(s); }}
            className="flex-1 rounded-full py-2.5 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>{t("badgeSeeAll")}</button>
          <button type="button" onClick={close} className="flex-1 rounded-full py-2.5 text-sm text-emerald-50" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.6)}` }}>
            {t("badgeContinue")}
          </button>
        </div>
      </div>
    </div>
  );
}
