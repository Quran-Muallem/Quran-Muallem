import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpenCheck, ChevronDown, Loader2, Search, Star, Volume2, X } from "lucide-react";
import { GOLD, GOLD_GRADIENT, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { TAJWEED, searchTajweed, type TajweedCategory, type TajweedExample, type TajweedRule } from "@/data/tajweedData";
import { toArabicDigits } from "@/lib/quranService";
import { useI18n } from "@/lib/i18n";
import { getReciter } from "@/lib/reciterManager";
import { useSettings } from "@/lib/settings";
import { TAJWEED_VOICES, exampleRef, getExampleSource, playExample, setExampleSource, stopExample, tajweedVoice, type ExampleVoice, type TajweedVoice, type TajweedVoiceId } from "@/lib/tajweedAudio";
import { cn } from "@/lib/utils";

type Filter = "all" | "favorites" | TajweedCategory["id"];

const FAV_KEY = "qm.tajweed.favorites";
function loadFavorites(): Set<string> {
  try { const v = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"); return new Set(Array.isArray(v) ? v.filter((x) => typeof x === "string") : []); }
  catch { return new Set(); }
}
function saveFavorites(f: ReadonlySet<string>) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...f])); } catch { /* private mode */ }
}

/** One example plays at a time in the whole guide; every chip shows whether it is the one. */
type PlayState = { key: string; phase: "loading" | "playing"; voice?: ExampleVoice } | { key: string; phase: "failed" } | null;
let playState: PlayState = null;
const listeners = new Set<(s: PlayState) => void>();
const setPlayState = (s: PlayState) => { playState = s; listeners.forEach((l) => l(s)); };
function usePlayState() {
  const [s, set] = useState<PlayState>(playState);
  useEffect(() => { listeners.add(set); return () => { listeners.delete(set); }; }, []);
  return s;
}
const exampleKey = (ruleId: string, e: TajweedExample) => `${ruleId}|${e.ar}`;

async function play(key: string, e: TajweedExample, reciterId: string): Promise<ExampleVoice | undefined> {
  if (playState && playState.key === key && playState.phase !== "failed") { stopExample(); setPlayState(null); return undefined; }
  setPlayState({ key, phase: "loading" });
  try {
    const voice = await playExample(e, reciterId, (v) => { if (playState?.key === key) setPlayState({ key, phase: "playing", voice: v }); });
    if (playState?.key === key) setPlayState(null);
    return voice;
  } catch {
    if (playState?.key === key) setPlayState({ key, phase: "failed" });
    return undefined;
  }
}

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
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const toggleFavorite = (id: string) => setFavorites((f) => { const n = new Set(f); if (n.has(id)) n.delete(id); else n.add(id); saveFavorites(n); return n; });
  // Leaving the guide stops an example that is still playing.
  useEffect(() => () => { stopExample(); setPlayState(null); }, []);
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));

  const searching = query.trim().length > 0;
  const groups = useMemo(() => {
    const source = filter === "all" ? TAJWEED
      : filter === "favorites" ? TAJWEED.map((c) => ({ ...c, rules: c.rules.filter((r) => favorites.has(r.id)) })).filter((c) => c.rules.length > 0)
      : TAJWEED.filter((c) => c.id === filter);
    return searchTajweed(query, source);
  }, [query, filter, favorites]);
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
        {(["all", "favorites", ...TAJWEED.map((c) => c.id)] as Filter[]).map((id) => {
          const c = TAJWEED.find((x) => x.id === id);
          const on = filter === id;
          return (
            <button key={id} type="button" role="tab" aria-selected={on} onClick={() => setFilter(id)}
              className={cn("shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition", on ? "font-semibold text-emerald-950" : "text-emerald-100/80 hover:bg-white/5")}
              style={on ? { background: GOLD_GRADIENT } : { boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.4)}` }}>
              {c ? (language === "ar" ? c.titleAr : c.titleEn) : id === "favorites"
                ? <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" fill="currentColor" />{t("tajweedFavorites")}{favorites.size > 0 && ` (${num(favorites.size)})`}</span>
                : t("tajweedAll")}
            </button>
          );
        })}
      </div>

      <VoicePicker />

      {searching && <p className="text-xs text-emerald-100/65" aria-live="polite">{hits ? `${num(hits)} ${t("tajweedResults")}` : t("tajweedNone")}</p>}
      {filter === "favorites" && !searching && hits === 0 && <p className="rounded-2xl bg-black/20 p-4 text-center text-sm text-emerald-100/70">{t("tajweedFavNone")}</p>}

      {groups.map(({ category, rules }) => (
        <section key={category.id} className="space-y-2">
          <div className="px-1">
            <h2 className="font-arabic text-xl leading-snug" style={{ color: GOLD_LIGHT }}>{category.titleAr}</h2>
            {language === "en" && <p className="text-sm font-medium text-emerald-50">{category.titleEn}</p>}
            {!searching && <p className="mt-1 text-[0.8rem] leading-relaxed text-emerald-100/70">{language === "ar" ? category.introAr : category.introEn}</p>}
          </div>
          <ul className="space-y-2">
            {rules.map((r) => (
              <li key={r.id}><RuleCard rule={r} open={searching || open.has(r.id)} onToggle={() => toggle(r.id)}
                favorite={favorites.has(r.id)} onFavorite={() => toggleFavorite(r.id)} /></li>
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

/**
 * Which voice the examples start with: the word-by-word voice of the mistake corrections (default) or the
 * Sheikh chosen in the settings. The other one is the fallback.
 */
function VoicePicker() {
  const { t, language } = useI18n();
  const r = getReciter(useSettings().reciterId);
  const [source, setSource] = useState<TajweedVoiceId>(getExampleSource);
  const pick = (v: TajweedVoiceId) => { setExampleSource(v); setSource(v); stopExample(); setPlayState(null); };
  const name = (v: TajweedVoice) => (language === "ar" ? v.ar : v.en);
  const label = (v: TajweedVoice) =>
    v.style === "wbw" ? t("tajweedVoiceWbwChoice")
    : v.style === "selected" ? `${language === "ar" ? r.nameArabic : r.nameEnglish} (${t("tajweedVoiceSettings")})`
    : `${name(v)} — ${t(v.style === "mujawwad" ? "tajweedMujawwad" : "tajweedMurattal")}`;
  const current = tajweedVoice(source);
  const wordExact = current.style === "wbw" || current.style === "selected" || current.quranComId != null;
  return (
    <div className="space-y-1 px-1 text-xs text-emerald-100/70" data-tajweed-voice={source}>
      <label className="flex items-center gap-2">
        <span className="flex shrink-0 items-center gap-1.5"><Volume2 className="h-3.5 w-3.5 shrink-0 text-amber-200/80" />{t("tajweedVoiceOf")}:</span>
        <select value={source} onChange={(e) => pick(e.target.value as TajweedVoiceId)} aria-label={t("tajweedVoiceOf")} data-tajweed-voice-select=""
          className={cn("min-w-0 flex-1 rounded-full bg-black/30 px-3 py-1.5 text-emerald-50 focus:outline-none", language === "ar" && "font-arabic text-sm")}
          style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.55)}` }}>
          <optgroup label={t("tajweedMujawwadGroup")}>
            {TAJWEED_VOICES.filter((v) => v.style === "mujawwad" || v.style === "murattal").map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
          </optgroup>
          <optgroup label={t("tajweedOtherVoices")}>
            {TAJWEED_VOICES.filter((v) => v.style === "wbw" || v.style === "selected").map((v) => <option key={v.id} value={v.id}>{label(v)}</option>)}
          </optgroup>
        </select>
      </label>
      {!wordExact && <p className="ps-6 text-[0.68rem] text-amber-200/70" data-tajweed-verse-only="">{t("tajweedVerseOnly")}</p>}
    </div>
  );
}

function RuleCard({ rule, open, onToggle, favorite, onFavorite }: { rule: TajweedRule; open: boolean; onToggle: () => void; favorite: boolean; onFavorite: () => void }) {
  const { t, language } = useI18n();
  const ar = language === "ar";
  const points = (ar ? rule.pointsAr : rule.pointsEn) ?? [];
  const panel = `tajweed-${rule.id}`;
  return (
    <div className="overflow-hidden rounded-2xl transition" style={{ background: "linear-gradient(160deg, rgba(6,78,59,.55), rgba(2,44,34,.75))", boxShadow: `inset 0 0 0 1px ${alpha(GOLD, open ? 0.6 : 0.3)}` }}>
      <div className="flex items-center">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panel} className="flex min-w-0 flex-1 items-center gap-3 p-3.5 pe-1 text-start">
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
      <button type="button" onClick={onFavorite} aria-pressed={favorite} aria-label={t(favorite ? "tajweedFavRemove" : "tajweedFavAdd")} data-tajweed-fav={rule.id}
        className="me-2 shrink-0 rounded-full p-2 transition hover:bg-white/5" style={{ color: favorite ? GOLD_LIGHT : "rgba(209,250,229,.45)" }}>
        <Star className="h-4 w-4" fill={favorite ? "currentColor" : "none"} />
      </button>
      </div>
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
              {rule.examples.map((e) => <ExampleChip key={e.ar} ruleId={rule.id} example={e} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** An example: tap to hear it in the selected Sheikh's voice (tap again to stop). */
function ExampleChip({ ruleId, example }: { ruleId: string; example: TajweedExample }) {
  const { t, language } = useI18n();
  const { reciterId } = useSettings();
  const state = usePlayState();
  const [voice, setVoice] = useState<ExampleVoice | null>(null);
  const note = language === "ar" ? example.noteAr : example.noteEn;
  const key = exampleKey(ruleId, example);
  const mine = state?.key === key ? state : null;
  const playable = exampleRef(example) != null;
  const busy = mine?.phase === "loading" || mine?.phase === "playing";
  const onTap = async () => { const v = await play(key, example, reciterId); if (v) setVoice(v); };
  const voiceLabel = voice === "sheikh" ? t("tajweedVoiceSheikh") : voice === "wordByWord" ? t("tajweedVoiceWbw") : voice === "verse" ? t("tajweedVoiceVerse") : null;
  return (
    <button type="button" onClick={() => void onTap()} disabled={!playable} data-tajweed-example={key} data-voice={voice ?? undefined}
      aria-label={`${t("tajweedListen")}: ${example.ar}`} aria-pressed={busy}
      className="inline-flex flex-col items-center rounded-xl bg-black/25 px-3 py-1.5 transition hover:bg-black/35 active:scale-[0.98] disabled:cursor-default"
      style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, busy ? 0.75 : 0.25)}` }}>
      <span className="flex items-center gap-2">
        <span dir="rtl" lang="ar" className="font-quran text-[1.35rem] leading-[1.9] text-emerald-50">{highlight(example.ar, example.mark ?? [])}</span>
        {playable && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={busy ? { background: GOLD_GRADIENT, color: "#022c22" } : { color: GOLD_LIGHT, boxShadow: `inset 0 0 0 1px ${alpha(GOLD_LIGHT, 0.45)}` }}>
            {mine?.phase === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className={cn("h-3.5 w-3.5", mine?.phase === "playing" && "animate-pulse")} />}
          </span>
        )}
      </span>
      {note && <span className="text-[0.66rem] text-emerald-100/60">{note}</span>}
      {mine?.phase === "failed" && <span role="alert" className="text-[0.62rem] text-rose-300">{t("tajweedPlayFailed")}</span>}
      {!mine && voiceLabel && <span className="text-[0.6rem] text-amber-200/60">{voiceLabel}</span>}
    </button>
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
