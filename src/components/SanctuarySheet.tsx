/**
 * v53 full-screen "Warm Sanctuary" sub-view for Settings & co. Replaces the old centred gold dialog, whose
 * nested scroll container snapped back to the top on Android and whose title collided with the status bar.
 *  • one stable scroll container (`overflow-y:auto`, momentum scrolling, `overscroll-behavior: contain`)
 *    that is never remounted while open → no snap-back when state changes re-render the content;
 *  • header padded by `env(safe-area-inset-top)` so title and ✕ never sit under the clock;
 *  • slides in from the inline end; sub-pages slide with `pageKey` (scroll resets only on page change).
 */
import { useBackLayer } from "@/lib/backStack";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { directionFor, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function SanctuarySheet({ open, onClose, title, subtitle, onBack, backLabel, pageKey, children, dataAttr, closable = true }: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode | undefined;
  /** When set, a «‹ Back» button replaces nothing — it sits before the title. */
  onBack?: (() => void) | undefined; backLabel?: string | undefined;
  /** Changes when a sub-page opens/closes: drives the slide and restores the scroll position. */
  pageKey?: string | undefined; children: ReactNode; dataAttr?: Record<string, string> | undefined;
  /** false while a blocking task runs (no ✕, no Escape). */
  closable?: boolean;
}) {
  const { t, language } = useI18n();
  const rtl = directionFor(language) === "rtl";
  const scroller = useRef<HTMLDivElement>(null);
  const saved = useRef<Record<string, number>>({});
  const prevKey = useRef<string | undefined>(pageKey);
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) { setMounted(true); const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }
    setShown(false);
    const id = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(id);
  }, [open]);

  // Lock the page behind the sheet (no scroll chaining / pull-to-refresh bounce).
  useEffect(() => {
    if (!open) return;
    const b = document.body, prev = b.style.overflow;
    b.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && closable) (onBack ?? onClose)(); };
    window.addEventListener("keydown", key);
    return () => { b.style.overflow = prev; window.removeEventListener("keydown", key); };
  }, [open, onBack, onClose, closable]);

  // v53.1: Android back button steps back one level (sub-page → index → closed).
  useBackLayer(open && closable, () => (onBack ?? onClose)());

  // Scroll position: remembered per page; a newly opened sub-page starts at the top, «back» restores.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || prevKey.current === pageKey) return;
    saved.current[prevKey.current ?? "index"] = el.scrollTop;
    el.scrollTop = saved.current[pageKey ?? "index"] ?? 0;
    prevKey.current = pageKey;
  }, [pageKey]);

  if (!mounted) return null;
  const Back = rtl ? ChevronRight : ChevronLeft;
  return createPortal(
    <div className="fixed inset-0 z-[60]" dir={rtl ? "rtl" : "ltr"} lang={language} {...dataAttr}>
      <button type="button" aria-label={t("close")} onClick={closable ? onClose : undefined} tabIndex={-1}
        className={cn("absolute inset-0 bg-[rgba(4,20,15,.55)] backdrop-blur-[3px] transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")} />
      <section role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}
        className="absolute inset-0 flex w-full flex-col rounded-none transition-[transform,opacity] duration-[260ms] ease-out"
        style={{ background: "var(--sx-sheet)", color: "var(--sx-ink)", transform: shown ? "translateX(0)" : `translateX(${rtl ? "-" : ""}100%)`, opacity: shown ? 1 : 0.6 }}>
        <header className="shrink-0 px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]"
          style={{ background: "var(--sx-sheet-top)", borderBottom: "1px solid var(--sx-card-border)" }}>
          <div className="flex min-h-[48px] items-center gap-2">
            {onBack ? (
              <button type="button" onClick={onBack} data-sheet-back="" className="sx-chip flex h-11 max-w-[38%] shrink-0 items-center gap-1 rounded-2xl pe-3 ps-2 text-[0.95rem] font-bold">
                <Back className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="truncate">{backLabel}</span>
              </button>
            ) : <span className="w-11 shrink-0" aria-hidden="true" />}
            <h2 data-sheet-title="" className={cn("line-clamp-2 min-w-0 flex-1 text-center text-[1.2rem] font-extrabold leading-tight", language === "ar" && "font-arabic text-[1.4rem]")}>{title}</h2>
            {closable
              ? <button type="button" onClick={onClose} aria-label={t("close")} data-sheet-close="" className="sx-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"><X className="h-5 w-5" /></button>
              : <span className="w-11 shrink-0" aria-hidden="true" />}
          </div>
          {subtitle && <p className="mt-1 text-center text-[0.9rem] sx-ink-soft">{subtitle}</p>}
        </header>
        <div ref={scroller} data-sheet-scroll=""
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 [-webkit-overflow-scrolling:touch]">
          <div key={pageKey ?? "index"} className={cn("animate-in fade-in duration-200", rtl ? "slide-in-from-left-6" : "slide-in-from-right-6")}>{children}</div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default SanctuarySheet;
