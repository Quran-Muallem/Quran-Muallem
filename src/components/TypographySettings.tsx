/**
 * v45 «الخط وسهولة القراءة»: app-wide font size (85–160 %, presets S–XXL), Quran / Arabic / Latin fonts
 * with a live preview, and «تباين عالٍ». Values: settings `appFontScale`, `quranFont`, `arabicUiFont`,
 * `latinFont`, `highContrast` → `applyTypography` (root font-size + data attributes, CSS in styles.css).
 * Every font is bundled with the app (fontsource / public/fonts), so all of this works offline.
 */
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { useI18n, type CopyKey } from "@/lib/i18n";
import { toArabicDigits } from "@/lib/quranService";
import {
  FONT_SCALE_PRESETS, FONT_SCALE_RANGE, updateSettings, useSettings,
  type ArabicUiFont, type LatinFont, type QuranFont,
} from "@/lib/settings";
import { cn } from "@/lib/utils";

const QURAN_FONTS: { id: QuranFont; label: CopyKey; family: string }[] = [
  { id: "default", label: "fontQuranDefault", family: '"Amiri Quran", serif' },
  { id: "uthmani", label: "fontQuranUthmani", family: '"KFGQPC Uthmanic Hafs", serif' },
  { id: "naskh", label: "fontQuranNaskh", family: '"Noto Naskh Arabic", serif' },
  { id: "amiri", label: "fontQuranAmiri", family: '"Amiri Quran", serif' },
];
const AR_FONTS: { id: ArabicUiFont; label: CopyKey; family: string }[] = [
  { id: "default", label: "fontArDefault", family: '"Scheherazade New", serif' },
  { id: "naskh", label: "fontArNaskh", family: '"Noto Naskh Arabic", serif' },
  { id: "cairo", label: "fontArCairo", family: '"Cairo", sans-serif' },
];
const LATIN_FONTS: { id: LatinFont; label: CopyKey; family: string }[] = [
  { id: "default", label: "fontLatinDefault", family: '"Outfit", sans-serif' },
  { id: "atkinson", label: "fontLatinAtkinson", family: '"Atkinson Hyperlegible", sans-serif' },
  { id: "lexend", label: "fontLatinLexend", family: '"Lexend", sans-serif' },
  { id: "opendyslexic", label: "fontLatinDyslexic", family: '"OpenDyslexic", sans-serif' },
  { id: "inter", label: "fontLatinInter", family: '"Inter", sans-serif' },
];

const card = { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.3)}` };

function Choice<T extends string>({ title, items, value, onPick, sample, dir, attr }: {
  title: string; items: { id: T; label: CopyKey; family: string }[]; value: T; onPick: (v: T) => void; sample: string; dir: "rtl" | "ltr"; attr: string;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2" role="radiogroup" aria-label={title} data-typo-group={attr}>
      <p className="px-1 text-xs font-semibold" style={{ color: GOLD_LIGHT }}>{title}</p>
      {items.map((it) => {
        const on = value === it.id;
        return (
          <button key={it.id} type="button" role="radio" aria-checked={on} onClick={() => onPick(it.id)} data-typo-option={`${attr}:${it.id}`}
            className="flex w-full items-center gap-3 rounded-2xl bg-black/15 p-3 text-start" style={{ boxShadow: `inset 0 0 0 ${on ? 2 : 1}px ${alpha(on ? GOLD_LIGHT : GOLD, on ? 0.85 : 0.3)}` }}>
            <span dir={dir} className="w-28 shrink-0 truncate rounded-xl bg-black/25 px-2 py-1 text-center text-lg leading-loose text-emerald-50" style={{ fontFamily: it.family }}>{sample}</span>
            <span className="min-w-0 flex-1 text-sm text-emerald-50">{t(it.label)}</span>
            <span aria-hidden="true" className={cn("h-4 w-4 shrink-0 rounded-full border-2", on ? "border-amber-300 bg-amber-300" : "border-white/40")} />
          </button>
        );
      })}
    </div>
  );
}

export function TypographySettings() {
  const { t, language } = useI18n();
  const s = useSettings();
  const pct = Math.round(s.appFontScale * 100);
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const quranFamily = s.quranFont === "default" ? '"Amiri Quran", serif' : QURAN_FONTS.find((f) => f.id === s.quranFont)!.family;
  return (
    <div className="space-y-5" data-typography="">
      {/* Live preview — follows every choice at once */}
      <div className="space-y-2 rounded-2xl bg-black/20 p-4" style={{ boxShadow: `inset 0 0 0 2px ${alpha(GOLD_LIGHT, 0.6)}` }} data-typo-preview="">
        <p className="text-xs font-semibold" style={{ color: GOLD_LIGHT }}>{t("typoPreview")}</p>
        <p dir="rtl" lang="ar" className="leading-loose text-emerald-50" style={{ fontFamily: quranFamily, fontSize: `${1.6 * s.appFontScale}rem` }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</p>
        <p dir="rtl" lang="ar" className="font-arabic text-base leading-relaxed text-emerald-50">الحمد لله الذي علّم بالقلم، علّم الإنسان ما لم يعلم.</p>
        <p dir="ltr" lang="en" className="text-base leading-relaxed text-emerald-50" style={{ fontFamily: "var(--font-ui)" }}>Il1 O0 — „Lies im Namen deines Herrn.“ · Read in the name of your Lord.</p>
      </div>

      {/* App-wide font size */}
      <div className="space-y-3 rounded-2xl bg-black/15 p-3.5" style={card} data-typo-scale={pct}>
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-emerald-50">{t("typoScale")}</p>
          <span className="tabular-nums text-sm" style={{ color: GOLD_LIGHT }} dir="ltr">{num(pct)} %</span>
        </div>
        <div className="flex gap-1.5" role="radiogroup" aria-label={t("typoScale")}>
          {FONT_SCALE_PRESETS.map(([label, v]) => {
            const on = Math.abs(s.appFontScale - v) < 0.001;
            return (
              <button key={label} type="button" role="radio" aria-checked={on} onClick={() => void updateSettings({ appFontScale: v })} data-typo-preset={label}
                className={cn("flex-1 rounded-full py-1.5 text-xs font-semibold", on ? "text-emerald-950" : "text-emerald-100/80")}
                style={on ? { background: GOLD_GRADIENT } : { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` }}>{label}</button>
            );
          })}
        </div>
        <input type="range" min={FONT_SCALE_RANGE[0] * 100} max={FONT_SCALE_RANGE[1] * 100} step={5} value={pct} aria-label={t("typoScale")} data-typo-slider=""
          onChange={(e) => void updateSettings({ appFontScale: Number(e.target.value) / 100 })} className="w-full accent-amber-400" />
        <p className="text-xs leading-relaxed text-emerald-100/60">{t("typoScaleDesc")}</p>
      </div>

      <Choice title={t("typoQuranFont")} items={QURAN_FONTS} value={s.quranFont} onPick={(v) => void updateSettings({ quranFont: v })} sample="ٱلْحَمْدُ لِلَّهِ" dir="rtl" attr="quran" />
      <Choice title={t("typoArabicFont")} items={AR_FONTS} value={s.arabicUiFont} onPick={(v) => void updateSettings({ arabicUiFont: v })} sample="تفسير ميسّر" dir="rtl" attr="arabic" />
      <Choice title={t("typoLatinFont")} items={LATIN_FONTS} value={s.latinFont} onPick={(v) => void updateSettings({ latinFont: v })} sample="Il1 O0 Aa" dir="ltr" attr="latin" />

      <label className="flex items-start gap-3 rounded-2xl bg-black/15 p-3.5" style={card} data-typo-contrast={s.highContrast ? "on" : "off"}>
        <span className="flex-1">
          <span className="block text-sm text-emerald-50">{t("typoContrast")}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-emerald-100/60">{t("typoContrastDesc")}</span>
        </span>
        <input type="checkbox" role="switch" checked={s.highContrast} onChange={(e) => void updateSettings({ highContrast: e.target.checked })} className="peer sr-only" />
        <span aria-hidden="true" className={cn("relative mt-1 h-6 w-11 shrink-0 rounded-full transition", s.highContrast ? "bg-amber-400" : "bg-white/20")}>
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", s.highContrast ? "start-[1.375rem]" : "start-0.5")} />
        </span>
      </label>
    </div>
  );
}

export default TypographySettings;
