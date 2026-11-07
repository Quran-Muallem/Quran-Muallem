/**
 * Diagnostics for recording and speech recognition (sizes, durations, timings).
 * Printed in development builds, or in any build after running in the console:
 *   localStorage.setItem("hifz.debug.audio", "1")
 */
const enabled = (): boolean => {
  try {
    if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) return true;
    return globalThis.localStorage?.getItem("hifz.debug.audio") === "1";
  } catch { return false; }
};

export function audioDebug(event: string, data: Record<string, unknown> = {}): void {
  if (!enabled()) return;
  console.info(`[audio] ${event}`, data);
}

/** Seconds with one decimal, for logs. */
export const secs = (samples: number, rate: number) => Math.round((samples / rate) * 10) / 10;
