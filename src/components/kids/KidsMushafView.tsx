/**
 * v47 Kids Mushaf: STRICTLY one complete surah per screen (no scrolling into the next one), big clear
 * script with full tashkeel and generous spacing, the Basmala as its own block, and big «السورة السابقة» /
 * «السورة التالية» buttons above and below the surah, plus a colourful surah picker.
 * Tapping a verse opens the kids tafsir drawer (read-aloud + the Sheikh's recitation of that verse).
 */
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { BASMALAH, getSurahAyahs, getSurahMeta, toArabicDigits, type Ayah } from "@/lib/quranService";
import { KidsTafsirDrawer } from "@/components/kids/KidsTafsirDrawer";
import { JOURNEY, useSurahStars } from "@/components/kids/KidsStarJourney";
import { stopSheikhAudio } from "@/lib/audioPlayback";

const KEY = "qm.kids.surah";
export function kidsSurah(): number {
  try { const n = Number(localStorage.getItem(KEY)); return n >= 1 && n <= 114 ? n : 1; } catch { return 1; }
}
export function setKidsSurah(n: number) { try { localStorage.setItem(KEY, String(n)); } catch { /* ignore */ } }

export function KidsMushafView({ surah, onSurah }: { surah: number; onSurah: (s: number) => void }) {
  const { t, language } = useI18n();
  const ar = language === "ar";
  const settings = useSettings();
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [tapped, setTapped] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);
  const meta = getSurahMeta(surah);
  const size = Math.max(26, settings.quranFontSize);
  const num = (n: number) => (ar ? toArabicDigits(n) : String(n));

  useEffect(() => {
    const ac = new AbortController();
    setAyahs(null); setFailed(false); setTapped(null);
    getSurahAyahs(surah, { signal: ac.signal }).then((s) => setAyahs(s.ayahs)).catch(() => { if (!ac.signal.aborted) setFailed(true); });
    window.scrollTo({ top: 0 });
    return () => { ac.abort(); stopSheikhAudio(); };
  }, [surah, retry]);

  const go = (s: number) => { if (s >= 1 && s <= 114) { setKidsSurah(s); onSurah(s); } };
  const nav = (where: "top" | "bottom") => (
    <div className="grid grid-cols-2 gap-3" data-kids-surah-nav={where}>
      <button type="button" className="kd-btn kd-btn-coral w-full text-base" disabled={surah <= 1} onClick={() => go(surah - 1)} data-kids-prev="">
        <span aria-hidden="true">{ar ? "→" : "←"}</span><span className="truncate">{t("kidsPrevSurah")}</span>
      </button>
      <button type="button" className="kd-btn w-full text-base" disabled={surah >= 114} onClick={() => go(surah + 1)} data-kids-next="">
        <span className="truncate">{t("kidsNextSurah")}</span><span aria-hidden="true">{ar ? "←" : "→"}</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-4" data-kids-mushaf={surah}>
      {nav("top")}
      <article className="kd-card overflow-hidden" dir="rtl" lang="ar">
        {/* surah title — sequential blocks: title → Basmala → verses (never overlapping) */}
        <header className="relative flex flex-col items-center gap-1 px-4 pb-4 pt-5 text-center" style={{ background: "linear-gradient(180deg, var(--kd-sun), transparent)" }}>
          <button type="button" onClick={() => setPicker(true)} className="kd-btn kd-btn-mango !min-h-0 px-5 py-2 text-sm" data-kids-picker-open="">📖 {t("kidsPickSurah")}</button>
          <h1 className="mt-2 font-arabic text-4xl font-black leading-snug">سورة {meta?.nameArabic}</h1>
          <p className="text-sm font-bold kd-ink-soft" dir={ar ? "rtl" : "ltr"}>{!ar && `${meta?.nameSimple} · `}{t("kidsVersesCount").replace("{n}", num(meta?.versesCount ?? 0))}</p>
        </header>
        {surah !== 1 && surah !== 9 && (
          <p className="kd-quran px-4 py-3 text-center" data-basmala-flow="" style={{ fontSize: `clamp(22px, ${(size * 0.85).toFixed(1)}px, 44px)`, lineHeight: 1.9, color: "var(--kd-turquoise-deep)" }}>{BASMALAH}</p>
        )}
        <p className="px-4 pb-2 text-center text-sm font-bold kd-ink-soft" dir={ar ? "rtl" : "ltr"}>{t("kidsTapAyahHint")}</p>
        {!ayahs && !failed && <p className="p-10 text-center font-bold kd-ink-soft" dir={ar ? "rtl" : "ltr"}>{t("kidsLoading")}</p>}
        {failed && (
          <div className="space-y-3 p-8 text-center" dir={ar ? "rtl" : "ltr"}>
            <p className="font-bold">{t("kidsOffline")}</p>
            <button type="button" className="kd-btn" onClick={() => setRetry((r) => r + 1)}>{t("kidsTryAgain")}</button>
          </div>
        )}
        {ayahs && (
          <ol className="divide-y-2 divide-dashed px-2 pb-3" style={{ borderColor: "var(--kd-edge)" }}>
            {ayahs.map((a) => (
              <li key={a.number}>
                <button type="button" onClick={() => setTapped(a.number)} data-kids-ayah={a.number}
                  className={cn("kd-quran block w-full rounded-[22px] px-3 py-3 text-start transition", tapped === a.number ? "bg-[var(--kd-sun)]" : "active:bg-[var(--kd-sky)]")}
                  style={{ fontSize: size, lineHeight: 2.25 }}>
                  {a.text}
                  <span aria-hidden="true" className="ms-2 inline-flex h-[1.5em] min-w-[1.5em] translate-y-[-0.1em] items-center justify-center rounded-full align-middle font-sans text-[0.45em] font-black text-white"
                    style={{ background: "var(--kd-turquoise)", boxShadow: "0 3px 0 var(--kd-turquoise-deep)" }}>{toArabicDigits(a.number)}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </article>
      {ayahs && nav("bottom")}
      {tapped != null && <KidsTafsirDrawer surah={surah} ayah={tapped} withSheikh onClose={() => { stopSheikhAudio(); setTapped(null); }} />}
      {picker && <KidsSurahPicker current={surah} onPick={(s) => { setPicker(false); go(s); }} onClose={() => setPicker(false)} />}
    </div>
  );
}

const TILE = ["#14b8a6", "#fb7185", "#f59e0b", "#38bdf8", "#a78bfa", "#34d399"];

/** A cheerful grid of surahs: the children's journey (al-Fātiḥa, Juz ʿAmma, Tabārak) first, then the rest. */
export function KidsSurahPicker({ current, onPick, onClose }: { current: number; onPick: (s: number) => void; onClose: () => void }) {
  const { t, language } = useI18n();
  const stars = useSurahStars();
  const ar = language === "ar";
  const rest = useMemo(() => Array.from({ length: 114 }, (_, i) => i + 1).filter((s) => !JOURNEY.includes(s)), []);
  const tile = (s: number, i: number) => (
    <li key={s}>
      <button type="button" onClick={() => onPick(s)} data-kids-pick={s}
        className={cn("flex h-full w-full flex-col items-center gap-0.5 p-2 text-center text-white active:translate-y-[2px]", s === current && "ring-4 ring-[var(--kd-sun)]")}
        style={{ background: TILE[i % TILE.length], borderRadius: 22, borderBottom: "4px solid rgba(0,0,0,.18)" }}>
        <span className="text-xs font-black opacity-90">{ar ? toArabicDigits(s) : s}</span>
        <span className="font-arabic text-lg font-bold leading-tight">{getSurahMeta(s)?.nameArabic}</span>
        <span className="text-[0.7rem] leading-none">{"⭐".repeat(stars[s] ?? 0) || "·"}</span>
      </button>
    </li>
  );
  return (
    <div className="fixed inset-0 z-[65] flex flex-col kd-root" data-kids-picker="" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <h2 className={cn("flex-1 font-black", ar ? "font-arabic text-2xl" : "text-xl")}>📖 {t("kidsPickSurah")}</h2>
        <button type="button" onClick={onClose} aria-label={t("close")} className="kd-btn kd-btn-soft h-12 w-12 !p-0 text-xl">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <ul className="grid grid-cols-3 gap-2.5">{JOURNEY.map(tile)}</ul>
        <ul className="mt-4 grid grid-cols-3 gap-2.5">{rest.map((s, i) => tile(s, i + 3))}</ul>
      </div>
    </div>
  );
}

export default KidsMushafView;
