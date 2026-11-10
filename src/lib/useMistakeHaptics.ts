import { useEffect, useRef } from "react";
import { mistakeHaptic } from "@/lib/haptics";
import { getSettings } from "@/lib/settings";
import type { LiveStatus } from "@/lib/quranMatcher";

/**
 * Vibrates briefly when a word turns red (ERROR) or orange (WARNING) while the user is reciting.
 * Only newly judged words count (a word re-judged later, or the final result after stopping, does not
 * vibrate again). Nothing here touches the microphone or the recognizer.
 */
export function useMistakeHaptics(statuses: readonly LiveStatus[], active: boolean) {
  const seen = useRef<Set<number>>(new Set());
  useEffect(() => { if (!active) seen.current = new Set(); }, [active]);
  useEffect(() => {
    if (!active) return;
    let fresh = false;
    statuses.forEach((s, i) => {
      if ((s === "ERROR" || s === "WARNING") && !seen.current.has(i)) { seen.current.add(i); fresh = true; }
    });
    if (fresh && getSettings().mistakeVibration) mistakeHaptic();
  }, [statuses, active]);
  /** Forget what was seen (e.g. after an automatic page turn the indexes start again). */
  return () => { seen.current = new Set(); };
}
