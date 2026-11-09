import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { BellOff, Cpu, Globe, Loader2, LocateFixed, MapPin, Settings2, Vibrate, Volume2 } from "lucide-react";
import { PrayerSettingsModal } from "@/components/hub/PrayerSettingsModal";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import {
  METHODS, NOTIFY_PRAYERS, PRAYERS, loadPrayerSettings, minutesUntil, modeOf, nextMode, nextPrayer, setPrayerMode,
  prayerSettings, timesFor, updatePrayerSettings, type DayTimes, type NotifyMode, type NotifyPrayer, type PrayerName, type PrayerSettings, type TimesResult,
} from "@/lib/PrayerTimesEngine";
import { VIBRATE_PATTERN, exactAlarmStatus, notificationPermission, openExactAlarmSetting, type ExactAlarmStatus, type NotifyPermission } from "@/lib/prayerNotifications";
import { replanAdhan } from "@/lib/AdhanNotificationService";
import { getPosition } from "@/lib/location";
import { toArabicDigits } from "@/lib/quranService";
import { useI18n, type CopyKey } from "@/lib/i18n";
import { isNativePlatform } from "@/lib/storage";
import { cn } from "@/lib/utils";

const NAME: Record<PrayerName, CopyKey> = { fajr: "prayerFajr", sunrise: "prayerSunrise", dhuhr: "prayerDhuhr", asr: "prayerAsr", maghrib: "prayerMaghrib", isha: "prayerIsha" };
const ARABIC: Record<PrayerName, string> = { fajr: "الفجر", sunrise: "الشروق", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" };

export function usePrayerSettings(): PrayerSettings {
  const s = useSyncExternalStore(prayerSettings.subscribe, prayerSettings.get, prayerSettings.get);
  useEffect(() => { void loadPrayerSettings(); }, []);
  return s;
}

type State = { status: "idle" } | { status: "loading" } | { status: "ready"; today: TimesResult; tomorrow: DayTimes | null } | { status: "error"; code: "offline" | "city" | "failed" };

/**
 * Prayer times (🕋): on-device calculation from the GPS position (offline), Aladhan for a city typed by hand,
 * a method / madhab choice, ±15 min per prayer and Adhan notifications.
 */
export function PrayerTimesView() {
  const { t, language } = useI18n();
  const settings = usePrayerSettings();
  const [state, setState] = useState<State>({ status: "idle" });
  const [now, setNow] = useState(() => new Date());
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [perm, setPerm] = useState<NotifyPermission>("prompt");
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const clock = useCallback((d: Date) => {
    const s = d.toLocaleTimeString(language === "ar" ? "ar-EG" : language, { hour: "2-digit", minute: "2-digit" });
    return s;
  }, [language]);

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);
  useEffect(() => { void notificationPermission(false).then(setPerm); }, []);
  useEffect(() => { if (settings.location?.mode === "city") { setCity(settings.location.city); setCountry(settings.location.country); } }, [settings.location]);

  // Calculate today + tomorrow whenever the settings change (and at midnight via `now`'s date).
  const dayStamp = now.toDateString();
  useEffect(() => {
    if (!settings.location) { setState({ status: "idle" }); return; }
    let alive = true;
    setState({ status: "loading" });
    const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    void Promise.all([timesFor(settings, language), timesFor(settings, language, tomorrowDate).then((r) => r.times).catch(() => null)])
      .then(([today, tomorrow]) => { if (alive) setState({ status: "ready", today, tomorrow }); })
      .catch(() => { if (alive) setState({ status: "error", code: typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : settings.location?.mode === "city" ? "city" : "failed" }); });
    return () => { alive = false; };
  }, [settings, language, dayStamp]);

  // Planning runs app-wide (AdhanNotificationService); here only the Android "exact alarms" check.
  const [exact, setExact] = useState<ExactAlarmStatus>("n/a");
  useEffect(() => {
    const check = () => void exactAlarmStatus().then(setExact);
    check();
    const onVis = () => { if (document.visibilityState === "visible") { check(); void replanAdhan(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const locate = async () => {
    setLocating(true); setLocError(null);
    try {
      const p = await getPosition();
      await updatePrayerSettings({ location: { mode: "gps", lat: p.lat, lon: p.lon, at: p.at } });
    } catch (e) {
      setLocError(e instanceof Error && e.message === "denied" ? t("prayerLocDenied") : t("prayerLocFailed"));
    } finally { setLocating(false); }
  };
  const applyCity = async () => {
    if (!city.trim() || !country.trim()) return;
    await updatePrayerSettings({ location: { mode: "city", city: city.trim(), country: country.trim() } });
  };
  /**
   * Row icon: 🔊 Adhan → 📳 vibration → 🔇 off → 🔊 … The mode is always saved first (it used to be dropped
   * when the permission was not "granted", e.g. in web views without notifications); the permission is then
   * asked for and a hint shown when the alert cannot be delivered.
   */
  const cycleMode = async (p: NotifyPrayer) => {
    const mode = nextMode(modeOf(settings, p));
    await setPrayerMode(p, mode);
    if (mode === "vibrate" && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(VIBRATE_PATTERN.slice(0, 1));
    if (mode !== "off") setPerm(await notificationPermission(true).catch(() => "unsupported" as const));
  };
  const next = state.status === "ready" ? nextPrayer(state.today.times, state.tomorrow, now) : null;
  const until = next ? minutesUntil(next.at, now) : 0;
  const untilText = next ? t("prayerIn").replace("{h}", num(Math.floor(until / 60))).replace("{m}", language === "ar" ? toArabicDigits(String(until % 60).padStart(2, "0")) : String(until % 60).padStart(2, "0")) : "";
  const locLabel = settings.location?.mode === "gps"
    ? `${t("prayerGps")} · ${settings.location.lat.toFixed(2)}°, ${settings.location.lon.toFixed(2)}°`
    : settings.location?.mode === "city" ? `${settings.location.city}, ${settings.location.country}` : null;

  return (
    <div className="space-y-4">
      {/* location */}
      <section className={card} style={cardStyle}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-amber-300" />
          <p className="min-w-0 flex-1 truncate text-sm text-emerald-50">{locLabel ?? t("prayerNoLocation")}</p>
          {state.status === "ready" && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-[0.68rem] text-emerald-100/80">
              {state.today.source === "device" ? <><Cpu className="h-3 w-3" />{t("prayerOffline")}</> : <><Globe className="h-3 w-3" />Aladhan</>}
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void locate()} disabled={locating} className={goldBtn} style={{ background: GOLD_GRADIENT }}>
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}{t("prayerUseGps")}
          </button>
          <button type="button" onClick={() => setShowSettings(true)} aria-haspopup="dialog" data-open-prayer-settings="" className={outlineBtn}>
            <Settings2 className="h-4 w-4" />{t("prayerSettings")}
          </button>
        </div>
        {locError && <p className="mt-2 text-xs text-red-200">{locError}</p>}
        <form className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2" onSubmit={(e) => { e.preventDefault(); void applyCity(); }}>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("prayerCity")} aria-label={t("prayerCity")} className={input} />
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t("prayerCountry")} aria-label={t("prayerCountry")} className={input} />
          <button type="submit" disabled={!city.trim() || !country.trim()} className={cn(outlineBtn, "px-3")}>{t("goShort")}</button>
        </form>
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-emerald-100/55">{t("prayerHybridNote")}</p>
      </section>

      <PrayerSettingsModal open={showSettings} settings={settings} onClose={() => setShowSettings(false)} />

      {/* the day */}
      {state.status === "idle" && <p className="rounded-2xl bg-black/15 p-4 text-center text-sm text-emerald-100/75">{t("prayerPickLocation")}</p>}
      {state.status === "loading" && <p className="flex items-center justify-center gap-2 py-8 text-sm text-emerald-100/70"><Loader2 className="h-4 w-4 animate-spin" />{t("contentLoading")}</p>}
      {state.status === "error" && <p className="rounded-2xl bg-black/15 p-4 text-center text-sm text-red-200">{t(state.code === "offline" ? "contentOffline" : state.code === "city" ? "prayerCityFailed" : "contentFailed")}</p>}
      {state.status === "ready" && (
        <section className={card} style={cardStyle}>
          {next && (
            <div className="mb-3 rounded-2xl p-3 text-center" style={{ background: alpha(GOLD, 0.12), boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.45)}` }}>
              <p className="text-xs text-emerald-100/75">{t("prayerNext")}</p>
              <p className="mt-0.5 text-2xl font-semibold" style={{ color: GOLD_LIGHT }}>{t(NAME[next.name])} · {clock(next.at)}</p>
              <p className="text-xs text-amber-100/90">{untilText}</p>
            </div>
          )}
          <p className="mb-1 text-xs text-emerald-100/60">{METHODS[state.today.method].name} · {t(settings.madhab === "hanafi" ? "prayerHanafi" : "prayerShafi")}</p>
          <ul className="divide-y divide-white/5" data-prayer-times="">
            {PRAYERS.map((p) => {
              const at = state.today.times[p];
              const isNext = next?.name === p && next.at === at;
              return (
                <li key={p} className={cn("flex items-center gap-3 rounded-xl px-2 py-2.5", isNext && "bg-amber-300/10")}>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", isNext ? "font-semibold text-amber-100" : "text-emerald-50")}>{t(NAME[p])}</span>
                    {language !== "ar" && <span className="block font-arabic text-xs text-emerald-100/55">{ARABIC[p]}</span>}
                  </span>
                  <span className={cn("text-lg tabular-nums", isNext ? "text-amber-200" : "text-emerald-50")}>{clock(at)}</span>
                  {p !== "sunrise" ? (() => {
                    const mode = modeOf(settings, p);
                    const Icon = mode === "adhan" ? Volume2 : mode === "vibrate" ? Vibrate : BellOff;
                    const label = t(mode === "adhan" ? "adhanModeAdhan" : mode === "vibrate" ? "adhanModeVibrate" : "adhanModeOff");
                    return (
                      <button type="button" onClick={() => void cycleMode(p)} data-mode={mode} aria-label={`${t("prayerAdhanNotify")}: ${t(NAME[p])} – ${label}`} title={label}
                        className={cn("flex h-9 w-9 items-center justify-center rounded-full", mode !== "off" ? "bg-amber-300/20 text-amber-200" : "text-emerald-100/40")}>
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })() : <span className="w-9" />}
                </li>
              );
            })}
          </ul>
          {(perm === "denied" || perm === "unsupported") && NOTIFY_PRAYERS.some((x) => modeOf(settings, x) !== "off") && <p className="mt-2 text-xs text-red-200" data-adhan-warn="">{t(perm === "denied" ? "prayerNotifyDenied" : "adhanPermissionWarn")}</p>}
          {exact === "denied" && NOTIFY_PRAYERS.some((x) => modeOf(settings, x) !== "off") && (
            <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: "rgba(245,158,11,.12)", boxShadow: "inset 0 0 0 1px rgba(245,158,11,.4)" }} data-exact-alarm="">
              <p className="font-semibold text-amber-200">{t("adhanExactTitle")}</p>
              <p className="mt-1 text-emerald-100/80">{t("adhanExactBody")}</p>
              <button type="button" onClick={() => void openExactAlarmSetting().then(setExact)} className="mt-2 rounded-lg bg-amber-400 px-3 py-1.5 font-semibold text-emerald-950">{t("adhanExactButton")}</button>
            </div>
          )}
          {!isNativePlatform() && Object.values(settings.notify).some((m) => m && m !== "off") && <p className="mt-2 text-[0.7rem] leading-relaxed text-emerald-100/55">{t("prayerNotifyWebNote")}</p>}
        </section>
      )}
    </div>
  );
}

const card = "rounded-2xl bg-black/15 p-3.5";
const cardStyle = { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.33)}` };
const goldBtn = "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-emerald-950 disabled:opacity-60";
const outlineBtn = "flex items-center justify-center gap-2 rounded-xl border border-amber-400/50 py-2.5 text-sm text-amber-100 disabled:opacity-40";
const input = "h-10 min-w-0 rounded-xl border border-amber-400/40 bg-black/25 px-3 text-sm text-emerald-50 placeholder:text-emerald-100/45 focus:outline-none";

export default PrayerTimesView;
