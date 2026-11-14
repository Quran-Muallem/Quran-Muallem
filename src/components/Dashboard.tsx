import type { ReactNode } from "react";
import { KidsModePill } from "@/components/kids/KidsModePill";
import { BookOpenText, ChevronLeft, Flame, Mic, RotateCcw, Share2, Sparkles, Target, Trophy } from "lucide-react";

import { DailyAyah } from "@/components/DailyAyah";
import { BadgesCard } from "@/components/badges/BadgesModal";
import { AppLogo, AppWordmark, GoldFrame, GOLD, GOLD_GRADIENT, GOLD_LIGHT, EMERALD_DEEP, Star, alpha } from "@/components/ornaments";
import {
  TOTAL_AYAHS, WEEKDAY_LETTERS, getDueRanges, getStats, recentSurahs, surahProgress, useProgress, type DueRange, type LastPosition, type ProgressStats, type StudyMode,
} from "@/lib/progressStorage";
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
      <header className="flex items-center gap-3">
        <AppLogo className="h-14 w-14 shrink-0" />
        <div className="min-w-0">
          <AppWordmark className="items-start" />
          <h1 className="truncate text-sm text-emerald-100/80">
            {userName ? `${t("welcomeUser")}${directionFor(language) === "rtl" ? "، " : ", "}${userName}` : t("title")}
          </h1>
        </div>
      </header>
      {/* v46: «وضع الأطفال» right under the logo, never hidden */}
      <KidsModePill className="-mt-2 w-fit" />

      <DailyAyah onOpen={(r) => onOpen({ surahId: r.surah, fromAyah: r.from, toAyah: r.to, mode: "READING" })} />

      <ContinueCard last={progress.lastPosition} num={num} name={name}
        onContinue={(p) => onOpen({ surahId: p.surahId, fromAyah: p.ayahId, toAyah: p.ayahId, mode: p.mode })}
        onStart={() => onOpen({ surahId: 1, fromAyah: 1, toAyah: 7, mode: "READING" })} />

      <ReviewCard due={due} total={stats.dueToday} num={num} name={name}
        onReview={(r) => onOpen({ surahId: r.surahId, fromAyah: r.fromAyah, toAyah: r.toAyah, mode: "MEMORIZATION_MODE" })} />

      <div className="grid grid-cols-3 gap-2.5">
        <Metric icon={<Flame className="h-4 w-4" />} value={num(stats.streak)} label={t("streakDays")} highlight={stats.activeToday} />
        <Metric icon={<Trophy className="h-4 w-4" />} value={num(stats.memorized)} label={t("versesMemorized")} />
        <Metric icon={<Target className="h-4 w-4" />} value={stats.averageAccuracy == null ? "—" : `${num(stats.averageAccuracy)}${language === "ar" ? "٪" : "%"}`} label={t("avgAccuracy")} />
      </div>

      {onBadges && <BadgesCard onOpen={onBadges} />}

      <CompletionCard memorized={stats.memorized} revision={stats.needsRevision} week={stats.week} num={num} />

      <div className="grid grid-cols-2 gap-3">
        <ModeCard icon={<Mic className="h-5 w-5" />} title={t("reciteMode")} desc={t("reciteDesc")}
          onClick={() => { const p = progress.lastPosition; onOpen({ surahId: p?.surahId ?? 1, fromAyah: p?.ayahId ?? 1, toAyah: p?.ayahId ?? 1, mode: "RECITATION_MODE" }); }} />
        <ModeCard icon={<BookOpenText className="h-5 w-5" />} title={t("hifzMode")} desc={t("hifzDesc")}
          onClick={() => { const p = progress.lastPosition; onOpen({ surahId: p?.surahId ?? 1, fromAyah: p?.ayahId ?? 1, toAyah: p?.ayahId ?? 1, mode: "MEMORIZATION_MODE" }); }} />
      </div>

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

      <RecentSurahs ids={recentSurahs(progress)} name={name} num={num} onOpen={(id) => onOpen({ surahId: id, fromAyah: 1, toAyah: 1, mode: "READING" })} />
    </div>
  );
}

type Num = (n: number) => string;
type Name = (id: number) => string;

function ContinueCard({ last, num, name, onContinue, onStart }: {
  last: LastPosition | null; num: Num; name: Name; onContinue: (p: LastPosition) => void; onStart: () => void;
}) {
  const { t } = useI18n();
  const meta = last ? getSurahMeta(last.surahId) : undefined;
  const pct = last && meta ? Math.round((last.ayahId / meta.versesCount) * 100) : 0;
  return (
    <GoldFrame className="shadow-[0_0_50px_-14px_rgba(251,191,36,.55)]">
      <button type="button" onClick={() => (last ? onContinue(last) : onStart())} className="block w-full p-5 text-start">
        <p className="flex items-center gap-2 text-xs font-medium" style={{ color: GOLD_LIGHT }}>
          <Star className="h-4 w-4" />{last ? t("continueTitle") : t("startTitle")}
        </p>
        {last && meta ? (
          <>
            <p className="mt-3 font-arabic text-3xl leading-snug text-emerald-50" dir="rtl" lang="ar">سُورَةُ {meta.nameArabic}</p>
            <p className="mt-1 text-sm text-emerald-100/75">
              {t("verse")} {num(last.ayahId)} {t("of")} {num(meta.versesCount)} · {t(last.mode === "MEMORIZATION_MODE" ? "modeMemorization" : last.mode === "RECITATION_MODE" ? "modeRecitation" : "modeReading")}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/30" dir="ltr">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GOLD_GRADIENT }} />
              </div>
              <span className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>
                {t("continueAction")}<ChevronLeft className="h-4 w-4 ltr:rotate-180" />
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 font-arabic text-2xl leading-snug text-emerald-50" dir="rtl" lang="ar">سُورَةُ الفَاتِحَة</p>
            <p className="mt-1 text-sm text-emerald-100/75">{t("startDesc")} · {name(1)}</p>
          </>
        )}
      </button>
    </GoldFrame>
  );
}

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
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-100/70"><Sparkles className="h-4 w-4 text-emerald-300" />{t("reviewNone")}</p>
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

function Metric({ icon, value, label, highlight = false }: { icon: ReactNode; value: string; label: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3 text-center" style={{ boxShadow: `inset 0 0 0 1px ${highlight ? GOLD_LIGHT : alpha(GOLD, 0.33)}` }}>
      <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full" style={{ color: GOLD_LIGHT, background: "rgba(251,191,36,.12)" }}>{icon}</span>
      <p className="mt-1.5 text-xl font-semibold text-emerald-50">{value}</p>
      <p className="text-[0.7rem] leading-tight text-emerald-100/65">{label}</p>
    </div>
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

function ModeCard({ icon, title, desc, onClick }: { icon: ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group rounded-2xl bg-black/15 p-4 text-start transition hover:bg-black/25" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.33)}` }}>
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-emerald-950" style={{ background: GOLD_GRADIENT }}>{icon}</span>
      <span className="block font-medium text-emerald-50">{title}</span>
      <span className="mt-0.5 block text-xs text-emerald-100/65">{desc}</span>
    </button>
  );
}

function RecentSurahs({ ids, name, num, onOpen }: { ids: number[]; name: Name; num: Num; onOpen: (id: number) => void }) {
  const { t } = useI18n();
  const progress = useProgress();
  if (!ids.length) return null;
  return (
    <section>
      <h2 className="mb-2.5 font-medium text-emerald-50">{t("progress")}</h2>
      <ul className="space-y-2.5">
        {ids.map((id) => {
          const meta = getSurahMeta(id);
          if (!meta) return null;
          const p = surahProgress(progress, id, meta.versesCount);
          return (
            <li key={id}>
              <button type="button" onClick={() => onOpen(id)} className="w-full rounded-2xl bg-black/15 p-3.5 text-start hover:bg-black/25" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.27)}` }}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-emerald-50">{t("surah")} {name(id)}</span>
                  <span className="text-emerald-100/60">{num(p.memorized)}/{num(meta.versesCount)}</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/30" dir="ltr">
                  <div className="h-full rounded-full" style={{ width: `${p.percent}%`, background: GOLD_GRADIENT }} />
                </div>
                <p className="mt-1 text-end text-xs text-emerald-100/55">{num(p.percent)}% {t("mastered")}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default Dashboard;
