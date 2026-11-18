import { useEffect, useState, type ReactNode } from "react";
import { useBackLayer } from "@/lib/backStack";
import { Bell, BellRing, BookOpen, BookOpenCheck, Check, ChevronDown, Clock, Compass, Download, Globe, Headphones, Home, Library, Map as MapIcon, Mic, Pin, Search, Settings, Share2, SunMoon, Target, Type, X } from "lucide-react";
import { homeTileDef, togglePin, pinTile, usePinned, type HomeTileId } from "@/lib/homeLayoutStore";
import { showToast } from "@/lib/appToast";
import { LargePrintToggle } from "@/components/LargePrintToggle";
import { PrayingPersonIcon } from "@/components/icons/PrayingPersonIcon";
import { updateSettings } from "@/lib/settings";
import type { HubSection } from "@/components/IslamicHubView";
import type { SettingsPage } from "@/components/SettingsModal";
import { AppLogo, AppWordmark, GOLD, alpha } from "@/components/ornaments";

import { directionFor, useI18n, type CopyKey } from "@/lib/i18n";
import { languageInfo } from "@/i18n";
import { cn } from "@/lib/utils";

/** Prayer times, Qibla, adhkar, Tajweed and Hadith live together in the Islamic hub ("hub"). */
export type AppTab = "home" | "mushaf" | "practice" | "khatma" | "hub";

/** Burger button: top of the full-screen Mushaf and of every other screen (global header). */
export function BurgerButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl text-[var(--sx-gold-soft)]"
      style={{ background: "var(--sx-card)", boxShadow: `inset 0 0 0 1.5px var(--sx-card-top), var(--sx-card-shadow)` }}>
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}


/**
 * The app's side menu (burger), available on every screen: navigation, companion, hub sections,
 * settings pages and invite. `current` marks the screen that is open.
 */
export function MushafMenu({ open, onClose, onNavigate, onSettings, onInvite, onSearch, onCompanion, onHub, onSettingsPage, profile, current = "mushaf" }: {
  current?: AppTab;
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: AppTab) => void;
  onSettings: () => void;
  onInvite: () => void;
  /** Opens the Quran search (surah, verse, words). */
  onSearch?: (() => void) | undefined;
  /** v51 flat menu: the companion, a hub section, a settings page, and the account row. */
  onCompanion?: () => void;
  onHub?: (s: HubSection) => void;
  onSettingsPage?: (p: SettingsPage) => void;
  profile?: ReactNode;
}) {
  const { t, language } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  useBackLayer(open, onClose);
  /** v57: a row dragged out of the menu (mouse / pen / tablet) — dropped on the «Home» zone it is pinned. */
  const [dragPin, setDragPin] = useState<HomeTileId | null>(null);
  if (!open) return null;

  const ic = "h-7 w-7";
  type Row = MenuRow;
  const main: Row[] = [
    { key: "home", icon: <Home className={ic} />, title: "start", sub: "menuHomeSub", on: () => onNavigate("home"), current: current === "home" },
    { key: "mushaf", icon: <BookOpen className={ic} />, title: "navMushaf", sub: "menuMushafSub", pin: "read", on: () => onNavigate("mushaf"), current: current === "mushaf" },
    { key: "practice", icon: <Mic className={ic} />, title: "navPractice", sub: "menuReciteSub", pin: "recite", on: () => onNavigate("practice"), current: current === "practice" },
    { key: "companion", icon: <PrayingPersonIcon className={ic} />, title: "navCompanion", sub: "menuCompanionSub", pin: "companion", on: onCompanion ?? (() => window.dispatchEvent(new CustomEvent("qm:open-companion"))) },
    { key: "khatma", icon: <Target className={ic} />, title: "navKhatma", sub: "menuKhatmaSub", pin: "khatma", on: () => onNavigate("khatma"), current: current === "khatma" },
  ];
  const hub = (id: HubSection) => () => { if (onHub) onHub(id); else window.dispatchEvent(new CustomEvent("qm:open-hub", { detail: id })); };
  const more: Row[] = [
    { key: "stories", icon: <BookOpenCheck className={ic} />, title: "homeStoriesTitle", sub: "homeStoriesSub", pin: "stories", on: hub("stories") },
    { key: "prophets", icon: <MapIcon className={ic} />, title: "storiesJourneyTab", sub: "tileProphetsSub", pin: "prophets", on: homeTileDef("prophets").open },
    { key: "tajweed", icon: <BookOpenCheck className={ic} />, title: "homeTajweedTitle", sub: "homeTajweedSub", pin: "tajweed", on: hub("tajweed") },
    { key: "prayer", icon: <Clock className={ic} />, title: "hubPrayer", sub: "hubPrayerSub", pin: "prayer", on: hub("prayer") },
    { key: "qibla", icon: <Compass className={ic} />, title: "navQibla", sub: "hubQiblaSub", pin: "qibla", on: hub("qibla") },
    { key: "adhkar", icon: <SunMoon className={ic} />, title: "hubAdhkar", sub: "hubAdhkarSub", pin: "adhkar", on: hub("adhkar") },
    { key: "hadith", icon: <Library className={ic} />, title: "hubHadith", sub: "hubHadithSub", pin: "hadith", on: hub("hadith") },
    { key: "reciters", icon: <Headphones className={ic} />, title: "hubReciters", sub: "hubRecitersSub", pin: "reciters", on: hub("reciters") },
    { key: "recordings", icon: <Mic className={ic} />, title: "hubRecordings", sub: "hubRecordingsSub", pin: "recordings", on: hub("recordings") },
  ];
  const page2 = (p: SettingsPage) => () => { if (onSettingsPage) onSettingsPage(p); else window.dispatchEvent(new CustomEvent("qm:open-settings", { detail: p })); };
  const settingsRows: Row[] = [
    ...(onSearch ? [{ key: "search", icon: <Search className={ic} />, title: "searchTitle" as CopyKey, sub: "menuSearchSub" as CopyKey, pin: "search" as HomeTileId, on: onSearch }] : []),
    { key: "typo", icon: <Type className={ic} />, title: "setTypography", sub: "menuTypoSub", on: page2("typography") },
    { key: "adhan", icon: <BellRing className={ic} />, title: "menuAdhanTitle", sub: "menuAdhanSub", pin: "adhan", on: hub("prayer") },
    { key: "reminders", icon: <Bell className={ic} />, title: "tileRemindersTitle", sub: "tileRemindersSub", pin: "reminders", on: page2("reminders") },
    { key: "downloads", icon: <Download className={ic} />, title: "menuDownloadsTitle", sub: "menuDownloadsSub", on: page2("offline") },
    { key: "settings", icon: <Settings className={ic} />, title: "settingsTitle", sub: "menuSettingsSub", on: onSettings },
    { key: "invite", icon: <Share2 className={ic} />, title: "inviteTitle", sub: "menuInviteSub", on: onInvite },
  ];
  const go = (fn: () => void) => () => { fn(); onClose(); };

  return (
    <div className="fixed inset-0 z-50" dir={directionFor(language)} lang={language}>
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in" />
      <aside role="dialog" aria-modal="true" aria-label={t("menu")}
        className="absolute inset-y-0 start-0 flex w-[86%] max-w-sm flex-col overflow-y-auto [&>*]:shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl animate-in fade-in slide-in-from-right-4 duration-200"
        style={{ background: "var(--sx-sheet)", boxShadow: `inset -1px 0 0 ${alpha(GOLD, 0.6)}` }}>
        <div className="flex items-center gap-3">
          <AppLogo className="h-11 w-11" />
          <AppWordmark size="sm" className="flex-1 items-start" />
          <button type="button" onClick={onClose} aria-label={t("close")} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--sx-gold)] hover:bg-[var(--sx-chip)]"><X className="h-5 w-5" /></button>
        </div>

        {/* v54: profile + a prominent language pill (opens Settings → Language, the same setting) */}
        <div className="mt-3 flex flex-wrap items-center gap-2" data-menu-top="">
          {profile}
          <button type="button" data-menu-language="" aria-label={t("menuLanguage")}
            onClick={go(() => window.dispatchEvent(new CustomEvent("qm:open-settings", { detail: "language" })))}
            className="flex h-10 items-center gap-1.5 rounded-full border-2 border-[var(--sx-gold)] bg-[var(--sx-chip)] pe-3 ps-2.5 text-[0.95rem] font-extrabold text-[var(--sx-ink)] shadow-sm active:scale-[.98]">
            <Globe className="h-5 w-5 shrink-0 text-[var(--sx-gold)]" aria-hidden="true" />
            <span className={language === "ar" || language === "ur" ? "font-arabic text-[1.05rem]" : undefined}>{languageInfo(language).native}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--sx-gold)]" aria-hidden="true" />
          </button>
        </div>

        {/* v51: large print — the first thing in the menu */}
        <LargePrintToggle className="mt-4" />

        {/* v51: Kids Mode lives here (not in the header), as a clearly labelled card */}
        <div className="relative mt-3">
          <button type="button" onClick={go(() => void updateSettings({ kidsMode: true }))} data-menu-kids=""
            draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", "kids"); setDragPin("kids"); }} onDragEnd={() => setDragPin(null)}
            className="flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl px-4 py-3 pe-[4.25rem] text-start text-[#2a1b00]"
            style={{ background: "linear-gradient(135deg,#fde68a,#fbbf24)", boxShadow: "inset 0 0 0 2px #d97706" }}>
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-2xl">🧒</span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-extrabold leading-snug">{t("kidsSwitchTitle")}</span>
              <span className="block text-sm leading-snug">{t("kidsSwitchSub")}</span>
            </span>
          </button>
          <PinButton id="kids" className="qm-native-colors absolute end-3 top-1/2 -translate-y-1/2 !bg-white/80" />
        </div>

        <p className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--sx-chip)] px-3 py-2 text-[0.85rem] leading-snug text-[var(--sx-ink-soft)]" data-menu-pin-hint="">
          <Pin className="h-4 w-4 shrink-0 text-[var(--sx-gold)]" aria-hidden="true" />{t("menuPinHint")}
        </p>
        <MenuGroup title={t("menuGroupMain")} rows={main} go={go} t={t} onDrag={setDragPin} />
        <MenuGroup title={t("menuGroupMore")} rows={more} go={go} t={t} onDrag={setDragPin} />
        <MenuGroup title={t("menuGroupSettings")} rows={settingsRows} go={go} t={t} onDrag={setDragPin} />

        {/* v54: «Go to» removed from the menu (the Mushaf sub-bar has its own surah/page picker). */}

      </aside>
      {dragPin && (
        <div data-menu-dropzone="" onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const id = (e.dataTransfer.getData("text/plain") || dragPin) as HomeTileId; showToast(t(pinTile(id) ? "homeAddedToast" : "homeAlreadyToast")); setDragPin(null); }}
          className="absolute inset-y-0 end-0 flex w-[14%] min-w-16 flex-col items-center justify-center gap-2 border-s-[3px] border-dashed border-[#f3d27a] bg-[#d4af37]/25 text-center text-[0.8rem] font-bold text-[#f3d27a] animate-in fade-in">
          <Home className="h-7 w-7" aria-hidden="true" /><span className="px-1">{t("homeDropHere")}</span>
        </div>
      )}
    </div>
  );
}

/** v57: «📌 إلى الرئيسية» — pins the row's destination as a Home tile (tap again to remove it). */
function PinButton({ id, className }: { id: HomeTileId; className?: string }) {
  const { t } = useI18n();
  const pinned = usePinned(id);
  return (
    <button type="button" data-menu-pin={id} aria-pressed={pinned} aria-label={`${t(pinned ? "homePinnedLabel" : "homePinLabel")}: ${t(homeTileDef(id).title)}`}
      onClick={(e) => { e.stopPropagation(); showToast(t(togglePin(id) ? "homeAddedToast" : "homeRemovedToast")); }}
      className={cn("relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95", className,
        pinned ? "text-[#1b1300] shadow-[0_4px_12px_-6px_rgba(212,175,55,.9)]" : "border-2 border-dashed border-[var(--sx-gold)] bg-[var(--sx-chip)] text-[var(--sx-gold)]")}
      style={pinned ? { background: "linear-gradient(135deg,#f3d27a,#d4af37)" } : undefined}>
      {pinned ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> : <Pin className="h-5 w-5" aria-hidden="true" />}
      {!pinned && <span aria-hidden="true" className="absolute -end-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#d4af37] text-[13px] font-black leading-none text-[#1b1300]">+</span>}
    </button>
  );
}

type MenuRow = { key: string; icon: ReactNode; title: CopyKey; sub: CopyKey; on: () => void; current?: boolean; pin?: HomeTileId };

/** v51: a flat group of large, self-explaining rows (icon ≥ 28 px, title, one-line help, ≥ 52 px tall); v57: 📌 pin per row. */
function MenuGroup({ title, rows, go, t, onDrag }: { title: string; rows: MenuRow[]; go: (fn: () => void) => () => void; t: (k: CopyKey) => string; onDrag: (id: HomeTileId | null) => void }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 px-1 text-sm font-bold text-[var(--sx-gold)]">{title}</h2>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-1.5">
            <button type="button" onClick={go(r.on)} aria-current={r.current ? "page" : undefined} data-menu-row={r.key}
              draggable={!!r.pin} onDragStart={r.pin ? (e) => { e.dataTransfer.setData("text/plain", r.pin!); onDrag(r.pin!); } : undefined} onDragEnd={() => onDrag(null)}
              className={cn("flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition", r.current ? "bg-[var(--sx-chip)]" : "hover:bg-[var(--sx-chip)]")}>
              <span className="shrink-0 text-[var(--sx-gold)]">{r.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold leading-snug text-[var(--sx-ink)]">{t(r.title)}</span>
                <span className="block text-sm leading-snug text-[var(--sx-ink-soft)]">{t(r.sub)}</span>
              </span>
            </button>
            {r.pin && <PinButton id={r.pin} />}
          </li>
        ))}
      </ul>
    </section>
  );
}


export default MushafMenu;
