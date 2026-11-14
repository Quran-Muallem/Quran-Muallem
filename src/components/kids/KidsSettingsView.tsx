/**
 * v47 «إعدادات الأطفال» — the child-locked settings. In Kids Mode this REPLACES the full settings screen and
 * offers only: Quran appearance (font + verse size), app appearance (three kids themes), language
 * (العربية / Deutsch / English) and the Kids Mode switch. Everything that could change the parents' data
 * (progress reset, reciter cache, sensor calibration, account) is simply not reachable from here.
 */
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { QURAN_FONT_SIZES, updateSettings, useSettings, type KidsTheme, type QuranFont } from "@/lib/settings";
import { chooseLanguage } from "@/components/LanguageSelector";
import { toArabicDigits } from "@/lib/quranService";
import type { Language } from "@/i18n";

const FONTS: { id: QuranFont; label: string }[] = [
  { id: "naskh", label: "نسخ واضح" },
  { id: "uthmani", label: "عثماني" },
  { id: "amiri", label: "أميري" },
  { id: "default", label: "الأصلي" },
];
const THEMES: { id: KidsTheme; key: "kidsThemeSky" | "kidsThemeGarden" | "kidsThemeNight"; emoji: string; bg: string; ink: string }[] = [
  { id: "sky", key: "kidsThemeSky", emoji: "☀️", bg: "linear-gradient(135deg,#e0f4ff,#7dd3fc)", ink: "#1e3a5f" },
  { id: "garden", key: "kidsThemeGarden", emoji: "🌿", bg: "linear-gradient(135deg,#e3f8ec,#6ee7b7)", ink: "#14402e" },
  { id: "night", key: "kidsThemeNight", emoji: "🌙", bg: "linear-gradient(135deg,#252f6b,#1b2350)", ink: "#fdf6e3" },
];
const LANGS: { id: Language; label: string; flag: string }[] = [
  { id: "ar", label: "العربية", flag: "🌙" },
  { id: "de", label: "Deutsch", flag: "🇩🇪" },
  { id: "en", label: "English", flag: "🇬🇧" },
];

function Section({ emoji, title, children, id }: { emoji: string; title: string; children: ReactNode; id: string }) {
  return (
    <section className="kd-card space-y-3 p-4" data-kids-setting={id}>
      <h2 className="flex items-center gap-2 text-lg font-black"><span className="text-2xl" aria-hidden="true">{emoji}</span>{title}</h2>
      {children}
    </section>
  );
}

export function KidsSettingsView({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, language } = useI18n();
  const s = useSettings();
  if (!open) return null;
  const ar = language === "ar";
  const sizes = QURAN_FONT_SIZES.filter((n) => n >= 24);
  const i = Math.max(0, sizes.indexOf(Math.max(24, s.quranFontSize) as (typeof sizes)[number]));
  const setSize = (d: number) => { const n = sizes[Math.min(sizes.length - 1, Math.max(0, (i < 0 ? 0 : i) + d))]; if (n) void updateSettings({ quranFontSize: n }); };
  return (
    <div className="kd-root fixed inset-0 z-[75] overflow-y-auto" data-kids-settings="" dir={ar ? "rtl" : "ltr"} lang={language}>
      <div className="mx-auto max-w-md space-y-4 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <h1 className={cn("flex-1 font-black", ar ? "font-arabic text-3xl" : "text-2xl")}>⚙️ {t("kidsSettings")}</h1>
          <button type="button" onClick={onClose} aria-label={t("close")} className="kd-btn kd-btn-soft h-12 w-12 !p-0 text-xl" data-kids-settings-close="">✕</button>
        </div>

        <Section id="quran" emoji="📖" title={t("kidsQuranLook")}>
          <p className="kd-quran rounded-[22px] p-3 text-center" dir="rtl" style={{ background: "var(--kd-sky)", fontSize: Math.max(24, s.quranFontSize), lineHeight: 2.1 }}>قُلْ هُوَ ٱللَّهُ أَحَدٌ</p>
          <p className="text-sm font-bold kd-ink-soft">{t("kidsFontStyle")}</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {FONTS.map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={s.quranFont === f.id} onClick={() => void updateSettings({ quranFont: f.id })}
                className={cn("kd-btn w-full font-arabic text-lg", s.quranFont === f.id ? "" : "kd-btn-soft")} data-kids-font={f.id}>{f.label}</button>
            ))}
          </div>
          <p className="text-sm font-bold kd-ink-soft">{t("kidsFontSize")}</p>
          <div className="flex items-center gap-3">
            <button type="button" className="kd-btn kd-btn-coral h-14 w-16 !p-0 text-xl" onClick={() => setSize(-1)} disabled={i <= 0} data-kids-size="-"><span dir="ltr">A−</span></button>
            <span className="flex-1 text-center text-2xl font-black tabular-nums">{ar ? toArabicDigits(Math.max(24, s.quranFontSize)) : Math.max(24, s.quranFontSize)}</span>
            <button type="button" className="kd-btn h-14 w-16 !p-0 text-xl" onClick={() => setSize(1)} disabled={i >= sizes.length - 1} data-kids-size="+"><span dir="ltr">A+</span></button>
          </div>
        </Section>

        <Section id="theme" emoji="🎨" title={t("kidsAppLook")}>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {THEMES.map((th) => (
              <button key={th.id} type="button" role="radio" aria-checked={s.kidsTheme === th.id} onClick={() => void updateSettings({ kidsTheme: th.id })} data-kids-theme-pick={th.id}
                className={cn("flex flex-col items-center gap-1 p-3 text-center text-sm font-black", s.kidsTheme === th.id && "ring-4 ring-[var(--kd-mango)]")}
                style={{ background: th.bg, color: th.ink, borderRadius: 22, borderBottom: "5px solid rgba(0,0,0,.18)" }}>
                <span className="text-3xl" aria-hidden="true">{th.emoji}</span><span className="font-arabic leading-tight">{t(th.key)}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section id="language" emoji="🌍" title={t("languageTitle")}>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {LANGS.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={language === l.id} onClick={() => void chooseLanguage(l.id)} data-kids-lang={l.id}
                className={cn("kd-btn w-full flex-col !gap-0 px-2 text-base", language === l.id ? "kd-btn-mango" : "kd-btn-soft")}>
                <span className="text-2xl" aria-hidden="true">{l.flag}</span><span>{l.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section id="kids" emoji="🧒" title={ar ? "وضع الأطفال" : t("setKids")}>
          <button type="button" role="switch" aria-checked={s.kidsMode} onClick={() => { void updateSettings({ kidsMode: !s.kidsMode }); onClose(); }} data-kids-exit=""
            className="kd-btn kd-btn-soft w-full justify-between text-base">
            <span>{ar ? "وضع الأطفال مفعّل" : t("setKidsMode")}</span>
            <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full" style={{ background: s.kidsMode ? "var(--kd-turquoise)" : "var(--kd-edge)" }}>
              <span className="absolute top-1 h-5 w-5 rounded-full shadow" style={{ background: "#fff", insetInlineStart: s.kidsMode ? "1.6rem" : "0.25rem" }} />
            </span>
          </button>
          <p className="text-sm leading-relaxed kd-ink-soft">🔒 {t("kidsSettingsNote")}</p>
        </Section>
      </div>
    </div>
  );
}

export default KidsSettingsView;
