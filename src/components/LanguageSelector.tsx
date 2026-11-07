import { useState } from "react";
import { Check, Languages } from "lucide-react";
import { GoldDialog, GOLD, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { LANGUAGES, languageInfo, loadLanguage, type Language } from "@/i18n";
import { useI18n } from "@/lib/i18n";
import { updateSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/** Saves the language (with the other settings) after its dictionary has loaded, so the switch is instant. */
export async function chooseLanguage(code: Language) {
  await loadLanguage(code);
  await updateSettings({ language: code });
}

/** The list of all app languages, each in its own script. */
export function LanguageList({ onChosen }: { onChosen?: () => void }) {
  const { language, t } = useI18n();
  return (
    <div>
      <div role="radiogroup" aria-label={t("languageTitle")} className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((l) => {
          const on = l.code === language;
          return (
            <button key={l.code} type="button" role="radio" aria-checked={on} lang={l.code} dir={l.dir}
              onClick={() => { void chooseLanguage(l.code).then(() => onChosen?.()); }}
              className={cn("flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-start text-sm transition", on ? "bg-amber-400/15 text-amber-100" : "bg-black/10 text-emerald-50 hover:bg-black/20")}
              style={{ boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${on ? GOLD_LIGHT : alpha(GOLD, 0.35)}` }}>
              <span className={cn("truncate", (l.code === "ar" || l.code === "ur") && "font-arabic text-base")}>{l.native}</span>
              {on && <Check className="h-4 w-4 shrink-0" style={{ color: GOLD_LIGHT }} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {language !== "ar" && language !== "en" && <p className="mt-3 text-[0.7rem] leading-relaxed text-emerald-100/55">{t("languageNote")}</p>}
    </div>
  );
}

/** Header / menu button: shows the current language and opens the list. */
export function LanguageSelector({ variant = "pill", className, onOpenChange }: { variant?: "pill" | "row"; className?: string; onOpenChange?: (open: boolean) => void }) {
  const { language, t } = useI18n();
  const [open, setOpenState] = useState(false);
  const setOpen = (v: boolean) => { setOpenState(v); onOpenChange?.(v); };
  const info = languageInfo(language);
  return (
    <>
      {variant === "pill" ? (
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`${t("languageTitle")}: ${info.native}`}
          className={cn("flex h-10 items-center gap-2 rounded-full border border-accent/40 bg-card px-3 text-sm text-accent transition hover:bg-accent/10", className)}>
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span lang={info.code} className="max-w-[6.5rem] truncate">{info.native}</span>
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
          className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-50 hover:bg-white/5", className)}>
          <Languages className="h-5 w-5" style={{ color: GOLD_LIGHT }} />
          <span className="flex-1 text-start">{t("languageTitle")}</span>
          <span lang={info.code} className="text-xs text-emerald-100/70">{info.native}</span>
        </button>
      )}
      <GoldDialog open={open} onOpenChange={setOpen} title={t("languageTitle")} className="max-w-sm">
        <LanguageList onChosen={() => setOpen(false)} />
      </GoldDialog>
    </>
  );
}

export default LanguageSelector;
