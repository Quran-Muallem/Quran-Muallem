import { CheckCircle2, CloudDownload, Cpu, Loader2 } from "lucide-react";
import { GOLD_GRADIENT, alpha, GOLD } from "@/components/ornaments";
import { WHISPER_MODELS, preloadWhisper, useWhisperModel, type WhisperModelId } from "@/lib/whisper";
import { toArabicDigits } from "@/lib/quranService";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Loading indicator for the on-device Whisper model.
 * - `compact`: one line with a progress bar, shown above the microphone while the model initializes.
 * - full: status + "download now" button (settings).
 */
export function WhisperModelStatus({ model, compact = false, className }: { model: WhisperModelId; compact?: boolean; className?: string }) {
  const { t, language } = useI18n();
  const s = useWhisperModel();
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const mine = s.model === model;

  if (compact) {
    if (!(mine && (s.status === "loading" || s.status === "error"))) return null;
    return (
      <div role="status" aria-live="polite" className={cn("rounded-2xl border border-accent/40 bg-card/90 px-3 py-2 text-xs animate-in fade-in", className)}>
        {s.status === "loading" ? (
          <>
            <p className="flex items-center gap-2 text-accent">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />{s.preparing ? t("modelPreparing") : <>{t("modelLoading")} · {num(s.progress)}% <span className="text-muted-foreground">({t("modelFirstTime")})</span></>}
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" dir="ltr">
              <div className="h-full rounded-full bg-gold transition-all duration-300" style={{ width: `${Math.max(3, s.progress)}%` }} />
            </div>
          </>
        ) : <p className="text-destructive">{t(s.message === "prepare-timeout" ? "errModelPrepare" : "errModelDownload")}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl bg-black/15 p-3 text-sm" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
      <p className="flex items-center gap-2 text-emerald-50"><Cpu className="h-4 w-4 text-amber-200" />{t("modelSize")} {num(WHISPER_MODELS[model].approxMB)} MB</p>
      {mine && s.status === "ready" ? (
        <p className="flex items-center gap-2 text-emerald-300"><CheckCircle2 className="h-4 w-4" />{t("modelReady")}</p>
      ) : mine && s.status === "loading" ? (
        <div>
          <p className="flex items-center gap-2 text-amber-100"><Loader2 className="h-4 w-4 animate-spin" />
            {s.preparing ? t("modelPreparing") : <>{num(s.progress)}% · {num(s.loadedMB)}/{num(s.totalMB)} MB</>}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/30" dir="ltr">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(3, s.progress)}%`, background: GOLD_GRADIENT }} />
          </div>
        </div>
      ) : (
        <>
          {mine && s.status === "error" && <p className="text-xs text-red-200">{t(s.message === "prepare-timeout" ? "errModelPrepare" : "errModelDownload")}</p>}
          <button type="button" onClick={() => void preloadWhisper(model).catch(() => {})}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>
            <CloudDownload className="h-4 w-4" />{t("modelDownload")}
          </button>
        </>
      )}
      <p className="text-xs leading-relaxed text-emerald-100/60">{t("modelNote")}</p>
    </div>
  );
}

export default WhisperModelStatus;
