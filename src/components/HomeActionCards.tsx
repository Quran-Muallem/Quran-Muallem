/**
 * v52 "Warm Sanctuary" home: a hero welcome (salam, next-prayer pill, streak + hifdh ring), a
 * «تابع القراءة» spotlight with a surah progress bar and one-tap listen/read, and the five v51
 * destinations as an airy bento grid. Theme-aware through the --sx-* tokens (parchment light /
 * frosted emerald dark). Structure stays flat: every card goes straight to one place.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, BookOpenCheck, ChevronLeft, ChevronRight, Clock3, Mic, Pause, Play, ScrollText } from "lucide-react";
import { directionFor, useI18n, type CopyKey } from "@/lib/i18n";
import { TOTAL_AYAHS, getStats, useProgress } from "@/lib/progressStorage";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { useNextPrayer } from "@/lib/useNextPrayer";
import type { PrayerName } from "@/lib/PrayerTimesEngine";
import { ayahUrls } from "@/lib/reciterManager";
import { getSettings } from "@/lib/settings";
import { PrayingPersonIcon } from "@/components/icons/PrayingPersonIcon";
import { cn } from "@/lib/utils";

const emit = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));
const PRAYER_KEY: Record<PrayerName, CopyKey> = { fajr: "prayerFajr", sunrise: "prayerSunrise", dhuhr: "prayerDhuhr", asr: "prayerAsr", maghrib: "prayerMaghrib", isha: "prayerIsha" };

/** Islamic eight-point star lattice, drawn at very low opacity behind hero headers. */
export function StarLattice({ className, opacity = 0.05, id = "sx-lattice" }: { className?: string; opacity?: number; id?: string }) {
  return (
    <svg aria-hidden="true" className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} style={{ color: "var(--sx-watermark)", opacity }}>
      <defs>
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M28 6 L34 22 L50 28 L34 34 L28 50 L22 34 L6 28 L22 22 Z" />
            <rect x="16" y="16" width="24" height="24" transform="rotate(45 28 28)" />
            <rect x="16" y="16" width="24" height="24" />
            <path d="M0 0 L6 6 M56 0 L50 6 M0 56 L6 50 M56 56 L50 50" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Plays a verse range through the user's reciter, falling back across mirrors. One player at a time. */
export function useAyahPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const stop = () => { token.current++; audio.current?.pause(); audio.current = null; setPlaying(null); };
  useEffect(() => stop, []);
  const play = (key: string, surah: number, from: number, to: number) => {
    stop();
    const my = ++token.current;
    setPlaying(key);
    const step = (ayah: number, src = 0) => {
      if (my !== token.current) return;
      if (ayah > to) { setPlaying(null); return; }
      const urls = ayahUrls(getSettings().reciterId, surah, ayah);
      if (src >= urls.length) { setPlaying(null); return; }
      const a = new Audio(urls[src]);
      audio.current = a;
      a.onended = () => step(ayah + 1);
      a.onerror = () => step(ayah, src + 1);
      void a.play().catch(() => { if (my === token.current) setPlaying(null); });
    };
    step(from);
  };
  return { playing, play, stop };
}

function useNum() {
  const { language } = useI18n();
  return (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
}

/** «الصلاة القادمة: العشاء • بعد ٤٥ دقيقة» */
function PrayerPill() {
  const { t, language } = useI18n();
  const num = useNum();
  const n = useNextPrayer(language);
  const base = "inline-flex min-h-[2.5rem] max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.95rem] font-bold";
  if (n.status === "no-location")
    return (
      <button type="button" onClick={() => emit("qm:open-hub", "prayer")} className={cn(base, "sx-chip sx-ink")} data-hero-prayer="none">
        <Clock3 className="h-4 w-4 shrink-0" style={{ color: "var(--sx-gold)" }} /><span className="truncate">{t("prayerSetLocation")}</span>
      </button>
    );
  if (n.status !== "ready") return <span className={cn(base, "sx-chip w-56 animate-pulse")} aria-hidden="true" />;
  const mins = Math.max(1, Math.round(n.remainingMs / 60000));
  const when = mins < 60 ? t("homeInMin").replace("{m}", num(mins)) : t("homeInHM").replace("{h}", num(Math.floor(mins / 60))).replace("{m}", num(mins % 60));
  return (
    <button type="button" onClick={() => emit("qm:open-hub", "prayer")} data-hero-prayer={n.name}
      className={cn(base, "rounded-[1.25rem] text-start leading-snug text-[#1b1300] shadow-[0_6px_18px_-8px_rgba(212,175,55,.8)]")} style={{ background: "linear-gradient(135deg,#f3d27a,#d4af37)" }}>
      <Clock3 className="h-4 w-4 shrink-0" />
      <span className="min-w-0">{t("homePrayerLine").replace("{p}", t(PRAYER_KEY[n.name])).replace("{in}", when)}</span>
    </button>
  );
}

/** Progress ring: hifdh share of the whole Quran (never drawn smaller than a visible sliver). */
function Ring({ value, size = 68, children }: { value: number; size?: number; children: ReactNode }) {
  const r = size / 2 - 6, c = 2 * Math.PI * r;
  const shown = value <= 0 ? 0 : Math.max(0.025, Math.min(1, value));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sx-chip)" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#sx-ring-g)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${c * shown} ${c}`} />
        <defs><linearGradient id="sx-ring-g" x1="0" x2="1"><stop offset="0" stopColor="#f3d27a" /><stop offset="1" stopColor="#d4af37" /></linearGradient></defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}

export function HomeHero({ userName }: { userName?: string | null | undefined }) {
  const { t, language } = useI18n();
  const num = useNum();
  const stats = getStats(useProgress());
  const rtl = directionFor(language) === "rtl";
  const pct = (stats.memorized / TOTAL_AYAHS) * 100;
  const pctLabel = pct === 0 ? num(0) : pct < 1 ? (language === "ar" ? `${toArabicDigits(pct.toFixed(1)).replace(".", "٫")}` : pct.toFixed(1)) : num(Math.round(pct));
  return (
    <section className="sx-card relative overflow-hidden p-5" data-home-hero="">
      <StarLattice id="sx-hero-lattice" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(212,175,55,.18)", insetInlineEnd: -40 }} />
      <div className="relative">
        <h1 className={cn("font-extrabold leading-tight sx-ink", language === "ar" ? "font-arabic text-[1.9rem]" : "text-[1.6rem]")}>
          {t("homeSalam")}{userName ? `${rtl ? "، " : ", "}${userName}` : ""}
        </h1>
        <p className={cn("mt-1 sx-ink-soft", language === "ar" ? "text-[1.05rem]" : "text-[0.98rem]")}>{t("homeHeroSub")}</p>
        <div className="mt-3.5"><PrayerPill /></div>
        <div className="mt-4 flex items-center gap-3.5 rounded-2xl sx-chip p-3">
          <Ring value={pct / 100}>
            <span className="text-center leading-none">
              <span className="block text-[1.05rem] font-extrabold sx-ink">{pctLabel}{language === "ar" ? "٪" : "%"}</span>
            </span>
          </Ring>
          <span className="min-w-0">
            <span className="block text-[1.12rem] font-extrabold sx-ink" data-hero-streak="">
              <span aria-hidden="true">🔥 </span>{t("homeStreak").replace("{n}", num(stats.streak))}
            </span>
            <span className="mt-0.5 block text-[0.95rem] sx-ink-soft">{t("homeHifdh").replace("{n}", num(stats.memorized))}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/** «تابع القراءة» spotlight: surah, ayah, progress bar, one-tap listen and read. */
export function ContinueSpotlight({ onContinue }: { onContinue: (surah: number, ayah: number) => void }) {
  const { t, language } = useI18n();
  const num = useNum();
  const ar = language === "ar";
  const last = useProgress().lastPosition;
  const player = useAyahPlayer();
  const surah = last?.surahId ?? 1, ayah = last?.ayahId ?? 1;
  const meta = getSurahMeta(surah);
  const total = meta?.versesCount ?? 7;
  const pct = last ? Math.max(4, Math.round((ayah / total) * 100)) : 0;
  const key = `c${surah}:${ayah}`;
  const isPlaying = player.playing === key;
  return (
    <section className="qm-native-colors relative overflow-hidden rounded-[24px] p-5 text-white shadow-[0_18px_40px_-20px_rgba(15,81,50,.75)]" data-home-continue=""
      style={{ background: "linear-gradient(135deg,#0f5132 0%,#14684a 55%,#1d7b59 100%)" }}>
      <StarLattice id="sx-cont-lattice" opacity={0.08} className="[color:#f3d27a]" />
      <div className="relative">
        <p className="flex items-center gap-1.5 text-[0.95rem] font-bold text-[#f3d27a]"><BookOpen className="h-4 w-4" />{last ? t("continueReading") : t("homeContinueStart")}</p>
        <p className={cn("mt-1.5 font-extrabold leading-snug", ar ? "font-arabic text-[1.75rem]" : "text-[1.4rem]")}>
          {ar ? `سورة ${meta?.nameArabic ?? ""}` : (meta?.nameSimple ?? "")}
          {!ar && <span className="ms-2 font-arabic text-[1.2rem] text-[#f3d27a]">{meta?.nameArabic}</span>}
        </p>
        <p className="mt-0.5 text-[0.98rem] text-[#e3f3ea]">{t("homeAyahOf").replace("{a}", num(ayah)).replace("{n}", num(total))}</p>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#f3d27a,#d4af37)" }} />
        </div>
        <div className="mt-4 flex gap-2.5">
          <button type="button" onClick={() => onContinue(surah, ayah)} data-continue-read=""
            className="sx-press flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#fbf6e9] px-4 text-[1.05rem] font-extrabold text-[#0f5132] transition">
            <BookOpen className="h-5 w-5" />{t("homeRead")}
          </button>
          <button type="button" onClick={() => (isPlaying ? player.stop() : player.play(key, surah, ayah, total))} data-continue-play=""
            aria-label={isPlaying ? t("homePause") : t("homeListen")}
            className="sx-press flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/12 px-5 text-[1.05rem] font-bold transition">
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}{isPlaying ? t("homePause") : t("homeListen")}
          </button>
        </div>
      </div>
    </section>
  );
}

type Tile = { id: string; icon: (cls: string) => ReactNode; title: CopyKey; sub: CopyKey; on: () => void; bg?: string; tint: string; wide?: boolean };

/** The five destinations as a bento grid: one wide hero tile, then a 2×2 of gradient / surface tiles. */
export function HomeActionCards() {
  const { t, language } = useI18n();
  const ar = language === "ar";
  const Chevron = directionFor(language) === "rtl" ? ChevronLeft : ChevronRight;
  const duo = (Icon: typeof BookOpen) => (cls: string) => <Icon className={cls} strokeWidth={1.9} fill="currentColor" fillOpacity={0.18} />;
  const tiles: Tile[] = [
    { id: "read", icon: duo(BookOpen), title: "homeReadTitle", sub: "homeReadSub", on: () => emit("qm:open-mushaf"), wide: true,
      bg: "linear-gradient(135deg,#0d4a2e 0%,#0f5132 45%,#2a7a52 100%)", tint: "#f3d27a" },
    { id: "recite", icon: duo(Mic), title: "homeReciteTitle", sub: "homeReciteSub", on: () => emit("qm:go", "practice"),
      bg: "linear-gradient(150deg,#0d5c62 0%,#16807a 55%,#b8901f 130%)", tint: "#ffe7a3" },
    { id: "companion", icon: (cls) => <PrayingPersonIcon className={cls} />, title: "homeCompanionTitle", sub: "homeCompanionSub", on: () => emit("qm:open-companion"),
      bg: "linear-gradient(150deg,#2a3577 0%,#25507a 50%,#1a6b5a 100%)", tint: "#c9d6ff" },
    { id: "tajweed", icon: duo(BookOpenCheck), title: "homeTajweedTitle", sub: "homeTajweedSub", on: () => emit("qm:open-hub", "tajweed"), tint: "#3a8fd0" },
    { id: "stories", icon: duo(ScrollText), title: "homeStoriesTitle", sub: "homeStoriesSub", on: () => emit("qm:open-hub", "stories"), tint: "#9b5fd0" },
  ];
  return (
    <section className="grid grid-cols-2 gap-3.5" aria-label={t("start")} data-home-cards="">
      {tiles.map((c) => {
        const solid = !!c.bg;
        return (
          <button key={c.id} type="button" onClick={c.on} data-home-card={c.id}
            className={cn("sx-press relative flex flex-col overflow-hidden rounded-[24px] p-5 text-start transition",
              c.wide ? "col-span-2 min-h-[9.5rem]" : "h-auto min-h-[12.5rem] pb-6",
              solid ? "qm-native-colors text-white shadow-[0_16px_34px_-20px_rgba(10,40,30,.8)]" : "sx-card")}
            style={solid ? { background: c.bg } : undefined}>
            {solid && <StarLattice id={`sx-tile-${c.id}`} opacity={0.07} className="[color:#fff]" />}
            <span className={cn("relative flex w-full items-start gap-3", c.wide ? "flex-row" : "flex-col")}>
              <span aria-hidden="true" className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[18px]"
                style={solid ? { background: "rgba(255,255,255,.16)", color: c.tint, boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)" }
                  : { background: `color-mix(in srgb, ${c.tint} 14%, transparent)`, color: c.tint, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c.tint} 25%, transparent)` }}>
                {c.icon("h-8 w-8")}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-extrabold leading-snug", solid ? "text-white" : "sx-ink", ar ? "font-arabic text-[1.3rem]" : "text-[1.1rem]")}>{t(c.title)}</span>
                <span className={cn("mt-1 block leading-snug", solid ? "text-white/85" : "sx-ink-soft", ar ? "text-[0.98rem]" : "text-[0.9rem]")}>{t(c.sub)}</span>
              </span>
              {c.wide && <Chevron aria-hidden="true" className="h-7 w-7 shrink-0 self-center text-[#f3d27a]" />}
            </span>
          </button>
        );
      })}
    </section>
  );
}

export default HomeActionCards;
