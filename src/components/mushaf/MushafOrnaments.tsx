import { useId, type CSSProperties, type ReactNode } from "react";
import { toArabicDigits } from "@/lib/quranService";
import { cn } from "@/lib/utils";

/* Mushaf palette (dark emerald page, cream text, antique gold). */
export const PAGE_BG = "var(--mf-page)";
export const PAGE_BG_HI = "var(--mf-page-hi)";
export const PAGE_BG_DEEP = "var(--mf-page-deep)";
export const INK = "var(--mf-ink)";
export const GOLD_A = "var(--mf-gold-a)";
export const GOLD_B = "var(--mf-gold-b)";
export const GOLD_C = "var(--mf-gold-c)";
import { alpha } from "@/components/ornaments";
export { alpha };

const goldStops = (id: string) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stopColor={GOLD_B} /><stop offset=".45" stopColor={GOLD_A} /><stop offset=".7" stopColor="#fbe7a6" /><stop offset="1" stopColor={GOLD_C} />
  </linearGradient>
);

/** Eight-fold rosette (girih star inside a scalloped ring). */
export function Rosette({ className, style }: { className?: string; style?: CSSProperties }) {
  const id = `ros-${useId().replace(/:/g, "")}`;
  const petals = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden="true">
      <defs>{goldStops(id)}</defs>
      <g fill="none" stroke={`url(#${id})`}>
        <circle cx="50" cy="50" r="46" strokeWidth="2.2" />
        {petals.map((a) => <path key={a} d="M50 6 C56 14 56 20 50 26 C44 20 44 14 50 6Z" strokeWidth="1.3" transform={`rotate(${a} 50 50)`} />)}
        <rect x="27" y="27" width="46" height="46" strokeWidth="1.6" />
        <rect x="27" y="27" width="46" height="46" strokeWidth="1.6" transform="rotate(45 50 50)" />
        <circle cx="50" cy="50" r="13" strokeWidth="1.4" />
        {petals.filter((_, i) => i % 2 === 0).map((a) => <path key={a} d="M50 37 L53 45 L50 50 L47 45Z" strokeWidth="1" transform={`rotate(${a} 50 50)`} />)}
      </g>
      <circle cx="50" cy="50" r="3.2" fill={GOLD_B} />
    </svg>
  );
}

/** Corner arabesque: interlaced quarter rosette with scrolls. */
function Corner({ className }: { className?: string }) {
  const id = `cor-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden="true">
      <defs>{goldStops(id)}</defs>
      <g fill="none" stroke={`url(#${id})`} strokeWidth="1.4">
        <path d="M4 56 V4 H56" strokeWidth="2" />
        <path d="M10 56 V10 H56" />
        <path d="M10 30 C22 30 30 22 30 10" />
        <path d="M10 22 C18 22 22 18 22 10" />
        <path d="M30 10 C30 18 36 24 44 24 C50 24 54 20 54 16" />
        <path d="M10 30 C18 30 24 36 24 44 C24 50 20 54 16 54" />
        <circle cx="22" cy="22" r="5" />
        <circle cx="22" cy="22" r="1.6" fill={GOLD_B} />
      </g>
    </svg>
  );
}

/** The page: double gold border, rosettes on both sides, ornate corners. */
export function PageFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative mx-1", className)}>
      <div className="relative rounded-[6px] p-[3px] shadow-[0_18px_50px_-20px_rgba(0,0,0,.8)]"
        style={{ background: `linear-gradient(135deg, ${GOLD_B}, ${GOLD_A} 30%, #fbe7a6 50%, ${GOLD_A} 70%, ${GOLD_C})` }}>
        <div className="rounded-[4px] p-[5px]" style={{ background: PAGE_BG_DEEP }}>
          <div className="relative rounded-[3px] px-2 pb-2.5 pt-2 sm:px-5"
            style={{ boxShadow: `inset 0 0 0 1.5px ${GOLD_A}, inset 0 0 0 4px ${PAGE_BG_DEEP}, inset 0 0 0 5px ${alpha(GOLD_B, 0.53)}`, background: `radial-gradient(120% 70% at 50% 35%, var(--mf-page-hi) 0%, ${PAGE_BG} 55%, ${PAGE_BG_DEEP} 100%)` }}>
            {children}
          </div>
        </div>
      </div>
      {(["-left-1 -top-1", "-right-1 -top-1 rotate-90", "-left-1 -bottom-1 -rotate-90", "-right-1 -bottom-1 rotate-180"] as const).map((pos) => (
        <Corner key={pos} className={cn("pointer-events-none absolute h-9 w-9", pos)} />
      ))}
      {/* No rosettes on the side margins: they covered the text of lines 8–9 on narrow screens. */}
    </div>
  );
}

/** إطار اسم السورة: framed banner with arabesque side panels and a gold cartouche in the middle. */
export function SurahBanner({ name, height }: { name: string; height: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="relative w-full" style={{ height }} dir="rtl" lang="ar">
      <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          {goldStops(`bg-${id}`)}
          <pattern id={`ar-${id}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <g fill="none" stroke={GOLD_A} strokeWidth=".8" opacity=".9">
              <circle cx="10" cy="10" r="6" /><circle cx="0" cy="0" r="6" /><circle cx="20" cy="0" r="6" /><circle cx="0" cy="20" r="6" /><circle cx="20" cy="20" r="6" />
              <path d="M10 4 L12 10 L10 16 L8 10Z" />
            </g>
          </pattern>
        </defs>
        <rect x="1.5" y="1.5" width="397" height="57" rx="3" fill={PAGE_BG_DEEP} stroke={`url(#bg-${id})`} strokeWidth="2.4" />
        <rect x="6" y="6" width="388" height="48" rx="2" fill={`url(#ar-${id})`} stroke={GOLD_B} strokeOpacity=".6" strokeWidth=".9" />
        {/* cartouche */}
        <path d="M118 8 H282 Q300 8 312 30 Q300 52 282 52 H118 Q100 52 88 30 Q100 8 118 8Z" fill="var(--mf-page-deep)" stroke={`url(#bg-${id})`} strokeWidth="2" />
        <path d="M121 12 H279 Q294 12 304 30 Q294 48 279 48 H121 Q106 48 96 30 Q106 12 121 12Z" fill="none" stroke={GOLD_B} strokeOpacity=".55" strokeWidth=".8" />
        <circle cx="80" cy="30" r="5" fill="none" stroke={GOLD_B} strokeWidth="1" /><circle cx="320" cy="30" r="5" fill="none" stroke={GOLD_B} strokeWidth="1" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-quran leading-none"
        style={{ fontSize: height * 0.46, color: GOLD_B, textShadow: "0 0 10px rgba(243,210,122,.35)" }}>
        {name}
      </span>
    </div>
  );
}

export const BASMALAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";

export function BasmalaLine({ height }: { height: number }) {
  return (
    <div className="flex w-full items-center justify-center" style={{ height }} dir="rtl" lang="ar">
      <span className="font-quran"
        style={{
          fontSize: height * 0.56, lineHeight: 1.9, paddingInline: "0.2em",
          backgroundImage: `linear-gradient(180deg, #fff2c4, ${GOLD_B} 45%, ${GOLD_A})`,
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          filter: "drop-shadow(0 0 8px rgba(243,210,122,.45))",
        }}>
        {BASMALAH_TEXT}
      </span>
    </div>
  );
}

/** End-of-verse medallion with Eastern Arabic numerals. */
export function AyahMedallion({ n, tone = "gold", className }: { n: number; tone?: "gold" | "memorized" | "revision"; className?: string }) {
  const color = tone === "memorized" ? "var(--color-emerald-300)" : tone === "revision" ? "var(--color-orange-300)" : GOLD_B;
  const digits = toArabicDigits(n);
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center align-middle", className)} style={{ width: "1.32em", height: "1.32em" }} aria-label={`آية ${digits}`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <g fill="none" stroke={color} strokeWidth="1.4">
          {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={20 + 15 * Math.cos((i * Math.PI) / 6)} cy={20 + 15 * Math.sin((i * Math.PI) / 6)} r="4.2" strokeWidth=".9" opacity=".85" />)}
          <circle cx="20" cy="20" r="13" fill={PAGE_BG_DEEP} />
          <circle cx="20" cy="20" r="10.5" strokeWidth=".8" opacity=".7" />
        </g>
      </svg>
      <span className="relative font-arabic leading-none" style={{ color, fontSize: digits.length > 2 ? "0.42em" : "0.5em" }}>{digits}</span>
    </span>
  );
}

/** Page number at the foot of the page. */
export function PageNumber({ n }: { n: number }) {
  return (
    <div className="mt-1.5 flex items-center justify-center gap-2" dir="rtl">
      <span className="h-px w-10" style={{ background: `linear-gradient(90deg, transparent, ${GOLD_A})` }} />
      <span className="font-arabic text-sm" style={{ color: GOLD_B }}>{toArabicDigits(n)}</span>
      <span className="h-px w-10" style={{ background: `linear-gradient(90deg, ${GOLD_A}, transparent)` }} />
    </div>
  );
}
