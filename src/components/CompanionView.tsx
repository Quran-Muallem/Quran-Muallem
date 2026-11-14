/**
 * v46 «رفيق الصلاة والمراجعة» — one place for both AI companions, with a segmented switch at the top
 * (same pill style as القراءة / الحفظ):
 *  • «رفيق الصلاة»  – Salat Companion (v42) + motion rakʿah counter (v43)
 *  • «المراجعة الحرة» – hands-free pocket / Bluetooth Hifdh (v45)
 * The switch is shown on both setup screens; once a session runs, its full-screen focus view takes over.
 */
import { SalatModeView } from "@/components/SalatModeView";
import { HandsFreeHifdhView } from "@/components/HandsFreeHifdhView";
import { stopPrompt } from "@/lib/sheikhPrompt";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { GOLD_GRADIENT } from "@/components/ornaments";

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
  return (
    <div role="tablist" aria-label={t("companionTitle")} className="grid grid-cols-2 gap-1 rounded-[1.7rem] border border-amber-500/40 bg-white/5 p-1" data-companion-switch={tab}>
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" aria-selected={tab === it.id} data-companion-tab={it.id}
          onClick={() => { if (it.id !== tab) { stopPrompt(); onTab(it.id); } }}
          className={cn("flex min-h-[3.25rem] min-w-0 items-center justify-center gap-1.5 rounded-[1.4rem] px-2 py-2 text-center font-bold leading-tight transition",
            tab === it.id ? "text-[#062b22] shadow-md" : "text-neutral-300 hover:text-white")}
          style={tab === it.id ? { background: GOLD_GRADIENT } : undefined}>
          <span aria-hidden="true" className="shrink-0">{it.emoji}</span>
          {/* v49: responsive size, wraps instead of being cut off — both titles fit on every width */}
          <span className={cn("min-w-0 break-words [hyphens:auto]", ar && "font-arabic")} style={{ fontSize: ar ? "clamp(0.92rem, 4.2vw, 1.08rem)" : "clamp(0.74rem, 3.4vw, 0.9rem)" }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

export function CompanionView({ tab, onTab, onClose }: { tab: CompanionTab; onTab: (t: CompanionTab) => void; onClose: () => void }) {
  const set = (t2: CompanionTab) => { try { localStorage.setItem(KEY, t2); } catch { /* ignore */ } onTab(t2); };
  const sw = <CompanionSwitch tab={tab} onTab={set} />;
  return tab === "salat"
    ? <SalatModeView key="salat" onClose={onClose} switcher={sw} />
    : <HandsFreeHifdhView key="handsfree" onClose={onClose} switcher={sw} />;
}

export default CompanionView;
