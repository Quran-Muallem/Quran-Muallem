/**
 * v52 lush storybook art for Kids Mode: illustrated adventure badges (no faces, no figures), a rolling
 * meadow backdrop, floating sparkles and a golden star meter. Pure SVG/CSS — no image assets.
 */
import { useId } from "react";
import { cn } from "@/lib/utils";

export type KidsBadgeId = "mushaf" | "stories" | "tafsir" | "journey";

export function KidsBadge({ id, className }: { id: KidsBadgeId; className?: string }) {
  const u = useId().replace(/:/g, "");
  const g = (n: string) => `${n}-${u}`;
  return (
    <svg viewBox="0 0 100 100" className={cn("h-24 w-24", className)} aria-hidden="true">
      <defs>
        <radialGradient id={g("halo")} cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#fff7e0" /></radialGradient>
        <linearGradient id={g("gold")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe58a" /><stop offset="1" stopColor="#f2a516" /></linearGradient>
        <linearGradient id={g("teal")} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#0d8f81" /></linearGradient>
        <linearGradient id={g("dusk")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c6cf0" /><stop offset="1" stopColor="#f9a8d4" /></linearGradient>
        <linearGradient id={g("night")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#312e81" /><stop offset="1" stopColor="#7c3aed" /></linearGradient>
        <linearGradient id={g("sky")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bae6fd" /><stop offset="1" stopColor="#e0f2fe" /></linearGradient>
      </defs>
      {/* medallion with a soft 3D rim */}
      <circle cx="50" cy="53" r="46" fill="rgba(0,0,0,.12)" />
      <circle cx="50" cy="50" r="46" fill={`url(#${g("halo")})`} />
      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="3" />
      {id === "mushaf" && (<>
        <circle cx="50" cy="50" r="38" fill={`url(#${g("sky")})`} />
        <path d="M18 70 Q50 58 82 70 V76 Q50 64 18 76 Z" fill="#86efac" />
        {/* open book on a rehal */}
        <path d="M30 74 L50 62 L70 74" fill="none" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 40 Q38 33 22 36 V64 Q38 61 50 68 Z" fill="#fffdf5" stroke={`url(#${g("teal")})`} strokeWidth="3" strokeLinejoin="round" />
        <path d="M50 40 Q62 33 78 36 V64 Q62 61 50 68 Z" fill="#fffdf5" stroke={`url(#${g("teal")})`} strokeWidth="3" strokeLinejoin="round" />
        <path d="M28 44 Q37 42 45 46 M28 50 Q37 48 45 52 M28 56 Q37 54 45 58 M55 46 Q63 42 72 44 M55 52 Q63 48 72 50 M55 58 Q63 54 72 56" stroke="#0d8f81" strokeWidth="1.8" strokeLinecap="round" opacity=".55" fill="none" />
        <path d="M58 36 V50 L61 47 L64 50 V35" fill="#fb7185" />
        <path d="M50 18 l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2z" fill={`url(#${g("gold")})`} className="kd-float" style={{ transformOrigin: "50px 25px" }} />
        <circle cx="30" cy="26" r="2" fill="#fbbf24" /><circle cx="72" cy="24" r="2.4" fill="#fbbf24" />
      </>)}
      {id === "stories" && (<>
        <circle cx="50" cy="50" r="38" fill={`url(#${g("dusk")})`} />
        <circle cx="66" cy="34" r="8" fill={`url(#${g("gold")})`} />
        <path d="M12 66 Q30 50 50 62 Q70 74 88 58 V88 H12 Z" fill="#fcd9a5" />
        <path d="M12 74 Q34 62 54 72 Q72 80 88 70 V88 H12 Z" fill="#f4b46a" />
        {/* dotted journey path to the Kaaba */}
        <path d="M20 82 Q34 70 46 72 Q56 74 58 64" fill="none" stroke="#fff" strokeWidth="2.4" strokeDasharray="1 5" strokeLinecap="round" />
        <rect x="52" y="48" width="16" height="16" rx="1.5" fill="#1f2937" />
        <rect x="52" y="52" width="16" height="3" fill={`url(#${g("gold")})`} />
        <path d="M30 60 l-6 8 h12 z M30 54 l-5 8 h10 z" fill="#15803d" />
      </>)}
      {id === "tafsir" && (<>
        <circle cx="50" cy="50" r="38" fill={`url(#${g("night")})`} />
        <path d="M40 22 a14 14 0 1 0 14 22 a11 11 0 1 1 -14 -22z" fill={`url(#${g("gold")})`} />
        {/* lantern (fanous) with glow */}
        <circle cx="62" cy="62" r="16" fill="#fde68a" opacity=".35" />
        <path d="M62 38 V44" stroke="#fde68a" strokeWidth="2" />
        <path d="M56 46 H68 L66 44 H58 Z" fill="#f59e0b" />
        <path d="M55 48 H69 L72 62 L62 74 L52 62 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="2" strokeLinejoin="round" />
        <path d="M62 50 V70 M57 56 L67 56 M56 62 H68" stroke="#b45309" strokeWidth="1.5" opacity=".7" />
        <circle cx="62" cy="61" r="3.5" fill="#fff7d6" />
        <circle cx="30" cy="62" r="1.8" fill="#fff" /><circle cx="36" cy="74" r="1.3" fill="#fff" /><circle cx="74" cy="30" r="1.5" fill="#fff" />
      </>)}
      {id === "journey" && (<>
        <circle cx="50" cy="50" r="38" fill="#fff4cc" />
        <path d="M38 64 L32 86 L42 80 L48 88 L50 66 Z" fill="#fb7185" />
        <path d="M62 64 L68 86 L58 80 L52 88 L50 66 Z" fill="#14b8a6" />
        <path d="M50 16 L59 36 L81 38 L64 52 L69 74 L50 62 L31 74 L36 52 L19 38 L41 36 Z" fill={`url(#${g("gold")})`} stroke="#c97d00" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M44 32 L48 24" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
        <path d="M78 20 l1.6 3.6 3.6 1.6-3.6 1.6-1.6 3.6-1.6-3.6-3.6-1.6 3.6-1.6z" fill="#f59e0b" className="kd-float" style={{ transformOrigin: "78px 25px" }} />
      </>)}
    </svg>
  );
}

/** Rolling meadow hills fixed to the bottom of the kids canvas (behind the content). */
export function KidsMeadow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 220" preserveAspectRatio="none" className="pointer-events-none fixed bottom-0 left-1/2 -z-0 h-[34vh] w-full max-w-md -translate-x-1/2">
      <path d="M0 120 Q80 70 170 110 T400 90 V220 H0 Z" fill="var(--kd-hill-1, #bbf7d0)" />
      <path d="M0 160 Q120 110 230 150 T400 140 V220 H0 Z" fill="var(--kd-hill-2, #86efac)" />
      <path d="M0 196 Q140 166 260 190 T400 186 V220 H0 Z" fill="var(--kd-hill-3, #4ade80)" opacity=".85" />
      {[[60, 150], [300, 168], [180, 182], [350, 140]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}><circle r="3" fill="#fde047" /><circle r="1.3" fill="#f97316" /></g>
      ))}
    </svg>
  );
}

/** Floating sparkles over a card. */
export function Sparkles({ count = 4, seed = 0 }: { count?: number; seed?: number }) {
  const spots = [[12, 18], [84, 14], [70, 78], [22, 70], [50, 8], [92, 52]];
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {spots.slice(0, count).map(([x, y], i) => (
        <span key={i} className="kd-twinkle absolute text-white" style={{ left: `${x}%`, top: `${y}%`, fontSize: 10 + ((i + seed) % 3) * 5, animationDelay: `${((i + seed) * 0.55) % 2.4}s` }}>✦</span>
      ))}
    </span>
  );
}

/** Golden star meter towards the next badge (every 10 stars). */
export function StarMeter({ stars, label, sub }: { stars: number; label: string; sub: string }) {
  const goal = Math.max(10, Math.ceil((stars + 1) / 10) * 10);
  const into = stars - (goal - 10);
  return (
    <div className="space-y-1.5" data-kids-star-meter={`${stars}/${goal}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="whitespace-nowrap text-[1rem] font-black">⭐ {label}</span>
        <span className="text-[0.8rem] font-bold kd-ink-soft">{sub}</span>
      </div>
      <div className="relative h-7 overflow-hidden rounded-full" style={{ background: "rgba(245,158,11,.16)", boxShadow: "inset 0 2px 0 rgba(0,0,0,.06)" }}>
        <div className="kd-shine absolute inset-y-0 start-0 rounded-full" style={{ width: `${Math.max(8, (into / 10) * 100)}%`, background: "linear-gradient(180deg,#ffe58a,#f59e0b)", boxShadow: "0 0 14px rgba(251,191,36,.8)" }} />
        <div className="absolute inset-0 grid grid-cols-10 items-center px-1">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="text-center text-[0.8rem] leading-none" style={{ opacity: i < into ? 1 : 0.35, filter: i < into ? "drop-shadow(0 0 3px #fff7)" : "grayscale(1)" }}>⭐</span>
          ))}
        </div>
      </div>
    </div>
  );
}
