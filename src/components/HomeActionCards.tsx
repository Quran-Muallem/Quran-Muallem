/**
 * v52 "Warm Sanctuary" home: a hero welcome (salam, next-prayer pill, streak + hifdh ring), a
 * «تابع القراءة» spotlight with a surah progress bar and one-tap listen/read, and the five v51
 * destinations as an airy bento grid. Theme-aware through the --sx-* tokens (parchment light /
 * frosted emerald dark). Structure stays flat: every card goes straight to one place.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, AudioLines, Bell, BellRing, BookOpen, BookOpenCheck, Check, ChevronLeft, ChevronRight, Clock, Clock3, Compass, Headphones, Library, Map as MapIcon, Mic, Pause, Play, Plus, RotateCcw, ScrollText, Search, SunMoon, Target, X, type LucideIcon } from "lucide-react";
import { HOME_TILE_CATALOG, getHomeTiles, homeTileDef, moveTile, pinTile, placeTile, resetHomeTiles, unpinTile, useHomeTiles, type HomeTileId } from "@/lib/homeLayoutStore";
import { useBackLayer } from "@/lib/backStack";
import { showToast } from "@/lib/appToast";
import { SanctuarySheet } from "@/components/SanctuarySheet";
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

type Look = { icon: (cls: string) => ReactNode; bg?: string; tint: string };
const duo = (Icon: LucideIcon) => (cls: string) => <Icon className={cls} strokeWidth={1.9} fill="currentColor" fillOpacity={0.18} />;
const line = (Icon: LucideIcon) => (cls: string) => <Icon className={cls} strokeWidth={1.9} />;

/** How each tile looks; what it opens lives in `homeLayoutStore` (shared with the burger menu pins). */
const HOME_TILE_LOOK: Record<HomeTileId, Look> = {
  continue: { icon: duo(BookOpen), tint: "#0f5132" },
  read: { icon: duo(BookOpen), bg: "linear-gradient(135deg,#0d4a2e 0%,#0f5132 45%,#2a7a52 100%)", tint: "#f3d27a" },
  recite: { icon: duo(Mic), bg: "linear-gradient(150deg,#0d5c62 0%,#16807a 55%,#b8901f 130%)", tint: "#ffe7a3" },
  companion: { icon: (cls) => <PrayingPersonIcon className={cls} />, bg: "linear-gradient(150deg,#2a3577 0%,#25507a 50%,#1a6b5a 100%)", tint: "#c9d6ff" },
  tajweed: { icon: duo(BookOpenCheck), tint: "#3a8fd0" },
  stories: { icon: duo(ScrollText), tint: "#9b5fd0" },
  prophets: { icon: line(MapIcon), tint: "#c2410c" },
  khatma: { icon: line(Target), tint: "#b8901f" },
  prayer: { icon: line(Clock), tint: "#0f766e" },
  adhan: { icon: line(BellRing), tint: "#b45309" },
  qibla: { icon: line(Compass), tint: "#15803d" },
  adhkar: { icon: line(SunMoon), tint: "#a16207" },
  hadith: { icon: line(Library), tint: "#7c3aed" },
  reciters: { icon: line(Headphones), tint: "#0e7490" },
  recordings: { icon: line(AudioLines), tint: "#be123c" },
  search: { icon: line(Search), tint: "#1d4ed8" },
  reminders: { icon: line(Bell), tint: "#c2410c" },
  kids: { icon: (cls) => <span className={cn(cls, "flex items-center justify-center text-[1.9rem] leading-none")}>🧒</span>, tint: "#d97706" },
};

const LONG_PRESS_MS = 550;

/**
 * v57 the Home destinations — the user's own list (homeLayoutStore): reorder (⠿ drag, ↑ / ↓), remove (✕),
 * add from the menu catalog (+). «تخصيص الرئيسية» or a long press on a tile enters edit mode; «تم» or
 * back leaves it. Outside edit mode a tile simply opens its place.
 */
export function HomeActionCards({ onContinue }: { onContinue: (surah: number, ayah: number) => void }) {
  const { t } = useI18n();
  const tiles = useHomeTiles();
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState(false);
  const [dragging, setDragging] = useState<HomeTileId | null>(null);
  useBackLayer(editing, () => setEditing(false));
  const grid = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);

  const enterEdit = () => {
    setEditing(true);
    try { navigator.vibrate?.(30); } catch { /* ignore */ }
  };
  const startPress = (e: ReactPointerEvent) => {
    if (editing) return;
    const timer = setTimeout(() => { press.current = null; suppressClick.current = true; enterEdit(); }, LONG_PRESS_MS);
    press.current = { timer, x: e.clientX, y: e.clientY };
  };
  const movePress = (e: ReactPointerEvent) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) { clearTimeout(p.timer); press.current = null; }
  };
  const endPress = () => { if (press.current) { clearTimeout(press.current.timer); press.current = null; } };
  const openTile = (id: HomeTileId) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (!editing) homeTileDef(id).open();
  };

  // ⠿ drag: the tile under the finger takes the dragged tile's place (live reorder).
  const dragMove = (e: ReactPointerEvent) => {
    if (!dragging) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-home-card]");
    const over = el?.dataset["homeCard"] as HomeTileId | undefined;
    if (!over || over === dragging) return;
    const list = getHomeTiles();
    placeTile(dragging, list.indexOf(over));
  };

  return (
    <section aria-label={t("start")} data-home-cards="" data-home-editing={editing ? "" : undefined}>
      {editing ? (
        <div className="sticky top-[calc(4.6rem+env(safe-area-inset-top))] z-20 -mx-1 mb-3 rounded-2xl px-3 py-2.5 shadow-[0_14px_30px_-14px_rgba(0,0,0,.65)] ring-1 ring-[color-mix(in_srgb,var(--sx-gold)_55%,transparent)]" style={{ background: "var(--sx-sheet)" }} data-home-editbar="">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditing(false)} data-home-done=""
              className="flex min-h-11 items-center gap-1.5 rounded-full px-5 text-[1.02rem] font-extrabold text-[#1b1300] shadow-[0_6px_18px_-8px_rgba(212,175,55,.9)]"
              style={{ background: "linear-gradient(135deg,#f3d27a,#d4af37)" }}>
              <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />{t("homeEditDone")}
            </button>
            <span className="flex-1" />
            <button type="button" onClick={() => { resetHomeTiles(); showToast(t("homeResetToast")); }} data-home-reset=""
              className="flex min-h-11 items-center gap-1.5 rounded-full sx-chip px-3.5 text-sm font-bold sx-ink">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />{t("homeEditReset")}
            </button>
          </div>
          <p className="mt-2 text-[0.88rem] leading-snug sx-ink-soft">{t("homeEditHint")}</p>
        </div>
      ) : (
        <div className="mb-2.5 flex" dir="ltr">
          <button type="button" onClick={enterEdit} data-home-customize=""
            className="ms-auto flex min-h-10 items-center gap-1.5 rounded-full sx-chip px-3.5 text-[0.92rem] font-bold sx-ink ring-1 ring-[color-mix(in_srgb,var(--sx-gold)_45%,transparent)]">
            <span aria-hidden="true">✏️</span>{t("homeCustomize")}
          </button>
        </div>
      )}

      <div ref={grid} className="grid grid-cols-2 gap-3.5" onPointerMove={dragMove}
        onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)}>
        {tiles.map((id, i) => (
          <HomeTile key={id} id={id} onContinue={onContinue} editing={editing} dragging={dragging === id} first={i === 0} last={i === tiles.length - 1}
            onOpen={() => openTile(id)} onPressStart={startPress} onPressMove={movePress} onPressEnd={endPress}
            onDragStart={(e) => { (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId); setDragging(id); }} />
        ))}
        {editing && (
          <button type="button" onClick={() => setPicker(true)} data-home-add=""
            className="col-span-2 flex min-h-[5.5rem] items-center justify-center gap-2.5 rounded-[24px] border-[2.5px] border-dashed border-[var(--sx-gold)] bg-[color-mix(in_srgb,var(--sx-gold)_8%,transparent)] px-4 text-[1.08rem] font-extrabold sx-ink">
            <Plus className="h-7 w-7 text-[var(--sx-gold)]" strokeWidth={2.6} aria-hidden="true" />{t("homeAddFromMenu")}
          </button>
        )}
        {!editing && tiles.length === 0 && (
          <button type="button" onClick={enterEdit} className="col-span-2 rounded-[24px] border-2 border-dashed border-[var(--sx-gold)] p-5 text-center font-bold sx-ink-soft">
            {t("homeEmptyHint")}
          </button>
        )}
      </div>
      <TilePicker open={picker} onClose={() => setPicker(false)} />
    </section>
  );
}

function HomeTile({ id, onContinue, editing, dragging, first, last, onOpen, onPressStart, onPressMove, onPressEnd, onDragStart }: {
  id: HomeTileId; onContinue: (surah: number, ayah: number) => void; editing: boolean; dragging: boolean; first: boolean; last: boolean; onOpen: () => void;
  onPressStart: (e: ReactPointerEvent) => void; onPressMove: (e: ReactPointerEvent) => void; onPressEnd: () => void;
  onDragStart: (e: ReactPointerEvent) => void;
}) {
  const { t, language } = useI18n();
  const ar = language === "ar";
  const Chevron = directionFor(language) === "rtl" ? ChevronLeft : ChevronRight;
  const def = homeTileDef(id), look = HOME_TILE_LOOK[id];
  if (id === "continue") {
    // the spotlight keeps its own read / listen buttons; in edit mode they rest and the controls sit below it
    return (
      <div data-home-card={id} className={cn("relative col-span-2", dragging && "z-10 scale-[1.02] opacity-90 transition-transform")}
        onPointerDown={onPressStart} onPointerMove={onPressMove} onPointerUp={onPressEnd} onPointerLeave={onPressEnd} onPointerCancel={onPressEnd}
        onContextMenu={(e) => e.preventDefault()}>
        <div className={cn("select-none rounded-[24px] [-webkit-touch-callout:none]", editing && "pointer-events-none outline-dashed outline-[2.5px] outline-offset-[3px] outline-[#d4af37]")}>
          <ContinueSpotlight onContinue={onContinue} />
        </div>
        {editing && (
          <>
            <button type="button" onClick={() => unpinTile(id)} aria-label={`${t("homeRemoveTile")}: ${t(def.title)}`} data-home-remove={id}
              className="qm-native-colors absolute -end-2 -top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#b91c1c] text-white shadow-md ring-2 ring-white">
              <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
            </button>
            <EditControls id={id} title={t(def.title)} first={first} last={last} onDragStart={onDragStart} className="mt-2.5 rounded-2xl sx-chip p-1.5" />
          </>
        )}
      </div>
    );
  }
  const wide = id === "read";
  const solid = !!look.bg;
  const title = t(def.title);
  return (
    <div data-home-card={id} className={cn("relative", wide && "col-span-2", dragging && "z-10 scale-[1.04] opacity-90 transition-transform")}>
      <button type="button" onClick={onOpen} tabIndex={editing ? -1 : 0} aria-disabled={editing || undefined}
        onPointerDown={onPressStart} onPointerMove={onPressMove} onPointerUp={onPressEnd} onPointerLeave={onPressEnd} onPointerCancel={onPressEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={cn("sx-press relative flex h-full w-full select-none flex-col overflow-hidden rounded-[24px] p-5 text-start transition [-webkit-touch-callout:none]",
          wide ? "min-h-[9.5rem]" : "min-h-[12.5rem] pb-6",
          solid ? "qm-native-colors text-white shadow-[0_16px_34px_-20px_rgba(10,40,30,.8)]" : "sx-card",
          editing && "outline-dashed outline-[2.5px] outline-offset-[3px] outline-[#d4af37]",
          editing && (wide ? "pb-16" : "pb-[4.25rem]"))}
        style={solid ? { background: look.bg } : undefined}>
        {solid && <StarLattice id={`sx-tile-${id}`} opacity={0.07} className="[color:#fff]" />}
        <span className={cn("relative flex w-full items-start gap-3", wide ? "flex-row" : "flex-col")}>
          <span aria-hidden="true" className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[18px]"
            style={solid ? { background: "rgba(255,255,255,.16)", color: look.tint, boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)" }
              : { background: `color-mix(in srgb, ${look.tint} 14%, transparent)`, color: look.tint, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${look.tint} 25%, transparent)` }}>
            {look.icon("h-8 w-8")}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block font-extrabold leading-snug", solid ? "text-white" : "sx-ink", ar ? "font-arabic text-[1.3rem]" : "text-[1.1rem]")}>{title}</span>
            <span className={cn("mt-1 block leading-snug", solid ? "text-white/85" : "sx-ink-soft", ar ? "text-[0.98rem]" : "text-[0.9rem]")}>{t(def.sub)}</span>
          </span>
          {wide && !editing && <Chevron aria-hidden="true" className="h-7 w-7 shrink-0 self-center text-[#f3d27a]" />}
        </span>
      </button>
      {editing && (
        <>
          <button type="button" onClick={() => unpinTile(id)} aria-label={`${t("homeRemoveTile")}: ${title}`} data-home-remove={id}
            className="qm-native-colors absolute -end-2 -top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#b91c1c] text-white shadow-md ring-2 ring-white">
            <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          </button>
          <EditControls id={id} title={title} first={first} last={last} onDragStart={onDragStart} className="absolute inset-x-2.5 bottom-2.5 z-10" />
        </>
      )}
    </div>
  );
}

/** ⠿ drag handle and ↑ / ↓ (edit mode), the same on every tile. */
function EditControls({ id, title, first, last, onDragStart, className }: { id: HomeTileId; title: string; first: boolean; last: boolean; onDragStart: (e: ReactPointerEvent) => void; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("qm-native-colors flex items-center gap-1.5", className)} dir="ltr">
      <span role="button" tabIndex={-1} aria-label={t("homeDragTile")} onPointerDown={onDragStart} data-home-handle={id}
        className="flex h-11 w-11 cursor-grab touch-none select-none items-center justify-center rounded-xl bg-black/35 text-[1.45rem] font-black leading-none text-white">⠿</span>
      <span className="flex-1" />
      <button type="button" disabled={first} onClick={() => moveTile(id, -1)} aria-label={`${t("homeMoveUp")}: ${title}`} data-home-up={id}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-[#1b1300] shadow disabled:opacity-35"><ArrowUp className="h-5 w-5" strokeWidth={2.6} /></button>
      <button type="button" disabled={last} onClick={() => moveTile(id, 1)} aria-label={`${t("homeMoveDown")}: ${title}`} data-home-down={id}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-[#1b1300] shadow disabled:opacity-35"><ArrowDown className="h-5 w-5" strokeWidth={2.6} /></button>
    </div>
  );
}

/** «+ إضافة من القائمة»: every menu destination that is not on the Home yet. */
function TilePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const tiles = useHomeTiles();
  const rest = HOME_TILE_CATALOG.filter((d) => !tiles.includes(d.id));
  return (
    <SanctuarySheet open={open} onClose={onClose} title={t("homePickerTitle")} subtitle={t("homePickerSub")} dataAttr={{ "data-home-picker": "" }}>
      {rest.length === 0 ? <p className="py-8 text-center sx-ink-soft">{t("homePickerEmpty")}</p> : (
        <ul className="space-y-2">
          {rest.map((d) => {
            const look = HOME_TILE_LOOK[d.id];
            return (
              <li key={d.id}>
                <button type="button" data-home-pick={d.id} onClick={() => { pinTile(d.id); showToast(t("homeAddedToast")); }}
                  className="flex min-h-[3.75rem] w-full items-center gap-3 rounded-2xl sx-card px-3 py-2.5 text-start">
                  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ color: look.tint, background: `color-mix(in srgb, ${look.tint} 14%, transparent)` }}>{look.icon("h-6 w-6")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold leading-snug sx-ink">{t(d.title)}</span>
                    <span className="block text-sm leading-snug sx-ink-soft">{t(d.sub)}</span>
                  </span>
                  <span className="flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-extrabold text-[#1b1300]" style={{ background: "linear-gradient(135deg,#f3d27a,#d4af37)" }}>
                    <Plus className="h-4 w-4" strokeWidth={3} aria-hidden="true" />{t("homePinShort")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("qm:open-menu")); }} data-home-open-menu=""
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--sx-gold)] text-sm font-bold sx-ink">
        <span aria-hidden="true">📌</span>{t("homePickerMenuHint")}
      </button>
    </SanctuarySheet>
  );
}

export default HomeActionCards;
