/**
 * «تذكير بالمداومة على الورد اليومي» — one local notification every day at the chosen time (app only;
 * scheduled on the device with @capacitor/local-notifications, so it also comes with the app closed).
 * Re-planned when the setting, its time or the language change (started in App via `syncDailyReminder`).
 */
import { localNotifications, notificationPermission } from "@/lib/prayerNotifications";
import { isNativePlatform } from "@/lib/storage";

export const REMINDER_ID = 9100;

/** "20:30" → { hour: 20, minute: 30 } (null when malformed). */
export function parseTime(hhmm: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const hour = Number(m[1]), minute = Number(m[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

export const reminderSupported = () => isNativePlatform();

/** Plans (or cancels) the daily reminder. Returns false when notifications are not allowed. */
export async function syncDailyReminder(on: boolean, time: string, text: { title: string; body: string }): Promise<boolean> {
  const ln = await localNotifications();
  if (!ln) return false;
  await ln.cancel({ notifications: [{ id: REMINDER_ID }] }).catch(() => {});
  const at = parseTime(time);
  if (!on || !at) return true;
  if ((await notificationPermission(true)) !== "granted") return false;
  await ln.schedule({
    notifications: [{
      id: REMINDER_ID, title: text.title, body: text.body,
      schedule: { on: { hour: at.hour, minute: at.minute }, allowWhileIdle: true },
      extra: { kind: "wird" },
    }],
  });
  return true;
}
