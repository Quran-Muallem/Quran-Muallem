import { useEffect, useRef, useState } from "react";
import { Check, HandHeart, Moon, RotateCcw, Sunrise, Sunset } from "lucide-react";
import { GoldFrame, GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import {
  ADHKAR_CATEGORIES, adhkarCategory, categoryProgress, countDhikr, resetAdhkar, suggestedCategory, useAdhkarDay,
  type AdhkarCategoryId, type Dhikr, type QuranRef,
} from "@/lib/adhkar";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { loadMushaf, type Mushaf } from "@/lib/mushafData";
import { toArabicDigits } from "@/lib/quranService";
import { useI18n, type CopyKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TABS: Record<AdhkarCategoryId, { label: CopyKey; title: CopyKey; icon: typeof Sunrise }> = {
  morning: { label: "adhkarMorning", title: "adhkarMorningTitle", icon: Sunrise },
  evening: { label: "adhkarEvening", title: "adhkarEveningTitle", icon: Sunset },
  prayer: { label: "adhkarPrayer", title: "adhkarPrayerTitle", icon: HandHeart },
  sleep: { label: "adhkarSleep", title: "adhkarSleepTitle", icon: Moon },
};

/** Daily adhkar: morning, evening, after prayer and before sleep, each with a tap counter. */
export function AdhkarTab() {
  const { t, language } = useI18n();
  const [active, setActive] = useState<AdhkarCategoryId>(() => suggestedCategory());
  const day = useAdhkarDay();
  const mushaf = useMushafData();
  const category = adhkarCategory(active);
  const progress = categoryProgress(day, category);
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const cards = useRef<Record<string, HTMLDivElement | null>>({});

  const onCount = (d: Dhikr, index: number) => {
    const before = day.counts[d.id] ?? 0;
    if (before >= d.count) return;
    const after = countDhikr(d);
    if (after >= d.count) {
      void successHaptic();
      // Move on to the next dhikr that is not done yet.
      const next = category.items.slice(index + 1).find((x) => (day.counts[x.id] ?? 0) < x.count);
      if (next) setTimeout(() => cards.current[next.id]?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
    } else void tapHaptic();
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-arabic text-3xl leading-snug" style={{ color: GOLD_LIGHT }}>{t("adhkarTitle")}</h1>
        <p className="text-sm text-emerald-100/70">{t("adhkarSub")}</p>
      </header>

      <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-black/20 p-1.5" role="tablist" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
        {ADHKAR_CATEGORIES.map((id) => {
          const { label, icon: Icon } = TABS[id];
          const on = id === active;
          const p = categoryProgress(day, adhkarCategory(id));
          return (
            <button key={id} type="button" role="tab" aria-selected={on} onClick={() => { setActive(id); window.scrollTo({ top: 0 }); }}
              className={cn("relative flex flex-col items-center gap-1 rounded-xl py-2 text-[0.72rem] transition", on ? "font-semibold text-emerald-950" : "text-emerald-100/75 hover:bg-white/5")}
              style={on ? { background: GOLD_GRADIENT } : undefined}>
              <Icon className="h-5 w-5" />
              {t(label)}
              {p.done === p.total && p.total > 0 && <Check className={cn("absolute end-1 top-1 h-3.5 w-3.5", on ? "text-emerald-900" : "text-amber-300")} aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl bg-black/15 p-3.5" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.33)}` }}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium text-emerald-50">{t(TABS[active].title)}</h2>
          <button type="button" onClick={() => resetAdhkar(category)} disabled={!category.items.some((d) => day.counts[d.id])}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-amber-200/90 transition hover:bg-white/5 disabled:opacity-40">
            <RotateCcw className="h-3.5 w-3.5" />{t("adhkarReset")}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/30" dir="ltr" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: GOLD_GRADIENT }} />
          </div>
          <span className="shrink-0 text-xs text-emerald-100/75">{num(progress.done)} / {num(progress.total)} {t("adhkarCompleted")}</span>
        </div>
      </section>

      {progress.done === progress.total && progress.total > 0 && (
        <GoldFrame className="animate-in fade-in zoom-in-95 duration-300">
          <p className="flex items-center justify-center gap-2 p-4 text-center font-arabic text-lg" style={{ color: GOLD_LIGHT }}>
            <Check className="h-5 w-5 shrink-0" />{t("adhkarAllDone")}
          </p>
        </GoldFrame>
      )}

      <ol className="space-y-3">
        {category.items.map((d, i) => (
          <li key={d.id}>
            <DhikrCard dhikr={d} count={day.counts[d.id] ?? 0} mushaf={mushaf} onCount={() => onCount(d, i)}
              cardRef={(el) => { cards.current[d.id] = el; }} />
          </li>
        ))}
      </ol>

      <p className="px-1 text-center text-[0.7rem] leading-relaxed text-emerald-100/50">{t("adhkarNote")}</p>
    </div>
  );
}

function DhikrCard({ dhikr, count, mushaf, onCount, cardRef }: {
  dhikr: Dhikr; count: number; mushaf: Mushaf | null; onCount: () => void; cardRef: (el: HTMLDivElement | null) => void;
}) {
  const { t, language } = useI18n();
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const done = count >= dhikr.count;
  const left = dhikr.count - count;
  const [bump, setBump] = useState(0);
  const r = 22, c = 2 * Math.PI * r;
  const source = language === "ar" ? dhikr.sourceAr : dhikr.sourceEn;
  const benefit = language === "ar" ? dhikr.benefitAr : dhikr.benefitEn;

  return (
    <div ref={cardRef} className={cn("rounded-3xl transition-all duration-300", done && "opacity-70")}
      style={{ background: done ? "rgba(0,0,0,.12)" : "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 1px ${done ? alpha(GOLD_LIGHT, 0.65) : alpha(GOLD, 0.3)}` }}>
      <button type="button" onClick={() => { if (!done) { setBump((b) => b + 1); onCount(); } }} disabled={done}
        aria-label={`${t("adhkarTap")} — ${num(left)} ${t("adhkarLeft")}`}
        className="block w-full p-4 text-start focus-visible:outline-2 focus-visible:outline-amber-300 disabled:cursor-default">
        {dhikr.preface && <p dir="rtl" lang="ar" className="mb-1 text-center font-arabic text-base text-emerald-100/75">{dhikr.preface}</p>}
        {dhikr.quran && <QuranText refs={dhikr.quran} mushaf={mushaf} clamp={done} />}
        {dhikr.text && (
          <p dir="rtl" lang="ar" className={cn("font-arabic text-[1.3rem] leading-[2.1] text-emerald-50", done && "line-clamp-2")}>{dhikr.text}</p>
        )}
        {benefit && !done && <p className="mt-2 text-[0.78rem] leading-relaxed text-emerald-100/70">{benefit}</p>}
        <div className="mt-3 flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[0.7rem] text-amber-200/80">
              {dhikr.count === 1 ? t("adhkarOnce") : `${num(dhikr.count)} ${t("adhkarTimes")}`}
            </span>
            <span className="block truncate text-[0.7rem] text-emerald-100/55">{source}</span>
          </span>
          <span key={bump} className={cn("relative flex h-14 w-14 shrink-0 items-center justify-center", bump > 0 && "dhikr-bump")} aria-hidden="true">
            <svg viewBox="0 0 50 50" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="25" cy="25" r={r} fill={done ? GOLD_LIGHT : "rgba(0,0,0,.3)"} fillOpacity={done ? 0.18 : 1} stroke="rgba(0,0,0,.35)" strokeWidth="4" />
              <circle cx="25" cy="25" r={r} fill="none" stroke={GOLD_LIGHT} strokeWidth="4" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - count / dhikr.count)} className="transition-[stroke-dashoffset] duration-300" />
            </svg>
            {done
              ? <Check className="relative h-6 w-6" style={{ color: GOLD_LIGHT }} />
              : <span className="relative text-base font-semibold text-emerald-50">{num(left)}</span>}
          </span>
        </div>
      </button>
    </div>
  );
}

function QuranText({ refs, mushaf, clamp }: { refs: QuranRef[]; mushaf: Mushaf | null; clamp: boolean }) {
  if (!mushaf) return <div className="h-20 animate-pulse rounded-xl bg-black/20" />;
  const basmala = mushaf.words(1, 1).join(" ");
  return (
    <div dir="rtl" lang="ar" className={cn("space-y-1.5 text-center font-quran text-[1.35rem] leading-[2.25] text-emerald-50", clamp && "line-clamp-2")}>
      {refs.map((r) => (
        <p key={`${r.surah}:${r.from}`}>
          {r.basmala && <span className="block text-[0.9em] text-emerald-100/80">{basmala}</span>}
          {Array.from({ length: r.to - r.from + 1 }, (_, i) => r.from + i).map((a) => (
            <span key={a}>{mushaf.words(r.surah, a).join(" ")} <span className="whitespace-nowrap text-[0.85em]" style={{ color: GOLD_LIGHT }}>﴿{toArabicDigits(a)}﴾</span> </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function useMushafData(): Mushaf | null {
  const [m, setM] = useState<Mushaf | null>(null);
  useEffect(() => { let alive = true; loadMushaf().then((d) => alive && setM(d)).catch(() => {}); return () => { alive = false; }; }, []);
  return m;
}
