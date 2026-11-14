/**
 * v45 «وضع الأطفال»: whether the app runs in Kids Mode (settings `kidsMode`, theme via `applyTypography` →
 * html[data-kids="on"]), plus the praise phrases the kids screens share.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { updateSettings, useSettings } from "@/lib/settings";

type KidsMode = { on: boolean; set: (on: boolean) => void };
const Ctx = createContext<KidsMode | null>(null);

export function KidsModeProvider({ children }: { children: ReactNode }) {
  const s = useSettings();
  const value = useMemo<KidsMode>(() => ({ on: s.kidsMode, set: (on) => void updateSettings({ kidsMode: on }) }), [s.kidsMode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Works with or without the provider (falls back to the settings). */
export function useKidsMode(): KidsMode {
  const ctx = useContext(Ctx);
  const s = useSettings();
  return ctx ?? { on: s.kidsMode, set: (on) => void updateSettings({ kidsMode: on }) };
}

/** «أحسنت يا بطل!» — encouraging praise in Arabic, German and English (others: English). */
export const PRAISE: { ar: string; de: string; en: string }[] = [
  { ar: "أحسنت يا بطل!", de: "Māschāʾ Allāh, toll gemacht!", en: "MashaAllah, well done, champion!" },
  { ar: "بارك الله فيك!", de: "Bārak Allāhu fīk – super!", en: "Barakallahu feek – amazing!" },
  { ar: "رائع! استمر هكذا", de: "Wunderbar! Mach weiter so!", en: "Wonderful! Keep it up!" },
  { ar: "نجمة جديدة لك ⭐", de: "Ein neuer Stern für dich ⭐", en: "A new star for you ⭐" },
  { ar: "ما شاء الله، حفظك رائع!", de: "Māschāʾ Allāh, dein Hifdh ist großartig!", en: "MashaAllah, your memorisation is great!" },
];
export const praiseIn = (p: { ar: string; de: string; en: string }, lang: string) => (lang === "ar" ? p.ar : lang === "de" ? p.de : p.en);
