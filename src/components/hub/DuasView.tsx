import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, Search, Settings2, Share2, Star, X } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { AdhkarTab, QuranText, useMushafData } from "@/components/AdhkarTab";
import { cn } from "@/lib/utils";
import { useI18n, type CopyKey } from "@/lib/i18n";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { toArabicDigits } from "@/lib/quranService";
import type { Mushaf } from "@/lib/mushafData";
import type { QuranRef } from "@/lib/adhkar";
import {
  DUA_CATEGORIES, searchDuas, setDuaReading, shareText, toggleDuaFavorite, useDuaFavorites, useDuaLibrary, useDuaReading,
  type DuaCategory, type DuaEntry,
} from "@/lib/duas";

type Tab = "all" | "fav";

/**
 * كل الأذكار — all duas & adhkar: live search by title, ⭐ favourites (own tab + "favourite adhkar" block on
 * top), collapsible categories, and a detail screen per dua (Arabic with tashkeel, transliteration,
 * translation, reference between ornaments, repetition counter, share, text size).
 */
export function DuasView() {
  const { t, language } = useI18n();
  const ar = language === "ar" || language === "ur";
  const list = useDuaLibrary();
  const favs = useDuaFavorites();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<DuaCategory>>(() => new Set(["daynight"]));
  const [detail, setDetail] = useState<string | null>(null);
  const [daily, setDaily] = useState(false);
  const scrollY = useRef(0);

  const entry = detail && list ? list.find((e) => e.key === detail) ?? null : null;
  if (daily) {
    return (
      <div data-duas-daily="">
        <button type="button" onClick={() => setDaily(false)} className="mb-3 flex items-center gap-1 text-sm" style={{ color: GOLD_LIGHT }}>
          {ar ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}{t("duaAll")}
        </button>
        <AdhkarTab />
      </div>
    );
  }
  if (entry && list) {
    const pool = tab === "fav" ? list.filter((e) => favs.includes(e.key)) : query ? searchDuas(list, query) : list;
    return <DuaDetail entry={entry} pool={pool} onOpen={setDetail} onBack={() => { setDetail(null); requestAnimationFrame(() => window.scrollTo(0, scrollY.current)); }} />;
  }
  const openEntry = (key: string) => { scrollY.current = window.scrollY; setDetail(key); window.scrollTo(0, 0); };
  const title = (e: DuaEntry) => (ar ? e.ar : e.en || e.ar);

  const favList = list ? list.filter((e) => favs.includes(e.key)) : [];
  const results = list && query ? searchDuas(list, query) : null;

  return (
    <div className="pb-24" data-duas="">
      <h2 className="font-arabic text-3xl font-bold leading-tight text-white" style={{ textShadow: `0 0 18px ${alpha(GOLD, 0.35)}` }}>كل الأذكار</h2>
      {!ar && <p className="text-xs text-emerald-100/65">{t("duaAll")}</p>}

      <label className="mt-3 flex items-center gap-2 rounded-2xl bg-black/30 px-3" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.35)}` }}>
        <Search className="h-5 w-5 shrink-0 text-emerald-100/60" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={ar ? "ابحث باستخدام العنوان" : t("duaSearch")} aria-label={t("duaSearch")} data-duas-search=""
          className="h-12 min-w-0 flex-1 bg-transparent text-base text-emerald-50 outline-none placeholder:text-emerald-100/45" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label={t("close")} className="text-emerald-100/60"><X className="h-4 w-4" /></button>}
      </label>

      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl p-1" style={{ background: "rgba(0,0,0,.2)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }} role="tablist">
        {([["all", "🎙️", "جميع الأذكار", "duaTabAll"], ["fav", "❤️", "المفضلة", "duaTabFav"]] as const).map(([id, emoji, arLabel, key]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} data-duas-tab={id} onClick={() => setTab(id)}
            className={cn("flex items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-xs font-semibold", tab === id ? "text-emerald-950" : "text-emerald-100/80")}
            style={tab === id ? { background: GOLD_GRADIENT } : undefined}>
            <span aria-hidden="true">{emoji}</span><span className="truncate">{ar ? arLabel : t(key)}</span>
          </button>
        ))}
        <button type="button" onClick={() => setDaily(true)} data-duas-daily-open="" className="flex items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-xs font-semibold text-emerald-100/80">
          <span aria-hidden="true">📿</span><span className="truncate">{t("duaDaily")}</span>
        </button>
      </div>

      {!list && <div className="mt-4 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-black/20" />)}</div>}

      {list && results && (
        <>
          <p className="mt-3 text-xs text-emerald-100/60">{results.length ? `${ar ? toArabicDigits(results.length) : results.length} ${t("duaResults")}` : t("duaNoResults")}</p>
          <ul className="mt-2 space-y-2">{results.map((e) => <DuaRow key={e.key} e={e} title={title(e)} fav={favs.includes(e.key)} onOpen={openEntry} />)}</ul>
        </>
      )}

      {list && !results && tab === "fav" && (
        favList.length
          ? <ul className="mt-3 space-y-2" data-duas-fav-list="">{favList.map((e) => <DuaRow key={e.key} e={e} title={title(e)} fav onOpen={openEntry} />)}</ul>
          : <p className="mt-6 text-center text-sm text-emerald-100/70" data-duas-fav-empty="">{t("duaNoFav")}</p>
      )}

      {list && !results && tab === "all" && (
        <>
          {favList.length > 0 && (
            <section className="mt-4" data-duas-fav-block="">
              <h3 className="mb-2 font-arabic text-lg font-bold text-white">{ar ? "الأذكار المفضلة" : t("duaFavBlock")}</h3>
              <ul className="space-y-2">{favList.map((e) => <DuaRow key={e.key} e={e} title={title(e)} fav onOpen={openEntry} />)}</ul>
            </section>
          )}
          <div className="mt-4 space-y-2.5">
            {DUA_CATEGORIES.map((c) => {
              const items = list.filter((e) => e.cat === c.id);
              if (!items.length) return null;
              const isOpen = open.has(c.id);
              return (
                <section key={c.id} className="rounded-2xl" style={{ background: "rgba(0,0,0,.16)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, isOpen ? 0.45 : 0.25)}` }} data-duas-cat={c.id}>
                  <button type="button" aria-expanded={isOpen} onClick={() => { const n = new Set(open); if (isOpen) n.delete(c.id); else n.add(c.id); setOpen(n); }}
                    className="flex w-full items-center gap-3 px-3 py-3 text-start">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: alpha(GOLD, 0.14) }} aria-hidden="true">{c.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-base font-semibold text-emerald-50", ar && "font-arabic")}>{t(c.key as CopyKey)}</span>
                      <span className="block text-[0.7rem] text-emerald-100/55">{ar ? toArabicDigits(items.length) : items.length}</span>
                    </span>
                    <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", isOpen && "rotate-180")} style={{ color: GOLD_LIGHT }} />
                  </button>
                  {isOpen && <ul className="space-y-2 px-2 pb-2">{items.map((e) => <DuaRow key={e.key} e={e} title={title(e)} fav={favs.includes(e.key)} onOpen={openEntry} />)}</ul>}
                </section>
              );
            })}
          </div>
          <p className="mt-4 text-center text-[0.68rem] leading-relaxed text-emerald-100/45">{t("duaSourceCredit")}</p>
        </>
      )}
    </div>
  );
}

function DuaRow({ e, title, fav, onOpen }: { e: DuaEntry; title: string; fav: boolean; onOpen: (k: string) => void }) {
  const { t, language } = useI18n();
  const ar = language === "ar" || language === "ur";
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-black/25 p-2.5" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.18)}` }} data-dua={e.key}>
      <button type="button" onClick={() => onOpen(e.key)} className="flex min-w-0 flex-1 items-center gap-3 text-start" data-dua-open={e.key}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: "rgba(255,255,255,.06)" }} aria-hidden="true">{e.icon}</span>
        <span className="min-w-0 flex-1">
          <span className={cn("block leading-snug text-emerald-50", ar ? "font-arabic text-[1.05rem]" : "text-[0.95rem] font-medium")}>{title}</span>
          {!ar && <span className="mt-0.5 block truncate font-arabic text-[0.8rem] text-emerald-100/55" dir="rtl">{e.ar}</span>}
        </span>
      </button>
      <button type="button" onClick={() => { tapHaptic(); void toggleDuaFavorite(e.key); }} aria-pressed={fav} aria-label={t(fav ? "recFavRemove" : "recFavAdd")} data-dua-fav={e.key}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <Star className="h-6 w-6" style={{ color: fav ? "#facc15" : "rgba(236,253,245,.85)" }} fill={fav ? "#facc15" : "none"} />
      </button>
    </li>
  );
}

/** Ornamental divider of the reference (as in printed adhkar books). */
function Ornament() {
  return (
    <svg viewBox="0 0 320 16" className="h-4 w-full" aria-hidden="true">
      <g fill="none" stroke={alpha(GOLD, 0.7)} strokeWidth="1.4">
        <line x1="8" y1="8" x2="138" y2="8" /><line x1="182" y1="8" x2="312" y2="8" />
        <path d="M160 2 L168 8 L160 14 L152 8 Z" fill={alpha(GOLD, 0.7)} />
        <path d="M144 8 l5 -4 l5 4 l-5 4 z" /><path d="M166 8 l5 -4 l5 4 l-5 4 z" />
      </g>
      <circle cx="6" cy="8" r="3" fill={alpha(GOLD, 0.7)} /><circle cx="314" cy="8" r="3" fill={alpha(GOLD, 0.7)} />
    </svg>
  );
}

const quranPlain = (mushaf: Mushaf | null) => (refs: QuranRef[]) =>
  mushaf ? refs.map((r) => Array.from({ length: r.to - r.from + 1 }, (_, i) => r.from + i).map((a) => {
    const w = mushaf.words(r.surah, a);
    return (a === r.from && r.fromWord ? w.slice(r.fromWord - 1) : w).join(" ") + ` ﴿${toArabicDigits(a)}﴾`;
  }).join(" ")).join("\n") : "";

function DuaDetail({ entry, pool, onOpen, onBack }: { entry: DuaEntry; pool: DuaEntry[]; onOpen: (k: string) => void; onBack: () => void }) {
  const { t, language } = useI18n();
  const ar = language === "ar" || language === "ur";
  const mushaf = useMushafData();
  const reading = useDuaReading();
  const favs = useDuaFavorites();
  const fav = favs.includes(entry.key);
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [settings, setSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setIdx(0); setCount(0); }, [entry.key]);
  useEffect(() => { setCount(0); }, [idx]);
  const text = entry.texts[Math.min(idx, entry.texts.length - 1)]!;
  const n = (x: number) => (ar ? toArabicDigits(x) : String(x));
  const pos = pool.findIndex((e) => e.key === entry.key);
  const touch = useRef<number | null>(null);

  const step = (d: 1 | -1) => {
    const ni = idx + d;
    if (ni >= 0 && ni < entry.texts.length) { setIdx(ni); return; }
    // past the last / before the first text: the next / previous dua of the list
    const other = pool[pos + d];
    if (other) onOpen(other.key);
  };
  const tapCount = () => {
    if (text.repeat <= 1) return;
    const c = Math.min(text.repeat, count + 1);
    setCount(c);
    if (c === text.repeat) { successHaptic(); if (idx < entry.texts.length - 1) setTimeout(() => setIdx((i) => i + 1), 450); } else tapHaptic();
  };
  const share = async () => {
    const body = shareText(entry, quranPlain(mushaf));
    try {
      if (navigator.share) { await navigator.share({ title: entry.ar, text: body }); return; }
    } catch { /* cancelled → copy instead */ }
    try { await navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* not allowed */ }
  };
  const size = reading.size;
  const translation = text.en;
  const Back = ar ? ChevronRight : ChevronLeft;

  return (
    <div className="-mx-1 pb-24" data-dua-detail={entry.key}
      onTouchStart={(e) => { touch.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        const x0 = touch.current; touch.current = null;
        const x1 = e.changedTouches[0]?.clientX;
        if (x0 == null || x1 == null || Math.abs(x1 - x0) < 70) return;
        const forward = ar ? x1 > x0 : x1 < x0; // RTL: swipe right = next
        step(forward ? 1 : -1);
      }}>
      <div className="qm-native-colors sticky top-0 z-10 flex items-center gap-2 rounded-2xl bg-[#0b1a14]/90 p-2 backdrop-blur" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.25)}` }}>
        <button type="button" onClick={onBack} aria-label={t("back")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5" style={{ color: GOLD_LIGHT }} data-dua-back=""><Back className="h-5 w-5" /></button>
        <span className="flex-1" />
        <button type="button" onClick={() => { tapHaptic(); void toggleDuaFavorite(entry.key); }} aria-pressed={fav} aria-label={t(fav ? "recFavRemove" : "recFavAdd")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5">
          <Star className="h-5 w-5" style={{ color: fav ? "#facc15" : GOLD_LIGHT }} fill={fav ? "#facc15" : "none"} />
        </button>
        <button type="button" onClick={() => void share()} aria-label={t("duaShare")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5" style={{ color: GOLD_LIGHT }} data-dua-share=""><Share2 className="h-5 w-5" /></button>
        <button type="button" onClick={() => setSettings((s) => !s)} aria-expanded={settings} aria-label={t("duaReadingSettings")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5" style={{ color: GOLD_LIGHT }} data-dua-settings=""><Settings2 className="h-5 w-5" /></button>
      </div>
      {copied && <p className="mt-2 text-center text-xs text-emerald-300">{t("duaCopied")}</p>}
      {settings && (
        <div className="mt-2 space-y-2 rounded-2xl bg-black/30 p-3 text-sm text-emerald-50" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }} data-dua-settings-panel="">
          <div className="flex items-center gap-2">
            <span className="flex-1">{t("duaTextSize")}</span>
            <button type="button" onClick={() => setDuaReading({ size: Math.max(0.8, Math.round((size - 0.1) * 10) / 10) })} aria-label="A−" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><Minus className="h-4 w-4" /></button>
            <span className="w-10 text-center tabular-nums">{Math.round(size * 100)}%</span>
            <button type="button" onClick={() => setDuaReading({ size: Math.min(1.8, Math.round((size + 0.1) * 10) / 10) })} aria-label="A+" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><Plus className="h-4 w-4" /></button>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={reading.tr} onChange={(e) => setDuaReading({ tr: e.target.checked })} className="h-4 w-4 accent-amber-400" />{t("duaShowTranslit")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={reading.translation} onChange={(e) => setDuaReading({ translation: e.target.checked })} className="h-4 w-4 accent-amber-400" />{t("duaShowTranslation")}</label>
        </div>
      )}

      <h2 className="mt-5 px-2 text-center text-2xl font-bold leading-snug text-white" data-dua-title="">{ar ? entry.ar : entry.en || entry.ar}</h2>
      {!ar && <p className="mt-1 text-center font-arabic text-base text-emerald-100/70">{entry.ar}</p>}

      <article onClick={tapCount} className={cn("mt-5 px-2", text.repeat > 1 && "cursor-pointer select-none")} data-dua-text={text.id}>
        {text.preface && <p dir="rtl" lang="ar" className="mb-2 text-center font-arabic text-emerald-100/85" style={{ fontSize: `${1.15 * size}rem` }}>{text.preface}</p>}
        {text.quran && <div style={{ fontSize: `${size}em` }}><QuranText refs={text.quran} mushaf={mushaf} clamp={false} /></div>}
        {text.ar && (
          <p dir="rtl" lang="ar" className="whitespace-pre-line text-start font-arabic leading-[2.05] text-white" style={{ fontSize: `${1.6 * size}rem` }} data-dua-arabic="">{text.ar}</p>
        )}
        {reading.tr && text.tr && <p dir="ltr" className="mt-4 text-start leading-relaxed text-emerald-100/55" style={{ fontSize: `${1.15 * size}rem` }} data-dua-translit="">{text.tr}</p>}
        {reading.translation && translation && (
          <p dir="ltr" className="mt-4 text-start leading-relaxed text-emerald-50/90" style={{ fontSize: `${1.2 * size}rem` }} data-dua-translation="">
            {translation.startsWith("(") ? translation : `(${translation})`}
          </p>
        )}
        {reading.translation && translation && language !== "en" && !ar && <p className="mt-1 text-[0.7rem] text-emerald-100/45">{t("duaTranslationEnglish")}</p>}

        {(text.ref || (entry.chapterRefs && idx === entry.texts.length - 1)) && (
          <div className="mt-6" data-dua-ref="">
            <Ornament />
            <p dir="rtl" lang="ar" className="my-2 whitespace-pre-line px-1 font-arabic leading-relaxed text-emerald-50/85" style={{ fontSize: `${1.05 * size}rem` }}>
              {text.ref ?? entry.chapterRefs!.join("\n")}
            </p>
            <Ornament />
          </div>
        )}

        {text.repeat > 1 && (
          <div className="mt-5 flex items-center justify-center gap-3" data-dua-counter="">
            <span className="rounded-full px-4 py-2 text-lg font-bold tabular-nums text-emerald-950" style={{ background: count >= text.repeat ? "#4ade80" : GOLD_GRADIENT }}>{n(count)} / {n(text.repeat)}</span>
            <span className="text-xs text-emerald-100/60">{t("duaTapToCount")}</span>
          </div>
        )}
      </article>

      <div className="mt-8 flex items-center justify-center gap-6 text-emerald-100/80">
        <button type="button" onClick={() => step(-1)} disabled={idx === 0 && pos <= 0} aria-label={t("prevPage")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 disabled:opacity-30" data-dua-prev="">
          {ar ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
        <span className="min-w-[3.5rem] text-center text-base tabular-nums" data-dua-pos="">{n(idx + 1)}/{n(entry.texts.length)}</span>
        <button type="button" onClick={() => step(1)} disabled={idx === entry.texts.length - 1 && pos >= pool.length - 1} aria-label={t("nextPage")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 disabled:opacity-30" data-dua-next="">
          {ar ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

export default DuasView;
