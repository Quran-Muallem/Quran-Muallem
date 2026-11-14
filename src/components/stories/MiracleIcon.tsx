/**
 * v53 «معجزة النبي» — one own-design badge per prophet showing the sign/miracle linked to him in the Quran.
 * Flat, warm palette (gold, emerald, sky, sand); no human or animal faces, no four-pointed "AI sparkles"
 * (only classic five-pointed stars). Muhammad ﷺ: the noble Ka'bah alone — clean, without any crown.
 */
import { useId } from "react";
import { cn } from "@/lib/utils";
import { star5 } from "@/components/kids/KidsArt";

const GOLD = "#d4af37", GOLD_HI = "#f3d27a", INK = "#3b2a10", EMER = "#0f6b48", SKY = "#9fd3f5", SEA = "#2f8fd0", SAND = "#e9c98f";

export const MIRACLE_IDS = ["adam", "idris", "nuh", "hud", "salih", "ibrahim", "lut", "ismail-ishaq", "yaqub", "yusuf", "ayyub", "shuayb", "musa-harun", "dawud", "sulaiman", "yunus", "zakariya-yahya", "isa", "muhammad"] as const;
export const hasMiracleIcon = (id: string) => (MIRACLE_IDS as readonly string[]).includes(id);

export function MiracleIcon({ id, className, bg = true }: { id: string; className?: string; bg?: boolean }) {
  const u = useId().replace(/:/g, "");
  const gid = (n: string) => `${n}-${u}`;
  return (
    <svg viewBox="0 0 64 64" className={cn("h-12 w-12", className)} aria-hidden="true" data-miracle={id}>
      <defs>
        <linearGradient id={gid("g")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={GOLD_HI} /><stop offset="1" stopColor={GOLD} /></linearGradient>
        <linearGradient id={gid("sky")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9f0ff" /><stop offset="1" stopColor="#fff7e6" /></linearGradient>
      </defs>
      {bg && <circle cx="32" cy="32" r="30" fill={`url(#${gid("sky")})`} />}
      {id === "adam" && (<>{/* the Garden: a fruit tree */}
        <path d="M8 52 Q32 44 56 52 V58 H8 Z" fill="#8bd49a" />
        <rect x="29" y="34" width="6" height="18" rx="2" fill="#9a6a3a" />
        <circle cx="32" cy="26" r="13" fill="#3fae6a" /><circle cx="22" cy="31" r="8" fill="#38a062" /><circle cx="42" cy="31" r="8" fill="#38a062" />
        <circle cx="26" cy="24" r="2.2" fill="#e8504a" /><circle cx="37" cy="21" r="2.2" fill="#e8504a" /><circle cx="40" cy="31" r="2.2" fill="#e8504a" /><circle cx="24" cy="33" r="2.2" fill="#e8504a" />
      </>)}
      {id === "idris" && (<>{/* scroll of wisdom with a reed pen */}
        <rect x="14" y="16" width="34" height="32" rx="3" fill="#fff6dc" stroke={INK} strokeWidth="1.6" />
        <rect x="11" y="13" width="40" height="6" rx="3" fill={`url(#${gid("g")})`} stroke={INK} strokeWidth="1.4" />
        <rect x="11" y="45" width="40" height="6" rx="3" fill={`url(#${gid("g")})`} stroke={INK} strokeWidth="1.4" />
        <path d="M19 26h22M19 31h22M19 36h16" stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
        <path d="M44 42 L54 22" stroke={EMER} strokeWidth="3" strokeLinecap="round" /><path d="M44 42 l-1.5 4 3.5-2.4z" fill={INK} />
      </>)}
      {id === "nuh" && (<>{/* the wooden Ark on the waves */}
        <path d="M30 14 V30" stroke="#7a5230" strokeWidth="2" /><path d="M30 15 L42 27 H30 Z" fill="#fff6dc" stroke="#7a5230" strokeWidth="1.2" />
        <path d="M10 32 H54 L48 44 H16 Z" fill="#a8723f" stroke="#6b4423" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="20" y="26" width="18" height="7" rx="1.5" fill="#c08850" stroke="#6b4423" strokeWidth="1.2" />
        <path d="M4 46 q6-5 12 0 t12 0 t12 0 t12 0 t12 0 V60 H4 Z" fill={SEA} /><path d="M4 52 q6-4 12 0 t12 0 t12 0 t12 0 t12 0" stroke="#bfe5ff" strokeWidth="1.6" fill="none" />
      </>)}
      {id === "hud" && (<>{/* the wind and the clouds */}
        <ellipse cx="24" cy="20" rx="12" ry="7" fill="#c8ccd8" /><ellipse cx="36" cy="18" rx="10" ry="8" fill="#b4b9c8" /><ellipse cx="44" cy="22" rx="8" ry="5.5" fill="#c8ccd8" />
        <path d="M8 34 H38 a5 5 0 1 0 -5 -5" stroke="#6a7a90" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M12 42 H48 a6 6 0 1 1 -6 6" stroke="#6a7a90" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M6 50 H28" stroke="#6a7a90" strokeWidth="3" strokeLinecap="round" />
        <path d="M6 58 Q32 52 58 58" stroke={SAND} strokeWidth="4" fill="none" />
      </>)}
      {id === "salih" && (<>{/* the she-camel by the rock (silhouette) */}
        <path d="M6 54 Q32 48 58 54 V60 H6 Z" fill={SAND} />
        <path d="M44 14 h6 l2 4 -4 1 -2 6 v4 c0 4-3 6-6 6 h-14 c-3 0-6 2-7 6 v12 h3 v-9 l3-2 h14 v11 h3 v-12 c4-2 5-6 5-10 v-9 z" fill="#c58b4a" stroke="#7a5230" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M24 31 q6-10 14-2" fill="#c58b4a" stroke="#7a5230" strokeWidth="1.4" />
        <path d="M6 54 l6-14 l8 4 l4 10 z" fill="#b59a76" stroke="#7a6248" strokeWidth="1.2" />
      </>)}
      {id === "ibrahim" && (<>{/* the fire made cool and peaceful, over the Ka'bah's foundations */}
        <rect x="14" y="46" width="36" height="8" rx="1" fill="#9aa0a6" stroke="#5f656b" strokeWidth="1.2" />
        <path d="M14 50 H50 M23 46 V54 M32 46 V54 M41 46 V54" stroke="#5f656b" strokeWidth="1" />
        <path d="M32 10 C40 20 46 26 44 36 C43 42 38 46 32 46 C26 46 21 42 20 36 C19 28 26 24 26 18 C29 22 30 24 32 22 C34 18 32 14 32 10 Z" fill="#7fd0c0" stroke="#2c8f7d" strokeWidth="1.4" />
        <path d="M32 24 C36 30 38 34 36 39 C35 42 33 43 32 43 C30 43 28 41 28 38 C28 34 31 32 32 24 Z" fill="#e6fbf5" />
        <circle cx="26" cy="40" r="2" fill="#f6a5c0" /><circle cx="38" cy="38" r="2" fill="#f6a5c0" />
      </>)}
      {id === "lut" && (<>{/* dawn and deliverance: sunrise over the path out */}
        <path d="M4 40 H60 V60 H4 Z" fill="#f2c88a" />
        <circle cx="32" cy="40" r="13" fill={`url(#${gid("g")})`} />
        {[-60, -30, 0, 30, 60].map((a) => <path key={a} d="M32 20 V14" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${a} 32 40)`} />)}
        <path d="M4 40 H60" stroke="#c48a3a" strokeWidth="2" />
        <path d="M30 60 L32 44 L34 60 Z" fill="#fff4d6" opacity=".9" />
      </>)}
      {id === "ismail-ishaq" && (<>{/* the spring of Zamzam welling up in the valley */}
        <path d="M4 50 Q20 38 32 44 Q44 38 60 50 V60 H4 Z" fill={SAND} />
        <ellipse cx="32" cy="48" rx="14" ry="4.5" fill={SEA} />
        <path d="M32 46 C30 40 28 36 32 26 C36 36 34 40 32 46 Z" fill="#7cc8f5" />
        <path d="M25 44 C22 40 22 36 25 32 M39 44 C42 40 42 36 39 32" stroke="#7cc8f5" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="32" cy="22" r="2.2" fill="#7cc8f5" /><circle cx="26" cy="28" r="1.6" fill="#7cc8f5" /><circle cx="38" cy="28" r="1.6" fill="#7cc8f5" />
      </>)}
      {id === "yaqub" && (<>{/* sabr and the light of vision restored */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M32 8 V14" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${a} 32 32)`} />)}
        <path d="M12 32 Q32 14 52 32 Q32 50 12 32 Z" fill="#fffaf0" stroke={INK} strokeWidth="1.8" />
        <circle cx="32" cy="32" r="8" fill="#3c8f6a" /><circle cx="32" cy="32" r="3.5" fill={INK} /><circle cx="34.5" cy="29.5" r="1.6" fill="#fff" />
      </>)}
      {id === "yusuf" && (<>{/* the dream: the sun, the moon and eleven stars */}
        <circle cx="32" cy="32" r="30" fill="#1f2a5c" opacity={bg ? 1 : 0} />
        <circle cx="22" cy="24" r="7" fill={`url(#${gid("g")})`} />
        <path d="M44 16 a8 8 0 1 0 6 12 a6.5 6.5 0 1 1 -6 -12z" fill="#fff3c4" />
        {[[14, 42], [22, 48], [30, 52], [38, 50], [46, 46], [52, 38], [10, 32], [36, 38], [28, 40], [44, 32], [20, 36]].map(([x, y], i) => (
          <path key={i} d={star5(x!, y!, 2.6)} fill={GOLD_HI} />
        ))}
      </>)}
      {id === "ayyub" && (<>{/* the healing spring of water at his feet */}
        <path d="M4 44 Q32 34 60 44 V60 H4 Z" fill="#9fd89a" />
        <ellipse cx="32" cy="48" rx="16" ry="5" fill={SEA} />
        <path d="M32 46 C26 34 30 26 32 18 C34 26 38 34 32 46 Z" fill="#8fd2ff" stroke={SEA} strokeWidth="1.2" />
        <path d="M24 30 q-4 6 0 10 M40 30 q4 6 0 10" stroke="#8fd2ff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M14 46 q2-6 6-6 M50 46 q-2-6-6-6" stroke="#3f9a52" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </>)}
      {id === "shuayb" && (<>{/* the just scales */}
        <path d="M32 12 V50" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M14 20 H50" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="32" cy="12" r="3" fill={`url(#${gid("g")})`} stroke={INK} strokeWidth="1.2" />
        <path d="M14 20 L8 36 M14 20 L20 36 M50 20 L44 36 M50 20 L56 36" stroke={INK} strokeWidth="1.4" />
        <path d="M6 36 H22 A8 6 0 0 1 6 36 Z" fill={`url(#${gid("g")})`} stroke={INK} strokeWidth="1.4" />
        <path d="M42 36 H58 A8 6 0 0 1 42 36 Z" fill={`url(#${gid("g")})`} stroke={INK} strokeWidth="1.4" />
        <path d="M22 54 H42 L38 50 H26 Z" fill={`url(#${gid("g")})`} stroke={INK} strokeWidth="1.4" />
      </>)}
      {id === "musa-harun" && (<>{/* the staff and the sea parted into two walls */}
        <path d="M4 14 C10 22 12 34 12 58 H4 Z" fill={SEA} /><path d="M60 14 C54 22 52 34 52 58 H60 Z" fill={SEA} />
        <path d="M8 22 C11 30 11 40 10 52 M56 22 C53 30 53 40 54 52" stroke="#bfe5ff" strokeWidth="1.8" fill="none" />
        <path d="M12 58 C18 46 24 42 32 40 C40 42 46 46 52 58 Z" fill={SAND} />
        <path d="M30 56 L40 12" stroke="#8a5a2b" strokeWidth="3.4" strokeLinecap="round" /><path d="M40 12 q4-1 4 3" stroke="#8a5a2b" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>)}
      {id === "dawud" && (<>{/* mountains and birds glorifying with him (melodic tasbih) */}
        <path d="M2 56 L20 26 L32 42 L44 22 L62 56 Z" fill="#8aa29a" stroke="#56706a" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M44 22 L39 30 L44 28 L49 30 Z M20 26 L16 33 L20 31 L24 33 Z" fill="#fff" />
        <path d="M12 14 q3-3 6 0 q3-3 6 0 M30 10 q3-3 6 0 q3-3 6 0 M46 14 q2.5-2.5 5 0 q2.5-2.5 5 0" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M10 22 q6-4 12 0 t12 0 t12 0 t12 0" stroke={GOLD} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".9" />
      </>)}
      {id === "sulaiman" && (<>{/* the hoopoe and the ant */}
        <path d="M6 54 Q32 48 58 54 V60 H6 Z" fill="#a6d98f" />
        <ellipse cx="34" cy="30" rx="13" ry="8" fill="#e0a25a" stroke="#8a5a2b" strokeWidth="1.3" />
        <path d="M30 28 q8 8 16 4" stroke="#fff" strokeWidth="2.4" fill="none" /><path d="M28 30 q8 8 16 4" stroke="#2b2b2b" strokeWidth="2" fill="none" />
        <circle cx="21" cy="25" r="5.5" fill="#e0a25a" stroke="#8a5a2b" strokeWidth="1.3" />
        <path d="M18 20 l-3 -8 M21 19 l0 -9 M24 20 l3 -8" stroke="#c46a2a" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M16 26 L8 28 L16 28 Z" fill={INK} /><circle cx="20" cy="24" r="1" fill={INK} />
        <path d="M47 30 L56 26 L54 34 Z" fill="#8a5a2b" /><path d="M30 37 v8 M36 37 v8" stroke="#8a5a2b" strokeWidth="1.8" />
        <ellipse cx="44" cy="52" rx="2.2" ry="1.6" fill={INK} /><ellipse cx="48" cy="52" rx="2.6" ry="2" fill={INK} /><ellipse cx="52.5" cy="51.5" rx="2" ry="1.6" fill={INK} />
        <path d="M46 51 l-1-3 M48 50 l0-3 M50 51 l1-3 M46 53 l-1 3 M48 54 l0 3 M50 53 l1 3" stroke={INK} strokeWidth="1" />
      </>)}
      {id === "yunus" && (<>{/* the whale */}
        <path d="M4 50 q7-4 14 0 t14 0 t14 0 t14 0 V60 H4 Z" fill={SEA} />
        <path d="M8 36 C10 24 26 18 40 22 C48 24 52 30 52 34 L60 26 L58 38 L60 48 L50 40 C44 48 30 50 20 48 C12 46 7 42 8 36 Z" fill="#4a7fb5" stroke="#2c5a88" strokeWidth="1.5" />
        <path d="M10 38 C18 44 34 46 46 40" stroke="#cfe6f8" strokeWidth="2" fill="none" /><circle cx="18" cy="32" r="1.8" fill={INK} />
        <path d="M24 20 C22 14 24 10 26 8 M26 20 C28 14 30 12 32 12" stroke="#8fd2ff" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>)}
      {id === "zakariya-yahya" && (<>{/* the mihrab where the du'a was answered */}
        <path d="M14 58 V30 Q14 12 32 8 Q50 12 50 30 V58 Z" fill="#fff6dc" stroke={GOLD} strokeWidth="2.4" />
        <path d="M20 58 V32 Q20 18 32 14 Q44 18 44 32 V58 Z" fill="#e7f3ec" stroke={EMER} strokeWidth="1.6" />
        <path d="M32 22 C36 28 38 32 36 36 C35 38 33 39 32 39 C31 39 29 38 28 36 C26 32 28 28 32 22 Z" fill={`url(#${gid("g")})`} />
        <path d="M32 39 V44" stroke={INK} strokeWidth="1.4" /><path d="M26 44 H38" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
        <path d={star5(32, 50, 3.4)} fill={GOLD} />
      </>)}
      {id === "isa" && (<>{/* a dove of peace with an olive branch, in healing light */}
        <circle cx="32" cy="32" r="22" fill="#fff8de" />
        <path d="M14 34 C20 26 28 26 34 30 C38 22 46 18 54 18 C50 24 46 30 40 34 C42 38 40 44 32 46 C24 46 18 42 14 34 Z" fill="#ffffff" stroke="#8a9bb0" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14 34 L8 33 L13 37 Z" fill="#e7a23a" /><circle cx="18" cy="32" r="1.2" fill={INK} />
        <path d="M10 40 Q16 44 22 42" stroke="#5a8a3a" strokeWidth="1.6" fill="none" />
        <ellipse cx="13" cy="42" rx="2.4" ry="1.2" fill="#7fb050" transform="rotate(-20 13 42)" /><ellipse cx="18" cy="44" rx="2.4" ry="1.2" fill="#7fb050" transform="rotate(10 18 44)" />
      </>)}
      {id === "muhammad" && (<>{/* the noble Ka'bah — clean, no crown */}
        <path d="M6 54 Q32 50 58 54 V60 H6 Z" fill="#e9e3d4" />
        <path d="M14 22 L32 16 L50 22 V52 L32 56 L14 52 Z" fill="#141414" />
        <path d="M32 16 L50 22 L32 27 L14 22 Z" fill="#2a2a2a" />
        <path d="M14 30 L32 35 L50 30 V34 L32 39 L14 34 Z" fill={`url(#${gid("g")})`} />
        <path d="M32 35 V56" stroke="#000" strokeWidth=".8" opacity=".6" />
        <rect x="38" y="42" width="6" height="10" rx="0.8" fill={`url(#${gid("g")})`} transform="skewY(-10)" />
      </>)}
    </svg>
  );
}

export default MiracleIcon;
