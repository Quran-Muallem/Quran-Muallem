/**
 * v48 «قصص القرآن وقصص الأنبياء»: two tabs — the Prophets' journey through time and stories from the Quran —
 * and the story reader. Used in normal mode (المزيد / home) and inside the kids storybook layout.
 */
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { QURAN_STORIES, storyById, storyLang, useStoryProgress } from "@/lib/stories";
import { ProphetsJourneyView } from "@/components/stories/ProphetsJourneyView";
import { ADULT_LOOK, KIDS_LOOK, StoryReaderView } from "@/components/stories/StoryReaderView";

type Tab = "prophets" | "quran";
const TAB_KEY = "qm.stories.tab";

export function StoriesView({ kids = false }: { kids?: boolean }) {
  const { t, language } = useI18n();
  const look = kids ? KIDS_LOOK : ADULT_LOOK;
  const [tab, setTabState] = useState<Tab>(() => { try { return localStorage.getItem(TAB_KEY) === "quran" ? "quran" : "prophets"; } catch { return "prophets"; } });
  const [open, setOpen] = useState<string | null>(null);
  const setTab = (x: Tab) => { setTabState(x); try { localStorage.setItem(TAB_KEY, x); } catch { /* ignore */ } };
  const story = open ? storyById(open) : null;
  if (story) return <StoryReaderView key={story.id} story={story} look={look} onBack={() => setOpen(null)} onOpen={setOpen} />;
  const ar = language === "ar";
  return (
    <div className="space-y-4" data-stories={tab}>
      <div role="tablist" className={cn(kids ? "kd-card !rounded-full" : "rounded-full border border-accent/30 bg-card", "grid grid-cols-2 gap-1 p-1")}>
        {([["prophets", "🗺️", t("storiesJourneyTab")], ["quran", "📖", t("storiesQuranTab")]] as const).map(([id, e, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} data-stories-tab={id}
            className={cn("flex min-h-12 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-black transition", tab === id ? "text-white shadow-md" : kids ? "kd-ink-soft" : "text-muted-foreground")}
            style={tab === id ? { background: kids ? "var(--kd-turquoise)" : "var(--accent)", color: kids ? "#fff" : "var(--accent-foreground)" } : undefined}>
            <span aria-hidden="true">{e}</span><span className={cn("leading-tight", ar ? "font-arabic text-[0.95rem]" : "text-xs")}>{label}</span>
          </button>
        ))}
      </div>
      {tab === "prophets" ? <ProphetsJourneyView look={look} kids={kids} onOpen={setOpen} /> : <QuranStoriesView kids={kids} onOpen={setOpen} />}
    </div>
  );
}

const TILES = ["linear-gradient(135deg,#5eead4,#14b8a6)", "linear-gradient(135deg,#fda4af,#fb7185)", "linear-gradient(135deg,#fcd34d,#f59e0b)", "linear-gradient(135deg,#7dd3fc,#0ea5e9)", "linear-gradient(135deg,#c4b5fd,#8b5cf6)", "linear-gradient(135deg,#86efac,#22c55e)"];

/** «قصص القرآن»: the six stories as colourful cards. */
export function QuranStoriesView({ kids, onOpen }: { kids: boolean; onOpen: (id: string) => void }) {
  const { language } = useI18n();
  const L = storyLang(language);
  const p = useStoryProgress();
  return (
    <ul className="grid grid-cols-2 gap-3" dir={L === "ar" ? "rtl" : "ltr"} data-quran-stories="">
      {QURAN_STORIES.map((s, i) => (
        <li key={s.id}>
          <button type="button" onClick={() => onOpen(s.id)} data-quran-story={s.id}
            className={cn("relative flex h-full w-full flex-col items-center gap-1 p-4 text-center active:translate-y-[2px]", kids ? "text-white" : "rounded-2xl border border-accent/25 bg-card text-foreground")}
            style={kids ? { background: TILES[i % TILES.length], borderRadius: 28, borderBottom: "6px solid rgba(0,0,0,.18)" } : undefined}>
            {p.done[s.id] && <span className="absolute end-2 top-2 text-lg" aria-label="⭐">⭐</span>}
            <span className="text-4xl leading-tight" aria-hidden="true">{s.emoji}</span>
            <span className={cn("font-black leading-snug", L === "ar" ? "font-arabic text-lg" : "text-base")}>{s.name[L]}</span>
            <span className={cn("text-xs font-semibold", kids ? "opacity-90" : "text-muted-foreground")}>{s.era[L]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default StoriesView;
