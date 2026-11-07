import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, RefreshCw, Share2 } from "lucide-react";
import { GoldFrame, GOLD_LIGHT, Star } from "@/components/ornaments";
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

  const label = `${t("surah")} ${language === "ar" ? meta?.nameArabic : meta?.nameSimple} · ${language === "ar" ? toArabicDigits(ref.from) : ref.from}${ref.to > ref.from ? `–${language === "ar" ? toArabicDigits(ref.to) : ref.to}` : ""}`;
  const plain = verses?.map((v) => `${v.text} ﴿${toArabicDigits(v.n)}﴾`).join(" ") ?? "";

  return (
    <GoldFrame className="shadow-[0_0_40px_-16px_rgba(251,191,36,.5)]">
      <div className="p-5">
        <p className="flex items-center gap-2 text-xs font-medium" style={{ color: GOLD_LIGHT }}><Star className="h-4 w-4" />{t("dailyAyahTitle")}</p>
        <p dir="rtl" lang="ar" className="mt-3 min-h-[4.5rem] text-center font-quran text-[1.45rem] leading-[2.3] text-emerald-50">
          {verses === null ? "…" : verses.length === 0 ? "" : verses.map((v) => (
            <span key={v.n}>{v.text} <span className="whitespace-nowrap text-[0.85em]" style={{ color: GOLD_LIGHT }}>﴿{toArabicDigits(v.n)}﴾</span> </span>
          ))}
        </p>
        <p className="mt-1 text-center text-xs text-emerald-100/65">{label}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <IconBtn label={t("dailyAyahAnother")} onClick={() => setOffset((o) => o + 1 + Math.floor(Math.random() * 7))}><RefreshCw className="h-4 w-4" /></IconBtn>
          <IconBtn label={t("openInMushaf")} onClick={() => onOpen(ref)}><BookOpen className="h-4 w-4" /></IconBtn>
          <IconBtn label={t("dailyAyahShare")} onClick={async () => { const txt = `${plain}\n[${label}]\n— ${APP_NAME}`; if (!(await shareNative(txt, ""))) await copyText(txt); }}><Share2 className="h-4 w-4" /></IconBtn>
        </div>
      </div>
    </GoldFrame>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-300/40 px-3 text-xs text-amber-100 hover:bg-black/20">
      {children}<span className="hidden min-[380px]:inline">{label}</span>
    </button>
  );
}

export default DailyAyah;
