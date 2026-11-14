/**
 * v51 «وضع الخط الكبير لكبار السن»: one big switch (top of the menu and of the settings) that sets 130 % text,
 * Atkinson Hyperlegible + clear Naskh, and one verse per line in the Mushaf — and restores the old look when off.
 */
import { useI18n } from "@/lib/i18n";
import { setLargePrint, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function LargePrintToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const s = useSettings();
  const on = s.largePrint;
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => void setLargePrint(!on)} data-large-print={on ? "on" : "off"}
      className={cn("flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl px-4 py-3 text-start transition", on ? "bg-amber-300 text-[#1b1300]" : "bg-amber-100 text-[#1b1300]", className)}
      style={{ boxShadow: "inset 0 0 0 2px #b8860b" }}>
      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 font-serif text-2xl font-black leading-none">A<span className="text-base">A</span></span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold leading-snug">{t("largePrintTitle")}</span>
        <span className="block text-sm leading-snug">{t("largePrintSub")}</span>
      </span>
      <span aria-hidden="true" className={cn("relative h-8 w-14 shrink-0 rounded-full transition", on ? "bg-emerald-700" : "bg-[#1b1300]/30")}>
        <span className="absolute top-1 h-6 w-6 rounded-full shadow transition-all" style={{ background: "#fff", insetInlineStart: on ? "1.75rem" : "0.25rem" }} />
      </span>
    </button>
  );
}

export default LargePrintToggle;
