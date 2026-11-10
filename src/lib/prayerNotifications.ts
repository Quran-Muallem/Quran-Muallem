/**
 * Adhan notifications: per prayer 🔊 full Adhan (the chosen muezzin), 📳 vibration only, or 🔇 off.
 *
 *  - App (Android / iOS): @capacitor/local-notifications schedules the next 3 days on the device, so the
 *    Adhan or the vibration comes with the app closed and the screen locked; re-planned on every start
 *    and whenever the settings change.
 *    · Android: one notification channel per recording (`adhan_<file>`, sound = res/raw/adhan_<file>.mp3,
 *      copied there by scripts/native-permissions.mjs) and a "vibration only" channel with a silent sound.
 *      The channel's sound plays in full.
 *    · iOS: the sound comes from Library/Sounds (copied there from public/adhan/ios/*.caf on first use);
 *      iOS plays at most 30 seconds of a notification sound.
 *  - Web / PWA: browsers cannot schedule anything for a closed page — while the app is open the Adhan is
 *    played (or the phone vibrates) at the time, with a notification.
 */
import { isNativePlatform } from "@/lib/storage";
import { NOTIFY_PRAYERS, modeOf, timesFor, voiceOf, type DayTimes, type NotifyPrayer, type PrayerSettings } from "@/lib/PrayerTimesEngine";
import { ADHAN_VOICES, SILENT_FILE, VIBRATE_CHANNEL, adhanFileFor, channelFor } from "@/data/adhanVoices";
import type { Language } from "@/i18n";

type LocalNotificationsPlugin = typeof import("@capacitor/local-notifications").LocalNotifications;
let plugin: Promise<LocalNotificationsPlugin | null> | null = null;
export function localNotifications(): Promise<LocalNotificationsPlugin | null> {
  plugin ??= !isNativePlatform() ? Promise.resolve(null) : Promise.all([import("@capacitor/core"), import("@capacitor/local-notifications")])
    .then(([{ Capacitor }, m]) => (Capacitor.isPluginAvailable("LocalNotifications") ? m.LocalNotifications : null))
    .catch(() => null);
  return plugin;
}
const platform = async (): Promise<string> => (await import("@capacitor/core")).Capacitor.getPlatform();

/** Days planned ahead (5 prayers × 7 = 35 notifications, well below iOS' limit of 64 pending ones). */
export const PLAN_DAYS = 7;
/** Notification ids: 7000 + day * 10 + prayer index (stable, so a re-plan replaces the old ones). */
export const idOf = (day: number, p: NotifyPrayer) => 7000 + day * 10 + NOTIFY_PRAYERS.indexOf(p);
const ALL_IDS = Array.from({ length: PLAN_DAYS }, (_, d) => [0, 1, 2, 3, 4, 5].map((i) => 7000 + d * 10 + i)).flat();

export type ExactAlarmStatus = "granted" | "denied" | "n/a";
/**
 * Android 12+: exact alarms ("Alarms & reminders"). Without them Android may deliver the Adhan minutes late
 * in Doze; on Android 14 the permission is off by default for new installs, so the prayer screen asks for it.
 */
export async function exactAlarmStatus(): Promise<ExactAlarmStatus> {
  const ln = await localNotifications();
  if (!ln || (await platform()) !== "android") return "n/a";
  const r = await ln.checkExactNotificationSetting().catch(() => null);
  return r?.exact_alarm === "granted" ? "granted" : r ? "denied" : "n/a";
}
/** Opens Android's "Alarms & reminders" page for the app; re-plans afterwards. */
export async function openExactAlarmSetting(): Promise<ExactAlarmStatus> {
  const ln = await localNotifications();
  if (!ln) return "n/a";
  const r = await ln.changeExactNotificationSetting().catch(() => null);
  return r?.exact_alarm === "granted" ? "granted" : "denied";
}

/** Web path of a recording (relative: works in the PWA and inside the app's web view). */
export const adhanUrl = (file: string) => `adhan/${file}.mp3`;

export type NotifyPermission = "granted" | "denied" | "prompt" | "unsupported";

export async function notificationPermission(ask = false): Promise<NotifyPermission> {
  const ln = await localNotifications();
  if (ln) {
    const cur = await ln.checkPermissions().catch(() => null);
    if (cur?.display === "granted") return "granted";
    if (!ask) return cur?.display === "denied" ? "denied" : "prompt";
    const res = await ln.requestPermissions().catch(() => null);
    return res?.display === "granted" ? "granted" : "denied";
  }
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  if (!ask) return "prompt";
  return (await Notification.requestPermission()) === "granted" ? "granted" : "denied";
}

/* ───────────── native sounds ───────────── */

const channelsMade = new Set<string>();
/**
 * Android: the channel of every bundled recording + the vibration-only channel. Checked on EVERY plan:
 * before v25 this ran once per app start with only the voices of that first plan, so a voice chosen later
 * (or the first Adhan after starting with everything on vibrate / off) had no channel — and Android silently
 * drops a notification posted to a channel that does not exist.
 */
async function ensureChannels(ln: LocalNotificationsPlugin, names: { adhan: string; vibrate: string }) {
  if ((await platform()) !== "android") return;
  const files = [...new Set(ADHAN_VOICES.flatMap((v) => [v.file, v.fajrFile]).filter((f): f is string => !!f))];
  for (const file of files) {
    const id = channelFor(file);
    if (channelsMade.has(id)) continue;
    const voice = ADHAN_VOICES.find((v) => v.file === file || v.fajrFile === file);
    await ln.createChannel({ id, name: `${names.adhan} · ${voice?.en ?? file}${voice?.fajrFile === file && voice.file !== file ? " (Fajr)" : ""}`, importance: 5, visibility: 1, vibration: true, lights: true, sound: `adhan_${file}.mp3` }).then(() => channelsMade.add(id)).catch(() => {});
  }
  if (!channelsMade.has(VIBRATE_CHANNEL)) {
    await ln.createChannel({ id: VIBRATE_CHANNEL, name: names.vibrate, importance: 5, visibility: 1, vibration: true, sound: `adhan_${SILENT_FILE}.mp3` }).then(() => channelsMade.add(VIBRATE_CHANNEL)).catch(() => {});
  }
}

const iosCopied = new Set<string>();
/** iOS: notification sounds must be in Library/Sounds — copy the 30-second clip there once. */
async function ensureIosSound(file: string): Promise<string | undefined> {
  const name = `adhan_${file}.caf`;
  if (iosCopied.has(name)) return name;
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    try { await Filesystem.stat({ path: `Sounds/${name}`, directory: Directory.Library }); iosCopied.add(name); return name; } catch { /* not there yet */ }
    const blob = await (await fetch(`adhan/ios/${file}.caf`)).blob();
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
    await Filesystem.writeFile({ path: `Sounds/${name}`, directory: Directory.Library, data, recursive: true });
    iosCopied.add(name);
    return name;
  } catch { return undefined; }
}

/* ───────────── web: play while the app is open ───────────── */

let webTimers: ReturnType<typeof setTimeout>[] = [];
let webAudio: HTMLAudioElement | null = null;
export function stopAdhan() { webAudio?.pause(); webAudio = null; }
/** Plays a recording (preview and web delivery); returns a stop function. */
export function playAdhan(file: string, onEnd?: () => void): () => void {
  stopAdhan();
  const a = new Audio(adhanUrl(file));
  webAudio = a;
  a.onended = () => { if (webAudio === a) webAudio = null; onEnd?.(); };
  a.onerror = () => { if (webAudio === a) webAudio = null; onEnd?.(); };
  void a.play().catch(() => onEnd?.());
  return () => { if (webAudio === a) stopAdhan(); };
}
/* ───────────── "prayer time now" inside the app (banner) ───────────── */

export type PrayerArrival = { prayer: NotifyPrayer; mode: "adhan" | "vibrate"; at: Date; file?: string };
const arrivalListeners = new Set<(a: PrayerArrival) => void>();
/** The in-app banner listens here (web timers and, in the app, notifications received in the foreground). */
export function onPrayerArrival(l: (a: PrayerArrival) => void): () => void { arrivalListeners.add(l); return () => { arrivalListeners.delete(l); }; }
export function announcePrayer(a: PrayerArrival) { arrivalListeners.forEach((l) => l(a)); }

let nativeArrivalBound = false;
/**
 * App open (any screen, also the prayer screen): the notification arrives → its short notification sound
 * is replaced by the FULL Adhan played in the app (the notification is removed from the shade, which stops
 * its sound on Android), plus the banner with "Stop". Closed / background / Doze: the scheduled
 * notification itself rings (Android: channel sound in full; iOS: 30 s clip).
 */
export async function bindNativeArrivals() {
  if (nativeArrivalBound) return;
  const ln = await localNotifications();
  if (!ln) return;
  nativeArrivalBound = true;
  await ln.addListener("localNotificationReceived", (n) => {
    const extra = (n.extra ?? {}) as { prayer?: NotifyPrayer; mode?: "adhan" | "vibrate"; file?: string };
    if (!extra.prayer) return;
    const mode = extra.mode === "vibrate" ? "vibrate" : "adhan";
    if (mode === "adhan" && extra.file) {
      void ln.removeDeliveredNotifications({ notifications: [n] }).catch(() => {});
      playAdhan(extra.file);
    } else if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(VIBRATE_PATTERN);
    announcePrayer({ prayer: extra.prayer, mode, at: new Date(), ...(extra.file ? { file: extra.file } : {}) });
  }).catch(() => { nativeArrivalBound = false; });
}

/** Android: create every muezzin's channel at app start (before any plan). */
export async function prepareAdhanChannels(names: { adhan: string; vibrate: string }) {
  const ln = await localNotifications();
  if (ln) await ensureChannels(ln, names);
}

/** Vibration pattern of "vibration only" (long – short – long). */
export const VIBRATE_PATTERN = [800, 300, 800, 300, 800];

export type NotifyLabels = {
  title: (p: NotifyPrayer) => string;
  body: (p: NotifyPrayer, time: string) => string;
  channelAdhan: string;
  channelVibrate: string;
};

/**
 * (Re)plans the notifications for today and the next six days according to the per-prayer modes and voices.
 * Exact (setExactAndAllowWhileIdle) when the exact-alarm permission is there, otherwise Android's inexact
 * fallback; the plugin re-arms them after a reboot (RECEIVE_BOOT_COMPLETED).
 */
export async function schedulePrayerNotifications(settings: PrayerSettings, language: Language, labels: NotifyLabels) {
  const wanted = NOTIFY_PRAYERS.filter((p) => modeOf(settings, p) !== "off");
  const ln = await localNotifications();
  webTimers.forEach(clearTimeout); webTimers = [];
  if (ln) await ln.cancel({ notifications: ALL_IDS.map((id) => ({ id })) }).catch(() => {});
  if (!wanted.length || !settings.location) return;
  // App: notifications need the permission. Web: the in-app Adhan (sound / vibration + banner) works without
  // it while the app is open; only the system notification needs it.
  if (ln && (await notificationPermission(false)) !== "granted") return;

  const now = new Date();
  const days: DayTimes[] = [];
  for (let d = 0; d < PLAN_DAYS; d++) {
    const date = new Date(now); date.setDate(now.getDate() + d); date.setHours(12, 0, 0, 0);
    try { days.push((await timesFor(settings, language, date)).times); } catch { break; }
  }
  const fmt = (d: Date) => d.toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" });
  const items = days.flatMap((t, d) => wanted.filter((p) => t[p] > now).map((p) => ({
    id: idOf(d, p), at: t[p], p, mode: modeOf(settings, p), file: adhanFileFor(voiceOf(settings, p), p === "fajr"),
  })));

  if (ln) {
    const os = await platform();
    if (os === "android") await ensureChannels(ln, { adhan: labels.channelAdhan, vibrate: labels.channelVibrate });
    const notifications = [];
    for (const it of items) {
      const sound = os === "ios" ? await ensureIosSound(it.mode === "adhan" ? it.file : SILENT_FILE) : undefined;
      notifications.push({
        id: it.id, title: labels.title(it.p), body: labels.body(it.p, fmt(it.at)),
        schedule: { at: it.at, allowWhileIdle: true },
        channelId: it.mode === "adhan" ? channelFor(it.file) : VIBRATE_CHANNEL,
        ...(sound ? { sound } : {}),
        extra: { prayer: it.p, mode: it.mode, file: it.file },
      });
    }
    await ln.schedule({ notifications }).catch(() => {});
    return;
  }
  // Web: only while the app is open (timers < 7 days, below the ~24-day limit).
  const granted = (await notificationPermission(false)) === "granted";
  for (const it of items) {
    webTimers.push(setTimeout(() => {
      if (it.mode === "adhan") playAdhan(it.file);
      else if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(VIBRATE_PATTERN);
      announcePrayer({ prayer: it.p, mode: it.mode === "vibrate" ? "vibrate" : "adhan", at: it.at, file: it.file });
      if (granted) { try { new Notification(labels.title(it.p), { body: labels.body(it.p, fmt(it.at)), icon: "icon-192.png", tag: `prayer-${it.p}`, silent: true }); } catch { /* not allowed here */ } }
    }, it.at.getTime() - now.getTime()));
  }
}
