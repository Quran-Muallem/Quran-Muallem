import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { deleteRecording, groupBySurah, recordingUrl, releaseUrl, useRecordings, type RecordingMeta } from "@/lib/audioStorage";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import type { StudyTarget } from "@/components/Dashboard";
import { useI18n } from "@/lib/i18n";
import type { Language } from "@/i18n";

/** Digits in the reading direction of the language (Arabic-Indic for Arabic). */
export const sessionNum = (language: Language | string, n: number) => (language === "ar" ? toArabicDigits(n) : String(n));

/** Surah name for a session title: Arabic in Arabic, transliteration otherwise. */
const surahName = (language: string, surah: number) => {
  const m = getSurahMeta(surah);
  return m ? (language === "ar" || language === "ur" ? m.nameArabic : m.nameSimple) : String(surah);
};

/** "تسجيلي من سورة البقرة: من الآية ١ إلى الآية ١٢" (localized). */
export function sessionTitle(template: string, language: string, r: Pick<RecordingMeta, "surah" | "fromAyah" | "toAyah">) {
  return template
    .replace("{surah}", surahName(language, r.surah))
    .replace("{from}", sessionNum(language, r.fromAyah))
    .replace("{to}", sessionNum(language, r.toAyah));
}

/**
 * جلسات التسجيل — every recitation recording, grouped by surah with best accuracy and number of attempts;
 * play, delete or re-test each one.
 */
export function RecordingSessionsView({ onRetest }: { onRetest: (t: StudyTarget) => void }) {
  const { t, language } = useI18n();
  const groups = groupBySurah(useRecordings());
  const [playing, setPlaying] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const n = (x: number) => sessionNum(language, x);

  const stop = () => { audio.current?.pause(); audio.current = null; releaseUrl(url.current); url.current = null; setPlaying(null); };
  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (r: RecordingMeta) => {
    if (playing === r.id) { stop(); return; }
    stop();
    const u = await recordingUrl(r);
    if (!u) return;
    url.current = u;
    const a = new Audio(u);
    audio.current = a;
    a.onended = () => { if (audio.current === a) stop(); };
    setPlaying(r.id);
    void a.play().catch(() => stop());
  };

  const date = (iso: string) => { try { return new Date(iso).toLocaleDateString(language, { day: "numeric", month: "short", year: "numeric" }); } catch { return iso.slice(0, 10); } };
  const dur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

  if (!groups.length) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.33)}` }} data-rec-empty="">
        <Mic className="mx-auto h-8 w-8" style={{ color: GOLD_LIGHT }} />
        <p className="mt-3 text-sm text-emerald-100/75">{t("recSessionsEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-rec-sessions="">
      {groups.map((g) => {
        const m = getSurahMeta(g.surah);
        return (
          <section key={g.surah} className="rounded-2xl p-3" style={{ background: "rgba(0,0,0,.18)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` }} data-rec-surah={g.surah}>
            <header className="flex items-baseline gap-2">
              <h2 className="font-arabic text-xl" style={{ color: GOLD_LIGHT }}>سورة {m?.nameArabic}</h2>
              {language !== "ar" && <span className="text-sm text-emerald-100/70">{m?.nameSimple}</span>}
            </header>
            <p className="mt-0.5 text-xs text-emerald-100/75" data-rec-stats="">
              {t("recBest")} {g.best == null ? "—" : `${n(g.best)}%`} | {t("recAttempts")}: {n(g.attempts)}
            </p>
            <ul className="mt-2 space-y-1.5">
              {g.sessions.map((r) => (
                <li key={r.id} className="rounded-xl bg-black/20 p-2.5" data-rec-session={r.id}>
                  <p className="text-sm leading-relaxed text-emerald-50">• {sessionTitle(t("recSessionName"), language, r)}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[0.7rem] text-emerald-100/60">
                    <span>{date(r.createdAt)} · {dur(r.seconds)}</span>
                    {r.accuracy != null && (
                      <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: alpha(r.accuracy >= 90 ? "#22c55e" : r.accuracy >= 70 ? GOLD : "#ef4444", 0.25), color: "#f8fafc" }}>{n(r.accuracy)}%</span>
                    )}
                    {r.mode && <span>{t(r.mode === "memorization" ? "modeMemorization" : "modeRecitation")}</span>}
                    <span className="flex-1" />
                    <IconBtn label={playing === r.id ? t("recPause") : t("recPlay")} onClick={() => void toggle(r)} data="play" gold>
                      {playing === r.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </IconBtn>
                    <IconBtn label={t("recRetest")} data="retest" onClick={() => { stop(); onRetest({ surahId: r.surah, fromAyah: r.fromAyah, toAyah: r.toAyah, mode: r.mode === "memorization" ? "MEMORIZATION_MODE" : "RECITATION_MODE" }); }}>
                      <RotateCcw className="h-4 w-4" />
                    </IconBtn>
                    {confirm === r.id ? (
                      <button type="button" data-rec-action="confirm-delete" onClick={() => { if (playing === r.id) stop(); setConfirm(null); void deleteRecording(r.id); }}
                        className="h-8 rounded-lg bg-red-600/80 px-2 text-xs font-semibold text-white">{t("recDeleteConfirm")}</button>
                    ) : (
                      <IconBtn label={t("recDelete")} data="delete" onClick={() => setConfirm(r.id)}><Trash2 className="h-4 w-4" /></IconBtn>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function IconBtn({ label, onClick, children, data, gold }: { label: string; onClick: () => void; children: React.ReactNode; data: string; gold?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} data-rec-action={data}
      className="flex h-8 w-8 items-center justify-center rounded-lg"
      style={gold ? { background: GOLD_GRADIENT, color: "#022c22" } : { background: alpha(GOLD, 0.14), color: GOLD_LIGHT }}>
      {children}
    </button>
  );
}

export default RecordingSessionsView;
