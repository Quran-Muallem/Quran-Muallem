import { useEffect, useId, useState, type FormEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowRight, Loader2, X } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { MAX_NAME_LENGTH, startWithName, updateProfile, type UserSession } from "@/lib/authService";
import { directionFor, useI18n } from "@/lib/i18n";
import { updateSettings } from "@/lib/settings";
import { LegalDialog, type LegalDoc } from "@/components/LegalDialog";
import { GOLD, GOLD_GRADIENT, GoldFrame, Divider, AppLogo, AppWordmark, alpha } from "@/components/ornaments";

export type WelcomeModalProps = {
  open: boolean;
  /** "start": first launch (cannot be closed). "rename": change the name later. */
  mode?: "start" | "rename";
  currentName?: string;
  onOpenChange?: (open: boolean) => void;
  onDone?: (session: UserSession) => void;
};

/**
 * First screen after the splash: no login – the user only types a name (optional) and starts.
 * Everything stays on the device.
 */
export function WelcomeModal({ open, mode = "start", currentName = "", onOpenChange, onDone }: WelcomeModalProps) {
  const { t, language } = useI18n();
  const id = useId();
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [legal, setLegal] = useState<LegalDoc | null>(null);
  const dismissible = mode === "rename";

  useEffect(() => { if (open) { setName(currentName); setFailed(false); } }, [open, currentName]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setFailed(false);
    try {
      const session = mode === "rename" ? await updateProfile({ name }) : await startWithName(name);
      if (session) onDone?.(session);
      onOpenChange?.(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const block = (e: Event) => { if (!dismissible || busy) e.preventDefault(); };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (dismissible && !busy) onOpenChange?.(o); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content dir={directionFor(language)} lang={language}
          onEscapeKeyDown={block} onPointerDownOutside={block} onInteractOutside={block}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.75rem] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <GoldFrame>
            {mode === "start" && (
              <LanguageSelector className="absolute start-3 top-3 z-10 h-9 border-amber-300/50 bg-transparent text-amber-200" />
            )}
            {dismissible && (
              <DialogPrimitive.Close disabled={busy} aria-label={t("close")}
                className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-amber-200/80 transition hover:bg-white/10 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-amber-300">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            )}

            <header className="px-6 pt-14 text-center">
              {mode === "start" && <><AppLogo className="mx-auto h-20 w-20" /><AppWordmark className="mt-3 items-center" /></>}
              <DialogPrimitive.Title className="mt-1 text-lg font-medium text-emerald-50">{t(mode === "start" ? "welcomeTitle" : "renameTitle")}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm leading-relaxed text-emerald-100/70">{t(mode === "start" ? "welcomeSub" : "renameSub")}</DialogPrimitive.Description>
              <Divider />
            </header>

            <form onSubmit={(e) => void submit(e)} className="space-y-4 px-6 pb-6">
              <div className="space-y-1.5">
                <label htmlFor={`${id}-name`} className="block text-sm text-emerald-50/90">{t("yourName")}</label>
                <input id={`${id}-name`} dir="auto" autoComplete="given-name" maxLength={MAX_NAME_LENGTH} value={name} autoFocus
                  onChange={(e) => setName(e.target.value)} placeholder={t("yourNamePlaceholder")}
                  className="w-full rounded-2xl border border-amber-500/40 bg-black/25 px-4 py-3 text-base text-emerald-50 outline-none placeholder:text-emerald-100/35 focus:border-amber-400" />
                <p className="text-xs text-emerald-100/55">{t("yourNameHint")}</p>
              </div>
              {failed && <p role="alert" className="rounded-xl border border-red-300/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">{t("welcomeFailed")}</p>}
              <button type="submit" disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-semibold text-emerald-950 shadow-lg transition hover:brightness-105 disabled:opacity-60"
                style={{ background: GOLD_GRADIENT }}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {t(mode === "start" ? "welcomeStart" : "save")}
                {!busy && <ArrowRight className="h-5 w-5 rtl:rotate-180" />}
              </button>
              {mode === "start" && (
                <>
                  <p className="text-center text-xs leading-relaxed text-emerald-100/55">{t("welcomeLocalNote")}</p>
                  <p className="text-center text-xs leading-relaxed text-emerald-100/55">
                    {t("legalAccept")}{" "}
                    <button type="button" onClick={() => setLegal("terms")} className="text-amber-200 underline underline-offset-2 hover:text-amber-100">{t("legalTerms")}</button>
                    {" "}{t("legalAnd")}{language === "ar" ? "" : " "}
                    <button type="button" onClick={() => setLegal("privacy")} className="text-amber-200 underline underline-offset-2 hover:text-amber-100">{t("legalPrivacy")}</button>
                  </p>
                </>
              )}
            </form>
            <LegalDialog doc={legal} onOpenChange={(o) => { if (!o) setLegal(null); }} />
          </GoldFrame>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default WelcomeModal;
