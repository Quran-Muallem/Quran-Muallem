/**
 * Keeps the Adhan notifications planned — independent of any screen.
 *
 * The notifications themselves are scheduled on the device (@capacitor/local-notifications, see
 * prayerNotifications.ts), so they come with the app closed, in the background or with the screen locked.
 * This service makes sure the plan is always current: on app start, whenever the prayer settings or the
 * language change, when the app comes back to the foreground, and around midnight — so the 7-day window
 * keeps moving even if the prayer screen is never opened. (Before, only the prayer screen re-planned, and
 * after three days without opening it the Adhan stopped.)
 */
import { NOTIFY_PRAYERS, loadPrayerSettings, modeOf, prayerSettings, type NotifyPrayer } from "@/lib/PrayerTimesEngine";
import { bindNativeArrivals, prepareAdhanChannels, exactAlarmStatus, notificationPermission, openExactAlarmSetting, schedulePrayerNotifications } from "@/lib/prayerNotifications";
import { isNativePlatform, kv } from "@/lib/storage";
import { translate, type CopyKey } from "@/lib/i18n";
import type { Language } from "@/i18n";

const NAME: Record<NotifyPrayer, CopyKey> = { fajr: "prayerFajr", dhuhr: "prayerDhuhr", asr: "prayerAsr", maghrib: "prayerMaghrib", isha: "prayerIsha" } as Record<NotifyPrayer, CopyKey>;
const ARABIC: Record<string, string> = { fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء", jumuah: "الجمعة" };

export function adhanLabels(language: Language) {
  const t = (k: CopyKey) => translate(language, k);
  return {
    title: (p: NotifyPrayer) => `${t(NAME[p] ?? ("prayerFajr" as CopyKey))} · ${ARABIC[p] ?? ""}`,
    body: (p: NotifyPrayer, time: string) => t("prayerNotifyBody").replace("{prayer}", t(NAME[p] ?? ("prayerFajr" as CopyKey))).replace("{time}", time),
    channelAdhan: t("adhanModeAdhan"),
    channelVibrate: t("adhanModeVibrate"),
  };
}

let language: Language = "ar";
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: Promise<void> | null = null;
let again = false;

/** (Re)plans now; calls arriving while a plan runs are merged into one more run. */
export function replanAdhan(): Promise<void> {
  if (pending) { again = true; return pending; }
  pending = (async () => {
    do {
      again = false;
      await loadPrayerSettings();
      await ensurePermissions();
      await schedulePrayerNotifications(prayerSettings.get(), language, adhanLabels(language)).catch(() => {});
    } while (again);
  })().finally(() => { pending = null; });
  return pending;
}

const anyOn = () => NOTIFY_PRAYERS.some((p) => modeOf(prayerSettings.get(), p) !== "off");
let askedNotify = false;
/**
 * App: when any prayer is on, make sure we may notify (Android 13+ POST_NOTIFICATIONS / iOS authorization)
 * and — once — offer Android's "Alarms & reminders" page so the Adhan comes at the exact minute in Doze.
 */
async function ensurePermissions() {
  if (!isNativePlatform() || !anyOn()) return;
  if (!askedNotify && (await notificationPermission(false)) === "prompt") { askedNotify = true; await notificationPermission(true).catch(() => {}); }
  if ((await exactAlarmStatus()) === "denied" && !(await kv.get(EXACT_ASKED))) {
    await kv.set(EXACT_ASKED, "1");
    await openExactAlarmSetting().catch(() => {});
  }
}
const EXACT_ASKED = "hifz.adhan.exactAsked.v1";

/** Re-plan shortly after midnight (new day → the window moves on). */
function armMidnight() {
  if (timer) clearTimeout(timer);
  const n = new Date(), next = new Date(n);
  next.setHours(24, 1, 0, 0);
  timer = setTimeout(() => { void replanAdhan(); armMidnight(); }, next.getTime() - n.getTime());
}

let started = false;
let unsub: (() => void) | null = null;
/** Starts the service (idempotent); call again when the app language changes. */
export function startAdhanService(lang: Language): () => void {
  language = lang;
  if (started) { void replanAdhan(); return stopAdhanService; }
  started = true;
  let last = "";
  unsub = prayerSettings.subscribe(() => {
    const key = JSON.stringify(prayerSettings.get());
    if (key !== last) { last = key; void replanAdhan(); }
  });
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisible);
  armMidnight();
  void bindNativeArrivals();
  void prepareAdhanChannels({ adhan: adhanLabels(lang).channelAdhan, vibrate: adhanLabels(lang).channelVibrate });
  void replanAdhan();
  return stopAdhanService;
}
function onVisible() { if (document.visibilityState === "visible") void replanAdhan(); }
export function stopAdhanService() {
  started = false;
  unsub?.(); unsub = null;
  if (timer) clearTimeout(timer);
  if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisible);
}
