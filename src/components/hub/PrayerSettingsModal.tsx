import { useEffect, useMemo, useState } from "react";
import { BellOff, Minus, Play, Plus, RotateCcw, Square, Vibrate, Volume2, X } from "lucide-react";
import { GOLD, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { ADHAN_VOICES, FAJR_FALLBACK, getVoice, isAvailable, isAvailableFor, type AdhanVoice } from "@/data/adhanVoices";
import {
  MAX_OFFSET, METHODS, METHOD_IDS, NOTIFY_PRAYERS, PRAYERS, ZERO_OFFSETS, clampOffset, defaultMethod, modeOf, setPrayerMode, updatePrayerSettings, voiceOf,
  type MethodId, type NotifyMode, type NotifyPrayer, type PrayerName, type PrayerSettings,
} from "@/lib/PrayerTimesEngine";
import { VIBRATE_PATTERN, notificationPermission, playAdhan, stopAdhan, type NotifyPermission } from "@/lib/prayerNotifications";
import { toArabicDigits } from "@/lib/quranService";
import { directionFor, useI18n, type CopyKey } from "@/lib/i18n";
import { isNativePlatform } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const PRAYER_NAME: Record<PrayerName, CopyKey> = { fajr: "prayerFajr", sunrise: "prayerSunrise", dhuhr: "prayerDhuhr", asr: "prayerAsr", maghrib: "prayerMaghrib", isha: "prayerIsha" };
const MODES: { id: NotifyMode; icon: typeof Volume2; label: CopyKey }[] = [
  { id: "adhan", icon: Volume2, label: "adhanModeAdhan" },
  { id: "vibrate", icon: Vibrate, label: "adhanModeVibrate" },
  { id: "off", icon: BellOff, label: "adhanModeOff" },
];

/**
 * Prayer settings: Adhan per prayer (🔊 Adhan · 📳 vibration · 🔇 off), the muezzin voice for all prayers or
 * per prayer with preview, and the calculation (method, Asr, ±15 min per prayer).
 */
export function PrayerSettingsModal({ open, settings, onClose }: { open: boolean; settings: PrayerSettings; onClose: () => void }) {
  const { t, language } = useI18n();
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotifyPermission>("prompt");
  const [perPrayer, setPerPrayer] = useState(() => Object.keys(settings.prayerVoices).length > 0);
  useEffect(() => { if (open) void notificationPermission(false).then(setPerm); }, [open]);
  useEffect(() => {
    if (!open) { stopAdhan(); setPreviewing(null); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  const method = settings.method ?? defaultMethod(language);
  const methodOptions = useMemo(() => METHOD_IDS.map((id) => ({ id, name: METHODS[id].name })), []);
  if (!open) return null;

  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const voiceName = (v: AdhanVoice) => (language === "ar" ? v.ar : v.en);
  const preview = (file: string) => {
    if (previewing === file) { stopAdhan(); setPreviewing(null); return; }
    setPreviewing(file);
    playAdhan(file, () => setPreviewing((cur) => (cur === file ? null : cur)));
  };
  /** Always saves the mode; then asks for the permission (a hint shows when alerts cannot be delivered). */
  const setMode = async (p: NotifyPrayer, mode: NotifyMode) => {
    await setPrayerMode(p, mode);
    if (mode === "vibrate" && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(VIBRATE_PATTERN.slice(0, 1));
    if (mode !== "off") setPerm(await notificationPermission(true).catch(() => "unsupported" as const));
  };
  const setPrayerVoice = (p: NotifyPrayer, id: string) => {
    const prayerVoices = { ...settings.prayerVoices };
    if (!id) delete prayerVoices[p]; else prayerVoices[p] = id;
    void updatePrayerSettings({ prayerVoices });
  };
  const setOffset = (p: PrayerName, delta: number) => void updatePrayerSettings({ offsets: { ...settings.offsets, [p]: clampOffset((settings.offsets[p] ?? 0) + delta) } });
  const fajrVoice = getVoice(voiceOf(settings, "fajr"));
  const fajrUsesFallback = !fajrVoice?.fajrFile;

  return (
    <div className="fixed inset-0 z-[70]" dir={directionFor(language)} lang={language}>
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in" />
      <section role="dialog" aria-modal="true" aria-label={t("prayerSettings")} data-prayer-settings=""
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
        style={{ background: "linear-gradient(180deg, var(--hq-emerald), var(--hq-emerald-deep))", boxShadow: `inset 0 1px 0 ${alpha(GOLD, 0.6)}` }}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-amber-200/40" aria-hidden="true" />
        <div className="flex items-center gap-2 px-4 pb-2">
          <h2 className="min-w-0 flex-1 text-base font-semibold" style={{ color: GOLD_LIGHT }}>{t("hubPrayer")} · {t("prayerSettings")}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="flex h-8 w-8 items-center justify-center rounded-full text-amber-200 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {/* 1 · per prayer: mode (+ voice) */}
          <section aria-label={t("adhanPerPrayer")}>
            <h3 className={h3}>{t("adhanPerPrayer")}</h3>
            <ul className="space-y-2">
              {NOTIFY_PRAYERS.map((p) => {
                const mode = modeOf(settings, p);
                return (
                  <li key={p} className="rounded-2xl bg-black/15 p-2.5" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.22)}` }} data-prayer-row={p}>
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 text-sm font-medium text-emerald-50">{t(PRAYER_NAME[p])}</span>
                      <div role="radiogroup" aria-label={t(PRAYER_NAME[p])} className="flex rounded-xl bg-black/25 p-0.5">
                        {MODES.map(({ id, icon: Icon, label }) => (
                          <button key={id} type="button" role="radio" aria-checked={mode === id} aria-label={`${t(PRAYER_NAME[p])}: ${t(label)}`} title={t(label)}
                            onClick={() => void setMode(p, id)}
                            className={cn("flex h-8 items-center gap-1 rounded-lg px-2 text-xs", mode === id ? "bg-amber-300 text-emerald-950" : "text-emerald-100/70")}>
                            <Icon className="h-3.5 w-3.5" /><span className="hidden min-[400px]:inline">{t(label)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {mode === "adhan" && perPrayer && (
                      <select value={settings.prayerVoices[p] ?? ""} onChange={(e) => setPrayerVoice(p, e.target.value)} aria-label={`${t("adhanVoice")}: ${t(PRAYER_NAME[p])}`}
                        className="mt-2 h-9 w-full rounded-xl border border-amber-400/40 bg-[var(--mf-page-deep)] px-2 text-sm text-emerald-50">
                        <option value="">{t("adhanSameVoice")}</option>
                        {ADHAN_VOICES.filter((v) => isAvailableFor(v, p === "fajr")).map((v) => <option key={v.id} value={v.id}>{voiceName(v)}</option>)}
                      </select>
                    )}
                    {p === "fajr" && mode === "adhan" && fajrUsesFallback && (
                      <p className="mt-1.5 text-[0.7rem] leading-relaxed text-amber-100/80">{t("adhanFajrNote").replace("{voice}", voiceName(getVoice(FAJR_FALLBACK)!))}</p>
                    )}
                  </li>
                );
              })}
            </ul>
            {(perm === "denied" || perm === "unsupported") && NOTIFY_PRAYERS.some((x) => modeOf(settings, x) !== "off") && <p className="mt-2 text-xs text-red-200" data-adhan-warn="">{t(perm === "denied" ? "prayerNotifyDenied" : "adhanPermissionWarn")}</p>}
            <p className="mt-2 text-[0.7rem] leading-relaxed text-emerald-100/55">{t(isNativePlatform() ? "adhanNativeNote" : "prayerNotifyWebNote")}</p>
          </section>

          {/* 2 · muezzin voice (global / per prayer) */}
          <section aria-label={t("adhanVoice")}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className={cn(h3, "mb-0 flex-1")}>{t("adhanVoice")}</h3>
              <label className="flex items-center gap-2 text-xs text-emerald-100/80">
                <input type="checkbox" checked={perPrayer} onChange={(e) => { setPerPrayer(e.target.checked); if (!e.target.checked) void updatePrayerSettings({ prayerVoices: {} }); }} className="h-4 w-4 accent-amber-300" />
                {t("adhanPerPrayerVoice")}
              </label>
            </div>
            <ul className="space-y-1.5" role="radiogroup" aria-label={t("adhanVoice")}>
              {ADHAN_VOICES.map((v) => {
                const available = isAvailable(v);
                const previewFile = v.file ?? v.fajrFile;
                const selected = settings.voice === v.id;
                return (
                  <li key={v.id} className={cn("flex items-center gap-2 rounded-xl px-2 py-1.5", selected ? "bg-amber-300/15" : "bg-black/15", !previewFile && "opacity-55")}
                    style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, selected ? 0.6 : 0.18)}` }} data-voice={v.id}>
                    <button type="button" role="radio" aria-checked={selected} disabled={!available} onClick={() => void updatePrayerSettings({ voice: v.id })}
                      className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-start disabled:cursor-not-allowed">
                      <span className={cn("h-4 w-4 shrink-0 rounded-full border-2", selected ? "border-amber-300 bg-amber-300" : "border-amber-200/40")} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm text-emerald-50", language === "ar" && "font-arabic")}>{voiceName(v)}</span>
                        <span className="block truncate text-[0.68rem] text-emerald-100/55">{available ? v.credit : v.fajrFile ? `${t("adhanFajrOnly")} · ${v.credit ?? ""}` : t("adhanVoiceMissing")}</span>
                      </span>
                    </button>
                    {previewFile && (
                      <button type="button" onClick={() => preview(previewFile)} aria-pressed={previewing === previewFile} aria-label={`${t("adhanPreview")}: ${voiceName(v)}`}
                        className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", previewing === previewFile ? "bg-amber-300 text-emerald-950" : "text-amber-200 hover:bg-white/10")}>
                        {previewing === previewFile ? <Square className="h-3.5 w-3.5" /> : <Play className="h-4 w-4" />}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[0.7rem] leading-relaxed text-emerald-100/55">{t("adhanCreditsNote")}</p>
          </section>

          {/* 3 · calculation */}
          <section aria-label={t("prayerMethod")}>
            <h3 className={h3}>{t("prayerMethod")}</h3>
            <select value={method} onChange={(e) => void updatePrayerSettings({ method: e.target.value as MethodId })} aria-label={t("prayerMethod")}
              className="h-10 w-full rounded-xl border border-amber-400/40 bg-[var(--mf-page-deep)] px-2 text-sm text-emerald-50">
              {methodOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-black/25 p-1" role="radiogroup" aria-label={t("prayerAsrMadhab")}>
              {(["shafi", "hanafi"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={settings.madhab === m} onClick={() => void updatePrayerSettings({ madhab: m })}
                  className={cn("rounded-lg py-1.5 text-xs", settings.madhab === m ? "bg-amber-300 text-emerald-950" : "text-emerald-100/80")}>
                  {t(m === "shafi" ? "prayerShafi" : "prayerHanafi")}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center">
              <h4 className="flex-1 text-xs text-emerald-100/70">{t("prayerOffsets").replace("{n}", num(MAX_OFFSET))}</h4>
              <button type="button" onClick={() => void updatePrayerSettings({ offsets: ZERO_OFFSETS })} className="flex items-center gap-1 text-xs text-amber-200"><RotateCcw className="h-3 w-3" />{t("reset")}</button>
            </div>
            <ul className="mt-1 divide-y divide-white/5">
              {PRAYERS.map((p) => {
                const o = settings.offsets[p] ?? 0;
                return (
                  <li key={p} className="flex items-center gap-2 py-1.5">
                    <span className="flex-1 text-sm text-emerald-50">{t(PRAYER_NAME[p])}</span>
                    <button type="button" onClick={() => setOffset(p, -1)} disabled={o <= -MAX_OFFSET} aria-label={`${t(PRAYER_NAME[p])} −1`} className={stepBtn}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-16 text-center text-sm tabular-nums text-amber-100">{o > 0 ? "+" : ""}{num(o)} {t("minShort")}</span>
                    <button type="button" onClick={() => setOffset(p, 1)} disabled={o >= MAX_OFFSET} aria-label={`${t(PRAYER_NAME[p])} +1`} className={stepBtn}><Plus className="h-3.5 w-3.5" /></button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </section>
    </div>
  );
}

const h3 = "mb-2 text-xs font-semibold uppercase tracking-wide text-amber-200/90";
const stepBtn = "flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/40 text-amber-100 disabled:opacity-30";

export default PrayerSettingsModal;
