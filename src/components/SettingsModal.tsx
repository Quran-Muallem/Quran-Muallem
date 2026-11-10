import { speechEngineFor } from "@/lib/speechEngine";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertOctagon, BellRing, BookOpen, BookText, CheckCircle2, ChevronLeft, ChevronRight, Download, ExternalLink, Eye, EyeOff, FileText, Globe, Languages, Loader2, Lock, Mic, MinusCircle, Play, Podcast, ShieldCheck, Sun, Trash2, Upload, XCircle } from "lucide-react";
import { GoldDialog, GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { THEME_COLORS, updateSettings, useSettings, type ThemeId } from "@/lib/settings";
import { BackupError, downloadBackup, importProgressJson } from "@/lib/progressStorage";
import { cachedSurahIds, downloadWholeQuran } from "@/lib/quranService";
import { directionFor, useI18n, type CopyKey } from "@/lib/i18n";
import { ReciterSelectModal } from "@/components/ReciterSelectModal";
import { ContentSelectModal } from "@/components/ContentSelectModal";
import { getReciter } from "@/lib/reciterManager";
import { getTafsir, getTranslation } from "@/lib/quranContent";
import { totalDownloadedBytes, useSurahDownloads } from "@/lib/recitersHub";
import { deleteAllRecordings, useRecordings } from "@/lib/audioStorage";
import { reminderSupported } from "@/lib/dailyReminder";
import { notificationPermission } from "@/lib/prayerNotifications";
import { LanguageList } from "@/components/LanguageSelector";
import { cn } from "@/lib/utils";
import { WhisperModelStatus } from "@/components/WhisperModelStatus";
import { WHISPER_MODELS } from "@/lib/whisper";
import { LegalDialog, LEGAL_TITLES, type LegalDoc } from "@/components/LegalDialog";
import { deleteAllData } from "@/lib/dataReset";
import { VoiceProfilePanel } from "@/components/VoiceProfilePanel";
import { retryZipformer, useZipformerState, zipformerAvailable, ZIPFORMER_MB } from "@/lib/zipformerEngine";


type SettingsPage = "recitation" | "listening" | "mushafLook" | "hidden" | "language" | "theme" | "reminders" | "mistakes" | "session" | "reciters" | "translation" | "tafsir" | "offline" | "data" | "recordings";
type Row = { id: SettingsPage; icon: ReactNode; label: CopyKey };
const ic = "h-5 w-5";
/** Grouped like Tarteel's settings: each row opens its own page inside the dialog. */
const GROUPS: { title: CopyKey; rows: Row[] }[] = [
  { title: "setGroupExperience", rows: [{ id: "recitation", icon: <Mic className={ic} />, label: "setRecitation" }, { id: "listening", icon: <Play className={ic} />, label: "setListening" }] },
  { title: "setGroupQuranLook", rows: [{ id: "mushafLook", icon: <BookOpen className={ic} />, label: "setMushafLook" }, { id: "hidden", icon: <EyeOff className={ic} />, label: "setHidden" }] },
  { title: "setGroupAppLook", rows: [{ id: "language", icon: <Globe className={ic} />, label: "languageTitle" }, { id: "theme", icon: <Sun className={ic} />, label: "themeTitle" }] },
  { title: "setGroupNotifications", rows: [{ id: "reminders", icon: <BellRing className={ic} />, label: "setReminders" }] },
  { title: "setGroupSounds", rows: [{ id: "mistakes", icon: <AlertOctagon className={ic} />, label: "setMistakes" }, { id: "session", icon: <Mic className={ic} />, label: "setSession" }] },
  { title: "setGroupDownloads", rows: [{ id: "reciters", icon: <Podcast className={ic} />, label: "setReciters" }, { id: "translation", icon: <Languages className={ic} />, label: "setTranslation" }, { id: "tafsir", icon: <BookText className={ic} />, label: "setTafsir" }, { id: "offline", icon: <Download className={ic} />, label: "offlineTitle" }] },
  { title: "setGroupPrivacy", rows: [{ id: "data", icon: <Lock className={ic} />, label: "setDataUse" }, { id: "recordings", icon: <MinusCircle className={ic} />, label: "setDeleteRecordings" }] },
];

/**
 * Settings (v29: grouped like Tarteel — التجربة, مظهر القرآن, مظهر التطبيق, إشعارات, الأصوات والتفاعل الحسي,
 * التنزيلات, الخصوصية; a row opens its page, the arrow goes back). Everything stays on the device; no
 * external AI services, no API keys.
 */
export function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, language } = useI18n();
  const [page, setPage] = useState<SettingsPage | null>(null);
  useEffect(() => { if (!open) setPage(null); }, [open]);
  const row = page ? GROUPS.flatMap((g) => g.rows).find((r) => r.id === page) : null;
  const Back = directionFor(language) === "rtl" ? ChevronRight : ChevronLeft;
  const Next = directionFor(language) === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <GoldDialog open={open} onOpenChange={onOpenChange} title={row ? t(row.label) : t("settingsTitle")} description={row ? undefined : t("settingsSub")} className="max-w-md">
      {!page ? (
        <div className="space-y-4" data-settings-index="">
          {GROUPS.map((g) => (
            <section key={g.title} className="overflow-hidden rounded-2xl bg-black/15" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
              <h3 className="border-b px-4 py-3 text-sm font-semibold" style={{ color: GOLD_LIGHT, borderColor: alpha(GOLD, 0.25) }}>{t(g.title)}</h3>
              <ul>
                {g.rows.map((r, i) => (
                  <li key={r.id} className={cn(i > 0 && "border-t")} style={{ borderColor: alpha(GOLD, 0.12) }}>
                    <button type="button" onClick={() => setPage(r.id)} data-settings-row={r.id}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-start text-sm text-emerald-50 hover:bg-white/5">
                      <span className="text-amber-200" aria-hidden="true">{r.icon}</span>
                      <span className="flex-1">{t(r.label)}</span>
                      <Next className="h-4 w-4 text-emerald-100/50" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-4" data-settings-page={page}>
          <button type="button" onClick={() => setPage(null)} data-settings-back=""
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-amber-100" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.5)}` }}>
            <Back className="h-4 w-4" aria-hidden="true" />{t("settingsTitle")}
          </button>
          {page === "recitation" && (<><SpeechSection /><Section title={t("voiceTitle")}><VoiceProfilePanel /></Section></>)}
          {page === "listening" && <ListeningSection />}
          {page === "mushafLook" && (<><p className="rounded-xl bg-black/15 p-3 text-xs leading-relaxed text-emerald-100/75">{t("setMushafLookDesc")}</p><ThemeSection /></>)}
          {page === "hidden" && <Toggle k="hiddenFirstWord" label="setHiddenFirstWord" desc="setHiddenFirstWordDesc" />}
          {page === "language" && <LanguageSection />}
          {page === "theme" && <ThemeSection />}
          {page === "reminders" && <ReminderSection />}
          {page === "mistakes" && <Toggle k="mistakeVibration" label="setMistakeVibration" desc="setMistakeVibrationDesc" />}
          {page === "session" && (<><Toggle k="autoStopSurahEnd" label="setAutoStop" desc="setAutoStopDesc" /><Toggle k="completionSound" label="setCompletionSound" desc="setCompletionSoundDesc" /></>)}
          {page === "reciters" && <RecitersDownloadsSection />}
          {(page === "translation" || page === "tafsir") && <ContentSection kind={page === "tafsir" ? "tf" : "tr"} />}
          {page === "offline" && <OfflineSection />}
          {page === "data" && (<><BackupSection /><LegalSection /></>)}
          {page === "recordings" && <DeleteRecordingsSection />}
        </div>
      )}
    </GoldDialog>
  );
}

type BoolKey = "mistakeVibration" | "completionSound" | "autoStopSurahEnd" | "hiddenFirstWord";
function Toggle({ k, label, desc }: { k: BoolKey; label: CopyKey; desc: CopyKey }) {
  const { t } = useI18n();
  const s = useSettings();
  const on = s[k];
  return (
    <label className="flex items-start gap-3 rounded-2xl bg-black/15 p-3.5" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }} data-settings-toggle={k}>
      <span className="flex-1">
        <span className="block text-sm text-emerald-50">{t(label)}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-emerald-100/60">{t(desc)}</span>
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => void updateSettings({ [k]: e.target.checked } as Partial<Record<BoolKey, boolean>>)} className="peer sr-only" />
      <span aria-hidden="true" className={cn("relative mt-1 h-6 w-11 shrink-0 rounded-full transition", on ? "bg-amber-400" : "bg-white/20")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "start-[1.375rem]" : "start-0.5")} />
      </span>
    </label>
  );
}

function ListeningSection() {
  const { t, language } = useI18n();
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const r = getReciter(s.reciterId);
  return (
    <Section title={t("setListeningSheikh")}>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl bg-black/15 p-3.5 text-start" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
        <Play className="h-4 w-4 text-amber-200" aria-hidden="true" />
        <span className="flex-1 text-sm text-emerald-50">{language === "ar" ? r.nameArabic : r.nameEnglish}</span>
        <span className="text-xs text-amber-200">{t("setChange")}</span>
      </button>
      <p className="text-xs leading-relaxed text-emerald-100/60">{t("setListeningDesc")}</p>
      <ReciterSelectModal open={open} onOpenChange={setOpen} selectedId={s.reciterId} surah={1} onSelect={(id) => void updateSettings({ reciterId: id })} />
    </Section>
  );
}

function ReminderSection() {
  const { t } = useI18n();
  const s = useSettings();
  const native = reminderSupported();
  const [denied, setDenied] = useState(false);
  const set = async (on: boolean, time = s.dailyReminderTime) => {
    await updateSettings({ dailyReminder: on, dailyReminderTime: time });
    if (on && native) setDenied((await notificationPermission(false)) === "denied");
  };
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 rounded-2xl bg-black/15 p-3.5" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }} data-settings-toggle="dailyReminder">
        <span className="flex-1 text-sm text-emerald-50">{t("reminderToggle")}</span>
        <input type="checkbox" role="switch" checked={s.dailyReminder} disabled={!native} onChange={(e) => void set(e.target.checked)} className="sr-only" />
        <span aria-hidden="true" className={cn("relative h-6 w-11 shrink-0 rounded-full transition", s.dailyReminder ? "bg-amber-400" : "bg-white/20", !native && "opacity-40")}>
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", s.dailyReminder ? "start-[1.375rem]" : "start-0.5")} />
        </span>
      </label>
      {s.dailyReminder && native && (
        <label className="flex items-center gap-3 px-1 text-sm text-emerald-100/80">{t("reminderTime")}
          <input type="time" value={s.dailyReminderTime} onChange={(e) => void set(true, e.target.value)}
            className="h-10 rounded-xl border border-amber-400/40 bg-[var(--mf-page-deep)] px-2 text-emerald-50" />
        </label>
      )}
      {!native && <p className="text-xs leading-relaxed text-amber-100/80">{t("reminderAppOnly")}</p>}
      {denied && <p className="text-xs leading-relaxed text-red-200">{t("reminderDenied")}</p>}
    </div>
  );
}

function RecitersDownloadsSection() {
  const { t, language } = useI18n();
  useSurahDownloads();
  const mb = totalDownloadedBytes() / 1e6;
  return (
    <div className="space-y-2 rounded-2xl bg-black/15 p-3.5 text-sm text-emerald-50" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
      <p>{t("setRecitersSize").replace("{mb}", mb.toLocaleString(language === "ar" ? "ar-EG" : language, { maximumFractionDigits: 1 }))}</p>
      <p className="text-xs leading-relaxed text-emerald-100/60">{t("setRecitersDesc")}</p>
    </div>
  );
}

function ContentSection({ kind }: { kind: "tr" | "tf" }) {
  const { t, language } = useI18n();
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const current = kind === "tf" ? getTafsir(s.tafsirs[language], language).option : getTranslation(s.translations[language], language);
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl bg-black/15 p-3.5 text-start" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
        {kind === "tf" ? <BookText className="h-4 w-4 text-amber-200" aria-hidden="true" /> : <Languages className="h-4 w-4 text-amber-200" aria-hidden="true" />}
        <span className="flex-1 text-sm text-emerald-50">{current.name}</span>
        <span className="text-xs text-amber-200">{t("setChange")}</span>
      </button>
      <ContentSelectModal kind={kind} open={open} selectedId={current.id} onClose={() => setOpen(false)}
        onSelect={(id) => void updateSettings(kind === "tf" ? { tafsirs: { ...s.tafsirs, [language]: id } } : { translations: { ...s.translations, [language]: id } })} />
    </div>
  );
}

function DeleteRecordingsSection() {
  const { t, language } = useI18n();
  const list = useRecordings();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const n = list.length;
  return (
    <div className="space-y-3 rounded-2xl border border-red-300/30 bg-red-950/20 p-3.5">
      <p className="text-xs leading-relaxed text-emerald-100/75">{t("setDeleteRecordingsDesc").replace("{n}", language === "ar" ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)] ?? d) : String(n))}</p>
      {!confirm ? (
        <button type="button" disabled={!n} onClick={() => setConfirm(true)} data-settings-delete-recordings=""
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-100 hover:bg-red-900/40 disabled:opacity-50" style={{ boxShadow: "inset 0 0 0 1px rgba(252,165,165,.45)" }}>
          <Trash2 className="h-4 w-4" />{t("setDeleteRecordings")}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2" role="alert">
          <button type="button" disabled={busy} onClick={() => setConfirm(false)} className="rounded-xl px-3 py-2.5 text-sm text-emerald-50 hover:bg-white/10" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)" }}>{t("cancel")}</button>
          <button type="button" disabled={busy} onClick={() => { setBusy(true); void deleteAllRecordings().finally(() => { setBusy(false); setConfirm(false); }); }}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{t("deleteAllYes")}
          </button>
        </div>
      )}
    </div>
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
