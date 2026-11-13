import type { ReactNode } from "react";
import { BookOpenCheck, ChevronLeft, ChevronRight, Clock, Compass, Headphones, Library, Mic, SunMoon } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { PrayerTimesView } from "@/components/hub/PrayerTimesView";
import { HadithLibrary } from "@/components/hub/HadithLibrary";
import { QiblaCompass } from "@/components/QiblaCompass";
import { TajweedGuide } from "@/components/TajweedGuide";
import { RecordingSessionsView } from "@/components/hub/RecordingSessionsView";
import { RecitersHubView } from "@/components/hub/RecitersHubView";
import { DuasView } from "@/components/hub/DuasView";
import { SalatModeView } from "@/components/SalatModeView";
import { formatCountdown, useNextPrayer } from "@/lib/useNextPrayer";
import type { PrayerName } from "@/lib/PrayerTimesEngine";
import type { StudyTarget } from "@/components/Dashboard";
import { isRtl } from "@/i18n";
import { useI18n, type CopyKey } from "@/lib/i18n";

export type HubSection = "prayer" | "salat" | "qibla" | "reciters" | "adhkar" | "recordings" | "tajweed" | "hadith";

const SECTIONS: { id: HubSection; icon: typeof Clock; emoji: string; title: CopyKey; sub: CopyKey; ar: string }[] = [
  { id: "prayer", icon: Clock, emoji: "🕋", title: "hubPrayer", sub: "hubPrayerSub", ar: "مواقيت الصلاة" },
  { id: "salat", icon: Mic, emoji: "🕌", title: "hubSalat", sub: "hubSalatSub", ar: "وضع الصلاة" },
  { id: "qibla", icon: Compass, emoji: "🧭", title: "navQibla", sub: "hubQiblaSub", ar: "القبلة" },
  { id: "adhkar", icon: SunMoon, emoji: "📿", title: "hubAdhkar", sub: "hubAdhkarSub", ar: "الأذكار والأدعية" },
  { id: "reciters", icon: Headphones, emoji: "🎧", title: "hubReciters", sub: "hubRecitersSub", ar: "المقرئين" },
  { id: "recordings", icon: Mic, emoji: "🎙️", title: "hubRecordings", sub: "hubRecordingsSub", ar: "جلسات التسجيل" },
  { id: "tajweed", icon: BookOpenCheck, emoji: "📜", title: "hubTajweed", sub: "hubTajweedSub", ar: "أحكام التجويد" },
  { id: "hadith", icon: Library, emoji: "📚", title: "hubHadith", sub: "hubHadithSub", ar: "كُتُب الحَديث" },
];

/**
 * "More" hub (المزيد): prayer times, Qibla, adhkar & duas, recording sessions, the Tajweed guide and the
 * Hadith library — replaces the separate Qibla / Adhkar / Tajweed tabs.
 */
export function IslamicHubView({ section, onSection, onRetest }: { section: HubSection | null; onSection: (s: HubSection | null) => void; onRetest: (t: StudyTarget) => void }) {
  const { t, language } = useI18n();
  const Back = isRtl(language) ? ChevronRight : ChevronLeft;
  const current = SECTIONS.find((s) => s.id === section);
  let body: ReactNode = null;
  if (section === "prayer") body = <PrayerTimesView />;
  else if (section === "qibla") body = <QiblaCompass />;
  else if (section === "adhkar") body = <DuasView />;
  else if (section === "reciters") body = <RecitersHubView />;
  else if (section === "recordings") body = <RecordingSessionsView onRetest={onRetest} />;
  else if (section === "tajweed") body = <TajweedGuide />;
  else if (section === "hadith") body = <HadithLibrary />;

  // Salat Mode is its own full-screen (pitch-black) view.
  if (section === "salat") return <SalatModeView onClose={() => onSection(null)} />;
  if (current) {
    return (
      <div className="space-y-3" data-hub-section={current.id}>
        <button type="button" onClick={() => { onSection(null); window.scrollTo({ top: 0 }); }} className="flex items-center gap-1 text-sm text-amber-200">
          <Back className="h-4 w-4" />{t("hubTitle")}
        </button>
        {(current.id === "prayer" || current.id === "hadith" || current.id === "recordings" || current.id === "reciters") && (
          <header>
            <h1 className="font-arabic text-3xl leading-snug" style={{ color: GOLD_LIGHT }}>{current.ar}</h1>
            {language !== "ar" && <p className="text-sm text-emerald-100/70">{t(current.title)}</p>}
          </header>
        )}
        {body}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-hub="">
      <header>
        <h1 className="font-arabic text-3xl leading-snug" style={{ color: GOLD_LIGHT }}>المزيد</h1>
        <p className="text-sm text-emerald-100/70">{t("hubSub")}</p>
      </header>
      <ul className="grid grid-cols-2 gap-3">
        {SECTIONS.map((s, i) => (
          <li key={s.id} className={i <= 1 ? "col-span-2" : undefined}>
            <button type="button" onClick={() => { onSection(s.id); window.scrollTo({ top: 0 }); }}
              className="flex h-full w-full flex-col items-start gap-2 rounded-2xl p-3.5 text-start transition active:scale-[.99]"
              style={{ background: i === 0 ? `linear-gradient(135deg, ${alpha(GOLD, 0.22)}, rgba(0,0,0,.18))` : "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, i === 0 ? 0.6 : 0.33)}` }}>
              <span className="flex w-full items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: i === 0 ? GOLD_GRADIENT : alpha(GOLD, 0.12) }} aria-hidden="true">{s.emoji}</span>
                {language !== "ar" && <span className="ms-auto font-arabic text-sm" style={{ color: alpha(GOLD_LIGHT, 0.9) }}>{s.ar}</span>}
              </span>
              <span className="text-base font-semibold text-emerald-50">{t(s.title)}</span>
              <span className="text-xs leading-relaxed text-emerald-100/65">{t(s.sub)}</span>
              {s.id === "prayer" && <NextPrayerStrip />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PRAYER_KEY: Record<PrayerName, CopyKey> = { fajr: "prayerFajr", sunrise: "prayerSunrise", dhuhr: "prayerDhuhr", asr: "prayerAsr", maghrib: "prayerMaghrib", isha: "prayerIsha" };
const PRAYER_AR: Record<PrayerName, string> = { fajr: "الفجر", sunrise: "الشروق", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" };

/** Prayer card: next prayer, its time and a live countdown (moves on to the following prayer by itself). */
function NextPrayerStrip() {
  const { t, language } = useI18n();
  const n = useNextPrayer(language);
  if (n.status === "no-location") return <span className="mt-1 text-xs text-amber-300/90" data-next-prayer="none">{t("prayerSetLocation")}</span>;
  if (n.status !== "ready") return <span className="mt-2 h-[58px] w-full animate-pulse rounded-lg bg-emerald-950/40" aria-hidden="true" />;
  const time = n.at.toLocaleTimeString(language === "ar" ? "ar-EG" : language, { hour: "2-digit", minute: "2-digit" });

  return (
    <span className="mt-2 flex w-full items-center justify-between rounded-lg border border-amber-500/30 bg-emerald-950/60 p-2.5" data-next-prayer={n.name}>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-amber-400">{t("prayerNext")}</span>
        <span className="flex items-baseline gap-1.5 truncate text-lg font-bold text-white" data-next-prayer-time="">
          {language !== "ar" && <><bdi>{t(PRAYER_KEY[n.name])}</bdi><span>/</span></>}<bdi className="font-arabic">{PRAYER_AR[n.name]}</bdi><span className="text-amber-400">•</span><bdi>{time}</bdi>
        </span>
      </span>
      <span className="shrink-0 text-end">
        <span className="block text-xs text-gray-300">{t("prayerCountdown")}</span>
        <span className="block text-sm font-semibold tabular-nums text-amber-400" dir="ltr" data-next-prayer-countdown="">{formatCountdown(n.remainingMs)}</span>
      </span>
    </span>
  );
}

export default IslamicHubView;
