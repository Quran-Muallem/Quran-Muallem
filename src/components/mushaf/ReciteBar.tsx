import { useEffect, useRef, type ReactNode } from "react";
import { ReciterAvatar } from "@/components/ReciterPill";
import type { Reciter } from "@/lib/reciterManager";
import { ClipboardList, ChevronLeft, Lightbulb, Loader2, Mic, Pause, Play, RotateCcw, Square } from "lucide-react";
import { toArabicDigits } from "@/lib/quranService";
import { GOLD_A, GOLD_B, GOLD_C } from "@/components/mushaf/MushafOrnaments";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type BarMode = "RECITATION_MODE" | "MEMORIZATION_MODE";

/**
 * Floating glass control bar (design reference): Recitation switch · golden microphone · Memorization switch.
 * The Sheikh player lives in the screen's top row (SheikhControls); `player` here is optional.
 * `onHeight` reports the bar's height so the Mushaf page can fit the rest of the screen exactly.
 */
export function ReciteBar({ mode, onMode, listening, busy, onMic, paused = false, onPause, getLevel, status, player, nextPage, hint, extra, docked = false, onHeight, onReset, onReview, reviewCount = 0 }: {
  /** v38 «إعادة»: start the session again from scratch (shown while there is something to reset). */
  onReset?: (() => void) | undefined;
  /** v38: open the review of the last recitation's mistakes again. */
  onReview?: (() => void) | undefined;
  reviewCount?: number;
  onHeight?: ((px: number) => void) | undefined;
  /** Extra row above the controls (the user's own recording). */
  extra?: ReactNode;
  /** No tab bar below (full-screen Mushaf). */
  docked?: boolean;
  /** Memorization: reveal the next word (max per verse). */
  /** One-tap hint (memorization): reveals one more word per tap; `used` = words shown so far. */
  hint?: { onClick: () => void; used: number; disabled: boolean } | undefined;
  mode: BarMode;
  onMode: (m: BarMode) => void;
  listening: boolean;
  busy: boolean;
  onMic: () => void;
  /** Pause / resume while reciting (state and word colours are kept). */
  paused?: boolean;
  onPause?: (() => void) | undefined;
  getLevel?: (() => number) | undefined;
  /** Short status line, e.g. accuracy or hint. */
  status?: ReactNode;
  player?: { playing: boolean; loading: boolean; reciter: Reciter; onToggle: () => void; onReciter: () => void } | undefined;
  /** Shown when the page was completed. */
  nextPage?: (() => void) | undefined;
}) {
  const { t, language } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const report = useRef(onHeight);
  report.current = onHeight;
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => report.current?.(el.getBoundingClientRect().height));
    ro.observe(el);
    report.current?.(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, []);
  const reciterName = player ? (language === "ar" ? player.reciter.nameArabic : player.reciter.nameEnglish) : "";
  return (
    <div ref={box} data-recite-bar="" className={cn("fixed inset-x-0 z-30 mx-auto w-[calc(100%-1.5rem)] max-w-md", docked ? "bottom-[max(0.6rem,env(safe-area-inset-bottom))]" : "bottom-[4.6rem]")}>
      <div className="rounded-[2rem] border border-white/15 bg-[var(--hq-glass)] px-4 pb-2.5 pt-2 [@media(max-height:719px)]:pb-1.5 [@media(max-height:719px)]:pt-1.5 shadow-[0_20px_50px_-15px_rgba(0,0,0,.8)] backdrop-blur-xl"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), 0 20px 50px -15px rgba(0,0,0,.8)" }}>
        {extra && <div className="mb-1.5">{extra}</div>}
        {/* top row: ▶/⏸ · Sheikh avatar · status · hint · waveform (no text labels for the Sheikh) */}
        <div className="flex items-center gap-2">
          {player && <>
            <button type="button" onClick={player.onToggle} aria-label={player.playing ? t("pause") : t("play")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/40 text-amber-200">
              {player.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : player.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button type="button" onClick={player.onReciter} aria-haspopup="dialog" aria-label={`${t("reciterChange")}: ${reciterName}`} title={reciterName}
              className="shrink-0 rounded-full transition active:scale-95">
              <ReciterAvatar reciter={player.reciter} selected={player.playing} className="h-8 w-8 text-sm" />
            </button>
          </>}
          {onReset && (
            <button type="button" onClick={onReset} aria-label={t("resetSession")} title={t("resetSession")} data-recite-reset=""
              className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300/50 px-2 py-1 text-xs text-amber-100 active:scale-95">
              <RotateCcw className="h-3.5 w-3.5" /><span className="[@media(max-width:360px)]:hidden">{t("resetSession")}</span>
            </button>
          )}
          <div className="min-w-0 flex-1 truncate text-center text-xs text-amber-100/90">{status}</div>
          {onReview && reviewCount > 0 && (
            <button type="button" onClick={onReview} aria-label={t("srOpen")} title={t("srOpen")} data-review-open=""
              className="flex shrink-0 items-center gap-1 rounded-full border border-red-300/50 bg-red-500/10 px-2 py-1 text-xs text-red-100">
              <ClipboardList className="h-3.5 w-3.5" />{language === "ar" ? toArabicDigits(reviewCount) : reviewCount}
            </button>
          )}
          {hint && (
            <button type="button" onClick={hint.onClick} disabled={hint.disabled} aria-label={t("hintLabel")}
              className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300/60 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-100 disabled:opacity-40">
              <Lightbulb className="h-3.5 w-3.5" />{t("hintShort")}{hint.used > 0 && <span className="opacity-70">· {language === "ar" ? toArabicDigits(hint.used) : hint.used}</span>}
            </button>
          )}
          <Waveform active={(listening && !paused) || !!player?.playing} getLevel={listening && !paused ? getLevel : undefined} />
        </div>

        <div className="mt-0.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <ModeSwitch label={t("modeRecitation")} on={mode === "RECITATION_MODE"} onClick={() => onMode("RECITATION_MODE")} />
          <div className="relative">
            <GoldMic listening={listening && !paused} busy={busy} onClick={onMic} label={listening ? t("stop") : t("record")} stopIcon={listening} />
            {listening && onPause && (
              <button type="button" onClick={onPause} aria-pressed={!!paused} data-recite-pause="" aria-label={paused ? t("reciteResume") : t("recitePause")} title={paused ? t("reciteResume") : t("recitePause")}
                className={cn("absolute -bottom-1 -end-3 flex h-9 w-9 items-center justify-center rounded-full shadow-lg", paused ? "text-emerald-950" : "bg-emerald-950 text-amber-200")}
                style={paused ? { background: `linear-gradient(135deg, ${GOLD_B}, ${GOLD_A})` } : { boxShadow: "inset 0 0 0 1px rgba(243,210,122,.7)" }}>
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
            )}
          </div>
          <ModeSwitch label={t("modeMemorization")} on={mode === "MEMORIZATION_MODE"} onClick={() => onMode("MEMORIZATION_MODE")} />
        </div>

        {nextPage && (
          <button type="button" onClick={nextPage}
            className="mx-auto mt-2 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-950 animate-in fade-in"
            style={{ background: `linear-gradient(135deg, ${GOLD_B}, ${GOLD_A})` }}>
            {t("nextPage")}<ChevronLeft className="h-3.5 w-3.5 ltr:rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
}

function ModeSwitch({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex flex-col items-center gap-1.5">
      <span className={cn("relative h-7 w-14 rounded-full border transition-colors", on ? "border-amber-300/70 bg-amber-200/20" : "border-white/20 bg-black/20")}>
        <span className={cn("absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full shadow transition-all duration-300", on ? "end-0.5" : "start-0.5 opacity-60")}
          style={{ background: `radial-gradient(circle at 35% 30%, #fff6d1, ${GOLD_B} 40%, ${GOLD_A} 70%, ${GOLD_C})` }} />
      </span>
      <span className={cn("text-[0.8rem] leading-none", on ? "text-emerald-50" : "text-emerald-50/60")}>{label}</span>
    </button>
  );
}

function GoldMic({ listening, busy, onClick, label, stopIcon = listening }: { listening: boolean; busy: boolean; onClick: () => void; label: string; stopIcon?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} aria-label={label}
      className="relative flex h-[4.6rem] w-[4.6rem] items-center justify-center rounded-full disabled:opacity-70 [@media(max-height:719px)]:h-[3.8rem] [@media(max-height:719px)]:w-[3.8rem]"
      style={{ background: `conic-gradient(from 210deg, ${GOLD_C}, ${GOLD_B}, #fff3c8, ${GOLD_A}, ${GOLD_C})`, boxShadow: "0 0 30px -4px rgba(243,210,122,.6), inset 0 0 0 1px rgba(255,255,255,.3)" }}>
      {listening && <span className="animate-ring absolute inset-0 rounded-full" style={{ background: "rgba(243,210,122,.45)" }} />}
      <span className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full [@media(max-height:719px)]:h-[3.1rem] [@media(max-height:719px)]:w-[3.1rem]"
        style={{ background: `radial-gradient(circle at 38% 30%, #fff6d1 0%, ${GOLD_B} 35%, ${GOLD_A} 70%, ${GOLD_C} 100%)`, boxShadow: "inset 0 2px 6px rgba(255,255,255,.5), inset 0 -4px 10px rgba(120,70,10,.45)" }}>
        {busy ? <Loader2 className="h-8 w-8 animate-spin text-emerald-950" /> : stopIcon ? <Square className="h-7 w-7 text-emerald-950" /> : <Mic className="h-9 w-9 text-emerald-950 [@media(max-height:719px)]:h-7 [@media(max-height:719px)]:w-7" />}
      </span>
    </button>
  );
}

function Waveform({ active, getLevel }: { active: boolean; getLevel?: (() => number) | undefined }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const tick = () => {
      const lvl = getLevel ? getLevel() : 0.5 + 0.5 * Math.sin(Date.now() / 180);
      bars.current.forEach((b, i) => { if (b) b.style.transform = `scaleY(${Math.max(0.15, Math.min(1, lvl * (0.4 + Math.abs(Math.sin(i * 1.7 + Date.now() / 140))) ))})`; });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, getLevel]);
  return (
    <div aria-hidden="true" dir="ltr" className="flex h-5 w-16 shrink-0 items-center justify-end gap-[3px]">
      {Array.from({ length: 11 }, (_, i) => (
        <span key={i} ref={(el) => { bars.current[i] = el; }} className="h-5 w-[2px] origin-center rounded-full transition-transform duration-75"
          style={{ background: active ? GOLD_B : "rgba(244,233,200,.35)", transform: `scaleY(${0.2 + 0.6 * Math.abs(Math.sin(i * 0.9))})` }} />
      ))}
    </div>
  );
}

export default ReciteBar;
