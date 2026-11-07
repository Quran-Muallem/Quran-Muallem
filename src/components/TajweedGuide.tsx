import { useMemo, useState, type ReactNode } from "react";
import { BookOpenCheck, ChevronDown, Search, X } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { TAJWEED, searchTajweed, type TajweedCategory, type TajweedExample, type TajweedRule } from "@/data/tajweedData";
import { toArabicDigits } from "@/lib/quranService";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Filter = "all" | TajweedCategory["id"];

/**
 * Offline Tajweed guide (replaces the former AI chat): rules for Ḥafṣ ʿan ʿĀṣim from src/data/tajweedData.ts,
 * an instant search in Arabic or English, category filter, accordion cards with highlighted examples,
 * and a permanent note that Tafsir and Fatwas belong to qualified scholars. No network, no AI.
 */
export function TajweedGuide() {
  const { t, language } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));

  const searching = query.trim().length > 0;
  const groups = useMemo(() => searchTajweed(query, filter === "all" ? TAJWEED : TAJWEED.filter((c) => c.id === filter)), [query, filter]);
  const hits = groups.reduce((n, g) => n + g.rules.length, 0);
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-emerald-950" style={{ background: GOLD_GRADIENT }}>
          <BookOpenCheck className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-arabic text-3xl leading-snug" style={{ color: GOLD_LIGHT }}>{t("tajweedTitle")}</h1>
          <p className="text-sm text-emerald-100/70">{t("tajweedSub")}</p>
        </div>
      </header>

      <ScholarNotice />

      <label className="flex items-center gap-2 rounded-full bg-black/25 px-4 py-2.5" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.45)}` }}>
        <Search className="h-4 w-4 shrink-0 text-amber-200/80" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("tajweedSearch")} aria-label={t("tajweedSearch")}
          className="min-w-0 flex-1 bg-transparent text-sm text-emerald-50 placeholder:text-emerald-100/45 focus:outline-none [&::-webkit-search-cancel-button]:hidden" />
        {searching && (
          <button type="button" onClick={() => setQuery("")} aria-label={t("close")} className="rounded-full p-0.5 text-emerald-100/70 hover:text-emerald-50">
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t("tajweedTitle")}>
        {(["all", ...TAJWEED.map((c) => c.id)] as Filter[]).map((id) => {
          const c = TAJWEED.find((x) => x.id === id);
          const on = filter === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={on} onClick={() => setFilter(id)}
              className={cn("shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition", on ? "font-semibold text-emerald-950" : "text-emerald-100/80 hover:bg-white/5")}
              style={on ? { background: GOLD_GRADIENT } : { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` }}>
              {c ? (language === "ar" ? c.titleAr : c.titleEn) : t("tajweedAll")}
            </button>
          );
        })}
      </div>

      {searching && <p className="text-xs text-emerald-100/65" aria-live="polite">{hits ? `${num(hits)} ${t("tajweedResults")}` : t("tajweedNone")}</p>}

      {groups.map(({ category, rules }) => (
        <section key={category.id} className="space-y-2">
          <div className="px-1">
            <h2 className="font-arabic text-xl leading-snug" style={{ color: GOLD_LIGHT }}>{category.titleAr}</h2>
            {language === "en" && <p className="text-sm font-medium text-emerald-50">{category.titleEn}</p>}
            {!searching && <p className="mt-1 text-[0.8rem] leading-relaxed text-emerald-100/70">{language === "ar" ? category.introAr : category.introEn}</p>}
          </div>
          <ul className="space-y-2">
            {rules.map((r) => (
              <li key={r.id}><RuleCard rule={r} open={searching || open.has(r.id)} onToggle={() => toggle(r.id)} /></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Permanent note: educational guide; Tafsir and Fatwas belong to qualified scholars. */
export function ScholarNotice() {
  const { t } = useI18n();
  return (
    <aside role="note" className="rounded-2xl p-3.5 text-[0.8rem] leading-relaxed text-amber-50"
      style={{ background: "linear-gradient(135deg, rgba(120,53,15,.35), rgba(6,78,59,.35))", boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.55)}` }}>
      <p className="font-semibold" style={{ color: GOLD_LIGHT }}>{t("tajweedScholarTitle")}</p>
      <p className="mt-1">{t("tajweedScholar")}</p>
    </aside>
  );
}

function RuleCard({ rule, open, onToggle }: { rule: TajweedRule; open: boolean; onToggle: () => void }) {
  const { t, language } = useI18n();
  const ar = language === "ar";
  const points = (ar ? rule.pointsAr : rule.pointsEn) ?? [];
  const panel = `tajweed-${rule.id}`;
  return (
    <div className="overflow-hidden rounded-2xl transition" style={{ background: "linear-gradient(160deg, rgba(6,78,59,.55), rgba(2,44,34,.75))", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, open ? 0.6 : 0.3)}` }}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panel} className="flex w-full items-center gap-3 p-3.5 text-start">
        <span className="min-w-0 flex-1">
          <span className="block font-arabic text-lg leading-snug text-emerald-50">{rule.titleAr}</span>
          {!ar && <span className="block text-xs text-emerald-100/70">{rule.titleEn}</span>}
        </span>
        {rule.letters && (
          <span dir="rtl" lang="ar" className="max-w-[45%] truncate rounded-full px-2.5 py-1 font-arabic text-sm" style={{ color: GOLD_LIGHT, boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.45)}` }}>
            {rule.letters}
          </span>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-amber-200 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div id={panel} className="space-y-3 border-t px-3.5 pb-4 pt-3 animate-in fade-in duration-200" style={{ borderColor: alpha(GOLD, 0.25) }}>
          <p className="text-sm leading-relaxed text-emerald-50">{ar ? rule.summaryAr : rule.summaryEn}</p>
          {points.length > 0 && (
            <ul className="space-y-1.5 text-[0.82rem] leading-relaxed text-emerald-100/80">
              {points.map((p) => <li key={p} className="flex gap-2"><span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: GOLD_LIGHT }} />{p}</li>)}
            </ul>
          )}
          <div>
            <p className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-amber-200/80">{t("tajweedExamples")}</p>
            <div className="flex flex-wrap gap-2">
              {rule.examples.map((e) => <ExampleChip key={e.ar} example={e} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExampleChip({ example }: { example: TajweedExample }) {
  const { language } = useI18n();
  const note = language === "ar" ? example.noteAr : example.noteEn;
  return (
    <span className="inline-flex flex-col items-center rounded-xl bg-black/25 px-3 py-1.5" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.25)}` }}>
      <span dir="rtl" lang="ar" className="font-quran text-[1.35rem] leading-[1.9] text-emerald-50">{highlight(example.ar, example.mark ?? [])}</span>
      {note && <span className="text-[0.66rem] text-emerald-100/60">{note}</span>}
    </span>
  );
}

/** Wraps the first occurrence of each mark in a gold highlight (marks never overlap in the data). */
export function highlight(text: string, marks: readonly string[]): ReactNode[] {
  const ranges = marks
    .map((m) => ({ at: text.indexOf(m), len: m.length }))
    .filter((r) => r.at >= 0 && r.len > 0)
    .sort((a, b) => a.at - b.at);
  const out: ReactNode[] = [];
  let pos = 0;
  ranges.forEach((r, i) => {
    if (r.at < pos) return;
    if (r.at > pos) out.push(text.slice(pos, r.at));
    out.push(<mark key={i} className="rounded-sm bg-transparent" style={{ color: GOLD_LIGHT, textShadow: `0 0 10px ${alpha(GOLD_LIGHT, 0.55)}`, borderBottom: `2px solid ${alpha(GOLD_LIGHT, 0.7)}` }}>{text.slice(r.at, r.at + r.len)}</mark>);
    pos = r.at + r.len;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}
