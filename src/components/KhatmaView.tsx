import { useEffect, useMemo, useState } from "react";
import { BookOpen, BookOpenCheck, Check, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, Sparkles, Target } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import {
  KHATMA_PAGES, dailyPages, endKhatma, khatmaStats, loadKhatma, logPages, logUpTo, pageIndexFrom, planDays, startKhatma, toggleJuz, undoLast,
  updateKhatma, useKhatma, type Khatma, type KhatmaKind, type KhatmaPlan, type PageIndex,
} from "@/lib/khatmaStorage";
import { loadMushaf } from "@/lib/mushafData";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { SURAH_META, toArabicDigits } from "@/lib/quranService";
import { directionFor, useI18n, type CopyKey} from "@/lib/i18n";
import { cn } from "@/lib/utils";

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");
/** "5 December" / "٥ ديسمبر" for a yyyy-mm-dd date. */
const dayName = (date: string, language: string) => new Date(`${date}T12:00:00`).toLocaleDateString(language === "ar" ? "ar" : language, { day: "numeric", month: "long", year: date.slice(0, 4) === String(new Date().getFullYear()) ? undefined : "numeric" });
const card = { background: "linear-gradient(160deg, rgba(6,78,59,.55), rgba(2,44,34,.75))", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.35)}` };

/**
 * Khatma (ختمة القرآن): plan and track completing the Quran — a reading khatma and a memorization khatma
 * side by side. Goal (days / pages a day / juz a day), progress by pages, juz and surahs, one-tap daily
 * log, "read up to page …", undo, open the next page in the Mushaf, and a history of completed khatmas.
 * Everything is stored on the device (src/lib/khatmaStorage.ts).
 */
export function KhatmaView({ onOpenPage }: { onOpenPage?: (page: number) => void }) {
  const { t, language } = useI18n();
  const state = useKhatma();
  const [kind, setKind] = useState<KhatmaKind>("tilawa");
  const [index, setIndex] = useState<PageIndex | null>(null);
  useEffect(() => { void loadKhatma(); void loadMushaf().then((m) => setIndex(pageIndexFrom(m))).catch(() => {}); }, []);
  const num = (n: number | string) => (language === "ar" ? toArabicDigits(String(n)) : String(n));
  const k = state[kind];
  const history = state.finished.filter((f) => f.kind === kind).slice().reverse();

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-emerald-950" style={{ background: GOLD_GRADIENT }}>
          <Target className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-arabic text-3xl leading-snug" style={{ color: GOLD_LIGHT }}>{t("khatmaTitle")}</h1>
          <p className="text-sm text-emerald-100/70">{t("khatmaSub")}</p>
        </div>
      </header>

      <div role="tablist" aria-label={t("khatmaTitle")} className="grid grid-cols-2 gap-1 rounded-full bg-black/25 p-1" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` }}>
        {(["tilawa", "hifz"] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={kind === id} onClick={() => setKind(id)}
            className={cn("flex items-center justify-center gap-1.5 rounded-full py-2 text-sm transition", kind === id ? "font-semibold text-emerald-950" : "text-emerald-100/80")}
            style={kind === id ? { background: GOLD_GRADIENT } : undefined}>
            {id === "tilawa" ? <BookOpen className="h-4 w-4" /> : <BookOpenCheck className="h-4 w-4" />}
            {t(id === "tilawa" ? "khatmaTilawa" : "khatmaHifz")}
          </button>
        ))}
      </div>

      {k ? <ActiveKhatma key={k.id} k={k} index={index} num={num} onOpenPage={onOpenPage} /> : <GoalSetup kind={kind} num={num} />}

      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-medium" style={{ color: GOLD_LIGHT }}>{t("khatmaHistory")}</h2>
          <ul className="space-y-1.5">
            {history.map((f) => (
              <li key={`${f.startDate}-${f.completedAt}`} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-emerald-50" style={card}>
                <Sparkles className="h-4 w-4 shrink-0" style={{ color: GOLD_LIGHT }} />
                <span className="flex-1">{dayName(f.completedAt, language)}</span>
                <span className="text-xs text-emerald-100/65">{fill(t("khatmaInDays"), { n: num(f.days) })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ───────────── goal setup ───────────── */

function GoalSetup({ kind, num, initial, onDone }: { kind: KhatmaKind; num: (n: number | string) => string; initial?: KhatmaPlan; onDone?: (plan: KhatmaPlan) => void }) {
  const { t } = useI18n();
  const [plan, setPlan] = useState<KhatmaPlan>(initial ?? (kind === "tilawa" ? { type: "days", days: 30 } : { type: "pages", perDay: 1 }));
  const presets: KhatmaPlan[] = kind === "tilawa"
    ? [{ type: "days", days: 30 }, { type: "days", days: 60 }, { type: "days", days: 7 }, { type: "juz", perDay: 1 }]
    : [{ type: "pages", perDay: 1 }, { type: "pages", perDay: 2 }, { type: "pages", perDay: 3 }, { type: "days", days: 365 }];
  const same = (a: KhatmaPlan, b: KhatmaPlan) => JSON.stringify(a) === JSON.stringify(b);
  const label = (p: KhatmaPlan) => p.type === "days" ? fill(t("khatmaPresetDays"), { n: num(p.days) })
    : p.type === "juz" ? `${num(p.perDay)} ${t("khatmaGoalJuz")}` : `${num(p.perDay)} ${t("khatmaGoalPages")}`;
  const value = plan.type === "days" ? plan.days : plan.perDay;
  const step = plan.type === "days" ? (value >= 60 ? 10 : 1) : plan.type === "juz" ? 0.5 : 1;
  const setValue = (v: number) => {
    const clean = Math.round(v * 2) / 2;
    if (plan.type === "days") setPlan({ type: "days", days: Math.min(1000, Math.max(1, Math.round(clean))) });
    else if (plan.type === "juz") setPlan({ type: "juz", perDay: Math.min(30, Math.max(0.5, clean)) });
    else setPlan({ type: "pages", perDay: Math.min(604, Math.max(1, Math.round(clean))) });
  };
  const perDay = dailyPages(plan);

  return (
    <section className="space-y-3 rounded-3xl p-4" style={card}>
      {!initial && <h2 className="text-base font-semibold text-emerald-50">{t("khatmaNewTitle")}</h2>}
      <p className="text-xs font-medium text-emerald-100/70">{t("khatmaGoal")}</p>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button key={JSON.stringify(p)} type="button" onClick={() => setPlan(p)}
            className={cn("rounded-full px-3 py-1.5 text-xs transition", same(p, plan) ? "font-semibold text-emerald-950" : "text-emerald-100/85 hover:bg-white/5")}
            style={same(p, plan) ? { background: GOLD_GRADIENT } : { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.45)}` }}>
            {label(p)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t("khatmaGoal")}>
        {([["days", "khatmaGoalDays"], ["pages", "khatmaGoalPages"], ["juz", "khatmaGoalJuz"]] as const).map(([type, key]) => (
          <button key={type} type="button" role="radio" aria-checked={plan.type === type}
            onClick={() => setPlan(type === "days" ? { type, days: planDays(plan) } : type === "juz" ? { type, perDay: Math.max(0.5, Math.round((dailyPages(plan) / 20) * 2) / 2) } : { type, perDay: dailyPages(plan) })}
            className={cn("rounded-xl px-2 py-2 text-xs transition", plan.type === type ? "bg-amber-400/15 text-amber-100" : "bg-black/15 text-emerald-100/80")}
            style={{ boxShadow: `inset 0 0 0 1px ${plan.type === type ? GOLD_LIGHT : alpha(GOLD, 0.27)}` }}>
            {t(key)}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 py-1">
        <button type="button" onClick={() => setValue(value - step)} aria-label="−" className="flex h-10 w-10 items-center justify-center rounded-full text-amber-200" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}><Minus className="h-4 w-4" /></button>
        <span className="min-w-[4ch] text-center text-3xl font-semibold tabular-nums text-emerald-50">{num(value)}</span>
        <button type="button" onClick={() => setValue(value + step)} aria-label="+" className="flex h-10 w-10 items-center justify-center rounded-full text-amber-200" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}><Plus className="h-4 w-4" /></button>
      </div>
      <p className="text-center text-xs text-emerald-100/70">
        {fill(t("khatmaPerDay"), { n: num(perDay) })} · {fill(t("khatmaFinishIn"), { n: num(planDays(plan)) })}
      </p>
      <button type="button" onClick={() => { void tapHaptic(); if (onDone) onDone(plan); else void startKhatma(kind, plan); }}
        className="w-full rounded-full py-3 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>
        {initial ? t("khatmaSave") : t("khatmaStart")}
      </button>
    </section>
  );
}

/* ───────────── active khatma ───────────── */

function ActiveKhatma({ k, index, num, onOpenPage }: { k: Khatma; index: PageIndex | null; num: (n: number | string) => string; onOpenPage?: ((page: number) => void) | undefined }) {
  const { t, language } = useI18n();
  const s = useMemo(() => khatmaStats(k, index), [k, index]);
  const [upTo, setUpTo] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [editing, setEditing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => { if (!confirmEnd) return; const id = setTimeout(() => setConfirmEnd(false), 3000); return () => clearTimeout(id); }, [confirmEnd]);

  const apply = (change: (k: Khatma) => Khatma) => {
    void tapHaptic();
    void updateKhatma(k.kind, change).then(({ completed }) => { if (completed) { setCelebrate(true); void successHaptic(); } });
  };
  const target = s.target;
  const r = 52, c = 2 * Math.PI * r;
  const status: { key: CopyKey; n: number; tone: string } = s.ahead > 0 ? { key: "khatmaAhead", n: s.ahead, tone: "text-emerald-300" }
    : s.ahead < 0 ? { key: "khatmaBehind", n: -s.ahead, tone: "text-amber-200" } : { key: "khatmaOnTrack", n: 0, tone: "text-emerald-300" };

  if (editing) return <GoalSetup kind={k.kind} num={num} initial={k.plan} onDone={(plan) => { setEditing(false); void updateKhatma(k.kind, (x) => ({ ...x, plan })); }} />;

  return (
    <div className="space-y-4">
      {(celebrate || k.completedAt) && (
        <section className="rounded-3xl p-4 text-center animate-in zoom-in-95" style={{ background: "linear-gradient(135deg, rgba(120,53,15,.45), rgba(6,78,59,.55))", boxShadow: `inset 0 0 0 1px ${GOLD_LIGHT}` }}>
          <Sparkles className="mx-auto h-8 w-8" style={{ color: GOLD_LIGHT }} />
          <p className="mt-2 font-arabic text-xl" style={{ color: GOLD_LIGHT }}>{t("khatmaDoneTitle")}</p>
          <p className="mt-1 text-sm text-emerald-50/85">{t("khatmaDoneSub")}</p>
          <button type="button" onClick={() => void endKhatma(k.kind)} className="mt-3 rounded-full px-5 py-2 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>{t("khatmaNewTitle")}</button>
        </section>
      )}

      <section className="flex items-center gap-4 rounded-3xl p-4" style={card}>
        <div className="relative h-32 w-32 shrink-0" role="img" aria-label={`${s.percent}%`}>
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" stroke="rgba(0,0,0,.3)" />
            <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" strokeLinecap="round" stroke={GOLD_LIGHT}
              strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(s.pagesDone ? 0.01 : 0, s.pagesDone / KHATMA_PAGES))} className="transition-[stroke-dashoffset] duration-700" />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold text-emerald-50" dir="ltr">{num(s.percent)}%</span>
            <span className="text-[0.65rem] text-emerald-100/65">{fill(t("khatmaDay"), { d: num(Math.min(s.dayNumber, s.totalDays)), n: num(s.totalDays) })}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Stat label={t("khatmaPages")} value={`${num(s.pagesDone)}/${num(KHATMA_PAGES)}`} share={s.pagesDone / KHATMA_PAGES} />
          <Stat label={t("khatmaJuz")} value={`${num(s.juzDone)}/${num(30)}`} share={s.juzDone / 30} />
          <Stat label={t("khatmaSurahs")} value={`${num(s.surahsDone)}/${num(114)}`} share={s.surahsDone / 114} />
        </div>
      </section>

      {/* today + quick log */}
      <section className="space-y-3 rounded-3xl p-4" style={card}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium" style={{ color: GOLD_LIGHT }}>{t("khatmaToday")}</h2>
          <span className="text-sm tabular-nums text-emerald-50"><bdi dir="ltr">{num(s.today)} / {num(target)}</bdi></span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-black/30" dir="ltr">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (s.today / target) * 100)}%`, background: GOLD_GRADIENT }} />
        </div>
        <p className={cn("text-xs", status.tone)}>
          {fill(t(status.key), { n: num(status.n) })}
          {s.projected && !k.completedAt && <span className="text-emerald-100/60"> · {fill(t("khatmaProjected"), { d: dayName(s.projected, language) })}</span>}
        </p>
        <button type="button" disabled={!!k.completedAt} onClick={() => apply((x) => logPages(x, target))}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-emerald-950 transition active:scale-[.99] disabled:opacity-40" style={{ background: GOLD_GRADIENT }}>
          <Check className="h-4 w-4" />{fill(t("khatmaLogTarget"), { n: num(target) })}
        </button>
        <div className="flex gap-2">
          <button type="button" disabled={!!k.completedAt} onClick={() => apply((x) => logPages(x, 1))}
            className="rounded-full px-4 py-2 text-xs text-amber-100 disabled:opacity-40" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}>{t("khatmaLogOne")}</button>
          <form className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-black/20 py-1 pe-1 ps-3" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.35)}` }}
            onSubmit={(e) => { e.preventDefault(); const p = Number(upTo.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))); if (p >= 1 && p <= KHATMA_PAGES) { apply((x) => logUpTo(x, p)); setUpTo(""); } }}>
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t("khatmaUpTo")}</span>
              <input inputMode="numeric" value={upTo} onChange={(e) => setUpTo(e.target.value)} placeholder={t("khatmaUpTo")}
                className="w-full bg-transparent text-xs text-emerald-50 placeholder:text-emerald-100/45 focus:outline-none" />
            </label>
            <button type="submit" className="rounded-full px-3 py-1 text-xs text-emerald-950" style={{ background: GOLD_LIGHT }}>{t("khatmaSave")}</button>
          </form>
          {k.lastAdded.length > 0 && (
            <button type="button" onClick={() => apply((x) => undoLast(x))} aria-label={t("khatmaUndo")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-amber-200" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}><RotateCcw className="h-4 w-4" /></button>
          )}
        </div>
        {s.nextPage && onOpenPage && (
          <button type="button" onClick={() => onOpenPage(s.nextPage!)} className="flex w-full items-center justify-center gap-1.5 text-xs text-amber-200 hover:underline">
            {fill(t("khatmaNext"), { n: num(s.nextPage) })}
            {directionFor(language) === "rtl" ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
      </section>

      {/* juz grid */}
      <section className="space-y-2 rounded-3xl p-4" style={card}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium" style={{ color: GOLD_LIGHT }}>{t("khatmaJuz")}</h2>
          <span className="text-[0.68rem] text-emerald-100/55">{t("khatmaJuzHint")}</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {s.juz.map((share, i) => (
            <button key={i} type="button" onClick={() => apply((x) => toggleJuz(x, i + 1, index))} aria-label={`${t("juz")} ${num(i + 1)}: ${Math.round(share * 100)}%`}
              className="relative h-10 overflow-hidden rounded-lg text-xs font-medium" style={{ background: "rgba(0,0,0,.28)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, share >= 1 ? 0.9 : 0.3)}` }}>
              <span className="absolute inset-x-0 bottom-0 transition-all duration-500" style={{ height: `${share * 100}%`, background: share >= 1 ? GOLD_GRADIENT : alpha(GOLD_LIGHT, 0.35) }} />
              <span className={cn("relative", share >= 1 ? "text-emerald-950" : "text-emerald-50")}>{num(i + 1)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* surahs */}
      <section className="space-y-2 rounded-3xl p-4" style={card}>
        <h2 className="text-sm font-medium" style={{ color: GOLD_LIGHT }}>{t("khatmaSurahs")} · <bdi dir="ltr">{num(s.surahsDone)}/{num(114)}</bdi></h2>
        <div className="flex flex-wrap gap-1" dir="rtl" aria-hidden="true">
          {s.surahs.map((done, i) => (
            <span key={i} title={SURAH_META[i]?.nameArabic} className="h-2.5 w-2.5 rounded-full" style={{ background: done ? GOLD_LIGHT : "rgba(0,0,0,.3)", boxShadow: done ? undefined : `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }} />
          ))}
        </div>
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={() => setEditing(true)} className="flex-1 rounded-xl py-2 text-xs text-amber-100" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` }}>{t("khatmaChangePlan")}</button>
        <button type="button" onClick={() => { if (!confirmEnd) { setConfirmEnd(true); return; } void endKhatma(k.kind); }}
          className={cn("flex-1 rounded-xl py-2 text-xs", confirmEnd ? "bg-red-900/70 text-red-100" : "text-red-200/80")} style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` }}>
          {confirmEnd ? t("khatmaEndConfirm") : t("khatmaEnd")}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, share }: { label: string; value: string; share: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs"><span className="text-emerald-100/70">{label}</span><bdi dir="ltr" className="tabular-nums text-emerald-50">{value}</bdi></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/30" dir="ltr">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, share * 100)}%`, background: GOLD_GRADIENT }} />
      </div>
    </div>
  );
}

export default KhatmaView;
