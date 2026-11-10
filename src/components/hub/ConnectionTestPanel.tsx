import { useState } from "react";
import { CheckCircle2, Copy, Loader2, Wifi, XCircle } from "lucide-react";
import { GOLD, GOLD_GRADIENT, alpha } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import { reportText, runConnectionTest, type TestStep } from "@/lib/connectionTest";

/** «اختبار الاتصال»: runs `runConnectionTest` and shows each step; the result can be copied and sent. */
export function ConnectionTestPanel() {
  const { t } = useI18n();
  const [steps, setSteps] = useState<TestStep[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const run = async () => {
    setBusy(true); setCopied(false); setSteps([]);
    try { await runConnectionTest((s) => setSteps((cur) => [...(cur ?? []), s])); } finally { setBusy(false); }
  };
  const copy = async () => { if (!steps) return; try { await navigator.clipboard.writeText(reportText(steps)); setCopied(true); } catch { /* blocked */ } };
  return (
    <div className="mt-4 rounded-2xl bg-black/15 p-3" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }} data-conn-test="">
      <div className="flex items-center gap-2">
        <Wifi className="h-4 w-4 text-amber-200" aria-hidden="true" />
        <p className="flex-1 text-xs leading-relaxed text-emerald-100/75">{t("connTestDesc")}</p>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => void run()} disabled={busy} data-conn-test-run=""
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-60" style={{ background: GOLD_GRADIENT }}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}{t("connTestRun")}
        </button>
        {steps && steps.length > 0 && !busy && (
          <button type="button" onClick={() => void copy()} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-amber-100" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.5)}` }}>
            <Copy className="h-4 w-4" />{copied ? "✓" : t("connTestCopy")}
          </button>
        )}
      </div>
      {steps && (
        <ul className="mt-2 space-y-1.5" dir="ltr" data-conn-test-result="">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2 text-[0.7rem] leading-snug text-emerald-50" data-conn-step={s.id} data-ok={String(s.ok)}>
              {s.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300" />}
              <span className="min-w-0 break-words"><b>{s.id}</b> · {s.detail}</span>
            </li>
          ))}
          {busy && <li className="text-[0.7rem] text-emerald-100/60">…</li>}
        </ul>
      )}
    </div>
  );
}
