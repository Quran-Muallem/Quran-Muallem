/**
 * v54: dignified emblems for the adult «قصص القرآن» — a gold Rub el Hizb medallion on emerald with a fine
 * gold line motif and the story's name in Arabic calligraphy. Kids keep their playful emoji tiles.
 */
import type { ReactNode } from "react";

const G = "#d4af37";
const G2 = "#f3d27a";

/** Short calligraphic word written inside each medallion. */
const WORD: Record<string, string> = {
  cave: "الكهف",
  elephant: "الفيل",
  dhulqarnayn: "ذو القرنين",
  gardens: "الجنّتان",
  cow: "البقرة",
  qarun: "قارون",
};

const line = { fill: "none", stroke: G2, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Fine line motifs, drawn in the upper half (y 22–58) of a 120×120 box. */
const MOTIF: Record<string, ReactNode> = {
  // cave mouth under a crescent
  cave: (<g {...line}><path d="M40 58 V46 a20 20 0 0 1 40 0 V58" /><path d="M48 58 V48 a12 12 0 0 1 24 0 V58" /><path d="M66 24 a7 7 0 1 0 6 11 a5.5 5.5 0 1 1 -6 -11z" fill={G2} stroke="none" /></g>),
  // the Kaʿbah with three birds above it
  elephant: (<g {...line}><rect x="49" y="40" width="22" height="18" rx="1" /><path d="M49 45 H71" /><path d="M38 30 l4 3 l4 -3 M56 25 l4 3 l4 -3 M74 30 l4 3 l4 -3" /></g>),
  // the barrier: courses of a wall between two peaks
  dhulqarnayn: (<g {...line}><path d="M30 58 L42 34 L50 46" /><path d="M90 58 L78 34 L70 46" /><rect x="48" y="40" width="24" height="18" /><path d="M48 46 H72 M48 52 H72 M56 40 V46 M64 46 V52 M56 52 V58" /></g>),
  // two date palms
  gardens: (<g {...line}><path d="M46 58 V36 M74 58 V36" /><path d="M46 36 q-9 -2 -12 6 M46 36 q9 -2 12 6 M46 36 q-5 -8 -12 -8 M46 36 q5 -8 12 -8" /><path d="M74 36 q-9 -2 -12 6 M74 36 q9 -2 12 6 M74 36 q-5 -8 -12 -8 M74 36 q5 -8 12 -8" /><path d="M36 58 H84" /></g>),
  // crescent horns over a simple arch (the heifer, al-Baqarah)
  cow: (<g {...line}><path d="M44 32 q4 10 16 10 q12 0 16 -10" /><path d="M48 58 V50 a12 10 0 0 1 24 0 V58" /><circle cx="60" cy="27" r="2.4" fill={G2} stroke="none" /></g>),
  // keys of the treasures
  qarun: (<g {...line}><circle cx="46" cy="36" r="6" /><path d="M52 36 H80 M74 36 v6 M80 36 v5" /><circle cx="52" cy="50" r="5" /><path d="M57 50 H78 M72 50 v5" /></g>),
};

export const hasStoryEmblem = (id: string) => id in WORD;

/** Rub el Hizb: two overlapping squares — an 8-point Islamic star (never a 4-point sparkle). */
function RubElHizb() {
  const sq = "M60 6 L114 60 L60 114 L6 60 Z";
  return (
    <g>
      <rect x="20" y="20" width="80" height="80" fill="url(#emb-em)" stroke={G} strokeWidth="2.4" />
      <path d={sq} fill="url(#emb-em)" stroke={G} strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="20" y="20" width="80" height="80" fill="none" stroke={G} strokeWidth="2.4" />
      <circle cx="60" cy="60" r="38" fill="none" stroke={G} strokeOpacity=".55" strokeWidth="1" />
      <circle cx="60" cy="60" r="35" fill="none" stroke={G2} strokeOpacity=".35" strokeWidth=".8" strokeDasharray="2 3" />
    </g>
  );
}

export function StoryEmblem({ id, className }: { id: string; className?: string }) {
  const word = WORD[id];
  if (!word) return null;
  const long = word.length > 6;
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={word} data-story-emblem={id}>
      <defs>
        <radialGradient id="emb-em" cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#1f6b52" />
          <stop offset="1" stopColor="#0b3a2d" />
        </radialGradient>
      </defs>
      <RubElHizb />
      {MOTIF[id]}
      <text x="60" y={long ? 80 : 82} textAnchor="middle" direction="rtl" fill={G2}
        style={{ fontFamily: "var(--font-arabic)", fontSize: long ? 15 : 19, fontWeight: 700 }}>{word}</text>
    </svg>
  );
}
