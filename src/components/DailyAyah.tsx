import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, Pause, Play, RefreshCw, Share2 } from "lucide-react";
import { Star } from "@/components/ornaments";
import { StarLattice, useAyahPlayer } from "@/components/HomeActionCards";
import { ayahOfTheDay, type AyahRef } from "@/lib/dailyAyah";
import { loadMushaf } from "@/lib/mushafData";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { shareNative, copyText } from "@/lib/invite";
import { APP_NAME } from "@/lib/assets";
import { useI18n } from "@/lib/i18n";

/** "Ayah of the day" for encouragement: a new verse each day, another one on tap. */
export function DailyAyah({ onOpen }: { onOpen: (ref: AyahRef) => void }) {
  const { t, language } = useI18n();
  const [offset, setOffset] = useState(0);
  const player = useAyahPlayer();
  const [verses, setVerses] = useState<{ n: number; text: string }[] | null>(null);
  const ref = ayahOfTheDay(undefined, offset);
  const meta = getSurahMeta(ref.surah);

  useEffect(() => {
    let alive = true;
    setVerses(null);
    loadMushaf()
      .then((m) => { if (alive) setVerses(Array.from({ length: ref.to - ref.from + 1 }, (_, i) => ({ n: ref.from + i, text: m.words(ref.surah, ref.from + i).join(" ") }))); })
      .catch(() => { if (alive) setVerses([]); });
    return () => { alive = false; };
  }, [ref.surah, ref.from, ref.to]);

  const label = `${t("surah")} ${language === "ar" ? meta?.nameArabic : meta?.nameSimple} • ${t("verse")} ${language === "ar" ? toArabicDigits(ref.from) : ref.from}${ref.to > ref.from ? `–${language === "ar" ? toArabicDigits(ref.to) : ref.to}` : ""}`;
  const plain = verses?.map((v) => `${v.text} ﴿${toArabicDigits(v.n)}﴾`).join(" ") ?? "";

  const playing = player.playing === "daily";
  return (
    <section className="sx-card relative overflow-hidden p-5" data-daily-ayah="">
      <StarLattice id="sx-daily-lattice" opacity={0.04} />
      <div className="relative">
        <p className="flex items-center gap-2 text-[0.95rem] font-bold" style={{ color: "var(--sx-gold-soft)" }}><Star className="h-4 w-4" />{t("homeAyahReflect")}</p>
        <p dir="rtl" lang="ar" className="mt-3 min-h-[4.5rem] text-center font-quran text-[1.5rem] leading-[2.3] sx-ink">
          {verses === null ? "…" : verses.length === 0 ? "" : verses.map((v) => (
            <span key={v.n}>{v.text} <span className="whitespace-nowrap text-[0.85em]" style={{ color: "var(--sx-gold)" }}>﴿{toArabicDigits(v.n)}﴾</span> </span>
          ))}
        </p>
        <p className="mt-1 text-center text-[0.9rem] font-semibold sx-ink-soft">{label}</p>
        <p className="mx-auto mt-2.5 max-w-[30ch] text-center text-[0.95rem] italic leading-relaxed sx-ink-soft">{t("homeReflectPrompt")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" data-daily-listen="" onClick={() => (playing ? player.stop() : player.play("daily", ref.surah, ref.from, ref.to))}
            className="qm-native-colors sx-press flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-[1rem] font-extrabold text-white transition" style={{ background: "linear-gradient(135deg,#0f5132,#1d7b59)" }}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}{playing ? t("homePause") : t("homeListen")}
          </button>
          <button type="button" data-daily-share="" onClick={async () => { const txt = `${plain}\n[${label}]\n— ${APP_NAME}`; if (!(await shareNative(txt, ""))) await copyText(txt); }}
            className="sx-press sx-chip sx-ink flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-[1rem] font-bold transition">
            <Share2 className="h-5 w-5" />{t("dailyAyahShare")}
          </button>
        </div>
        <div className="mt-2 flex justify-center gap-1">
          <IconBtn label={t("dailyAyahAnother")} onClick={() => setOffset((o) => o + 1 + Math.floor(Math.random() * 7))}><RefreshCw className="h-4 w-4" /></IconBtn>
          <IconBtn label={t("openInMushaf")} onClick={() => onOpen(ref)}><BookOpen className="h-4 w-4" /></IconBtn>
        </div>
      </div>
    </section>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[0.9rem] font-semibold sx-ink-soft">
      {children}<span>{label}</span>
    </button>
  );
}

export default DailyAyah;
