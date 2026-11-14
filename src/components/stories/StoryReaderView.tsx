/**
 * v48 story reader: illustrated header, the read-aloud bar (play/pause, restart, speed 0.8/1/1.2) with the
 * spoken paragraph highlighted and scrolled into view, chapters, «الآيات المرتبطة بالقصة» (Sheikh audio +
 * open in the Mushaf), «العبرة والدرس المستفاد», and «المحطة التالية» to travel on step by step.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { markStoryDone, markStoryOpened, nextStory, storyLang, useStoryProgress, type Story } from "@/lib/stories";
import { NARRATION_RATES, StoryAudioNarrator, type NarrationRate, type NarratorState } from "@/lib/StoryAudioNarrator";
import { getSurahAyahs, getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { getAyahAudioUrl } from "@/lib/reciterManager";
import { sheikhAudio, stopSheikhAudio } from "@/lib/audioPlayback";
import { getSettings } from "@/lib/settings";

export type StoryLook = { card: string; soft: string; accent: string; btn: string; btnAlt: string; ink: string };
export const KIDS_LOOK: StoryLook = { card: "kd-card", soft: "kd-ink-soft", accent: "var(--kd-turquoise)", btn: "kd-btn", btnAlt: "kd-btn kd-btn-soft", ink: "var(--kd-ink)" };
export const ADULT_LOOK: StoryLook = {
  card: "rounded-2xl border border-accent/25 bg-card text-foreground shadow-sm", soft: "text-muted-foreground", accent: "var(--accent)",
  btn: "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground min-h-11",
  btnAlt: "inline-flex items-center justify-center gap-2 rounded-full border border-accent/40 px-4 py-2.5 text-sm font-semibold text-accent min-h-11", ink: "var(--foreground)",
};

export function StoryReaderView({ story, look, onBack, onOpen }: { story: Story; look: StoryLook; onBack: () => void; onOpen: (id: string) => void }) {
  const { t, language } = useI18n();
  const L = storyLang(language);
  const rtl = L === "ar";
  const progress = useStoryProgress();
  const done = !!progress.done[story.id];
  const next = nextStory(story.id);
  // what is read aloud: each chapter (title + text), then the lesson
  const paragraphs = useMemo(() => [...story.chapters.map((c) => `${c.title[L]}. ${c.text[L]}`), `${t("storiesLesson")}. ${story.lesson[L]}`], [story, L, t]);
  const [active, setActive] = useState(-1);
  const [state, setState] = useState<NarratorState>("idle");
  const [rate, setRate] = useState<NarrationRate>(() => (getSettings().kidsMode ? 0.8 : 1));
  const [noVoice, setNoVoice] = useState(false);
  const narrator = useRef<StoryAudioNarrator | null>(null);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    markStoryOpened(story.id);
    window.scrollTo({ top: 0 });
    const n = new StoryAudioNarrator(paragraphs, L, rate, { index: setActive, state: setState, done: () => markStoryDone(story.id), error: () => setNoVoice(true) });
    narrator.current = n;
    return () => { void n.stop(); stopSheikhAudio(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id, L]);
  useEffect(() => { if (active >= 0) refs.current[active]?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [active]);
  // Reaching the end of the story counts as completing the station.
  useEffect(() => {
    const el = endRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) markStoryDone(story.id); }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [story.id]);

  const toggle = () => { const n = narrator.current; if (!n) return; setNoVoice(false); if (state === "playing") void n.pause(); else void n.play(); };
  const hl = (i: number) => (active === i ? { boxShadow: `0 0 0 3px ${look.accent}`, transform: "scale(1.01)" } : undefined);
  const nextLabel = next && (next.kind === "prophet" ? t("storiesNextStop") : t("storiesNextStory")).replace("{name}", next.name[L]);

  return (
    <div className="space-y-4" dir={rtl ? "rtl" : "ltr"} lang={L} data-story={story.id}>
      <button type="button" onClick={onBack} className={cn(look.btnAlt, "!min-h-0 px-4 py-2 text-sm")} data-story-back="">{rtl ? "→" : "←"} {t("storiesBack")}</button>

      <header className={cn(look.card, "relative overflow-hidden p-5 text-center")} style={{ background: story.final ? "linear-gradient(160deg,#fff4c2,#f7c948 60%,#d99a00)" : undefined, color: story.final ? "#3b2300" : undefined }}>
        <p className="text-5xl leading-tight tracking-widest" aria-hidden="true">{story.emoji}</p>
        <h1 className={cn("mt-2 font-black leading-snug", rtl ? "font-arabic text-3xl" : "text-2xl")}>{story.name[L]}</h1>
        {!rtl && <p className="font-arabic text-lg">{story.name.ar}</p>}
        <p className={cn("mt-1 text-sm font-bold", !story.final && look.soft)}>{story.era[L]}</p>
        {done && <span className="absolute end-3 top-3 text-2xl" aria-label="⭐">⭐</span>}
      </header>

      {/* read-aloud bar */}
      <div className={cn(look.card, "sticky z-20 flex flex-wrap items-center gap-2 p-3", look === KIDS_LOOK ? "top-2" : "top-[4.75rem]")} data-narrator={state}>
        <button type="button" onClick={toggle} className={cn(look.btn, "flex-1 text-base")} data-narrator-play="">
          <span aria-hidden="true">{state === "playing" ? "⏸" : "🔊"}</span>{state === "playing" ? t("storiesPause") : t("storiesListen")}
        </button>
        <button type="button" onClick={() => { setNoVoice(false); void narrator.current?.restart(); }} className={cn(look.btnAlt, "!px-3")} aria-label={t("storiesRestart")} data-narrator-restart="">⏮</button>
        <div className="flex items-center gap-1" role="radiogroup" aria-label={t("storiesSpeed")}>
          {NARRATION_RATES.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={rate === r} onClick={() => { setRate(r); void narrator.current?.setRate(r); }} data-narrator-rate={r}
              className={cn("min-h-10 rounded-full px-2.5 text-xs font-black tabular-nums", rate === r ? "text-white" : look.soft)} style={rate === r ? { background: look.accent } : { border: "2px solid currentColor", opacity: 0.8 }}>
              <span dir="ltr">{r.toFixed(1)}x</span>
            </button>
          ))}
        </div>
        {noVoice && <p className={cn("w-full text-xs", look.soft)}>{t("storiesNoVoice")}</p>}
      </div>

      {story.chapters.map((c, i) => (
        <section key={i} ref={(el) => { refs.current[i] = el; }} className={cn(look.card, "p-5 transition-all duration-300")} style={hl(i)} data-story-chapter={i} data-active={active === i ? "" : undefined}>
          <h2 className={cn("mb-2 flex items-center gap-2 font-black", rtl ? "font-arabic text-xl" : "text-lg")}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm text-white" style={{ background: look.accent }}>{rtl ? toArabicDigits(i + 1) : i + 1}</span>{c.title[L]}
          </h2>
          <p className={cn("leading-loose", rtl ? "font-arabic text-xl" : "text-[1.05rem]")}>{c.text[L]}</p>
        </section>
      ))}

      <StoryAyat story={story} look={look} rtl={rtl} />

      <section ref={(el) => { refs.current[story.chapters.length] = el; }} className={cn(look.card, "p-5")} style={{ ...hl(story.chapters.length), background: "linear-gradient(160deg, rgba(253,230,138,.55), transparent)" }} data-story-lesson="">
        <h2 className={cn("mb-2 font-black", rtl ? "font-arabic text-xl" : "text-lg")}>💡 {t("storiesLesson")}</h2>
        <p className={cn("leading-loose", rtl ? "font-arabic text-xl" : "text-[1.05rem]")}>{story.lesson[L]}</p>
      </section>

      <div ref={endRef} className="space-y-3 pb-4">
        {next ? (
          <button type="button" onClick={() => { markStoryDone(story.id); onOpen(next.id); }} className={cn(look.btn, "w-full py-4 text-lg")} data-story-next={next.id}>
            <span className="truncate">{nextLabel}</span><span aria-hidden="true">{rtl ? "←" : "➔"}</span>
          </button>
        ) : (
          <p className={cn(look.card, "p-4 text-center font-bold")} data-story-end="">{story.kind === "prophet" ? t("storiesJourneyEnd") : t("storiesAllRead")}</p>
        )}
      </div>
    </div>
  );
}

/** «الآيات المرتبطة بالقصة»: the verses, played in the Sheikh's voice one after another, and a jump to the Mushaf. */
function StoryAyat({ story, look, rtl }: { story: Story; look: StoryLook; rtl: boolean }) {
  const { t } = useI18n();
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState<string | null>(null);
  const run = useRef(0);
  useEffect(() => {
    let live = true;
    void Promise.all(story.ayat.map(async ([s, a, b]) => {
      try {
        const st = await getSurahAyahs(s);
        return [`${s}:${a}`, st.ayahs.filter((x) => x.number >= a && x.number <= b).map((x) => `${x.text} ﴿${toArabicDigits(x.number)}﴾`).join(" ")] as const;
      } catch { return [`${s}:${a}`, ""] as const; }
    })).then((rows) => { if (live) setTexts(Object.fromEntries(rows)); });
    return () => { live = false; run.current++; stopSheikhAudio(); };
  }, [story]);

  const play = async (s: number, a: number, b: number) => {
    const key = `${s}:${a}`;
    if (playing === key) { run.current++; stopSheikhAudio(); setPlaying(null); return; }
    const id = ++run.current;
    setPlaying(key);
    for (let v = a; v <= b && id === run.current; v++) {
      try {
        const el = sheikhAudio(await getAyahAudioUrl(getSettings().reciterId, s, v));
        await new Promise<void>((res) => { el.onended = () => res(); el.onerror = () => res(); void el.play().catch(() => res()); });
      } catch { break; }
    }
    if (id === run.current) setPlaying(null);
  };
  const openMushaf = (s: number, a: number) => window.dispatchEvent(new CustomEvent("qm:open-ayah", { detail: { surah: s, ayah: a } }));

  return (
    <section className="space-y-3" data-story-ayat="">
      <h2 className={cn("px-1 font-black", rtl ? "font-arabic text-xl" : "text-lg")}>📖 {t("storiesAyat")}</h2>
      {story.ayat.map(([s, a, b]) => {
        const key = `${s}:${a}`;
        const ref = `${getSurahMeta(s)?.nameArabic ?? ""} ${toArabicDigits(a)}${b > a ? `–${toArabicDigits(b)}` : ""}`;
        return (
          <article key={key} className={cn(look.card, "space-y-3 p-4")} data-story-ayah={key}>
            <p className="font-arabic text-sm font-bold" style={{ color: look.accent }} dir="rtl">﴿ سورة {ref} ﴾</p>
            <p className="qm-flow text-[1.45rem] leading-[2.3]" dir="rtl" lang="ar" style={{ color: look.ink }}>{texts[key] || "…"}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void play(s, a, b)} className={cn(look.btn, "!min-h-10 !py-2 text-sm")} data-story-play-ayah={key}>{playing === key ? "⏹" : "🎧"} {t("storiesPlayAyat")}</button>
              <button type="button" onClick={() => openMushaf(s, a)} className={cn(look.btnAlt, "!min-h-10 !py-2 text-sm")} data-story-open-mushaf={key}>📗 {t("storiesOpenMushaf")}</button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default StoryReaderView;
