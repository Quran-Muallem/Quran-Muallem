/**
 * v47 Kids Mushaf: STRICTLY one complete surah per screen (no scrolling into the next one), big clear
 * script with full tashkeel and generous spacing, the Basmala as its own block, and big «السورة السابقة» /
 * «السورة التالية» buttons above and below the surah, plus a colourful surah picker.
 * Tapping a verse opens the kids tafsir drawer (read-aloud + the Sheikh's recitation of that verse).
 */
import { surahMeaning } from "@/lib/goTo";
import { getTranslation, loadTranslation } from "@/lib/quranContent";
import { KidsBadge, TwinkleStars } from "@/components/kids/KidsArt";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { BASMALAH, getSurahAyahs, getSurahMeta, toArabicDigits, type Ayah } from "@/lib/quranService";
import { KidsTafsirDrawer } from "@/components/kids/KidsTafsirDrawer";
import { JOURNEY, useSurahStars } from "@/components/kids/KidsStarJourney";
import { stopSheikhAudio } from "@/lib/audioPlayback";
import { starChime } from "@/lib/storyAmbience";
import { useRecitation } from "@/lib/useRecitation";
import { phonemeRefs, usePhonemeLexicon } from "@/lib/quranAlignment";
import { loadMushaf, type Mushaf } from "@/lib/mushafData";
import type { LiveStatus } from "@/lib/quranMatcher";
import { creditRecitationStars, kidsStarsFor, useRecitationStars } from "@/lib/kidsRecitationStars";
import { Mic, Square } from "lucide-react";

const HIDE_KEY = "qm.kids.hide";
/** v54/v55: live recitation covers the whole surah (every surah of the children's journey has ≤ 56 verses);
 *  very long surahs are limited to their first verses. */
const KIDS_RANGE = 60;

const KEY = "qm.kids.surah";
export function kidsSurah(): number {
  try { const n = Number(localStorage.getItem(KEY)); return n >= 1 && n <= 114 ? n : 1; } catch { return 1; }
}
export function setKidsSurah(n: number) { try { localStorage.setItem(KEY, String(n)); } catch { /* ignore */ } }

export function KidsMushafView({ surah, onSurah }: { surah: number; onSurah: (s: number) => void }) {
  const { t, language } = useI18n();
  const ar = language === "ar";
  const settings = useSettings();
  // v56: interlinear translation under every verse when the app language is not Arabic (the translation
  // chosen for that language in Settings; downloaded once, then kept on the device).
  const [trans, setTrans] = useState<{ surah: number; verses: string[] } | null>(null);
  const trId = language === "ar" ? null : getTranslation(settings.translations[language], language).id;
  useEffect(() => {
    if (!trId) { setTrans(null); return; }
    let live = true;
    loadTranslation(trId, language, surah).then((v) => { if (live) setTrans({ surah, verses: v }); }).catch(() => { if (live) setTrans(null); });
    return () => { live = false; };
  }, [trId, language, surah]);
  const verseTr = (n: number) => (trans && trans.surah === surah ? trans.verses[n - 1] ?? "" : "");
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [tapped, setTapped] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);
  // v49 «إخفاء الآيات للتسميع»: verses under cloud covers; tap a cloud to check yourself.
  const [hide, setHide] = useState(() => { try { return localStorage.getItem(HIDE_KEY) === "1"; } catch { return false; } });
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [sparkle, setSparkle] = useState<number | null>(null);
  const toggleHide = () => { const v = !hide; setHide(v); setRevealed(new Set()); try { localStorage.setItem(HIDE_KEY, v ? "1" : "0"); } catch { /* ignore */ } };
  const reveal = (n: number) => { setRevealed((r) => new Set(r).add(n)); setSparkle(n); starChime(0.14); window.setTimeout(() => setSparkle((x) => (x === n ? null : x)), 1100); };
  const meta = getSurahMeta(surah);
  const size = Math.max(26, settings.quranFontSize);
  const num = (n: number) => (ar ? toArabicDigits(n) : String(n));

  // v54: live recitation with word-by-word highlighting (same engine as the adult Mushaf).
  const lexicon = usePhonemeLexicon();
  const [mushafWords, setMushafWords] = useState<Mushaf | null>(null);
  useEffect(() => { void loadMushaf().then(setMushafWords).catch(() => {}); }, []);
  const win = useMemo(() => (ayahs ?? []).slice(0, KIDS_RANGE), [ayahs]);
  const targets = useMemo(() => win.map((a) => a.text), [win]);
  const refs = useMemo(() => {
    if (!lexicon || !mushafWords || !win.length) return null;
    const out: (string | null)[] = [];
    for (const a of win) {
      const words = mushafWords.words(surah, a.number);
      if (words.join(" ") !== a.text) return null;
      out.push(...phonemeRefs(lexicon, surah, a.number, words));
    }
    return out;
  }, [lexicon, mushafWords, win, surah]);
  const rec = useRecitation(targets, { phonemeRefs: refs, forceLive: true });
  const offsets = useMemo(() => { let o = 0; return targets.map((t) => { const at = o; o += t.split(" ").length; return at; }); }, [targets]);
  const reciting = rec.listening || rec.match.recited > 0;
  const cursor = rec.listening ? rec.match.cursor : -1;
  const { reset: resetRec } = rec;
  useEffect(() => { resetRec(); }, [surah]); // eslint-disable-line react-hooks/exhaustive-deps
  const micToggle = () => { if (!rec.listening) { stopSheikhAudio(); setTapped(null); setResult(null); resetRec(); } rec.toggle(); };

  // v55 smooth auto-scroll: the verse being recited stays in the middle of the screen.
  const curAyah = useMemo(() => {
    if (!rec.listening) return -1;
    let i = 0;
    while (i + 1 < offsets.length && rec.match.cursor >= offsets[i + 1]!) i++;
    return win[i]?.number ?? -1;
  }, [rec.listening, rec.match.cursor, offsets, win]);
  useEffect(() => {
    if (curAyah < 0) return;
    const el = document.querySelector(`[data-kids-ayah="${curAyah}"], [data-kids-cloud="${curAyah}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [curAyah]);

  // v55 automatic stop on the last word of the surah, then a forgiving 1–5 star result.
  const [result, setResult] = useState<{ stars: number; added: number; read: number; total: number } | null>(null);
  const best = useRecitationStars();
  const journeyStars = useSurahStars();
  const starsNow = useRef(journeyStars);
  starsNow.current = journeyStars;
  const finished = rec.listening && rec.match.done;
  useEffect(() => { if (finished) rec.toggle(); }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps
  const wasListening = useRef(false);
  useEffect(() => {
    if (rec.listening) { wasListening.current = true; return; }
    if (!wasListening.current) return;
    wasListening.current = false;
    if (!rec.match.done) return; // stopped by hand before the end: no rating
    const total = rec.match.total || 1;
    const read = Math.min(total, rec.match.recited);
    const stars = kidsStarsFor(read / total);
    const before = Math.max(starsNow.current[surah] ?? 0, best[surah] ?? 0); // v56: journey + recitation (best)
    creditRecitationStars(surah, stars);
    const added = Math.max(0, stars - before);
    setResult({ stars, added, read, total });
    starChime(0.2);
  }, [rec.listening]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setResult(null), [surah]);
  const nextInJourney = (() => { const i = JOURNEY.indexOf(surah); return i >= 0 && i + 1 < JOURNEY.length ? JOURNEY[i + 1]! : surah + 1; })();
  /** A verse fully recited during this session (its clouds open by themselves). */
  const recitedVerse = (i: number) => reciting && i < win.length && rec.match.cursor >= offsets[i]! + targets[i]!.split(" ").length;
  const wordCls = (st: LiveStatus | undefined, current: boolean) => cn("rounded-lg px-0.5 transition-colors",
    current && "bg-[var(--kd-sun)] ring-2 ring-[var(--kd-mango)]",
    st === "CORRECT" && "bg-[#d1fae5] text-[#047857]",
    st === "WARNING" && "bg-[#fef3c7] text-[#b45309]",
    st === "ERROR" && "bg-[#DC2626]/15 text-[#DC2626] ring-[1.5px] ring-[#DC2626]");

  useEffect(() => {
    const ac = new AbortController();
    setAyahs(null); setFailed(false); setTapped(null); setRevealed(new Set());
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
    <div className="space-y-4 pb-[170px]" data-kids-mushaf={surah} data-kids-hide={hide ? "on" : "off"}>
      {nav("top")}
      {/* toolbar: hide the verses to recite from memory */}
      <div className="kd-card kd-3d flex items-center gap-2 p-2" dir={ar ? "rtl" : "ltr"}>
        <button type="button" role="switch" aria-checked={hide} onClick={toggleHide} data-kids-hide-toggle=""
          className={cn("kd-btn flex-1 text-base", hide ? "kd-btn-mango" : "kd-btn-soft")}>
          <span aria-hidden="true">{hide ? "🙈" : "👀"}</span>{hide ? t("kidsShowAyat") : t("kidsHideAyat")}
        </button>
        {hide && revealed.size > 0 && (
          <button type="button" onClick={() => setRevealed(new Set())} className="kd-btn kd-btn-soft !px-4 text-base" aria-label={t("kidsHideAgain")} data-kids-hide-again="">☁️</button>
        )}
      </div>
      <article className="kd-card kd-3d relative overflow-hidden" dir="rtl" lang="ar"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--kd-ink) 7%, transparent) 1px, transparent 0)", backgroundSize: "18px 18px" }}>
        {/* v52 storybook: a ribbon bookmark and a sunrise header */}
        <span aria-hidden="true" className="absolute end-6 top-0 z-[1] h-14 w-7" style={{ background: "linear-gradient(180deg,#fb7185,#e04e66)", clipPath: "polygon(0 0,100% 0,100% 100%,50% 78%,0 100%)" }} />
        {/* surah title — sequential blocks: title → Basmala → verses (never overlapping) */}
        <header className="relative flex flex-col items-center gap-1 overflow-hidden px-4 pb-4 pt-5 text-center" style={{ background: "linear-gradient(180deg, var(--kd-sun), color-mix(in srgb, var(--kd-sun) 30%, transparent) 70%, transparent)" }}>
          <TwinkleStars count={4} seed={1} />
          <KidsBadge id="mushaf" className="relative h-16 w-16 kd-float" />
          <button type="button" onClick={() => setPicker(true)} className="kd-btn kd-btn-mango !min-h-0 px-5 py-2 text-sm" data-kids-picker-open="">📖 {t("kidsPickSurah")}</button>
          <h1 className="relative mt-2 font-arabic text-4xl font-black leading-snug">سورة {meta?.nameArabic}</h1>
          {!ar && meta && (
            <p className="relative text-lg font-extrabold leading-snug" dir="ltr" data-kids-surah-title="">
              {meta.nameSimple}{surahMeaning(surah, language) ? ` (${surahMeaning(surah, language)})` : ""}
            </p>
          )}
          <p className="text-sm font-bold kd-ink-soft" dir={ar ? "rtl" : "ltr"}>{t("kidsVersesCount").replace("{n}", num(meta?.versesCount ?? 0))}</p>
        </header>
        {surah !== 1 && surah !== 9 && (
          <p className="kd-quran px-4 py-3 text-center" data-basmala-flow="" style={{ fontSize: `clamp(22px, ${(size * 0.85).toFixed(1)}px, 44px)`, lineHeight: 1.9, color: "var(--kd-turquoise-deep)" }}>{BASMALAH}</p>
        )}
        <p className="px-4 pb-2 text-center text-sm font-bold kd-ink-soft" dir={ar ? "rtl" : "ltr"}>{hide ? t("kidsHideHint") : t("kidsTapAyahHint")}</p>
        {!ayahs && !failed && <p className="p-10 text-center font-bold kd-ink-soft" dir={ar ? "rtl" : "ltr"}>{t("kidsLoading")}</p>}
        {failed && (
          <div className="space-y-3 p-8 text-center" dir={ar ? "rtl" : "ltr"}>
            <p className="font-bold">{t("kidsOffline")}</p>
            <button type="button" className="kd-btn" onClick={() => setRetry((r) => r + 1)}>{t("kidsTryAgain")}</button>
          </div>
        )}
        {ayahs && (
          <ol className="divide-y-2 divide-dashed px-2 pb-3" style={{ borderColor: "var(--kd-edge)" }}>
            {ayahs.map((a, ai) => (hide && !revealed.has(a.number) && !recitedVerse(ai)) ? (
              <li key={a.number} className="py-2">
                {/* a cloud cover with a golden star border — tap to reveal */}
                <button type="button" onClick={() => reveal(a.number)} data-kids-cloud={a.number}
                  className="relative flex w-full items-center justify-center gap-2 overflow-hidden px-4 py-5 text-center active:translate-y-[2px]"
                  style={{ borderRadius: 26, border: "3px dashed var(--kd-mango)", borderBottomWidth: 6, background: "linear-gradient(180deg, #ffffff, var(--kd-sky))", color: "var(--kd-ink)", boxShadow: "0 0 0 4px rgba(245,158,11,.15)" }}>
                  <span aria-hidden="true" className="absolute -start-2 -top-3 text-3xl opacity-80">☁️</span>
                  <span aria-hidden="true" className="absolute -end-1 -top-2 text-xl">⭐</span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-black text-white" style={{ background: "var(--kd-turquoise)", boxShadow: "0 3px 0 var(--kd-turquoise-deep)" }}>{toArabicDigits(a.number)}</span>
                  <span className="text-base font-black" dir={ar ? "rtl" : "ltr"}>{t("kidsTapReveal")}</span>
                </button>
              </li>
            ) : (
              <li key={a.number} className={cn("relative", sparkle === a.number && "kd-pop")}>
                {sparkle === a.number && <span aria-hidden="true" className="pointer-events-none absolute -top-1 start-3 z-10 text-2xl kids-star">⭐</span>}
                <button type="button" onClick={() => { if (!rec.listening) setTapped(a.number); }} data-kids-ayah={a.number}
                  className={cn("kd-quran block w-full rounded-[22px] px-3 py-3 text-start transition", tapped === a.number ? "bg-[var(--kd-sun)]" : "active:bg-[var(--kd-sky)]")}
                  style={{ fontSize: size, lineHeight: 2.25 }}>
                  {reciting && ai < win.length
                    ? a.text.split(" ").map((w, wi) => {
                        const k = offsets[ai]! + wi;
                        return <span key={wi} data-kids-word={k} data-status={rec.liveStatuses[k] ?? "PENDING"} className={wordCls(rec.liveStatuses[k], k === cursor)}>{w}{" "}</span>;
                      })
                    : a.text}
                  <span aria-hidden="true" className="ms-2 inline-flex h-[1.5em] min-w-[1.5em] translate-y-[-0.1em] items-center justify-center rounded-full align-middle font-sans text-[0.45em] font-black text-white"
                    style={{ background: "var(--kd-turquoise)", boxShadow: "0 3px 0 var(--kd-turquoise-deep)" }}>{toArabicDigits(a.number)}</span>
                  {verseTr(a.number) && (
                    <span className="kd-translation mt-1 block border-t-2 border-dashed border-[color:var(--kd-sky,#bae6fd)] pt-2 font-sans text-[1.02rem] font-semibold leading-relaxed text-[#334155]"
                      dir={language === "ur" ? "rtl" : "ltr"} lang={language} style={{ fontSize: "1.02rem", lineHeight: 1.6, fontFamily: language === "ur" ? "var(--font-arabic)" : undefined }} data-kids-translation={a.number}>
                      {verseTr(a.number)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        )}
      </article>
      {ayahs && nav("bottom")}
      {result && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(15,23,42,.45)] p-5" role="dialog" aria-modal="true" data-kids-result={result.stars} dir={ar ? "rtl" : "ltr"}>
          <div className="kd-card kd-3d kd-pop relative w-full max-w-sm space-y-3 overflow-visible p-6 text-center" style={{ background: "linear-gradient(170deg,#fffdf3 0%,#fff3c4 100%)" }}>
            <p className="text-[2.6rem] leading-none tracking-[0.12em]" aria-label={`${result.stars} / 5`}>
              {Array.from({ length: 5 }, (_, i) => <span key={i} className={i < result.stars ? "kd-pop inline-block" : "inline-block opacity-25 grayscale"} style={{ animationDelay: `${150 + i * 140}ms` }}>⭐</span>)}
            </p>
            <h2 className={cn("font-black leading-snug", ar ? "font-arabic text-[1.7rem]" : "text-2xl")}>{t(`kidsRate${result.stars}` as "kidsRate5")}</h2>
            <p className="text-sm font-bold kd-ink-soft">{t("kidsWordsRead").replace("{n}", num(result.read)).replace("{m}", num(result.total))}</p>
            <p className="rounded-2xl bg-[rgba(255,255,255,.85)] px-3 py-2 text-base font-black text-[#7a4b00] shadow-[inset_0_0_0_2px_#fcd34d]" data-kids-result-added={result.added}>
              {result.added > 0 ? t("kidsStarsAdded").replace("{n}", num(result.added)) : t("kidsStarsBest").replace("{n}", num(Math.max(journeyStars[surah] ?? 0, result.stars)))}
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="button" className="kd-btn kd-btn-coral w-full text-base" onClick={() => { setResult(null); micToggle(); }} data-kids-result-again="">{t("kidsReciteAgain")}</button>
              <button type="button" className="kd-btn w-full text-base" disabled={nextInJourney > 114} onClick={() => { setResult(null); go(nextInJourney); }} data-kids-result-next="">{t("kidsNextSurah")} {ar ? "←" : "→"}</button>
            </div>
          </div>
        </div>
      )}
      {ayahs && (
        <div className={cn("pointer-events-none fixed inset-x-0 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.5rem)] z-30 flex px-4", rec.listening ? "justify-center" : "justify-end")} data-kids-mic="">
          {/* v56: idle → a round button in the corner (keeps the verses and their translation readable);
              listening → the wide «I'm listening» pill in the middle */}
          <button type="button" onClick={micToggle} aria-pressed={rec.listening} data-kids-mic-btn="" aria-label={rec.listening ? t("kidsMicStop") : t("kidsMicStart")}
            className={cn("pointer-events-auto kd-btn flex items-center gap-2 rounded-full font-black shadow-xl",
              rec.listening ? "kd-btn-coral min-h-[3.5rem] px-6 text-lg ring-4 ring-[#fb7185]/40" : "h-[4.25rem] w-[4.25rem] justify-center !p-0 ring-4 ring-white/70")}
            dir={ar ? "rtl" : "ltr"}>
            {rec.listening ? <Square className="h-6 w-6 fill-current" aria-hidden="true" /> : <Mic className="h-8 w-8" aria-hidden="true" />}
            {rec.listening && <span>{t("kidsMicListening")}</span>}
          </button>
        </div>
      )}
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
        {!ar && (
          <span className="block text-[0.72rem] font-bold leading-tight" data-kids-pick-name="">
            {getSurahMeta(s)?.nameSimple}{surahMeaning(s, language) ? <span className="block font-semibold opacity-90">({surahMeaning(s, language)})</span> : null}
          </span>
        )}
        <span className="mt-0.5 flex gap-px text-[0.62rem] leading-none" aria-label={`${stars[s] ?? 0}/5`} data-kids-pick-stars={stars[s] ?? 0}>
          {[0, 1, 2, 3, 4].map((k) => <span key={k} className={k < (stars[s] ?? 0) ? "" : "opacity-30 grayscale"}>⭐</span>)}
        </span>
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
