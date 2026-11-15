import { ContinueSpotlight, HomeActionCards, HomeHero } from "@/components/HomeActionCards";
import { ChevronLeft, RotateCcw, Share2, Star } from "lucide-react";

import { DailyAyah } from "@/components/DailyAyah";
import { BadgesCard } from "@/components/badges/BadgesModal";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, EMERALD_DEEP, alpha } from "@/components/ornaments";
import { TOTAL_AYAHS, WEEKDAY_LETTERS, getDueRanges, getStats, useProgress, type DueRange, type ProgressStats, type StudyMode } from "@/lib/progressStorage";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { directionFor, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type StudyTarget = { surahId: number; fromAyah: number; toAyah: number; mode: StudyMode };

/**
 * Home dashboard: continue where you left off, verses due for review today, and completion metrics.
 * All numbers come from the device-local progress store.
 */
export function Dashboard({ userName, onOpen, onInvite, onBadges }: {
  userName?: string | null;
  onInvite?: () => void;
  /** Opens "Badges & Achievements". */
  onBadges?: () => void;
  /** Opens the Mushaf (READING) or a practice mode at the given verses. */
  onOpen: (target: StudyTarget) => void;
}) {
  const { t, language } = useI18n();
  const progress = useProgress();
  const stats = getStats(progress);
  const due = getDueRanges(progress);
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const name = (id: number) => { const m = getSurahMeta(id); return m ? (language === "ar" ? m.nameArabic : m.nameSimple) : String(id); };

  return (
    <div className="space-y-5">
      {/* v52 Warm Sanctuary: hero welcome, continue spotlight, bento grid; ayah of the day closes the page */}
      <HomeHero userName={userName} />
      <ContinueSpotlight onContinue={(surah, ayah) => onOpen({ surahId: surah, fromAyah: ayah, toAyah: ayah, mode: "READING" })} />
      <HomeActionCards />

      <ReviewCard due={due} total={stats.dueToday} num={num} name={name}
        onReview={(r) => onOpen({ surahId: r.surahId, fromAyah: r.fromAyah, toAyah: r.toAyah, mode: "MEMORIZATION_MODE" })} />

      {onBadges && <BadgesCard onOpen={onBadges} />}

      <CompletionCard memorized={stats.memorized} revision={stats.needsRevision} week={stats.week} num={num} />

      {onInvite && (
        <button type="button" onClick={onInvite} className="flex w-full items-center gap-3 rounded-2xl bg-black/15 p-4 text-start transition hover:bg-black/25" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.45)}` }}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-emerald-950" style={{ background: GOLD_GRADIENT }}><Share2 className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block font-medium text-emerald-50">{t("inviteTitle")}</span>
            <span className="block text-xs text-emerald-100/65">{t("inviteCardDesc")}</span>
          </span>
          <ChevronLeft className="ms-auto h-4 w-4 text-amber-200 ltr:rotate-180" />
        </button>
      )}

      {/* v52.1: the per-surah progress list is gone — the hero spotlight already shows the reading progress */}
      <DailyAyah onOpen={(r) => onOpen({ surahId: r.surah, fromAyah: r.from, toAyah: r.to, mode: "READING" })} />
    </div>
  );
}

type Num = (n: number) => string;
type Name = (id: number) => string;


function ReviewCard({ due, total, num, name, onReview }: { due: DueRange[]; total: number; num: Num; name: Name; onReview: (r: DueRange) => void }) {
  const { t } = useI18n();
  return (
    <section className="rounded-3xl p-4" style={{ background: `linear-gradient(180deg, var(--hq-emerald), ${EMERALD_DEEP})`, boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.47)}` }}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium text-emerald-50"><RotateCcw className="h-4 w-4" style={{ color: GOLD_LIGHT }} />{t("reviewTitle")}</h2>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", total ? "text-emerald-950" : "bg-black/25 text-emerald-100/70")}
          style={total ? { background: GOLD_GRADIENT } : undefined}>{num(total)}</span>
      </div>
      {due.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-100/70"><Star className="h-4 w-4 text-emerald-300" />{t("reviewNone")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {due.slice(0, 4).map((r) => (
            <li key={`${r.surahId}:${r.fromAyah}`}>
              <button type="button" onClick={() => onReview(r)}
                className="flex w-full items-center gap-3 rounded-2xl bg-black/20 px-3 py-2.5 text-start transition hover:bg-black/30">
                <span className="font-arabic text-lg text-emerald-50" dir="rtl" lang="ar">{getSurahMeta(r.surahId)?.nameArabic ?? name(r.surahId)}</span>
                <span className="text-xs text-emerald-100/70">{t("verse")} {num(r.fromAyah)}{r.toAyah > r.fromAyah ? `–${num(r.toAyah)}` : ""}</span>
                {r.overdueDays > 0 && <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[0.7rem] text-red-100">{t("overdue")}</span>}
                <ChevronLeft className="ms-auto h-4 w-4 text-amber-200 ltr:rotate-180" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


function CompletionCard({ memorized, revision, week, num }: { memorized: number; revision: number; week: ProgressStats["week"]; num: Num }) {
  const { t, language } = useI18n();
  const r = 34, c = 2 * Math.PI * r;
  const pct = memorized / TOTAL_AYAHS;
  const max = Math.max(1, ...week.map((d) => d.ayahs));
  const letters = WEEKDAY_LETTERS[language] ?? WEEKDAY_LETTERS.en;
  return (
    <section className="flex items-center gap-4 rounded-3xl bg-black/15 p-4" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.33)}` }}>
      <div className="relative h-24 w-24 shrink-0" role="img" aria-label={`${t("completion")}: ${(pct * 100).toFixed(1)}%`}>
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" stroke="rgba(0,0,0,.3)" />
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" strokeLinecap="round" stroke={GOLD_LIGHT}
            strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(pct, memorized ? 0.01 : 0))} className="transition-[stroke-dashoffset] duration-700" />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold text-emerald-50" dir="ltr">{(pct * 100).toFixed(pct < 0.1 && pct > 0 ? 2 : 1)}%</span>
          <span className="text-[0.6rem] text-emerald-100/60">{t("ofQuran")}</span>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-medium text-emerald-50">{t("completion")}</h2>
        <p className="mt-0.5 text-xs text-emerald-100/65">
          {num(memorized)} / {num(TOTAL_AYAHS)} {t("versesMemorized")} · {num(revision)} {t("needsRevision")}
        </p>
        {/* Monday first: left → right in English, right → left in Arabic */}
        <div className="mt-3 flex h-12 items-end gap-1.5" dir={directionFor(language)} aria-label={t("lastWeek")}>
          {week.map((d, i) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-md transition-all" title={`${d.date}: ${d.ayahs}`}
                style={{ height: `${Math.max(4, (d.ayahs / max) * 36)}px`, background: d.ayahs ? GOLD_GRADIENT : "rgba(0,0,0,.3)", opacity: d.future ? 0.4 : 1 }} />
              <span className={cn("text-[0.6rem] leading-none", d.today ? "font-bold text-amber-200" : "text-emerald-100/50")} lang={language}>{letters[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



export default Dashboard;
