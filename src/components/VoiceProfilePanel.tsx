import { useEffect, useState } from "react";
import { Gauge, TrendingDown, TrendingUp, X } from "lucide-react";
import { GOLD, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { resetVoiceProfile, removeVariant, setStrictness, surahAccuracySummary, useVoiceProfile, type Strictness } from "@/lib/userAdaptation";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Settings → "My voice profile" (Stage 4): strictness, learned pace, learned words (removable) and the
 * accuracy history per surah. Everything comes from IndexedDB on this device (src/lib/userAdaptation.ts).
 */
export function VoiceProfilePanel() {
  const { t, language } = useI18n();
  const profile = useVoiceProfile();
  const [confirm, setConfirm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { if (!confirm) return; const id = setTimeout(() => setConfirm(false), 3000); return () => clearTimeout(id); }, [confirm]);
  const num = (n: number | string) => (language === "ar" ? toArabicDigits(String(n)) : String(n));
  const summary = surahAccuracySummary(profile);
  const variants = [...profile.variants].reverse();
  const shown = showAll ? variants : variants.slice(0, 8);
  const levels: [Strictness, string, string][] = [
    ["strict", t("voiceStrict"), t("voiceStrictDesc")],
    ["normal", t("voiceNormal"), t("voiceNormalDesc")],
    ["lenient", t("voiceLenient"), t("voiceLenientDesc")],
  ];
  const box = { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.27)}` };

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-emerald-100/70">{t("voiceDesc")}</p>

      <h4 className="text-xs font-medium text-emerald-100/70">{t("voiceStrictness")}</h4>
      <div role="radiogroup" aria-label={t("voiceStrictness")} className="grid grid-cols-3 gap-1.5">
        {levels.map(([id, label, desc]) => {
          const on = profile.strictness === id;
          return (
            <button key={id} type="button" role="radio" aria-checked={on} onClick={() => void setStrictness(id)}
              className={cn("rounded-xl p-2.5 text-start transition", on ? "bg-amber-400/15" : "bg-black/15 hover:bg-black/25")}
              style={{ boxShadow: `inset 0 0 0 1px ${on ? GOLD_LIGHT : alpha(GOLD, 0.27)}` }}>
              <span className={cn("block text-sm font-medium", on ? "text-amber-100" : "text-emerald-50")}>{label}</span>
              <span className="mt-0.5 block text-[0.68rem] leading-snug text-emerald-100/60">{desc}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-black/15 p-3 text-sm" style={box}>
        <Gauge className="h-5 w-5 shrink-0" style={{ color: GOLD_LIGHT }} />
        <span className="min-w-0 flex-1">
          <span className="block text-emerald-50">{t("voiceSpeed")}</span>
          <span className="block text-xs text-emerald-100/60">
            {profile.wordsPerSecond != null && profile.speedSamples >= 2
              ? <><bdi dir="ltr">{num(profile.wordsPerSecond.toFixed(1))}</bdi> {t("voiceSpeedUnit")}</>
              : t("voiceSpeedUnknown")}
          </span>
        </span>
      </div>

      <h4 className="text-xs font-medium text-emerald-100/70">{t("voiceWords")} {variants.length > 0 && `(${num(variants.length)})`}</h4>
      {variants.length === 0
        ? <p className="rounded-xl bg-black/15 p-3 text-xs text-emerald-100/60" style={box}>{t("voiceWordsNone")}</p>
        : (
          <ul className="space-y-1.5">
            {shown.map((v) => (
              <li key={`${v.expected}|${v.heard}`} className="flex items-center gap-2 rounded-xl bg-black/15 px-3 py-1.5" style={box}>
                <span dir="rtl" lang="ar" className="min-w-0 flex-1 truncate">
                  <span className="font-quran text-lg text-emerald-50">{v.word}</span>
                  <span className="mx-2 text-emerald-100/50">←</span>
                  <span className="font-arabic text-amber-200">{v.heardRaw}</span>
                </span>
                {v.surah && <span className="shrink-0 text-[0.65rem] text-emerald-100/50">{getSurahMeta(v.surah)?.nameArabic} {v.ayah ? num(v.ayah) : ""}</span>}
                <button type="button" onClick={() => void removeVariant(v.expected, v.heard)} aria-label={`${t("voiceRemove")}: ${v.word}`}
                  className="shrink-0 rounded-full p-1 text-red-200/80 hover:bg-white/10"><X className="h-3.5 w-3.5" /></button>
              </li>
            ))}
            {variants.length > shown.length && (
              <li><button type="button" onClick={() => setShowAll(true)} className="w-full rounded-xl py-1.5 text-xs text-amber-200 hover:bg-white/5">+ {num(variants.length - shown.length)}</button></li>
            )}
          </ul>
        )}

      <h4 className="text-xs font-medium text-emerald-100/70">{t("voiceAccuracy")}</h4>
      {summary.length === 0
        ? <p className="rounded-xl bg-black/15 p-3 text-xs text-emerald-100/60" style={box}>{t("voiceAccuracyNone")}</p>
        : (
          <ul className="space-y-1.5">
            {summary.map((s) => (
              <li key={s.surah} className="flex items-center gap-3 rounded-xl bg-black/15 px-3 py-2" style={box}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-arabic text-sm text-emerald-50">{getSurahMeta(s.surah)?.nameArabic}</span>
                  <span className="block text-[0.68rem] text-emerald-100/55">{num(s.attempts)} {t("voiceAttempts")} · {t("voiceBest")} {num(s.best)}%</span>
                </span>
                <Sparkline values={s.history.slice(-12)} />
                <span className="flex w-14 shrink-0 items-center justify-end gap-1 text-sm font-semibold tabular-nums" style={{ color: GOLD_LIGHT }}>
                  {s.trend > 2 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-300" /> : s.trend < -2 ? <TrendingDown className="h-3.5 w-3.5 text-red-300" /> : null}
                  {num(s.last)}%
                </span>
              </li>
            ))}
          </ul>
        )}

      <button type="button" onClick={() => { if (!confirm) { setConfirm(true); return; } setConfirm(false); void resetVoiceProfile(); }}
        className={cn("w-full rounded-xl py-2 text-xs transition", confirm ? "bg-red-900/70 text-red-100" : "text-red-200/80 hover:bg-white/5")} style={box}>
        {confirm ? t("voiceResetConfirm") : t("voiceReset")}
      </button>
    </div>
  );
}

/** Tiny accuracy trend (0–100 %), oldest → newest, drawn left to right in both languages. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 56, h = 20;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (Math.max(0, Math.min(100, v)) / 100) * h}`).join(" ");
  return (
    <svg aria-hidden="true" width={w} height={h} viewBox={`0 -1 ${w} ${h + 2}`} className="shrink-0" dir="ltr">
      <polyline points={pts} fill="none" stroke={GOLD_LIGHT} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
