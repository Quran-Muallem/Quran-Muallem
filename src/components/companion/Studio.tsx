/**
 * v52 "Guided Companion Studio" — shared building blocks for the two setup screens of «المرافق»
 * (رفيق الصلاة / المراجعة الحرة): a theme-aware shell (parchment / frosted emerald), section cards,
 * visual prayer cards with rakʿah dots, illustrated pocket cards and a glowing start button.
 * The running (pitch-black) prayer screens are untouched.
 */
import type { ReactNode } from "react";
import { StarLattice } from "@/components/HomeActionCards";
import { cn } from "@/lib/utils";

export function StudioShell({ children, data, onClose, closeLabel, title, intro, switcher }: {
  children: ReactNode; data: Record<string, string>; onClose: () => void; closeLabel: string; title: ReactNode; intro: ReactNode; switcher?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[35] overflow-y-auto" style={{ background: "var(--sx-canvas)", color: "var(--sx-ink)" }} {...data}>
      <div className="relative mx-auto flex min-h-full max-w-md flex-col gap-4 px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <StarLattice id="sx-studio-lattice" opacity={0.04} className="!h-64" />
        <div className="relative">{switcher}</div>
        {/* v52.1: no close button in setup — the app's bottom bar stays visible to leave; the running
            session keeps its own stop control */}
        <div className="relative" data-close-label={closeLabel} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
          <div className="min-w-0">
            <h1 className="font-arabic text-[2rem] font-extrabold leading-tight" style={{ color: "var(--sx-ink)" }}>{title}</h1>
            <p className="mt-1 text-[0.98rem] leading-relaxed sx-ink-soft">{intro}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StudioCard({ title, icon, children, className, ...rest }: { title?: ReactNode; icon?: ReactNode; children: ReactNode; className?: string } & Record<`data-${string}`, string>) {
  return (
    <section className={cn("sx-card relative space-y-3 p-4", className)} {...rest}>
      {title && <h2 className="flex items-center gap-2 text-[1.05rem] font-extrabold sx-ink">{icon && <span className="flex h-8 w-8 items-center justify-center rounded-xl sx-chip" style={{ color: "var(--sx-gold)" }}>{icon}</span>}{title}</h2>}
      {children}
    </section>
  );
}

/** Pill / tile choice styling (selected = emerald fill with a gold ring). */
export const studioChoice = (on: boolean, extra?: string) =>
  cn("sx-press min-h-[52px] rounded-2xl px-3 py-2.5 text-[0.98rem] font-bold transition", on
    ? "bg-[var(--sx-primary)] text-[#ffffff] shadow-[0_8px_20px_-10px_rgba(15,81,50,.9),inset_0_0_0_2px_var(--sx-gold)] [html:not([data-theme])_&]:bg-[#1f7a56]"
    : "sx-chip sx-ink", extra);

export function StudioSlider({ id, label, value, display, min, max, step, onChange, data }: {
  id: string; label: ReactNode; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void; data: Record<string, string>;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-[0.98rem]">
        <label htmlFor={id} className="flex items-center gap-1.5 font-semibold sx-ink">{label}</label>
        <span className="rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums sx-chip" dir="ltr" style={{ color: "var(--sx-gold-soft)" }}>{display}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} {...data}
        className="sx-range h-3 w-full cursor-pointer appearance-none rounded-full"
        style={{ background: `linear-gradient(to right, var(--sx-gold) ${pct}%, var(--sx-chip) ${pct}%)` }} />
    </div>
  );
}

/** Rakʿah dots: ● with a surah after al-Fātiḥah, ○ al-Fātiḥah only. */
export function RakahDots({ total, full, color = "var(--sx-gold)" }: { total: number | null; full: number; color?: string }) {
  if (total == null) return <span aria-hidden="true" className="text-lg font-bold leading-none" style={{ color }}>∞</span>;
  return (
    <span aria-hidden="true" className="flex items-center justify-center gap-1" dir="ltr">
      {Array.from({ length: Math.min(total, 11) }, (_, i) => (
        <span key={i} className="h-2.5 w-2.5 rounded-full" style={i < full ? { background: color } : { boxShadow: `inset 0 0 0 1.6px ${color}` }} />
      ))}
    </span>
  );
}

export function PrayerCard({ on, name, sub, total, full, onClick, data, latin = false }: { latin?: boolean; on: boolean; name: string; sub: string; total: number | null; full: number; onClick: () => void; data: Record<string, string> }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} {...data}
      className={cn("sx-press relative flex min-h-[6rem] flex-col items-center justify-center gap-1.5 rounded-[20px] px-2 py-3 text-center transition",
        on ? "text-[#ffffff] shadow-[0_12px_26px_-12px_rgba(15,81,50,.9)]" : "sx-card !rounded-[20px]")}
      style={on ? { background: "linear-gradient(150deg,#0f5132,#1d7b59)", boxShadow: "inset 0 0 0 2px #d4af37, 0 12px 26px -12px rgba(15,81,50,.9)" } : undefined}>
      <span className={cn("font-extrabold", latin ? "text-[1.02rem] leading-tight" : "font-arabic text-[1.3rem] leading-none", !on && "sx-ink")} data-prayer-name="">{name}</span>
      <RakahDots total={total} full={full} color={on ? "#f3d27a" : "var(--sx-gold)"} />
      <span className={cn("text-[0.82rem] font-semibold", on ? "text-[#ffffffd9]" : "sx-ink-soft")}>{sub}</span>
    </button>
  );
}

/* ── pocket illustrations (stroke = ink, phone = gold) ── */
const ink = "var(--sx-ink-soft)";
function Phone({ x, y, w = 9, h = 15, r = 0 }: { x: number; y: number; w?: number; h?: number; r?: number }) {
  return (
    <g transform={`rotate(${r} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} rx="2" fill="#d4af37" stroke="#8a6a12" strokeWidth="1.2" />
      <rect x={x + 1.6} y={y + 2} width={w - 3.2} height={h - 4.6} rx="0.8" fill="#0f5132" opacity="0.85" />
    </g>
  );
}
export function PocketArt({ kind }: { kind: "chest" | "trousers" | "jacket" | "none" }) {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden="true" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {kind === "chest" && (<>
        <path d="M22 8 L14 13 L8 26 L15 29 L18 22 V56 H46 V22 L49 29 L56 26 L50 13 L42 8 Q32 16 22 8 Z" fill="var(--sx-chip)" />
        <path d="M36 24 H46 V35 H36 Z" />
        <Phone x={37.5} y={19} w={7} h={12} />
        <path d="M32 14 V54" strokeDasharray="1 4" />
      </>)}
      {kind === "trousers" && (<>
        <path d="M16 8 H48 L52 58 H37 L32 26 L27 58 H12 Z" fill="var(--sx-chip)" />
        <path d="M16 14 H48" />
        <path d="M19 15 Q22 26 30 22" />
        <Phone x={20} y={17} w={8} h={13} r={-14} />
      </>)}
      {kind === "jacket" && (<>
        <path d="M20 8 L10 14 L6 56 H24 V30 L32 14 L40 30 V56 H58 L54 14 L44 8 L32 14 Z" fill="var(--sx-chip)" />
        <path d="M44 38 H54" /><path d="M10 38 H20" />
        <Phone x={45} y={30} w={8} h={13} />
      </>)}
      {kind === "none" && (<>
        <path d="M10 52 H54" />
        <path d="M18 52 Q20 40 32 40 Q44 40 46 52" fill="var(--sx-chip)" />
        <Phone x={26} y={16} w={12} h={20} />
        <path d="M32 40 V36" />
      </>)}
    </svg>
  );
}

export function PlacementCard({ on, kind, label, onClick, data }: { on: boolean; kind: "chest" | "trousers" | "jacket" | "none"; label: string; onClick: () => void; data: Record<string, string> }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} {...data}
      className={cn("sx-press flex min-h-[8.5rem] flex-col items-center justify-center gap-2 rounded-[20px] px-2 py-3 text-center transition", on ? "" : "sx-card !rounded-[20px]")}
      style={on ? { background: "color-mix(in srgb, var(--sx-gold) 16%, var(--sx-card))", boxShadow: "inset 0 0 0 2.5px var(--sx-gold), 0 12px 26px -14px rgba(212,175,55,.8)" } : undefined}>
      <span className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[18px] sx-chip"><PocketArt kind={kind} /></span>
      <span className="text-[0.95rem] font-bold leading-snug sx-ink">{label}</span>
    </button>
  );
}

/** Big glowing start button with a soft pulse ring. */
export function GlowStart({ onClick, disabled, children, data, tone = "gold" }: { onClick: () => void; disabled?: boolean; children: ReactNode; data: Record<string, string>; tone?: "gold" | "emerald" }) {
  const bg = tone === "gold" ? "linear-gradient(135deg,#f3d27a 0%,#d4af37 55%,#b8901f 100%)" : "linear-gradient(135deg,#1d9a6c 0%,#0f6b48 55%,#0f5132 100%)";
  return (
    <div className="sticky bottom-[calc(5.4rem+env(safe-area-inset-bottom))] z-10 -mx-5 mt-auto px-5 pb-1 pt-4" style={{ background: "linear-gradient(to top, var(--sx-studio-fade, rgba(0,0,0,0)) 60%, transparent)" }}>
      <div className="relative isolate">
        <span aria-hidden="true" className={cn("absolute inset-0 rounded-[22px]", !disabled && "sx-pulse")} style={{ background: bg }} />
        <button type="button" onClick={onClick} disabled={disabled} {...data}
          className={cn("sx-press relative flex min-h-[64px] w-full items-center justify-center gap-2.5 rounded-[22px] px-5 text-[1.25rem] font-extrabold disabled:opacity-40",
            tone === "gold" ? "text-[#1b1300]" : "text-[#ffffff]")}
          style={{ background: bg, boxShadow: tone === "gold" ? "0 14px 34px -10px rgba(212,175,55,.85), inset 0 1px 0 rgba(255,255,255,.5)" : "0 14px 34px -10px rgba(15,107,72,.85), inset 0 1px 0 rgba(255,255,255,.3)" }}>
          {children}
        </button>
      </div>
    </div>
  );
}
