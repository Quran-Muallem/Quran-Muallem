import { speechEngineFor } from "@/lib/speechEngine";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Smile, Type } from "lucide-react";
import { TypographySettings } from "@/components/TypographySettings";
import { AlertOctagon, AlertTriangle, BellRing, Highlighter, Info, BookOpen, BookText, CheckCircle2, ChevronLeft, ChevronRight, Download, ExternalLink, Eye, EyeOff, FileText, Globe, Languages, Loader2, Lock, Mic, MinusCircle, Play, Podcast, ShieldCheck, Sun, Trash2, Upload, XCircle } from "lucide-react";
import { GoldDialog, GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { PLAYBACK_RATES, QURAN_FONT_SIZES, THEME_COLORS, updateSettings, useSettings, type MushafStyle, type ThemeId } from "@/lib/settings";
import { TAJWEED_LEGEND } from "@/lib/tajweedColors";
import { BackupError, downloadBackup, importProgressJson } from "@/lib/progressStorage";
import { cachedSurahIds, downloadWholeQuran, toArabicDigits } from "@/lib/quranService";
import { directionFor, useI18n, type CopyKey } from "@/lib/i18n";
import { ReciterSelectModal } from "@/components/ReciterSelectModal";
import { ContentSelectList } from "@/components/ContentSelectModal";
import { playMistakeSound } from "@/lib/feedbackSounds";
import { RECITERS } from "@/lib/reciterManager";
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


type SettingsPage = "recitation" | "listening" | "mushafLook" | "hidden" | "highlight" | "language" | "theme" | "reminders" | "mistakes" | "session" | "reciters" | "translation" | "tafsir" | "offline" | "data" | "recordings" | "allData" | "typography" | "kids";
type Row = { id: SettingsPage; icon: ReactNode; label: CopyKey };
const ic = "h-5 w-5";
/** Grouped like Tarteel's settings: each row opens its own page inside the dialog. */
const GROUPS: { title: CopyKey; rows: Row[] }[] = [
  { title: "setGroupExperience", rows: [{ id: "recitation", icon: <Mic className={ic} />, label: "setRecitation" }, { id: "listening", icon: <Play className={ic} />, label: "setListening" }] },
  { title: "setGroupQuranLook", rows: [{ id: "mushafLook", icon: <BookOpen className={ic} />, label: "setMushafLook" }, { id: "hidden", icon: <EyeOff className={ic} />, label: "setHidden" }, { id: "highlight", icon: <Highlighter className={ic} />, label: "setHighlight" }] },
  { title: "setGroupAppLook", rows: [{ id: "language", icon: <Globe className={ic} />, label: "languageTitle" }, { id: "theme", icon: <Sun className={ic} />, label: "themeTitle" }, { id: "typography", icon: <Type className={ic} />, label: "setTypography" }, { id: "kids", icon: <Smile className={ic} />, label: "setKids" }] },
  { title: "setGroupNotifications", rows: [{ id: "reminders", icon: <BellRing className={ic} />, label: "setReminders" }] },
  { title: "setGroupSounds", rows: [{ id: "mistakes", icon: <AlertOctagon className={ic} />, label: "setMistakes" }, { id: "session", icon: <Mic className={ic} />, label: "setSession" }] },
  { title: "setGroupDownloads", rows: [{ id: "reciters", icon: <Podcast className={ic} />, label: "setReciters" }, { id: "translation", icon: <Languages className={ic} />, label: "setTranslation" }, { id: "tafsir", icon: <BookText className={ic} />, label: "setTafsir" }, { id: "offline", icon: <Download className={ic} />, label: "offlineTitle" }] },
  { title: "setGroupPrivacy", rows: [{ id: "data", icon: <Lock className={ic} />, label: "setDataUse" }, { id: "recordings", icon: <MinusCircle className={ic} />, label: "setDeleteRecordings" }, { id: "allData", icon: <Trash2 className={ic} />, label: "deleteAll" }] },
];

/**
 * Settings (v29: grouped like Tarteel — التجربة, مظهر القرآن, مظهر التطبيق, إشعارات, الأصوات والتفاعل الحسي,
 * التنزيلات, الخصوصية; a row opens its page, the arrow goes back). Everything stays on the device; no
 * external AI services, no API keys.
 */
export function SettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, language } = useI18n();
  const [page, setPage] = useState<SettingsPage | null>(null);
  const s0 = useSettings();
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
                {g.rows.filter((r) => !(s0.kidsMode && r.id === "recitation")).map((r, i) => (
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
          {page === "recitation" && (<>
            <InfoCard title={t("setModeSwitchTitle")} text={t("setModeSwitchText")} />
            <Toggle k="errorDetection" label="setErrorDetection" desc="setErrorDetectionDesc" />
            <SpeechSection /><Section title={t("voiceTitle")}><VoiceProfilePanel /></Section>
          </>)}
          {page === "listening" && <ListeningSection onManage={() => { onOpenChange(false); window.dispatchEvent(new Event("qm:open-reciters")); }} />}
          {page === "mushafLook" && (<>
            <p className="rounded-xl bg-black/15 p-3 text-xs leading-relaxed text-emerald-100/75">{t("setMushafLookDesc")}</p>
            <MushafStyleSection />
            <Toggle k="tajweedColors" label="setTajweedColors" desc="setTajweedColorsDesc" />
            {s0.tajweedColors && <TajweedLegend />}
            <ThemeSection />
          </>)}
          {page === "hidden" && <Toggle k="hiddenFirstWord" label="setHiddenFirstWord" desc="setHiddenFirstWordDesc" />}
          {page === "highlight" && <Toggle k="showPastMistakes" label="setPastMistakes" desc="setPastMistakesDesc" />}
          {page === "language" && <LanguageSection />}
          {page === "theme" && <ThemeSection />}
          {page === "typography" && <TypographySettings />}
          {page === "kids" && (<>
            <InfoCard title={t("kidsInfoTitle")} text={t("kidsInfoText")} />
            <Toggle k="kidsMode" label="setKidsMode" desc="setKidsModeDesc" />
          </>)}
          {page === "reminders" && <ReminderSection />}
          {page === "mistakes" && (<>
            {!s0.errorDetection && <InfoCard warn title={t("setDetectionOffTitle")} text={t("setDetectionOffText")} action={{ label: t("setOpenRecitation"), onClick: () => setPage("recitation") }} />}
            <Toggle k="mistakeSound" label="setMistakeSound" desc="setMistakeSoundDesc" />
            {s0.mistakeSound && <SoundPicker />}
            <Toggle k="mistakeVibration" label="setMistakeVibration" desc="setMistakeVibrationDesc" />
          </>)}
          {page === "session" && (<>
            <Toggle k="sessionSound" label="setSessionSound" desc="setSessionSoundDesc" />
            <Toggle k="sessionHaptic" label="setSessionHaptic" desc="setSessionHapticDesc" />
            <Toggle k="autoStopSurahEnd" label="setAutoStop" desc="setAutoStopDesc" />
            <Toggle k="completionSound" label="setCompletionSound" desc="setCompletionSoundDesc" />
          </>)}
          {page === "reciters" && <RecitersDownloadsSection onManage={() => { onOpenChange(false); window.dispatchEvent(new Event("qm:open-reciters")); }} />}
          {(page === "translation" || page === "tafsir") && <ContentSection kind={page === "tafsir" ? "tf" : "tr"} />}
          {page === "offline" && <OfflineSection />}
          {page === "data" && (<>
            <Toggle k="saveRecordings" label="setSaveRecordings" desc="setSaveRecordingsDesc" />
            <InfoCard title={t("setNoTrainingTitle")} text={t("setNoTrainingText")} />
            <BackupSection /><LegalDocsSection />
          </>)}
          {page === "recordings" && <DeleteRecordingsSection onDone={() => setPage(null)} />}
          {page === "allData" && <DeleteAllDataSection />}
        </div>
      )}
    </GoldDialog>
  );
}

type BoolKey = "mistakeVibration" | "completionSound" | "autoStopSurahEnd" | "hiddenFirstWord" | "errorDetection" | "showPastMistakes" | "mistakeSound" | "sessionSound" | "sessionHaptic" | "saveRecordings" | "tajweedColors" | "kidsMode";
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

/** v38 «هيئة المصحف»: Madinah page or flowing clear text (with its font size). */
function MushafStyleSection() {
  const { t, language } = useI18n();
  const s = useSettings();
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const styles: { id: MushafStyle; label: CopyKey; desc: CopyKey; font: string }[] = [
    { id: "madinah", label: "mushafStyleMadinah", desc: "mushafStyleMadinahDesc", font: "font-quran" },
    { id: "clean", label: "mushafStyleClean", desc: "mushafStyleCleanDesc", font: "font-arabic" },
    { id: "lines", label: "mushafStyleLines", desc: "mushafStyleLinesDesc", font: "font-arabic" },
  ];
  return (
    <div className="space-y-2" role="radiogroup" aria-label={t("setMushafStyle")} data-settings-mushaf-style={s.mushafStyle}>
      <p className="px-1 text-xs font-semibold" style={{ color: GOLD_LIGHT }}>{t("setMushafStyle")}</p>
      {styles.map((st) => {
        const on = s.mushafStyle === st.id;
        return (
          <button key={st.id} type="button" role="radio" aria-checked={on} onClick={() => void updateSettings({ mushafStyle: st.id })} data-mushaf-style={st.id}
            className="flex w-full items-center gap-3 rounded-2xl bg-black/15 p-3 text-start" style={{ boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${alpha(on ? GOLD_LIGHT : GOLD, on ? 0.85 : 0.3)}` }}>
            <span dir="rtl" lang="ar" className={cn("w-24 shrink-0 rounded-xl bg-black/25 px-2 py-1 text-center text-lg leading-loose text-emerald-50", st.font)}>بِسْمِ ٱللَّهِ</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-emerald-50">{t(st.label)}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-emerald-100/60">{t(st.desc)}</span>
            </span>
            <span aria-hidden="true" className={cn("h-4 w-4 shrink-0 rounded-full border-2", on ? "border-amber-300 bg-amber-300" : "border-white/40")} />
          </button>
        );
      })}
      {(s.mushafStyle === "clean" || s.mushafStyle === "lines") && (
        <div className="rounded-2xl bg-black/15 p-3" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
          <p className="text-sm text-emerald-50">{t("setQuranFontSize")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("setQuranFontSize")}>
            {QURAN_FONT_SIZES.map((px) => (
              <button key={px} type="button" role="radio" aria-checked={s.quranFontSize === px} onClick={() => void updateSettings({ quranFontSize: px })} data-font-size={px}
                className={cn("rounded-full px-3 py-1 text-xs", s.quranFontSize === px ? "font-semibold text-emerald-950" : "text-emerald-100/80")}
                style={s.quranFontSize === px ? { background: GOLD_GRADIENT } : { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` }}>{num(px)}</button>
            ))}
          </div>
          <p dir="rtl" lang="ar" className="mt-2 font-arabic leading-loose text-emerald-50" style={{ fontSize: s.quranFontSize }}>ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ</p>
        </div>
      )}
    </div>
  );
}

/** The colours of the Tajweed rules (Quran.com's scheme), shown when the colours are on. */
function TajweedLegend() {
  const { t } = useI18n();
  return (
    <ul className="grid grid-cols-2 gap-1.5 rounded-2xl bg-black/15 p-3 text-xs text-emerald-50" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }} data-tajweed-legend="">
      {TAJWEED_LEGEND.map(([cls, key]) => (
        <li key={cls} className="flex items-center gap-2"><span className={cn("h-3 w-3 shrink-0 rounded-full", `tjb-${cls}`)} />{t(key)}</li>
      ))}
    </ul>
  );
}

function InfoCard({ title, text, warn = false, action }: { title: string; text: string; warn?: boolean; action?: { label: string; onClick: () => void } }) {
  return (
    <div className={cn("flex gap-3 rounded-2xl p-3.5", warn ? "bg-amber-950/40" : "bg-black/15")} style={{ boxShadow: `inset 0 0 0 1px ${alpha(warn ? "#f59e0b" : GOLD, warn ? 0.6 : 0.3)}` }} data-settings-info="">
      {warn ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" /> : <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-100">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-100/70">{text}</p>
        {action && <button type="button" onClick={action.onClick} className="mt-2 rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>{action.label}</button>}
      </div>
    </div>
  );
}

function SoundPicker() {
  const { t } = useI18n();
  const s = useSettings();
  const opts = [["tone", "setSoundTone"], ["click", "setSoundClick"], ["bell", "setSoundBell"]] as const;
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("setMistakeSound")} data-settings-sound-type="">
      {opts.map(([id, key]) => (
        <button key={id} type="button" role="radio" aria-checked={s.mistakeSoundType === id}
          onClick={() => { void updateSettings({ mistakeSoundType: id }); playMistakeSound(id); }}
          className={cn("rounded-xl px-2 py-2.5 text-xs", s.mistakeSoundType === id ? "font-semibold text-emerald-950" : "text-emerald-50")}
          style={s.mistakeSoundType === id ? { background: GOLD_GRADIENT } : { background: "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
          {t(key)}
        </button>
      ))}
    </div>
  );
}

function ListeningSection({ onManage }: { onManage: () => void }) {
  const { t, language } = useI18n();
  const s = useSettings();
  const ar = language === "ar" || language === "ur";
  return (
    <div className="space-y-4">
      <Section title={t("setListeningSheikh")}>
        <select value={s.reciterId} onChange={(e) => void updateSettings({ reciterId: e.target.value })} aria-label={t("setListeningSheikh")} data-settings-reciter=""
          className="h-11 w-full rounded-xl border border-amber-400/40 bg-[var(--mf-page-deep)] px-3 text-sm text-emerald-50">
          {RECITERS.map((r) => <option key={r.id} value={r.id}>{ar ? r.nameArabic : r.nameEnglish}</option>)}
        </select>
        <button type="button" onClick={onManage} data-settings-manage-downloads=""
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm text-amber-100" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.5)}` }}>
          <Download className="h-4 w-4" aria-hidden="true" /><span className="flex-1">{t("setManageDownloads")}</span>
        </button>
        <p className="text-xs leading-relaxed text-emerald-100/60">{t("setListeningDesc")}</p>
      </Section>
      <Section title={t("setPlaybackSpeed")}>
        <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label={t("setPlaybackSpeed")} data-settings-speed="">
          {PLAYBACK_RATES.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={s.playbackRate === r} onClick={() => void updateSettings({ playbackRate: r })}
              className={cn("rounded-lg py-2 text-xs tabular-nums", s.playbackRate === r ? "font-semibold text-emerald-950" : "text-emerald-50")}
              style={s.playbackRate === r ? { background: GOLD_GRADIENT } : { background: "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
              ×{r.toLocaleString(ar ? "ar-EG" : language)}
            </button>
          ))}
        </div>
      </Section>
    </div>
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

function RecitersDownloadsSection({ onManage }: { onManage: () => void }) {
  const { t, language } = useI18n();
  useSurahDownloads();
  const mb = totalDownloadedBytes() / 1e6;
  return (
    <div className="space-y-2 rounded-2xl bg-black/15 p-3.5 text-sm text-emerald-50" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` }}>
      <p>{t("setRecitersSize").replace("{mb}", mb.toLocaleString(language === "ar" ? "ar-EG" : language, { maximumFractionDigits: 1 }))}</p>
      <p className="text-xs leading-relaxed text-emerald-100/60">{t("setRecitersDesc")}</p>
      <button type="button" onClick={onManage} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>
        <Download className="h-4 w-4" aria-hidden="true" />{t("setManageDownloads")}
      </button>
    </div>
  );
}

function ContentSection({ kind }: { kind: "tr" | "tf" }) {
  const { language } = useI18n();
  const s = useSettings();
  const current = kind === "tf" ? getTafsir(s.tafsirs[language], language).option : getTranslation(s.translations[language], language);
  // v30: the list is shown right here (a separate overlay opened from inside this dialog was cut off).
  return (
    <ContentSelectList kind={kind} selectedId={current.id}
      onSelect={(id) => void updateSettings(kind === "tf" ? { tafsirs: { ...s.tafsirs, [language]: id } } : { translations: { ...s.translations, [language]: id } })} />
  );
}

function DeleteRecordingsSection({ onDone }: { onDone: () => void }) {
  const { t, language } = useI18n();
  const list = useRecordings();
  const [busy, setBusy] = useState(false);
  const n = list.length;
  const impacts: CopyKey[] = ["setImpactSessions", "setImpactListening", "setImpactManage", "setImpactMistakes"];
  return (
    <div className="space-y-3" data-settings-delete-recordings-sheet="">
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-red-950/25 p-4 text-center" style={{ boxShadow: "inset 0 0 0 1px rgba(252,165,165,.35)" }}>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-900/50"><Trash2 className="h-6 w-6 text-red-200" aria-hidden="true" /></span>
        <p className="text-sm font-semibold text-red-100">{t("setDeleteRecordingsHead")}</p>
        <p className="text-xs leading-relaxed text-emerald-100/70">{t("setDeleteRecordingsDesc").replace("{n}", language === "ar" ? String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)] ?? d) : String(n))}</p>
      </div>
      <p className="text-xs font-semibold text-amber-200/90">{t("setImpactTitle")}</p>
      <ul className="space-y-1.5">
        {impacts.map((k) => (
          <li key={k} className="flex items-center gap-2 text-sm text-emerald-50"><XCircle className="h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />{t(k)}</li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button type="button" disabled={busy} onClick={onDone} className="rounded-xl px-3 py-2.5 text-sm text-emerald-50 hover:bg-white/10" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)" }} data-settings-not-now="">{t("setNotNow")}</button>
        <button type="button" disabled={busy || !n} onClick={() => { setBusy(true); void deleteAllRecordings().finally(() => { setBusy(false); onDone(); }); }} data-settings-continue=""
          className="flex items-center justify-center gap-2 rounded-xl bg-red-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{t("setContinue")}
        </button>
      </div>
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

function LegalDocsSection() {
  return <LegalSection docs />;
}
function DeleteAllDataSection() {
  return <LegalSection wipeOnly />;
}
function LegalSection({ docs = false, wipeOnly = false }: { docs?: boolean; wipeOnly?: boolean }) {
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
    <Section title={wipeOnly ? t("deleteAll") : t("legalTitle")}>
      {!wipeOnly && <div className="grid gap-2">
        {(Object.keys(LEGAL_TITLES) as LegalDoc[]).map((d) => (
          <button key={d} type="button" onClick={() => setDoc(d)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm text-amber-100 hover:bg-black/30" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.5)}` }}>
            <FileText className="h-4 w-4 shrink-0" />{t(LEGAL_TITLES[d])}
          </button>
        ))}
      </div>}
      {!docs && <div className="rounded-2xl border border-red-300/30 bg-red-950/20 p-3" data-settings-delete-all-data="">
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
      </div>}
      <LegalDialog doc={doc} onOpenChange={(o) => { if (!o) setDoc(null); }} />
    </Section>
  );
}

export default SettingsModal;
