import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2, RotateCcw, Volume2, X } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { playWord, stopWordAudio } from "@/lib/audioPlayback";
import { getReciter } from "@/lib/reciterManager";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { useSettings } from "@/lib/settings";
import { diagnoseWord, type TajweedIssue } from "@/lib/tajweedAnalyzer";
import { directionFor, useI18n, type CopyKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** A word marked red / orange in the recitation that just ended. */
export type ReviewItem = {
  /** "surah:ayah:word" (word as Quran.com counts it). */
  key: string;
  /** The Mushaf word. */
  word: string;
  /** What the recognizer heard (null: skipped). */
  heard: string | null;
  /** Canonical phonemes of the word (phoneme engine), for the Tajweed diagnosis. */
  expected?: string | null | undefined;
  status: "ERROR" | "WARNING";
};

const ISSUE_KEY: Record<TajweedIssue, CopyKey> = {
  missing: "issueMissing", madd: "issueMadd", ghunnah: "issueGhunnah", ikhfa: "issueIkhfa", qalqalah: "issueQalqalah",
  tafkheem: "issueTafkheem", shadda: "issueShadda", harakat: "issueHarakat", letters: "issueLetters",
};

/**
 * v38 «مراجعة التلاوة»: after the stop, every word marked red / orange in the session — grouped by verse —
 * with what went wrong (from the phonemes: madd length, ghunnah, ikhfāʾ, qalqalah, heavy / light letter,
 * shaddah, vowels, letters), the word in the Sheikh's voice, «أعد الآية» to recite that verse again,
 * «تفاصيل» (what was heard, add to the voice profile) and «أعد التلاوة» for the whole passage.
 */
export function SessionReview({ items, stats, onClose, onRetryVerse, onRetryAll, onDetails }: {
  items: readonly ReviewItem[];
  stats: { correct: number; near: number; wrong: number };
  onClose: () => void;
  onRetryVerse: (surah: number, ayah: number) => void;
  onRetryAll: () => void;
  onDetails: (item: ReviewItem) => void;
}) {
  const { t, language } = useI18n();
  const settings = useSettings();
  const reciter = getReciter(settings.reciterId);
  const [audio, setAudio] = useState<{ key: string; state: "loading" | "playing" | "failed" } | null>(null);
  useEffect(() => () => stopWordAudio(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const ar = language === "ar" || language === "ur";
  const num = (n: number) => (ar ? toArabicDigits(n) : String(n));
  const verses = useMemo(() => {
    const out = new Map<string, ReviewItem[]>();
    for (const it of items) {
      const v = it.key.split(":").slice(0, 2).join(":");
      out.set(v, [...(out.get(v) ?? []), it]);
    }
    return [...out];
  }, [items]);
  const listen = (it: ReviewItem) => {
    const [surah, ayah, word] = it.key.split(":").map(Number) as [number, number, number];
    setAudio({ key: it.key, state: "loading" });
    void playWord({ quranComId: reciter.quranComId, surah, ayah, word })
      .then(() => setAudio((a) => (a?.key === it.key ? { key: it.key, state: "playing" } : a)))
      .catch(() => setAudio((a) => (a?.key === it.key ? { key: it.key, state: "failed" } : a)));
  };
  const total = stats.correct + stats.near + stats.wrong;
  const accuracy = total ? Math.round((100 * (stats.correct + 0.5 * stats.near)) / total) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" dir={directionFor(language)} lang={language} data-session-review="">
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 bg-black/60 animate-in fade-in" />
      <section role="dialog" aria-modal="true" aria-label={t("srTitle")}
        className="qm-native-colors relative mx-2 mb-[max(0.5rem,env(safe-area-inset-bottom))] flex w-full max-w-md flex-col overflow-hidden rounded-[1.5rem] shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200"
        style={{ background: "#062b22", boxShadow: `0 0 0 1px ${alpha(GOLD, 0.6)}, 0 20px 50px -20px rgba(0,0,0,.8)`, maxHeight: "min(80dvh, 44rem)" }}>
        <header className="shrink-0 space-y-2 px-4 pb-3 pt-4" style={{ background: "linear-gradient(180deg, #0a3d30, #062b22)" }}>
          <div className="flex items-center gap-2">
            <h2 className="flex-1 font-arabic text-xl" style={{ color: GOLD_LIGHT }}>{t("srTitle")}</h2>
            <button type="button" onClick={onClose} aria-label={t("close")} className="flex h-9 w-9 items-center justify-center rounded-full text-amber-100 hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs" data-review-stats={`${stats.correct}/${stats.near}/${stats.wrong}`}>
            <span className="rounded-full px-2.5 py-1 font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>{num(accuracy)}%</span>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-200">{t("correct")} {num(stats.correct)}</span>
            <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-orange-200">{t("warning")} {num(stats.near)}</span>
            <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-red-200">{t("missing")} {num(stats.wrong)}</span>
          </div>
          <p className="text-xs text-emerald-100/70">{t("srSub").replace("{n}", num(items.length))}</p>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
          {verses.map(([v, words]) => {
            const [s, a] = v.split(":").map(Number) as [number, number];
            const meta = getSurahMeta(s);
            return (
              <div key={v} className="rounded-2xl bg-black/20 p-3" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.25)}` }} data-review-verse={v}>
                <div className="mb-2 flex items-center gap-2">
                  <p className="flex-1 text-xs text-amber-100/80">
                    <span className="font-arabic text-sm" style={{ color: GOLD_LIGHT }}>{ar ? meta?.nameArabic : meta?.nameSimple}</span> · {t("verse")} {num(a)}
                  </p>
                  <button type="button" onClick={() => onRetryVerse(s, a)} data-review-retry={v}
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-xs text-amber-100" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}>
                    <RotateCcw className="h-3.5 w-3.5" />{t("srRetryVerse")}
                  </button>
                </div>
                <ul className="space-y-2">
                  {words.map((it) => {
                    const issues = diagnoseWord(it.expected, it.heard);
                    const red = it.status === "ERROR";
                    const st = audio?.key === it.key ? audio.state : null;
                    return (
                      <li key={it.key} className="flex items-start gap-2" data-review-word={it.key}>
                        <span dir="rtl" lang="ar" className={cn("shrink-0 rounded-xl px-2.5 font-quran text-[1.6rem] leading-[1.9]", red ? "bg-red-950/60 text-red-200" : "bg-orange-950/45 text-orange-200")}>{it.word}</span>
                        <div className="min-w-0 flex-1">
                          <ul className="flex flex-wrap gap-1">
                            {issues.map((i) => (
                              <li key={i} data-review-issue={i} className="rounded-full px-2 py-0.5 text-[0.68rem] text-amber-100" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.4)}` }}>{t(ISSUE_KEY[i])}</li>
                            ))}
                          </ul>
                          {it.heard && <p className="mt-1 truncate text-[0.7rem] text-emerald-100/60">{t("voiceHeard")}: <span lang="ar" className="font-arabic text-sm text-amber-200/90">{it.heard}</span></p>}
                          {st === "failed" && <p className="mt-0.5 text-[0.66rem] text-amber-200">{t("wordAudioFailed")}</p>}
                        </div>
                        <div className="flex shrink-0 flex-col items-center gap-1">
                          <button type="button" onClick={() => listen(it)} aria-label={`${t("wordListen")}: ${it.word}`} data-review-listen={it.key}
                            className="flex h-8 w-8 items-center justify-center rounded-full" style={st === "playing" || st === "loading" ? { background: GOLD_GRADIENT, color: "#022c22" } : { color: GOLD_LIGHT, boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}>
                            {st === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                          </button>
                          <button type="button" onClick={() => onDetails(it)} className="flex items-center text-[0.62rem] text-emerald-100/70 hover:text-emerald-50">
                            {t("srDetails")}<ChevronLeft className="h-3 w-3 ltr:rotate-180" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <p className="px-1 text-center text-[0.66rem] leading-relaxed text-emerald-100/55">{t("srNote")}</p>
        </div>

        <footer className="flex shrink-0 gap-2 border-t px-4 py-3" style={{ borderColor: alpha(GOLD, 0.25) }}>
          <button type="button" onClick={onRetryAll} data-review-retry-all=""
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>
            <RotateCcw className="h-4 w-4" />{t("srRetryAll")}
          </button>
          <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-sm text-amber-100" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.5)}` }}>{t("close")}</button>
        </footer>
      </section>
    </div>
  );
}
