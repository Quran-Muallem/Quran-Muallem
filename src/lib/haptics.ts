/** Soft haptic feedback: @capacitor/haptics in the app, the Vibration API in browsers that have it. */
import { isNativePlatform } from "@/lib/storage";

const vibrate = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* unsupported */ } };

/** A light tap (each count of a dhikr). */
export async function tapHaptic(): Promise<void> {
  if (isNativePlatform()) {
    try { const { Haptics, ImpactStyle } = await import("@capacitor/haptics"); await Haptics.impact({ style: ImpactStyle.Light }); return; } catch { /* plugin missing */ }
  }
  vibrate(8);
}

/** A short success pattern (a dhikr completed, a badge earned). */
export async function successHaptic(): Promise<void> {
  if (isNativePlatform()) {
    try { const { Haptics, NotificationType } = await import("@capacitor/haptics"); await Haptics.notification({ type: NotificationType.Success }); return; } catch { /* plugin missing */ }
  }
  vibrate([14, 60, 22]);
}

/**
 * A word was judged wrong or almost right while reciting: one light tap. Fire-and-forget — it never
 * awaits anything in the recognition path, so recording and live recognition simply carry on.
 */
let lastMistake = 0;
export function mistakeHaptic(): void {
  const now = Date.now();
  if (now - lastMistake < 350) return; // several words judged at once → one tap
  lastMistake = now;
  void tapHaptic().catch(() => {});
}
