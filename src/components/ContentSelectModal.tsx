import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, Download, Loader2, Trash2, X } from "lucide-react";
import { GOLD, GOLD_LIGHT, alpha } from "@/components/ornaments";
import {
  CONTENT_LANGUAGE_NAMES, ContentLoadError, TAFSIRS, TRANSLATIONS, downloadTafsir, downloadTranslation, isDownloaded, languageOrder, removeDownload,
  type ContentKind, type ContentLanguage, type TafsirOption, type TranslationOption,
} from "@/lib/quranContent";
import { directionFor, isRtlText, useI18n } from "@/lib/i18n";
import { toArabicDigits } from "@/lib/quranService";
import { cn } from "@/lib/utils";

type Option = TranslationOption | TafsirOption;
type DlState = { status: "none" } | { status: "done" } | { status: "loading"; done: number } | { status: "error"; offline: boolean };

/**
 * Translation settings (إعدادات الترجمة) / tafsir choice: every edition grouped under its language (the app
 * language first, then Arabic and English), the chosen one ticked, and a download button per edition so it
 * also works offline.
 */
export function ContentSelectModal({ kind, open, selectedId, onSelect, onClose }: {
  kind: ContentKind; open: boolean; selectedId: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const { t, language } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const title = kind === "tr" ? t("translationSettings") : t("tafsirSettings");
  return (
    <div className="fixed inset-0 z-[70]" dir={directionFor(language)} lang={language}>
      <button type="button" aria-label={t("close")} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in" />
      <section role="dialog" aria-modal="true" aria-label={title}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-3xl pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
        style={{ background: "linear-gradient(180deg, var(--hq-emerald), var(--hq-emerald-deep))", boxShadow: `inset 0 1px 0 ${alpha(GOLD, 0.6)}` }}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-amber-200/40" aria-hidden="true" />
        <div className="flex items-center gap-2 px-4">
          <h2 className="min-w-0 flex-1 text-base font-semibold" style={{ color: GOLD_LIGHT }}>
            {title}{language !== "ar" && <span className="ms-2 font-arabic text-sm text-amber-100/70">{kind === "tr" ? "إعدادات الترجمة" : "اختيار التفسير"}</span>}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="flex h-8 w-8 items-center justify-center rounded-full text-amber-200 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3">
          <ContentSelectList kind={kind} selectedId={selectedId} onSelect={(id) => { onSelect(id); onClose(); }} stickyBg="var(--hq-emerald)" />
        </div>
      </section>
    </div>
  );
}

/**
 * The list itself (v30): also shown directly inside a settings page — a fixed overlay opened from inside the
 * settings dialog was cut off by the dialog (its transform makes `fixed` relative to it).
 */
export function ContentSelectList({ kind, selectedId, onSelect, stickyBg = "var(--hq-emerald-deep)" }: {
  kind: ContentKind; selectedId: string; onSelect: (id: string) => void; stickyBg?: string;
}) {
  const { t, language } = useI18n();
  const open = true;
  const list: Option[] = kind === "tr" ? TRANSLATIONS : TAFSIRS;
  const [dl, setDl] = useState<Record<string, DlState>>({});
  const aborts = useRef(new Map<string, AbortController>());
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void Promise.all(list.map(async (o) => [o.id, await isDownloaded(kind, o.id)] as const)).then((rows) => {
      if (!alive) return;
      setDl((cur) => { const next = { ...cur }; for (const [id, done] of rows) if (!next[id] || next[id]!.status !== "loading") next[id] = { status: done ? "done" : "none" }; return next; });
    });
    return () => { alive = false; };
  }, [open, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));
  const start = (o: Option) => {
    const ctrl = new AbortController();
    aborts.current.set(o.id, ctrl);
    setDl((cur) => ({ ...cur, [o.id]: { status: "loading", done: 0 } }));
    const progress = (done: number) => setDl((cur) => ({ ...cur, [o.id]: { status: "loading", done } }));
    const run = kind === "tr" ? downloadTranslation(o as TranslationOption, progress, ctrl.signal) : downloadTafsir(o as TafsirOption, progress, ctrl.signal);
    run.then(() => setDl((cur) => ({ ...cur, [o.id]: { status: "done" } })))
      .catch((e) => setDl((cur) => ({ ...cur, [o.id]: ctrl.signal.aborted ? { status: "none" } : { status: "error", offline: e instanceof ContentLoadError && e.code === "offline" } })))
      .finally(() => aborts.current.delete(o.id));
  };
  const remove = (o: Option) => { void removeDownload(kind, o.id).then(() => setDl((cur) => ({ ...cur, [o.id]: { status: "none" } }))); };

  const groups = languageOrder(language)
    .map((l) => ({ lang: l, items: list.filter((o) => o.language === l) }))
    // German has no freely licensed tafsir: its header stays in the tafsir list with an explanation.
    .filter((g) => g.items.length || (kind === "tf" && g.lang === "de"));
  return (
    <div data-content-list={kind}>
      <p className="px-1 pb-2 text-xs leading-relaxed text-emerald-100/60">{t("contentDownloadHint")}</p>
          {groups.map((g) => (
            <section key={g.lang} className="mb-3" aria-label={CONTENT_LANGUAGE_NAMES[g.lang as ContentLanguage]}>
              <h3 dir={isRtlText(CONTENT_LANGUAGE_NAMES[g.lang]) ? "rtl" : "ltr"} style={{ background: stickyBg }} className={cn("sticky top-0 z-10 px-1 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-200/90", isRtlText(CONTENT_LANGUAGE_NAMES[g.lang]) && "font-arabic text-sm normal-case")}>
                {CONTENT_LANGUAGE_NAMES[g.lang]}
              </h3>
              {kind === "tf" && g.lang === "de" && <p className="mb-1 rounded-xl bg-black/15 px-3 py-2 text-[0.72rem] leading-relaxed text-emerald-100/70" data-german-tafsir-note="">{t("tafsirGermanNote")}</p>}
              <ul className="space-y-1">
                {g.items.map((o) => {
                  const st = dl[o.id] ?? { status: "none" };
                  const selected = o.id === selectedId;
                  return (
                    <li key={o.id} className={cn("flex items-center gap-2 rounded-xl px-2 py-1.5", selected ? "bg-amber-300/15" : "bg-black/15")}
                      style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, selected ? 0.6 : 0.18)}` }} data-content-option={o.id}>
                      <button type="button" onClick={() => onSelect(o.id)} aria-pressed={selected}
                        className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-start">
                        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-amber-300 bg-amber-300 text-emerald-950" : "border-amber-200/40")}>
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span dir={isRtlText(o.name) ? "rtl" : "ltr"} className={cn("min-w-0 flex-1 text-sm text-emerald-50", isRtlText(o.name) && "font-arabic")}>
                          {o.name}
                          {"meanings" in o && o.meanings && <span className="mt-0.5 block text-[0.66rem] text-amber-200/80" data-meanings-label="">{t("tafsirMeaningsLabel")}</span>}
                        </span>
                      </button>
                      {st.status === "done" ? (
                        <span className="flex shrink-0 items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-label={t("contentDownloaded")} />
                          <button type="button" onClick={() => remove(o)} aria-label={`${t("contentRemove")}: ${o.name}`} className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-100/50 hover:bg-white/10"><Trash2 className="h-4 w-4" /></button>
                        </span>
                      ) : st.status === "loading" ? (
                        <button type="button" onClick={() => aborts.current.get(o.id)?.abort()} aria-label={t("cancel")} className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] tabular-nums text-amber-100">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />{num(Math.round((st.done / 114) * 100))}%
                        </button>
                      ) : (
                        <button type="button" onClick={() => start(o)} aria-label={`${t("contentDownload")}: ${o.name}`} title={st.status === "error" ? t(st.offline ? "contentOffline" : "contentFailed") : t("contentDownload")}
                          className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10", st.status === "error" ? "text-red-300" : "text-amber-200")}>
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {kind === "tf" && <p className="px-1 pb-3 text-[0.7rem] leading-relaxed text-emerald-100/50">{t("tafsirMissingNote")}</p>}
    </div>
  );
}

export default ContentSelectModal;
