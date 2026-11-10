import { useEffect, type ReactNode } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Home, LayoutGrid, Mic, Search, Settings, Share2, Target, X } from "lucide-react";
import { AppLogo, AppWordmark, GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { TOTAL_PAGES } from "@/lib/mushafData";
import { SURAH_META, toArabicDigits } from "@/lib/quranService";

import { directionFor, useI18n, type CopyKey } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { cn } from "@/lib/utils";

/** Prayer times, Qibla, adhkar, Tajweed and Hadith live together in the Islamic hub ("hub"). */
export type AppTab = "home" | "mushaf" | "practice" | "khatma" | "hub";

/** Burger button: top of the full-screen Mushaf and of every other screen (global header). */
export function BurgerButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-amber-200"
      style={{ background: alpha("var(--mf-page-deep)", 0.85), boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

/** Search button (opens the Quran search), next to the burger. */
export function SearchButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-amber-200"
      style={{ background: alpha("var(--mf-page-deep)", 0.85), boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}>
      <Search className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

/**
 * The app's side menu (burger), available on every screen: navigation, surah / juz / page selection
 * (opens the Mushaf there), settings and invite. `current` marks the screen that is open.
 */
export function MushafMenu({ open, onClose, page, surah, juz, onPage, onSurah, onJuz, onNavigate, onSettings, onInvite, onSearch, onGoTo, current = "mushaf" }: {
  current?: AppTab;
  open: boolean;
  onClose: () => void;
  page: number;
  surah: number;
  juz: number;
  onPage: (p: number) => void;
  onSurah: (s: number) => void;
  onJuz: (j: number) => void;
  onNavigate: (tab: AppTab) => void;
  onSettings: () => void;
  onInvite: () => void;
  /** Opens the Quran search (surah, verse, words). */
  onSearch?: (() => void) | undefined;
  /** v33: the Mushaf's own «اذهب إلى» dialog (all surahs, search, recently read) instead of the pickers. */
  onGoTo?: (() => void) | undefined;
}) {
  const { t, language } = useI18n();
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  const nav: { id: AppTab; label: CopyKey; icon: ReactNode }[] = [
    { id: "home", label: "start", icon: <Home className="h-5 w-5" /> },
    { id: "mushaf", label: "navMushaf", icon: <BookOpen className="h-5 w-5" /> },
    { id: "practice", label: "navPractice", icon: <Mic className="h-5 w-5" /> },
    { id: "khatma", label: "navKhatma", icon: <Target className="h-5 w-5" /> },
    { id: "hub", label: "navHub", icon: <LayoutGrid className="h-5 w-5" /> },
  ];
  const go = (fn: () => void) => () => { fn(); onClose(); };

  return (
    <div className="fixed inset-0 z-50" dir={directionFor(language)} lang={language}>
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in" />
      <aside role="dialog" aria-modal="true" aria-label={t("menu")}
        className="absolute inset-y-0 start-0 flex w-[82%] max-w-xs flex-col overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl animate-in fade-in slide-in-from-right-4 duration-200"
        style={{ background: "linear-gradient(180deg, var(--hq-emerald), var(--hq-emerald-deep))", boxShadow: `inset -1px 0 0 ${alpha(GOLD, 0.6)}` }}>
        <div className="flex items-center gap-3">
          <AppLogo className="h-11 w-11" />
          <AppWordmark size="sm" className="flex-1 items-start" />
          <button type="button" onClick={onClose} aria-label={t("close")} className="flex h-9 w-9 items-center justify-center rounded-full text-amber-200 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        <nav className="mt-5 space-y-1">
          {nav.map((n) => (
            <button key={n.id} type="button" onClick={go(() => onNavigate(n.id))} aria-current={n.id === current ? "page" : undefined}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition", n.id === current ? "bg-amber-300/15 text-amber-100" : "text-emerald-50 hover:bg-white/5")}>
              <span style={{ color: GOLD_LIGHT }}>{n.icon}</span>{t(n.label)}
            </button>
          ))}
        </nav>

        <div className="my-4 h-px" style={{ background: alpha(GOLD, 0.4) }} />

        {onSearch && (
          <button type="button" onClick={go(onSearch)} className="mb-3 flex w-full items-center gap-3 rounded-xl border border-amber-400/40 px-3 py-2.5 text-start text-sm text-emerald-50 hover:bg-white/5">
            <Search className="h-5 w-5" style={{ color: GOLD_LIGHT }} />{t("searchTitle")}
          </button>
        )}
        {onGoTo && (
          <button type="button" onClick={go(onGoTo)} data-menu-goto="" className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>
            <BookOpen className="h-5 w-5" />{t("goTo")}
          </button>
        )}
        {!onGoTo && <h2 className="mb-2 text-xs font-medium text-emerald-100/70">{t("goTo")}</h2>}
        <div className={onGoTo ? "hidden" : "space-y-2"}>
          <label className="block text-xs text-emerald-100/70">{t("surah")}
            <select value={surah} onChange={(e) => { onSurah(Number(e.target.value)); onClose(); }} className={selectCls}>
              {SURAH_META.map((s) => <option key={s.id} value={s.id}>{language === "ar" ? `${toArabicDigits(s.id)}. ${s.nameArabic}` : `${s.id}. ${s.nameSimple}`}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-emerald-100/70">{t("juz")}
              <select value={juz} onChange={(e) => { onJuz(Number(e.target.value)); onClose(); }} className={selectCls}>
                {Array.from({ length: 30 }, (_, i) => <option key={i} value={i + 1}>{num(i + 1)}</option>)}
              </select>
            </label>
            <label className="block text-xs text-emerald-100/70">{t("pageLabel")}
              <select value={page} onChange={(e) => { onPage(Number(e.target.value)); onClose(); }} className={selectCls}>
                {Array.from({ length: TOTAL_PAGES }, (_, i) => <option key={i} value={i + 1}>{num(i + 1)}</option>)}
              </select>
            </label>
          </div>
          {current === "mushaf" && <div className="grid grid-cols-2 gap-2 pt-1" dir="rtl">
            <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={pageBtn}><ChevronRight className="h-4 w-4" />{t("prevPage")}</button>
            <button type="button" disabled={page >= TOTAL_PAGES} onClick={() => onPage(page + 1)} className={pageBtn}>{t("nextPage")}<ChevronLeft className="h-4 w-4" /></button>
          </div>}
        </div>

        <div className="my-4 h-px" style={{ background: alpha(GOLD, 0.4) }} />
        <LanguageSelector variant="row" />
        <button type="button" onClick={go(onSettings)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-50 hover:bg-white/5">
          <Settings className="h-5 w-5" style={{ color: GOLD_LIGHT }} />{t("settingsTitle")}
        </button>
        <button type="button" onClick={go(onInvite)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>
          <Share2 className="h-4 w-4" />{t("inviteTitle")}
        </button>
      </aside>
    </div>
  );
}

const selectCls = "mt-1 h-10 w-full rounded-xl border border-amber-400/40 bg-[var(--mf-page-deep)] px-2 text-sm text-emerald-50";
const pageBtn = "flex items-center justify-center gap-1 rounded-xl border border-amber-400/40 px-2 py-2 text-xs text-amber-100 disabled:opacity-40";

export default MushafMenu;
/** The same menu under its app-wide name. */
export const AppMenu = MushafMenu;
