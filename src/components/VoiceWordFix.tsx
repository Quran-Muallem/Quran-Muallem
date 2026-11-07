import { useEffect, useRef, useState } from "react";
import { Check, Loader2, UserRoundPlus, Volume2, X } from "lucide-react";
import { GOLD_LIGHT, alpha } from "@/components/ornaments";
import { addVariant } from "@/lib/userAdaptation";
import { playWord, stopWordAudio, type WordVoice } from "@/lib/audioPlayback";
import { getReciter } from "@/lib/reciterManager";
import { useSettings } from "@/lib/settings";
import { wordFeatures, type WordFeature } from "@/lib/wordTajweed";
import { useI18n, type CopyKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type WordFix = {
  /** "surah:ayah:word" */
  id: string;
  /** The Mushaf word (full Uthmani text with tashkeel). */
  word: string;
  /** What the recognizer heard for it (null: nothing — the word was skipped). */
  heard: string | null;
  surah?: number | undefined;
  ayah?: number | undefined;
  /** "ERROR" (red) or "WARNING" (orange). */
  status?: "ERROR" | "WARNING" | undefined;
  /** Set with the phoneme engine: the word's canonical phonemes (`heard` is then phonemes too). */
  phonemes?: string | undefined;
};

const FEATURE_KEY: Record<WordFeature, CopyKey> = {
  wasl: "twWasl", maddLong: "twMaddLong", daggerAlif: "twDaggerAlif", ghunna: "twGhunna",
  shadda: "twShadda", qalqalah: "twQalqalah", iqlab: "twIqlab", sakt: "twSakt",
};

/**
 * Popover for a word marked red / orange (Mushaf and Tasmīʿ): the word in full Uthmani script, its
 * Tajweed features, the word played in the selected Sheikh's voice, what was heard, and
 * "Add to my voice profile". In memorization the word is shown too — it was already revealed in red.
 */
export function VoiceWordFix({ fix, showExpected = true, onClose, className }: { fix: WordFix; showExpected?: boolean; onClose: () => void; className?: string }) {
  const { t, language } = useI18n();
  const settings = useSettings();
  const reciter = getReciter(settings.reciterId);
  const [added, setAdded] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ id: string; state: "loading" | WordVoice | "failed" } | null>(null);
  const done = added === fix.id;
  const box = useRef<HTMLDivElement>(null);
  // Bring the popover into view (on the Tasmīʿ screen it sits below the verses).
  useEffect(() => { box.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }); }, [fix.id]);
  useEffect(() => () => stopWordAudio(), []);
  const wordNumber = Number(fix.id.split(":")[2] ?? 0);
  const features = wordFeatures(fix.word);
  const red = fix.status !== "WARNING";
  const audioState = audio?.id === fix.id ? audio.state : null;

  const listen = () => {
    if (!fix.surah || !fix.ayah || !wordNumber) return;
    setAudio({ id: fix.id, state: "loading" });
    void playWord({ quranComId: reciter.quranComId, surah: fix.surah, ayah: fix.ayah, word: wordNumber })
      .then((voice) => setAudio({ id: fix.id, state: voice }))
      .catch(() => setAudio({ id: fix.id, state: "failed" }));
  };

  return (
    <div ref={box} role="dialog" aria-label={fix.word} className={cn("scroll-mb-36 rounded-2xl bg-black/35 p-3 text-xs text-emerald-50 animate-in fade-in zoom-in-95", className)}
      style={{ boxShadow: `inset 0 0 0 1px ${red ? "rgba(248,113,113,.45)" : "rgba(251,146,60,.45)"}` }}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn("text-[0.7rem] font-medium", red ? "text-red-300" : "text-orange-300")}>{t(red ? "wordWrong" : "wordNear")}</p>
          {showExpected && (
            <p dir="rtl" lang="ar" className={cn("mt-1 inline-block rounded-xl px-3 py-0.5 font-quran text-[2rem] leading-[1.9]", red ? "bg-red-950/60 text-red-200" : "bg-orange-950/45 text-orange-200")}>{fix.word}</p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label={t("close")} className="rounded-full p-1 text-emerald-100/70 hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>

      {features.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-[0.68rem] text-emerald-100/60">{t("wordTajweed")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {features.map((f) => (
              <li key={f} className="rounded-full px-2.5 py-1 text-[0.7rem] text-amber-100" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.45)}` }}>{t(FEATURE_KEY[f])}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={listen} disabled={audioState === "loading" || !fix.surah}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm text-amber-100 disabled:opacity-60" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.55)}` }}>
        {audioState === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}{t("wordListen")}
      </button>
      {audioState === "sheikh" && <p className="mt-1 text-center text-[0.66rem] text-emerald-100/60">{t("wordVoiceSheikh").replace("{r}", language === "ar" ? reciter.nameArabic : reciter.nameEnglish)}</p>}
      {audioState === "wordByWord" && <p className="mt-1 text-center text-[0.66rem] text-emerald-100/60">{t("wordVoiceWbw")}</p>}
      {audioState === "failed" && <p className="mt-1 text-center text-[0.66rem] text-amber-200">{t("wordAudioFailed")}</p>}

      {fix.heard && (
        <div className="mt-3 border-t pt-2.5" style={{ borderColor: alpha(GOLD_LIGHT, 0.2) }}>
          <p>{t("voiceHeard")}: <span lang="ar" className="font-arabic text-base text-amber-200">{fix.heard}</span></p>
          {done
            ? <p className="mt-1.5 flex items-center gap-1.5 text-emerald-300"><Check className="h-3.5 w-3.5" />{t("voiceAdded")}</p>
            : <>
                <p className="mt-1 text-emerald-100/65">{t("voiceAddHint")}</p>
                <button type="button" onClick={() => { const heard = fix.heard; if (heard) void addVariant({ ...fix, heard }).then((ok) => { if (ok) setAdded(fix.id); }); }}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full py-2 font-semibold text-emerald-950" style={{ background: "linear-gradient(135deg, #e9c46a, #f6e7b0)" }}>
                  <UserRoundPlus className="h-3.5 w-3.5" />{t("voiceAdd")}
                </button>
              </>}
        </div>
      )}
    </div>
  );
}
