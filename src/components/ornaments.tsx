import { useId, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { directionFor, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_NAME_ARABIC, APP_NAME_LATIN, assetUrl } from "@/lib/assets";

/* Shared palette: deep emerald with ornate gold frames. */
/* Theme colours (see styles.css: emerald / light / dark). */
export const EMERALD = "var(--hq-emerald)";
export const EMERALD_HI = "var(--hq-emerald-hi)";
export const EMERALD_DEEP = "var(--hq-emerald-deep)";
export const GOLD = "var(--hq-gold)";
export const GOLD_LIGHT = "var(--hq-gold-light)";
export const GOLD_GRADIENT = `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`;
/** A theme colour with transparency (0–1). */
export const alpha = (color: string, a: number) => `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;

/** Double gold frame with eight-point star ornaments in the corners. */
export function GoldFrame({ children, className }: { children: ReactNode; className?: string }) {
  const pid = `lattice-${useId().replace(/:/g, "")}`;
  return (
    <div className={cn("relative rounded-[1.75rem] p-[2px]", className)}
      style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD} 35%, #fde68a 55%, ${GOLD} 75%, ${GOLD_LIGHT})` }}>
      <div className="relative overflow-hidden rounded-[calc(1.75rem-2px)]"
        style={{ background: `radial-gradient(120% 70% at 50% 0%, var(--hq-emerald-hi) 0%, ${EMERALD} 55%, var(--hq-emerald-deep) 100%)` }}>
        {/* subtle geometric lattice */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]">
          <defs>
            <pattern id={pid} width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M18 0 L36 18 L18 36 L0 18 Z M18 8 L28 18 L18 28 L8 18 Z" fill="none" stroke={GOLD_LIGHT} strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${pid})`} />
        </svg>
        {/* inner hairline frame */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-[1.4rem]" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.60)}` }} />
        {(["top-0.5 start-0.5", "top-0.5 end-0.5", "bottom-0.5 start-0.5", "bottom-0.5 end-0.5"] as const).map((pos) => (
          <Star key={pos} className={cn("pointer-events-none absolute h-6 w-6", pos)} />
        ))}
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

export function Star({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <g fill="none" stroke={GOLD_LIGHT} strokeWidth="1.2">
        <rect x="6" y="6" width="12" height="12" />
        <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
      </g>
      <circle cx="12" cy="12" r="1.8" fill={GOLD_LIGHT} />
    </svg>
  );
}

export function Medallion() {
  return (
    <div aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center">
      <svg viewBox="0 0 64 64" className="h-16 w-16 drop-shadow-[0_0_14px_rgba(251,191,36,.45)]">
        <defs>
          <linearGradient id="medal-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={GOLD_LIGHT} />
            <stop offset="1" stopColor={GOLD} />
          </linearGradient>
        </defs>
        <rect x="14" y="14" width="36" height="36" rx="3" fill="url(#medal-gradient)" />
        <rect x="14" y="14" width="36" height="36" rx="3" fill="url(#medal-gradient)" transform="rotate(45 32 32)" />
        <circle cx="32" cy="32" r="15" fill={EMERALD} stroke="#fde68a" strokeWidth="1.2" />
        {/* open book */}
        <path d="M23 27.5c3.2-1.2 6.2-.9 9 1v11c-2.8-1.9-5.8-2.2-9-1z M41 27.5c-3.2-1.2-6.2-.9-9 1v11c2.8-1.9 5.8-2.2 9-1z"
          fill="none" stroke={GOLD_LIGHT} strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Divider() {
  return (
    <div aria-hidden="true" className="mx-auto mt-4 flex max-w-[12rem] items-center gap-2">
      <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
      <Star className="h-3.5 w-3.5" />
      <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
    </div>
  );
}


/** Emerald/gold modal shell shared by the auth, settings and reciter dialogs. */
export function GoldDialog({ open, onOpenChange, dismissible = true, busy = false, title, description, children, closeLabel, className }: {
  open: boolean;
  onOpenChange?: ((open: boolean) => void) | undefined;
  dismissible?: boolean;
  busy?: boolean;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  className?: string;
}) {
  const { language } = useI18n();
  const block = (e: Event) => { if (!dismissible || busy) e.preventDefault(); };
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (dismissible && !busy) onOpenChange?.(o); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content dir={directionFor(language)} lang={language}
          onEscapeKeyDown={block} onPointerDownOutside={block} onInteractOutside={block}
          className={cn("fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.75rem] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className)}>
          <GoldFrame className="shadow-[0_0_60px_-10px_rgba(251,191,36,.45)]">
            {dismissible && (
              <DialogPrimitive.Close disabled={busy} aria-label={closeLabel ?? (language === "ar" ? "إغلاق" : "Close")}
                className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-amber-200/80 transition hover:bg-white/10 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-amber-300">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            )}
            <header className="px-6 pt-7 text-center">
              <DialogPrimitive.Title className="font-arabic text-2xl leading-snug" style={{ color: GOLD_LIGHT }}>{title}</DialogPrimitive.Title>
              {description
                ? <DialogPrimitive.Description className="mt-1 text-sm text-emerald-100/70">{description}</DialogPrimitive.Description>
                : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
              <Divider />
            </header>
            <div className="px-6 pb-6 pt-2">{children}</div>
          </GoldFrame>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Two-line name lockup: «معلم القرآن» in Arabic calligraphy over "QURAN MUALLEM". */
export function AppWordmark({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const ar = { sm: "text-xl", md: "text-[1.7rem]", lg: "text-[3.4rem]" }[size];
  const la = { sm: "text-[0.6rem]", md: "text-[0.7rem]", lg: "text-sm" }[size];
  return (
    <span className={cn("inline-flex flex-col leading-none", className)} aria-label={APP_NAME}>
      <span dir="rtl" lang="ar" className={cn("font-arabic font-bold leading-[1.7]", ar)} style={{ color: GOLD_LIGHT }}>{APP_NAME_ARABIC}</span>
      <span dir="ltr" lang="en" className={cn("mt-1.5 font-sans font-semibold uppercase tracking-[0.22em] text-emerald-50/80", la)}>{APP_NAME_LATIN}</span>
    </span>
  );
}

/** The app icon. */
export function AppLogo({ className }: { className?: string }) {
  return <img src={assetUrl("logo-mark-512.png")} alt={APP_NAME} width={192} height={192} className={cn("rounded-[22%] shadow-[0_8px_24px_-8px_rgba(0,0,0,.6)]", className)} />;
}
