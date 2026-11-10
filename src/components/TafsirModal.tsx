import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Languages, Loader2, RefreshCw, X } from "lucide-react";
import { ContentSelectModal } from "@/components/ContentSelectModal";
import { GOLD, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { loadMushaf, type Mushaf } from "@/lib/mushafData";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { ContentLoadError, getTafsir, getTranslation, loadTafsir, loadTranslation, type TafsirResult } from "@/lib/quranContent";
import { updateSettings, useSettings } from "@/lib/settings";
import { directionFor, isRtlText, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type AyahInfoTab = "translation" | "tafsir";
type Load<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; offline: boolean };

/**
 * Bottom sheet for one verse: the Uthmani text, its translation in the app language (translator selectable)
 * and Tafsir Ibn Kathir (app language, English abridged where no free edition exists, Arabic original on
 * request). Texts are downloaded once and then read from the device.
 */
export function TafsirModal({ open, surah, ayah, tab: initialTab, onClose, onAyah }: {
  open: boolean; surah: number; ayah: number; tab: AyahInfoTab; onClose: () => void;
  /** Previous / next verse inside the sheet. */
  onAyah: (ayah: number) => void;
}) {
  const { t, language } = useI18n();
  const settings = useSettings();
  const [tab, setTab] = useState<AyahInfoTab>(initialTab);
  const [mushaf, setMushaf] = useState<Mushaf | null>(null);
  const [picker, setPicker] = useState<"tr" | "tf" | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => { if (open) setTab(initialTab); }, [open, initialTab]);
  useEffect(() => { if (open) void loadMushaf().then(setMushaf).catch(() => {}); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const translation = getTranslation(settings.translations[language], language);
  const tafsir = getTafsir(settings.tafsirs[language], language);

  const [tr, setTr] = useState<Load<string>>({ status: "loading" });
  const [tf, setTf] = useState<Load<TafsirResult>>({ status: "loading" });
  useEffect(() => {
    if (!open || tab !== "translation") return;
    let alive = true;
    setTr({ status: "loading" });
    loadTranslation(translation.id, language, surah)
      .then((v) => alive && setTr({ status: "ready", data: v[ayah - 1] ?? "" }))
      .catch((e) => alive && setTr({ status: "error", offline: e instanceof ContentLoadError && e.code === "offline" }));
    return () => { alive = false; };
  }, [open, tab, translation.id, language, surah, ayah, retry]);
  useEffect(() => {
    if (!open || tab !== "tafsir") return;
    let alive = true;
    setTf({ status: "loading" });
    loadTafsir(tafsir.option, surah, ayah)
      .then((v) => alive && setTf({ status: "ready", data: v }))
      .catch((e) => alive && setTf({ status: "error", offline: e instanceof ContentLoadError && e.code === "offline" }));
    return () => { alive = false; };
  }, [open, tab, tafsir.option, surah, ayah, retry]);
  if (!open) return null;

  const meta = getSurahMeta(surah);
  const count = meta?.versesCount ?? ayah;
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const words = mushaf?.words(surah, ayah) ?? [];
  const failed = (offline: boolean) => (
    <div className="py-6 text-center text-sm text-emerald-100/80">
      <p>{t(offline ? "contentOffline" : "contentFailed")}</p>
      <button type="button" onClick={() => setRetry((r) => r + 1)} className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-emerald-950"><RefreshCw className="h-4 w-4" />{t("retry")}</button>
    </div>
  );
  const loading = <p className="flex items-center justify-center gap-2 py-8 text-sm text-emerald-100/70"><Loader2 className="h-4 w-4 animate-spin" />{t("contentLoading")}</p>;
  const textDir = (s: string) => (isRtlText(s) ? "rtl" : "ltr");

  return (
    <div className="fixed inset-0 z-[60]" dir={directionFor(language)} lang={language}>
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in" />
      <section role="dialog" aria-modal="true" aria-label={`${meta?.nameSimple ?? ""} ${surah}:${ayah}`}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
        style={{ background: "linear-gradient(180deg, var(--hq-emerald), var(--hq-emerald-deep))", boxShadow: `inset 0 1px 0 ${alpha(GOLD, 0.6)}` }}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-amber-200/40" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium" style={{ color: GOLD_LIGHT }}>
            <span className="font-arabic">سُورَةُ {meta?.nameArabic}</span> · {t("verse")} {num(ayah)}
          </p>
          <div className="flex items-center gap-1" dir="ltr">
            <button type="button" disabled={ayah <= 1} onClick={() => onAyah(ayah - 1)} aria-label={t("prevVerse")} className={iconBtn}><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" disabled={ayah >= count} onClick={() => onAyah(ayah + 1)} aria-label={t("nextVerse")} className={iconBtn}><ChevronRight className="h-4 w-4" /></button>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className={iconBtn}><X className="h-4 w-4" /></button>
        </div>

        {words.length > 0 && <p dir="rtl" lang="ar" className="mt-2 font-quran text-xl leading-[2.1] text-emerald-50">{words.join(" ")} <span style={{ color: GOLD_LIGHT }}>﴿{toArabicDigits(ayah)}﴾</span></p>}

        <div role="tablist" className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-black/25 p-1">
          {([["translation", "ayahTranslation", Languages], ["tafsir", "ayahTafsir", BookOpen]] as const).map(([id, key, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm transition-colors", tab === id ? "bg-amber-300 text-emerald-950" : "text-emerald-100/80")}>
              <Icon className="h-4 w-4" />{t(key)}
            </button>
          ))}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-2">
          {tab === "translation" && (
            <>
              <PickerButton label={t("translationBy")} value={translation.name} onClick={() => setPicker("tr")} />
              {tr.status === "loading" ? loading : tr.status === "error" ? failed(tr.offline) : (
                <p dir={textDir(tr.data)} className="whitespace-pre-line text-[0.95rem] leading-relaxed text-emerald-50">{tr.data || "—"}</p>
              )}
            </>
          )}
          {tab === "tafsir" && (
            <>
              <PickerButton label={t("ayahTafsir")} value={tafsir.option.name} onClick={() => setPicker("tf")} />
              {tafsir.fallback && <p className="mb-2 rounded-xl bg-black/20 px-3 py-2 text-xs leading-relaxed text-amber-100/90">{t("tafsirFallbackNote")}</p>}
              {tafsir.option.meanings && <p className="mb-2 rounded-xl bg-black/20 px-3 py-2 text-xs leading-relaxed text-amber-100/90" data-meanings-note="">{t("tafsirMeaningsNote")}</p>}
              {tf.status === "loading" ? loading : tf.status === "error" ? failed(tf.offline) : (
                <>
                  {tf.data.fromAyah !== ayah && <p className="mb-2 text-xs text-emerald-100/60">{t("tafsirGroupNote").replace("{n}", num(tf.data.fromAyah))}</p>}
                  <p dir={textDir(tf.data.text)} lang={tafsir.option.language === "ar" ? "ar" : undefined}
                    className={cn("whitespace-pre-line leading-relaxed text-emerald-50", isRtlText(tf.data.text) ? "font-arabic text-base" : "text-[0.95rem]")}>{tf.data.text}</p>
                </>
              )}
              <p className="mt-4 text-[0.7rem] leading-relaxed text-emerald-100/50">{t("tafsirScholarNote")}</p>
            </>
          )}
        </div>
      </section>
      <ContentSelectModal kind={picker ?? "tr"} open={!!picker} selectedId={picker === "tf" ? tafsir.option.id : translation.id} onClose={() => setPicker(null)}
        onSelect={(id) => void updateSettings(picker === "tf" ? { tafsirs: { ...settings.tafsirs, [language]: id } } : { translations: { ...settings.translations, [language]: id } })} />
    </div>
  );
}

/** "Translation: Bubenheim & Elyas ▾" — opens the grouped selector with downloads. */
function PickerButton({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-haspopup="dialog" data-content-picker=""
      className="mb-2 flex w-full items-center gap-2 rounded-xl border border-amber-400/40 bg-black/20 px-3 py-2 text-start">
      <span className="min-w-0 flex-1">
        <span className="block text-[0.68rem] text-emerald-100/60">{label}</span>
        <span dir={isRtlText(value) ? "rtl" : "ltr"} className={cn("block truncate text-sm text-emerald-50", isRtlText(value) && "font-arabic")}>{value}</span>
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 text-amber-200" />
    </button>
  );
}

const iconBtn = "flex h-8 w-8 items-center justify-center rounded-full text-amber-200 hover:bg-white/10 disabled:opacity-30";

export default TafsirModal;
