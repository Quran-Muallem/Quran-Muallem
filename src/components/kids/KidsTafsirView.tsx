/**
 * v45 «تفسير وقصص الآيات» for children: groups (al-Fātiḥah, Āyat al-Kursī, al-Kahf, Juz Tabārak, Juz ʿAmma)
 * → an entry → three bite-sized cards (ماذا تقول الآية؟ · قصة أو مثال من حياتنا · ماذا نتعلم ونطبق اليوم؟),
 * each with «استمع للتفسير» (text-to-speech). Text in Arabic, German or English (others: English).
 */
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Square, Volume2 } from "lucide-react";
import { useI18n, type CopyKey } from "@/lib/i18n";
import { isRtl } from "@/i18n";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { KIDS_GROUPS, kidsLang, speak, stopSpeaking, type KidsTafsirEntry } from "@/lib/kidsTafsir";
import { cn } from "@/lib/utils";

const GROUP_KEY: Record<string, CopyKey> = { fatiha: "kidsGroupFatiha", kursi: "kidsGroupKursi", kahf: "kidsGroupKahf", tabarak: "kidsGroupTabarak", amma: "kidsGroupAmma" };
const CARDS = [
  { k: "say", emoji: "📖", title: "kidsCardSay" },
  { k: "story", emoji: "🌱", title: "kidsCardStory" },
  { k: "deed", emoji: "⭐", title: "kidsCardDeed" },
] as const;
const CARD_BG = ["bg-emerald-100/90 text-emerald-950", "bg-amber-100/90 text-amber-950", "bg-sky-100/90 text-sky-950"];

export function KidsTafsirView() {
  const { t, language } = useI18n();
  const L = kidsLang(language);
  const rtl = L === "ar";
  const [open, setOpen] = useState<KidsTafsirEntry | null>(null);
  useEffect(() => () => { void stopSpeaking(); }, []);
  const Back = isRtl(language) ? ChevronRight : ChevronLeft;

  if (open) {
    return (
      <div className="space-y-4" data-kids-tafsir-entry={open.id}>
        <button type="button" onClick={() => { void stopSpeaking(); setOpen(null); }} className="flex items-center gap-1 text-sm text-amber-200">
          <Back className="h-4 w-4" />{t("kidsTafsirTitle")}
        </button>
        <KidsTafsirCards entry={open} />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-kids-tafsir="">
      <p className="text-sm leading-relaxed text-emerald-100/70">{t("kidsTafsirSub")}</p>
      {KIDS_GROUPS.map((g) => (
        <section key={g.id} className="space-y-2" data-kids-group={g.id}>
          <h2 className="px-1 text-base font-bold text-amber-200">{t(GROUP_KEY[g.id]!)}</h2>
          <ul className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-3">
            {g.entries.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => { setOpen(e); window.scrollTo({ top: 0 }); }} data-kids-entry={e.id}
                  className="qm-native-colors flex h-full w-full flex-col items-center gap-1 rounded-[20px] bg-gradient-to-b from-emerald-50 to-emerald-100 p-3 text-center text-emerald-950 shadow-md active:scale-[.98]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-300 text-sm font-bold text-amber-950" aria-hidden="true">{language === "ar" ? toArabicDigits(e.surah) : e.surah}</span>
                  <span className="font-arabic text-lg leading-snug">{e.title.ar}</span>
                  {!rtl && <span className="text-xs opacity-75">{e.title[L]}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The three kids cards for one entry (header + «ماذا تقول الآية؟» / «قصة» / «عمل اليوم»), each with read-aloud. */
export function KidsTafsirCards({ entry: open }: { entry: KidsTafsirEntry }) {
  const { t, language } = useI18n();
  const L = kidsLang(language);
  const rtl = L === "ar";
  const [speaking, setSpeaking] = useState<string | null>(null);
  useEffect(() => () => { void stopSpeaking(); }, []);
  const read = async (id: string, text: string) => {
    if (speaking === id) { await stopSpeaking(); setSpeaking(null); return; }
    setSpeaking(id);
    try { await speak(text, L); } catch { /* no voice on this device */ }
    setSpeaking((s) => (s === id ? null : s));
  };
  const meta = getSurahMeta(open.surah);
  return (
    <div className="space-y-4">
      <header className="qm-native-colors rounded-[20px] bg-gradient-to-br from-amber-200 to-amber-400 p-5 text-center text-amber-950 shadow-lg">
        <p className="font-arabic text-3xl leading-snug">{open.ayah ? (open.id === "kursi" ? "آية الكرسي" : `سورة ${meta?.nameArabic ?? ""}`) : `سورة ${meta?.nameArabic ?? ""}`}</p>
        {!rtl && <p className="mt-1 text-base font-semibold">{open.title[L]}</p>}
        {open.ayah && open.id !== "kursi" && <p className="mt-1 font-arabic text-sm opacity-80">{rtl ? open.title.ar : `${open.surah}:${open.ayah}`}</p>}
      </header>
      {CARDS.map((c, i) => {
        const text = open[c.k][L];
        const id = `${open.id}:${c.k}`;
        return (
          <section key={c.k} className={cn("qm-native-colors rounded-[20px] p-5 shadow-md", CARD_BG[i])} dir={rtl ? "rtl" : "ltr"} data-kids-card={c.k}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-3xl" aria-hidden="true">{c.emoji}</span>
              <h2 className={cn("flex-1 font-bold", rtl ? "font-arabic text-xl" : "text-lg")}>{t(c.title)}</h2>
              <button type="button" onClick={() => void read(id, text)} aria-label={t("kidsReadAloud")} data-kids-read={c.k}
                className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-2 text-sm font-semibold shadow-sm active:scale-95">
                {speaking === id ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}<span className="hidden min-[380px]:inline">{t("kidsReadAloud")}</span>
              </button>
            </div>
            <p className={cn("leading-loose", rtl ? "font-arabic text-xl" : "text-lg")}>{text}</p>
          </section>
        );
      })}
      <p className="px-2 text-center text-xs leading-relaxed text-emerald-100/60">{t("kidsTafsirNote")}</p>
    </div>
  );
}

export default KidsTafsirView;
