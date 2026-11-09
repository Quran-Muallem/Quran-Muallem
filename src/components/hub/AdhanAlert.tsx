import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { useI18n, type CopyKey } from "@/lib/i18n";
import { onPrayerArrival, stopAdhan, type PrayerArrival } from "@/lib/prayerNotifications";
import type { NotifyPrayer } from "@/lib/PrayerTimesEngine";

const KEY: Record<NotifyPrayer, CopyKey> = { fajr: "prayerFajr", dhuhr: "prayerDhuhr", asr: "prayerAsr", maghrib: "prayerMaghrib", isha: "prayerIsha" };
const AR: Record<NotifyPrayer, string> = { fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" };

/**
 * «حان الآن وقت صلاة …» — shown on any screen when a prayer time arrives while the app is open (web: with
 * the Adhan / vibration; app: the notification's own sound plays, this is the visible part). Stop ends the Adhan.
 */
export function AdhanAlert() {
  const { t, language } = useI18n();
  const [arrival, setArrival] = useState<PrayerArrival | null>(null);
  useEffect(() => onPrayerArrival((a) => setArrival(a)), []);
  useEffect(() => {
    if (!arrival) return;
    const id = setTimeout(() => setArrival(null), 6 * 60 * 1000); // after the Adhan
    return () => clearTimeout(id);
  }, [arrival]);
  if (!arrival) return null;
  const close = () => { stopAdhan(); setArrival(null); };
  const name = language === "ar" ? AR[arrival.prayer] : `${t(KEY[arrival.prayer])} · ${AR[arrival.prayer]}`;
  return (
    <div role="alertdialog" aria-live="assertive" aria-label={t("adhanNowTitle").replace("{prayer}", name)} data-adhan-alert={arrival.prayer}
      className="fixed inset-x-3 top-3 z-[90] mx-auto max-w-md rounded-2xl p-4 shadow-2xl" style={{ top: "calc(env(safe-area-inset-top) + 12px)", background: "linear-gradient(160deg,#065f46,#022c22)", boxShadow: `0 16px 40px rgba(0,0,0,.55), inset 0 0 0 1px ${alpha(GOLD, 0.6)}` }}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 animate-pulse items-center justify-center rounded-full text-emerald-950" style={{ background: GOLD_GRADIENT }}><BellRing className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-arabic text-xl leading-snug" style={{ color: GOLD_LIGHT }}>حان الآن وقت صلاة {AR[arrival.prayer]}</p>
          {language !== "ar" && <p className="text-sm text-emerald-50">{t("adhanNowTitle").replace("{prayer}", t(KEY[arrival.prayer]))}</p>}
          <p className="mt-0.5 text-xs text-emerald-100/70">{arrival.at.toLocaleTimeString(language === "ar" ? "ar-EG" : language, { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <button type="button" onClick={close} aria-label={t("close")} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: GOLD_LIGHT }}><X className="h-5 w-5" /></button>
      </div>
      {arrival.mode === "adhan" && (
        <button type="button" onClick={close} data-adhan-stop="" className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>{t("adhanStop")}</button>
      )}
    </div>
  );
}

export default AdhanAlert;
