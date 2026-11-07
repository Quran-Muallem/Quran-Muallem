import { speechEngineFor } from "@/lib/speechEngine";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Download, ExternalLink, Eye, EyeOff, FileText, Languages, Loader2, ShieldCheck, Trash2, Upload, XCircle } from "lucide-react";
import { GoldDialog, GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { THEME_COLORS, updateSettings, useSettings, type ThemeId } from "@/lib/settings";
import { BackupError, downloadBackup, importProgressJson } from "@/lib/progressStorage";
import { cachedSurahIds, downloadWholeQuran } from "@/lib/quranService";
import { useI18n, type CopyKey } from "@/lib/i18n";
import { LanguageList } from "@/components/LanguageSelector";
import { cn } from "@/lib/utils";
import { WhisperModelStatus } from "@/components/WhisperModelStatus";
import { WHISPER_MODELS } from "@/lib/whisper";
import { LegalDialog, LEGAL_TITLES, type LegalDoc } from "@/components/LegalDialog";
import { deleteAllData } from "@/lib/dataReset";
import { VoiceProfilePanel } from "@/components/VoiceProfilePanel";
import { retryZipformer, useZipformerState, zipformerAvailable, ZIPFORMER_MB } from "@/lib/zipformerEngine";


/**
 * Settings: theme, speech recognition (always on the device), voice profile, progress backup,
 * offline Quran text and legal texts. No external AI services, no API keys.
 */
export function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  return (
    <GoldDialog open={open} onOpenChange={onOpenChange} title={t("settingsTitle")} description={t("settingsSub")} className="max-w-md">
      <div className="space-y-6">
        <LanguageSection />
        <ThemeSection />
        <SpeechSection />
        <Section title={t("voiceTitle")}><VoiceProfilePanel /></Section>
        <BackupSection />
        <OfflineSection />
        <LegalSection />
      </div>
    </GoldDialog>
  );
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: GOLD_LIGHT }}>{icon}{title}</h3>
      {children}
    </section>
  );
}

function LanguageSection() {
  const { t } = useI18n();
  return <Section title={t("languageTitle")} icon={<Languages className="h-4 w-4" />}><LanguageList /></Section>;
}

function ThemeSection() {
  const { t } = useI18n();
  const s = useSettings();
  const themes: { id: ThemeId; label: CopyKey; preview: [string, string, string] }[] = [
    { id: "emerald", label: "themeEmerald", preview: [THEME_COLORS.emerald, "#0a4a38", "#fbbf24"] },
    { id: "light", label: "themeLight", preview: ["#fbf5e4", "#efe5cc", "#a16207"] },
    { id: "dark", label: "themeDark", preview: ["#0e100f", "#1f2221", "#fbbf24"] },
  ];
  return (
    <Section title={t("themeTitle")}>
      <div role="radiogroup" aria-label={t("themeTitle")} className="grid grid-cols-3 gap-2">
        {themes.map((th) => (
          <button key={th.id} type="button" role="radio" aria-checked={s.theme === th.id} onClick={() => void updateSettings({ theme: th.id })}
            className={cn("rounded-xl p-2 text-center transition", s.theme === th.id ? "bg-amber-400/15" : "bg-black/10 hover:bg-black/20")}
            style={{ boxShadow: `inset 0 0 0 ${s.theme === th.id ? 2 : 1}px ${s.theme === th.id ? GOLD_LIGHT : alpha(GOLD, 0.35)}` }}>
            <span className="mx-auto flex h-12 w-full overflow-hidden rounded-lg" style={{ background: th.preview[0] }} aria-hidden="true">
              <span className="m-1.5 flex flex-1 items-end justify-center rounded-md pb-1" style={{ background: th.preview[1] }}>
                <span className="h-1.5 w-8 rounded-full" style={{ background: th.preview[2] }} />
              </span>
            </span>
            <span className="mt-1.5 block text-xs text-emerald-50">{t(th.label)}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function SpeechSection() {
  const { t } = useI18n();
  const s = useSettings();
  // Recognition always runs on the device (see src/lib/speechEngine.ts): no engine choice, no cloud.
  // The live checkbox shows the effective setting.
  const live = speechEngineFor(s).live;
  return (
    <Section title={t("speechTitle")}>
      <p className="rounded-xl bg-emerald-400/10 p-2.5 text-xs text-emerald-100">{t("engineDeviceDesc")}</p>
      <h4 className="pt-1 text-xs font-medium text-emerald-100/70">{t("engineTitle")}</h4>
      <Choice<"zipformer" | "whisper"> value={s.recognizer} onChange={(recognizer) => void updateSettings({ recognizer })}
        options={[["zipformer", t("engineZipformer"), `${t("engineZipformerDesc")} (≈ ${ZIPFORMER_MB} MB)`], ["whisper", t("engineWhisperOnly"), t("engineWhisperOnlyDesc")]]} />
      {s.recognizer === "zipformer" && <ZipformerStatus />}
      <h4 className="pt-1 text-xs font-medium text-emerald-100/70">{t("modelTitle")}</h4>
      <Choice<"base" | "tiny"> value={s.whisperModel} onChange={(whisperModel) => void updateSettings({ whisperModel })}
        options={[["base", t("modelBase"), `≈ ${WHISPER_MODELS.base.approxMB} MB`], ["tiny", t("modelTiny"), `≈ ${WHISPER_MODELS.tiny.approxMB} MB`]]} />
      <WhisperModelStatus model={s.whisperModel} />
      <label className="flex items-start gap-3 rounded-xl bg-black/15 p-3 text-sm" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.27)}` }}>
        <input type="checkbox" checked={live} onChange={(e) => void updateSettings(s.speechEngine === "auto" ? { speechEngine: "whisper", whisperLive: e.target.checked } : { whisperLive: e.target.checked })}
          className="mt-1 h-4 w-4 accent-amber-400" />
        <span>
          <span className="block text-emerald-50">{t("whisperLive")}</span>
          <span className="block text-xs leading-relaxed text-emerald-100/60">{t("whisperLiveDesc")}</span>
        </span>
      </label>
    </Section>
  );
}

function ZipformerStatus() {
  const { t } = useI18n();
  const st = useZipformerState();
  useEffect(() => { void zipformerAvailable(); }, []);
  const box = { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` };
  return (
    <div className="space-y-1.5 rounded-xl bg-black/15 p-2.5 text-xs text-emerald-100/80" style={box}>
      {st.status === "unavailable" && <p className="text-amber-100">{t("zfUnavailable")}</p>}
      {st.status === "error" && (
        <p className="flex items-center gap-2 text-amber-100">
          <span className="flex-1">{t("zfFailed")}</span>
          <button type="button" onClick={retryZipformer} className="shrink-0 rounded-full px-3 py-1 text-emerald-950" style={{ background: GOLD_LIGHT }}>{t("zfRetry")}</button>
        </p>
      )}
      {st.status === "loading" && <p>{t("zfLoading")} {Math.round(st.progress * 100)}%</p>}
      {st.status === "ready" && <p className="text-emerald-300">{t("zfReady")} · {st.backend === "webgpu" ? "WebGPU" : "WebAssembly"}</p>}
      <p>{t("zfDisclaimer")}</p>
      <p className="text-emerald-100/55">{t("zfLicense")}</p>
    </div>
  );
}

function Choice<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string, string][] }) {
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-2">
      {options.map(([id, label, desc]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)}
          className={cn("rounded-xl p-3 text-start transition", value === id ? "bg-amber-400/15" : "bg-black/15 hover:bg-black/25")}
          style={{ boxShadow: `inset 0 0 0 1px ${value === id ? GOLD_LIGHT : alpha(GOLD, 0.27)}` }}>
          <span className={cn("block text-sm font-medium", value === id ? "text-amber-100" : "text-emerald-50")} dir="auto">{label}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-emerald-100/60">{desc}</span>
        </button>
      ))}
    </div>
  );
}

function BackupSection() {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<CopyKey | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importProgressJson(await file.text(), mode);
      setStatus("backupRestored");
    } catch (e) {
      setStatus(e instanceof BackupError ? "backupInvalid" : "backupFailed");
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  return (
    <Section title={t("backupTitle")}>
      <p className="text-xs leading-relaxed text-emerald-100/60">{t("backupDesc")}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => { void downloadBackup().then(() => setStatus("backupSaved")).catch(() => setStatus("backupFailed")); }}
          className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-amber-100 hover:bg-black/30" style={{ boxShadow: `inset 0 0 0 1px ${GOLD}` }}>
          <Download className="h-4 w-4" />{t("backupExport")}
        </button>
        <button type="button" onClick={() => input.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-amber-100 hover:bg-black/30" style={{ boxShadow: `inset 0 0 0 1px ${GOLD}` }}>
          <Upload className="h-4 w-4" />{t("backupImport")}
        </button>
      </div>
      <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      <label className="flex items-center gap-2 text-xs text-emerald-100/70">
        <input type="checkbox" checked={mode === "replace"} onChange={(e) => setMode(e.target.checked ? "replace" : "merge")} className="h-3.5 w-3.5 accent-amber-400" />
        {t("backupReplace")}
      </label>
      {status && <p role="status" className="text-sm text-amber-100">{t(status)}</p>}
    </Section>
  );
}

function OfflineSection() {
  const { t, language } = useI18n();
  const [cached, setCached] = useState<number | null>(null);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [failed, setFailed] = useState(0);
  useEffect(() => { void cachedSurahIds().then((ids) => setCached(ids.length)); }, []);
  const run = async () => {
    setFailed(0); setProgress([0, 114]);
    const r = await downloadWholeQuran((d, n) => setProgress([d, n]));
    setFailed(r.failed.length); setProgress(null);
    setCached((await cachedSurahIds()).length);
  };
  const n = (x: number) => (language === "ar" ? String(x).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)] ?? d) : String(x));
  return (
    <Section title={t("offlineTitle")}>
      <p className="text-xs leading-relaxed text-emerald-100/60">
        {t("offlineDesc")} {cached != null && <span className="text-amber-100">({n(cached)}/{n(114)})</span>}
      </p>
      <button type="button" disabled={!!progress || cached === 114} onClick={() => void run()}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-amber-100 hover:bg-black/30 disabled:opacity-60" style={{ boxShadow: `inset 0 0 0 1px ${GOLD}` }}>
        {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {progress ? `${n(progress[0])}/${n(progress[1])}` : cached === 114 ? t("offlineDone") : t("offlineDownload")}
      </button>
      {failed > 0 && <p className="text-xs text-red-200">{t("offlineFailed")}</p>}
    </Section>
  );
}

function LegalSection() {
  const { t } = useI18n();
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const wipe = async () => {
    setDeleting(true);
    await deleteAllData();
    window.location.reload();
  };
  return (
    <Section title={t("legalTitle")}>
      <div className="grid gap-2">
        {(Object.keys(LEGAL_TITLES) as LegalDoc[]).map((d) => (
          <button key={d} type="button" onClick={() => setDoc(d)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm text-amber-100 hover:bg-black/30" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.5)}` }}>
            <FileText className="h-4 w-4 shrink-0" />{t(LEGAL_TITLES[d])}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-red-300/30 bg-red-950/20 p-3">
        <p className="text-xs leading-relaxed text-emerald-100/70">{t("deleteAllDesc")}</p>
        {!confirm ? (
          <button type="button" onClick={() => setConfirm(true)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-100 hover:bg-red-900/40" style={{ boxShadow: "inset 0 0 0 1px rgba(252,165,165,.45)" }}>
            <Trash2 className="h-4 w-4" />{t("deleteAll")}
          </button>
        ) : (
          <div className="mt-2 space-y-2" role="alert">
            <p className="text-sm font-medium text-red-100">{t("deleteAllConfirm")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={deleting} onClick={() => setConfirm(false)}
                className="rounded-xl px-3 py-2.5 text-sm text-emerald-50 hover:bg-white/10" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)" }}>{t("cancel")}</button>
              <button type="button" disabled={deleting} onClick={() => void wipe()}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{t("deleteAllYes")}
              </button>
            </div>
          </div>
        )}
      </div>
      <LegalDialog doc={doc} onOpenChange={(o) => { if (!o) setDoc(null); }} />
    </Section>
  );
}

export default SettingsModal;
