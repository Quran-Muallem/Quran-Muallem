/**
 * v46 «رفيق الصلاة والمراجعة» — one place for both AI companions, with a segmented switch at the top
 * (same pill style as القراءة / الحفظ):
 *  • «رفيق الصلاة»  – Salat Companion (v42) + motion rakʿah counter (v43)
 *  • «المراجعة الحرة» – hands-free pocket / Bluetooth Hifdh (v45)
 * The switch is shown on both setup screens; once a session runs, its full-screen focus view takes over.
 */
import { useEffect } from "react";
import { SalatModeView } from "@/components/SalatModeView";
import { HandsFreeHifdhView } from "@/components/HandsFreeHifdhView";
import { stopPrompt } from "@/lib/sheikhPrompt";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type CompanionTab = "salat" | "handsfree";
const KEY = "qm.companion.tab";

export function lastCompanionTab(): CompanionTab {
  try { return localStorage.getItem(KEY) === "handsfree" ? "handsfree" : "salat"; } catch { return "salat"; }
}

export function CompanionSwitch({ tab, onTab }: { tab: CompanionTab; onTab: (t: CompanionTab) => void }) {
  const { t, language } = useI18n();
  const ar = language === "ar";
  const items: { id: CompanionTab; emoji: string; label: string }[] = [
    { id: "salat", emoji: "🕌", label: ar ? "رفيق الصلاة" : t("hubSalat") },
    { id: "handsfree", emoji: "🎧", label: ar ? "المراجعة الحرة" : t("hfTitle") },
  ];
  const idx = items.findIndex((it) => it.id === tab);
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
  // v52: pill segmented control with a smooth sliding gold indicator
  return (
    <div role="tablist" aria-label={t("companionTitle")} className="sx-card relative grid grid-cols-2 gap-1 !rounded-full p-1.5" data-companion-switch={tab}>
      <span aria-hidden="true" className="absolute inset-y-1.5 rounded-full transition-transform duration-300 ease-out"
        style={{ width: "calc(50% - 0.375rem - 2px)", insetInlineStart: "0.375rem", background: "linear-gradient(135deg,#f3d27a,#d4af37)", boxShadow: "0 8px 20px -8px rgba(212,175,55,.85)",
          transform: `translateX(${(rtl ? -1 : 1) * idx * 100}%) translateX(${(rtl ? -1 : 1) * idx * 4}px)` }} />
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" aria-selected={tab === it.id} data-companion-tab={it.id}
          onClick={() => { if (it.id !== tab) { stopPrompt(); onTab(it.id); } }}
          className={cn("relative z-[1] flex min-h-[3.25rem] min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-center font-extrabold leading-tight transition-colors duration-300",
            tab === it.id ? "text-[#1b1300]" : "sx-ink-soft")}>
          <span aria-hidden="true" className="shrink-0">{it.emoji}</span>
          {/* v49: responsive size, wraps instead of being cut off — both titles fit on every width */}
          <span className={cn("min-w-0 break-words [hyphens:auto]", ar && "font-arabic")} style={{ fontSize: ar ? "clamp(0.92rem, 4.2vw, 1.08rem)" : "clamp(0.74rem, 3.4vw, 0.9rem)" }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

export function CompanionView({ tab, onTab, onClose }: { tab: CompanionTab; onTab: (t: CompanionTab) => void; onClose: () => void }) {
  useEffect(() => () => stopPrompt(), []);
  const set = (t2: CompanionTab) => { try { localStorage.setItem(KEY, t2); } catch { /* ignore */ } onTab(t2); };
  const sw = <CompanionSwitch tab={tab} onTab={set} />;
  return tab === "salat"
    ? <SalatModeView key="salat" onClose={onClose} switcher={sw} />
    : <HandsFreeHifdhView key="handsfree" onClose={onClose} switcher={sw} />;
}

export default CompanionView;
