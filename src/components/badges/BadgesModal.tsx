import { useMemo, useState } from "react";
import { BookOpen, ChevronLeft, Medal } from "lucide-react";
import { BadgeMedal } from "@/components/badges/BadgeMedal";
import { GoldDialog, GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { badgeCounts, recentBadges, surahBadgeProgress, useBadges, type BadgeState } from "@/lib/badges";
import { useProgress, type LocalProgress } from "@/lib/progressStorage";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { surahBadge } from "@/lib/surahBadges";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SURAHS = Array.from({ length: 114 }, (_, i) => i + 1);

/** "Badges & Achievements": all 114 surah badges, earned ones in gold or silver. */
export function BadgesModal({ open, onOpenChange, onOpenSurah, initialSurah }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the surah in the Mushaf. */
  onOpenSurah?: (surah: number) => void;
  /** Shows this surah's details first (e.g. right after earning it). */
  initialSurah?: number | null;
}) {
  const { t, language } = useI18n();
  const badges = useBadges();
  const progress = useProgress();
  const [filter, setFilter] = useState<"all" | "earned">("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [lastInitial, setLastInitial] = useState<number | null | undefined>(undefined);
  if (open && initialSurah !== lastInitial) { setLastInitial(initialSurah); setSelected(initialSurah ?? null); }
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const counts = badgeCounts(badges);
  const list = useMemo(() => (filter === "earned" ? SURAHS.filter((s) => badges.earned[String(s)]) : SURAHS), [filter, badges]);

  return (
    <GoldDialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setSelected(null); setLastInitial(undefined); } }}
      title={t("badgesTitle")} description={t("badgesSub")} closeLabel={t("close")} className="max-w-md">
      {selected ? (
        <BadgeDetail surah={selected} badges={badges} progress={progress} onBack={() => setSelected(null)}
          onOpenSurah={onOpenSurah ? () => { onOpenChange(false); setSelected(null); onOpenSurah(selected); } : undefined} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Count value={num(counts.gold)} label={t("badgeGold")} color="#f3d27a" />
            <Count value={num(counts.silver)} label={t("badgeSilver")} color="#dfe6ee" />
            <Count value={num(counts.total)} label={t("badgesOf114")} color={GOLD_LIGHT} />
          </div>
          <div className="mt-3 flex justify-center gap-2" role="tablist">
            {(["all", "earned"] as const).map((f) => (
              <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                className={cn("rounded-full px-4 py-1.5 text-xs transition", filter === f ? "font-semibold text-emerald-950" : "text-emerald-100/75 hover:bg-white/5")}
                style={filter === f ? { background: GOLD_GRADIENT } : { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` }}>
                {t(f === "all" ? "badgesAll" : "badgesEarned")}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="mt-6 text-center text-sm text-emerald-100/70">{t("badgesNoneYet")}</p>
          ) : (
            <ul className="mt-4 grid max-h-[52vh] grid-cols-4 gap-x-1.5 gap-y-3 overflow-y-auto pb-1">
              {list.map((s) => {
                const tier = badges.earned[String(s)]?.goldAt ? "gold" : badges.earned[String(s)]?.silverAt ? "silver" : null;
                const meta = getSurahMeta(s);
                return (
                  <li key={s}>
                    <button type="button" onClick={() => setSelected(s)} className="group flex w-full flex-col items-center rounded-xl p-1 transition hover:bg-white/5"
                      aria-label={`${meta?.nameArabic ?? s} — ${tier ? t(tier === "gold" ? "badgeGold" : "badgeSilver") : t("badgeLocked")}`}>
                      <BadgeMedal surah={s} tier={tier} className="h-14 w-14 transition group-hover:scale-105" />
                      <span className={cn("mt-1 w-full truncate text-center text-[0.68rem] leading-tight", tier ? "text-emerald-50" : "text-emerald-100/45")}>
                        {language === "ar" ? meta?.nameArabic : meta?.nameSimple}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </GoldDialog>
  );
}

function Count({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-2xl bg-black/20 px-2 py-2.5" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
      <p className="text-xl font-semibold" style={{ color }}>{value}</p>
      <p className="text-[0.68rem] leading-tight text-emerald-100/65">{label}</p>
    </div>
  );
}

function BadgeDetail({ surah, badges, progress, onBack, onOpenSurah }: {
  surah: number; badges: BadgeState; progress: LocalProgress; onBack: () => void; onOpenSurah?: (() => void) | undefined;
}) {
  const { t, language } = useI18n();
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const theme = surahBadge(surah);
  const meta = getSurahMeta(surah);
  const p = surahBadgeProgress(badges, surah);
  const rec = badges.earned[String(surah)];
  const at = rec?.goldAt ?? rec?.silverAt;
  const date = at ? new Date(at).toLocaleDateString(language, { day: "numeric", month: "long", year: "numeric" }) : null;
  return (
    <div className="animate-in fade-in duration-200">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs text-amber-200/90 hover:text-amber-100">
        <ChevronLeft className="h-4 w-4 ltr:rotate-0 rtl:rotate-180" />{t("back")}
      </button>
      <div className="mt-2 flex flex-col items-center text-center">
        <BadgeMedal surah={surah} tier={p.tier} shine className="h-32 w-32" />
        <p className="mt-2 font-arabic text-2xl leading-snug" style={{ color: GOLD_LIGHT }}>{theme?.titleAr}</p>
        {language === "en" && <p className="text-sm text-emerald-50">{theme?.titleEn}</p>}
        <p className="mt-0.5 text-xs text-emerald-100/65">
          {t("surah")} {language === "ar" ? meta?.nameArabic : meta?.nameSimple} · {num(surah)}
        </p>
        <p className="mt-2 rounded-full px-3 py-1 text-xs font-medium"
          style={p.tier ? { background: p.tier === "gold" ? GOLD_GRADIENT : "linear-gradient(135deg,#fff,#aab6c5)", color: "#052e23" } : { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}`, color: "rgba(209,250,229,.7)" }}>
          {p.tier ? t(p.tier === "gold" ? "badgeGold" : "badgeSilver") : t("badgeLocked")}
          {date && <span className="opacity-75"> · {t("badgeEarnedOn")} {date}</span>}
        </p>
      </div>
      <div className="mt-4 space-y-3">
        <Step label={t("badgeRead")} tier="silver" done={p.read} total={p.total} how={t("badgeHowSilver")} num={num} />
        <Step label={t("badgeRecited")} tier="gold" done={p.recited} total={p.total} how={t("badgeHowGold")} num={num} />
      </div>
      {onOpenSurah && (
        <button type="button" onClick={onOpenSurah} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>
          <BookOpen className="h-4 w-4" />{t("badgeOpenSurah")}
        </button>
      )}
    </div>
  );
}

function Step({ label, tier, done, total, how, num }: { label: string; tier: "gold" | "silver"; done: number; total: number; how: string; num: (n: number) => string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const bar = tier === "gold" ? GOLD_GRADIENT : "linear-gradient(90deg,#fff,#9aa8ba)";
  return (
    <div className="rounded-2xl bg-black/20 p-3" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.28)}` }}>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-emerald-50">
          <Medal className="h-4 w-4" style={{ color: tier === "gold" ? "#f3d27a" : "#dfe6ee" }} />{label}
        </span>
        <span className="text-xs text-emerald-100/70">{num(done)} / {num(total)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30" dir="ltr">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: bar }} />
      </div>
      <p className="mt-1.5 text-[0.72rem] leading-snug text-emerald-100/60">{how}</p>
    </div>
  );
}

/** Home screen card: badge counts and the latest badges; opens the overview. */
export function BadgesCard({ onOpen }: { onOpen: () => void }) {
  const { t, language } = useI18n();
  const badges = useBadges();
  const counts = badgeCounts(badges);
  const recent = recentBadges(badges, 4);
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-2xl bg-black/15 p-4 text-start transition hover:bg-black/25"
      style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.45)}` }}>
      {recent.length ? (
        <span className="flex shrink-0 -space-x-3 rtl:space-x-reverse">
          {recent.map((b) => <BadgeMedal key={b.surah} surah={b.surah} tier={b.tier} className="h-11 w-11 drop-shadow" />)}
        </span>
      ) : (
        <BadgeMedal surah={1} tier={null} className="h-11 w-11 shrink-0" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-emerald-50">{t("badgesTitle")}</span>
        <span className="block text-xs text-emerald-100/65">
          {counts.total
            ? `${num(counts.gold)} ${t("badgeGold")} · ${num(counts.silver)} ${t("badgeSilver")} · ${num(counts.total)} ${t("badgesOf114")}`
            : t("badgesNoneYet")}
        </span>
      </span>
      <ChevronLeft className="h-4 w-4 shrink-0 text-amber-200 ltr:rotate-180" />
    </button>
  );
}
