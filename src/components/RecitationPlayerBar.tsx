import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, Trash2 } from "lucide-react";
import { GOLD, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { deleteRecording, recordingUrl, releaseUrl, type RecordingMeta } from "@/lib/audioStorage";
import { toArabicDigits } from "@/lib/quranService";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const formatClock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * "My recording" bar for the recitation views:
 *  🎙️ record / stop (with a live timer) · ▶️ play / pause the saved recording · 🗑️ delete it.
 * Recordings are saved automatically after each recitation (src/lib/audioStorage.ts, on the device only).
 * `onRecord` is the same action as the main microphone button; pass `showRecord={false}` where that
 * button is right next to the bar, so there is one record control per screen.
 */
export function RecitationPlayerBar({ recording, elapsed, onRecord, busy = false, showRecord = true, saved, canKeep = true, compact = false, className }: {
  recording: boolean;
  /** Seconds recorded so far. */
  elapsed: () => number;
  onRecord: () => void;
  busy?: boolean;
  showRecord?: boolean;
  /** The saved recording for the current verse / passage, if any. */
  saved: RecordingMeta | null;
  /** False with the browser recognizer, which provides no audio to keep. */
  canKeep?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { t, language } = useI18n();
  const num = (s: string) => (language === "ar" ? toArabicDigits(s) : s);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);

  // Live timer while recording.
  useEffect(() => {
    if (!recording) return;
    setSeconds(0);
    const id = setInterval(() => setSeconds(elapsed()), 250);
    return () => clearInterval(id);
  }, [recording, elapsed]);

  // A different (or deleted) recording: stop playback and release the old file URL.
  const stopPlayback = () => {
    audio.current?.pause(); audio.current = null;
    releaseUrl(url.current); url.current = null;
    setPlaying(false); setPos(0);
  };
  useEffect(() => { stopPlayback(); setConfirm(false); return stopPlayback; }, [saved?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Never play back while recording (the microphone would pick it up).
  useEffect(() => { if (recording) stopPlayback(); }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!confirm) return; const id = setTimeout(() => setConfirm(false), 3000); return () => clearTimeout(id); }, [confirm]);

  const togglePlay = async () => {
    if (!saved) return;
    if (playing) { audio.current?.pause(); setPlaying(false); return; }
    if (!audio.current) {
      url.current = await recordingUrl(saved);
      if (!url.current) return;
      const a = new Audio(url.current);
      a.ontimeupdate = () => setPos(a.currentTime);
      a.onended = () => { setPlaying(false); setPos(0); };
      a.onerror = () => setPlaying(false);
      audio.current = a;
    }
    try { await audio.current.play(); setPlaying(true); } catch { setPlaying(false); }
  };

  const erase = () => {
    if (!saved) return;
    if (!confirm) { setConfirm(true); return; }
    stopPlayback(); setConfirm(false);
    void deleteRecording(saved.id);
  };

  const btn = "flex shrink-0 items-center justify-center rounded-full transition disabled:opacity-35";
  const size = compact ? "h-8 w-8" : "h-10 w-10";
  const range = saved ? (saved.fromAyah === saved.toAyah ? num(String(saved.fromAyah)) : `${num(String(saved.fromAyah))}–${num(String(saved.toAyah))}`) : "";

  return (
    <div className={cn("flex items-center gap-2 rounded-full p-1", className)} style={{ background: "linear-gradient(135deg, #064e3b, #022c22)", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.45)}` }}>
      {showRecord && (
        <button type="button" onClick={onRecord} disabled={busy} aria-label={recording ? t("stop") : t("record")}
          className={cn(btn, size, recording ? "bg-red-600 text-white" : "text-emerald-950")}
          style={recording ? undefined : { background: GOLD_LIGHT }}>
          {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
        </button>
      )}
      <div className="min-w-0 flex-1 px-1.5" aria-live="polite">
        {recording ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-red-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />{t("recordingNow")} · <bdi dir="ltr" className="tabular-nums">{num(formatClock(seconds))}</bdi>
          </p>
        ) : saved ? (
          <p className="truncate text-xs text-emerald-50">
            {t("myRecording")} · {t("verse")} {range} · <bdi dir="ltr" className="tabular-nums">{num(formatClock(playing || pos ? pos : saved.seconds))}</bdi>
            {playing && <span className="text-emerald-100/60"> / <bdi dir="ltr">{num(formatClock(saved.seconds))}</bdi></span>}
          </p>
        ) : (
          <p className="truncate text-xs text-emerald-100/55">{canKeep ? t("myRecordingNone") : t("myRecordingBrowser")}</p>
        )}
      </div>
      <button type="button" onClick={() => void togglePlay()} disabled={!saved || recording} aria-label={playing ? t("pause") : t("myRecordingPlay")}
        className={cn(btn, size, "text-amber-200 hover:bg-white/10")} style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button type="button" onClick={erase} disabled={!saved || recording} aria-label={confirm ? t("myRecordingDeleteConfirm") : t("myRecordingDelete")}
        className={cn(btn, confirm ? "h-8 rounded-full bg-red-900/70 px-3 text-[0.7rem] text-red-100" : cn(size, "text-red-200/80 hover:bg-white/10"))}>
        {confirm ? t("myRecordingDeleteConfirm") : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
