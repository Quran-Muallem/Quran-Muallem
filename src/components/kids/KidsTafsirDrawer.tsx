/**
 * v46: in Kids Mode, tapping a verse in the Mushaf opens this drawer — «تفسير مبسّط للأطفال» with the three
 * kids cards and «استمع للتفسير» — instead of the scholarly tafsir / verse menu.
 */
import { useEffect, useState } from "react";
import { getAyahAudioUrl } from "@/lib/reciterManager";
import { sheikhAudio, stopSheikhAudio } from "@/lib/audioPlayback";
import { getSettings } from "@/lib/settings";
import { X } from "lucide-react";
import { directionFor, useI18n } from "@/lib/i18n";
import { kidsTafsirFor, stopSpeaking } from "@/lib/kidsTafsir";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { KidsTafsirCards } from "@/components/kids/KidsTafsirView";

export function KidsTafsirDrawer({ surah, ayah, onClose, withSheikh = false }: { surah: number; ayah: number; onClose: () => void; withSheikh?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const listen = async () => {
    if (playing) { stopSheikhAudio(); setPlaying(false); return; }
    try {
      const el = sheikhAudio(await getAyahAudioUrl(getSettings().reciterId, surah, ayah));
      el.onended = () => setPlaying(false); el.onerror = () => setPlaying(false);
      setPlaying(true); await el.play();
    } catch { setPlaying(false); }
  };
  useEffect(() => () => stopSheikhAudio(), []);
  const { t, language } = useI18n();
  const entry = kidsTafsirFor(surah, ayah);
  const meta = getSurahMeta(surah);
  useEffect(() => () => { void stopSpeaking(); }, []);
  const ref = language === "ar" ? `سورة ${meta?.nameArabic ?? ""} • الآية ${toArabicDigits(ayah)}` : `${meta?.nameSimple ?? surah} ${surah}:${ayah}`;
  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center" dir={directionFor(language)} lang={language} data-kids-drawer={entry?.id ?? "none"}>
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 bg-black/45 animate-in fade-in" />
      <div className="relative flex max-h-[86vh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] bg-card text-foreground shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-foreground/20" aria-hidden="true" />
        <header className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-2">
          <span className="text-2xl" aria-hidden="true">🌟</span>
          <span className="min-w-0 flex-1">
            <span className="block font-arabic text-xl font-bold leading-snug">{t("kidsDrawerTitle")}</span>
            <span className="block font-arabic text-sm text-muted-foreground">{ref}</span>
          </span>
          <button type="button" onClick={onClose} aria-label={t("close")} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/10" data-kids-drawer-close=""><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {withSheikh && (
            <button type="button" onClick={() => void listen()} data-kids-sheikh={playing ? "playing" : "idle"}
              className="kd-btn kd-btn-mango mb-3 w-full text-lg">{playing ? "⏹" : "🎧"} {t("kidsListenSheikh")}</button>
          )}
          {entry ? <KidsTafsirCards entry={entry} /> : (
            <div className="qm-native-colors my-4 rounded-[20px] bg-amber-100 p-5 text-center text-amber-950" data-kids-no-tafsir="">
              <p className="text-4xl" aria-hidden="true">📚</p>
              <p className="mt-2 font-arabic text-lg leading-loose">{t("kidsNoTafsir")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KidsTafsirDrawer;
