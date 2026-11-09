import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookOpen, Crosshair, Headphones, Languages, Mic, X } from "lucide-react";
import { GOLD, alpha } from "@/components/ornaments";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { directionFor, useI18n } from "@/lib/i18n";

export type AyahAction = "listen" | "translation" | "tafsir" | "mark" | "practiceRange";

/**
 * Small floating menu next to a tapped verse: listen (from here), translation, Tafsir Ibn Kathir,
 * mark for practice. With a practice start marked earlier in the same surah it also offers the range.
 */
export function AyahActionMenu({ surah, ayah, at, markedFrom, onAction, onClose }: {
  surah: number; ayah: number;
  /** Screen point of the tap. */
  at: { x: number; y: number };
  /** Verse marked as the start of a practice range (same surah), if any. */
  markedFrom: number | null;
  onAction: (a: AyahAction) => void;
  onClose: () => void;
}) {
  const { t, language } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, m = 8;
    const left = Math.min(Math.max(m, at.x - w / 2), vw - w - m);
    // Above the finger when there is room (the verse stays visible), otherwise below.
    const top = at.y - h - 14 >= m ? at.y - h - 14 : Math.min(at.y + 18, vh - h - m);
    setPos({ left, top });
  }, [at.x, at.y, markedFrom]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const meta = getSurahMeta(surah);
  const range = markedFrom != null && markedFrom < ayah;
  const items: { id: AyahAction; label: string; icon: typeof Headphones }[] = [
    { id: "listen", label: t("ayahListen"), icon: Headphones },
    { id: "translation", label: t("ayahTranslation"), icon: Languages },
    { id: "tafsir", label: t("ayahTafsir"), icon: BookOpen },
    range
      ? { id: "practiceRange", label: t("ayahPracticeRange").replace("{a}", num(markedFrom!)).replace("{b}", num(ayah)), icon: Mic }
      : { id: "mark", label: markedFrom === ayah ? t("ayahMarked") : t("ayahMark"), icon: Crosshair },
  ];

  return (
    <div className="fixed inset-0 z-[55]" dir={directionFor(language)} lang={language}>
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 cursor-default" />
      <div ref={box} role="menu" aria-label={`${meta?.nameSimple ?? ""} ${surah}:${ayah}`}
        className="absolute w-60 rounded-2xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, background: "linear-gradient(180deg, var(--hq-emerald), var(--hq-emerald-deep))", boxShadow: `0 18px 40px -12px rgba(0,0,0,.8), inset 0 0 0 1px ${alpha(GOLD, 0.55)}` }}>
        <div className="flex items-center gap-2 px-2 pb-1 pt-0.5">
          <p className="min-w-0 flex-1 truncate font-arabic text-xs text-amber-200/90">سُورَةُ {meta?.nameArabic} · {num(ayah)}</p>
          <button type="button" onClick={onClose} aria-label={t("close")} className="text-amber-200/80"><X className="h-3.5 w-3.5" /></button>
        </div>
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="menuitem" onClick={() => onAction(id)}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-sm text-emerald-50 hover:bg-white/10 focus:bg-white/10 focus:outline-none">
            <Icon className="h-4 w-4 shrink-0 text-amber-300" />{label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AyahActionMenu;
