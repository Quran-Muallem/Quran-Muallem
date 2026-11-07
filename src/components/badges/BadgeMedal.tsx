import { useId } from "react";
import { BADGE_ICONS } from "@/lib/badgeIconData";
import type { BadgeTier } from "@/lib/badges";
import { surahBadge } from "@/lib/surahBadges";
import { cn } from "@/lib/utils";

const TIERS = {
  gold: { from: "#fbe7a1", mid: "#e0b252", to: "#9a6a12", icon: "#f6dc8f", ring: "#f3d27a" },
  silver: { from: "#ffffff", mid: "#cfd8e3", to: "#7c8a9c", icon: "#e8eef5", ring: "#dfe6ee" },
} as const;

/** Thematic symbol of a surah, drawn like a Lucide icon (24 × 24, stroke 2). */
export function SurahSymbol({ surah, className, color = "currentColor" }: { surah: number; className?: string; color?: string }) {
  const theme = surahBadge(surah);
  if (!theme) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={className} dangerouslySetInnerHTML={{ __html: BADGE_ICONS[theme.icon] }} />
  );
}

/**
 * The badge of a surah: an eight-pointed star (Rub el Hizb) in gold or silver with the surah's symbol
 * in the centre. Without a tier it is shown locked (dim outline).
 */
export function BadgeMedal({ surah, tier, className, shine = false }: { surah: number; tier: BadgeTier | null; className?: string; shine?: boolean }) {
  const id = useId().replace(/:/g, "");
  const c = tier ? TIERS[tier] : null;
  return (
    <svg viewBox="0 0 100 100" className={cn("block", className)} role="img" aria-hidden="true">
      {c && (
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c.from} /><stop offset=".5" stopColor={c.mid} /><stop offset="1" stopColor={c.to} />
          </linearGradient>
          <radialGradient id={`f${id}`} cx=".5" cy=".38" r=".7">
            <stop offset="0" stopColor="#0f5a45" /><stop offset="1" stopColor="#052e23" />
          </radialGradient>
        </defs>
      )}
      <g fill={c ? `url(#g${id})` : "rgba(0,0,0,.22)"} stroke={c ? "rgba(0,0,0,.25)" : "rgba(243,210,122,.32)"} strokeWidth={c ? 0.6 : 1.4}
        strokeDasharray={c ? undefined : "3 3"} strokeLinejoin="round">
        <path d="M50 4 93.5 50 50 96 6.5 50Z" />
        <path d="M17.5 17.5h65v65h-65Z" />
      </g>
      <circle cx="50" cy="50" r="30" fill={c ? `url(#f${id})` : "rgba(0,0,0,.25)"} stroke={c ? c.ring : "rgba(243,210,122,.22)"} strokeWidth={c ? 2.2 : 1.2} />
      {c && <circle cx="50" cy="50" r="25.5" fill="none" stroke={c.ring} strokeOpacity=".35" strokeWidth=".8" strokeDasharray="1.5 2.2" />}
      <svg x="31" y="31" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={c ? c.icon : "rgba(209,250,229,.32)"}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: BADGE_ICONS[surahBadge(surah)?.icon ?? "star"] }} />
      {c && shine && <path d="M22 30 Q50 8 78 30" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="2.5" strokeLinecap="round" className="badge-shine" />}
    </svg>
  );
}
