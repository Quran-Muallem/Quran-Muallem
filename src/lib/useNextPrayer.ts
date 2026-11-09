import { useEffect, useState, useSyncExternalStore } from "react";
import { loadPrayerSettings, nextPrayer, prayerSettings, timesFor, type DayTimes, type PrayerName } from "@/lib/PrayerTimesEngine";
import type { Language } from "@/i18n";

export type NextPrayerInfo =
  | { status: "no-location" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; name: PrayerName; at: Date; remainingMs: number };

/** "-01:48:12" style countdown (hours only when needed). */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return `-${two(h)}:${two(m)}:${two(sec)}`;
}

/**
 * The next prayer and a live countdown (ticks every second). Times for today and tomorrow are recalculated
 * when the settings change, at midnight, and when the next prayer has passed (so the card moves on by itself).
 */
export function useNextPrayer(language: Language): NextPrayerInfo {
  const settings = useSyncExternalStore(prayerSettings.subscribe, prayerSettings.get, prayerSettings.get);
  const [days, setDays] = useState<{ today: DayTimes; tomorrow: DayTimes | null } | "loading" | "error" | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { void loadPrayerSettings(); }, []);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const dayStamp = now.toDateString();
  useEffect(() => {
    if (!settings.location) { setDays(null); return; }
    let alive = true;
    setDays("loading");
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    void Promise.all([timesFor(settings, language).then((r) => r.times), timesFor(settings, language, tomorrow).then((r) => r.times).catch(() => null)])
      .then(([today, tm]) => { if (alive) setDays({ today, tomorrow: tm }); })
      .catch(() => { if (alive) setDays("error"); });
    return () => { alive = false; };
  }, [settings, language, dayStamp]);
  if (!settings.location) return { status: "no-location" };
  if (days === null || days === "loading") return { status: "loading" };
  if (days === "error") return { status: "error" };
  const n = nextPrayer(days.today, days.tomorrow, now);
  if (!n) return { status: "loading" };
  return { status: "ready", name: n.name, at: n.at, remainingMs: n.at.getTime() - now.getTime() };
}
