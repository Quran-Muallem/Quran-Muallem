import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, Headphones, Home, LayoutGrid, Loader2, PenLine, Mic, Lightbulb, RotateCcw, Search, Settings, Sparkles, Square, Target, Pause, Play } from "lucide-react";
import { VoiceWordFix, type WordFix } from "@/components/VoiceWordFix";
import { useVoiceProfile } from "@/lib/userAdaptation";
import { deferLiveMistakes, tokenVerses } from "@/lib/liveMistakes";
import { SessionReview, type ReviewItem } from "@/components/SessionReview";
import { useTajweedWords, type TajweedSeg } from "@/lib/tajweedColors";
import { useMistakeHaptics } from "@/lib/useMistakeHaptics";
import { matchLive, normalizeArabic, type LiveMatch, type LiveStatus, type WordStatus } from "@/lib/quranMatcher";
import { useSpeechRecognition, type SpeechErrorCode } from "@/lib/useSpeechRecognition";
import { useTranscribingRecorder, type TranscriptKind } from "@/lib/use-transcribing-recorder";
import { loadQuranPhonemes, matchLivePhonemes, phonemeRefs, usePhonemeLexicon } from "@/lib/quranAlignment";
import { locateRecitation, locatorIndex } from "@/lib/ayahLocator";
import { loadMushaf, TOTAL_PAGES, type Mushaf } from "@/lib/mushafData";
import { BurgerButton, MushafMenu, type AppTab } from "@/components/mushaf/MushafMenu";
import { KhatmaView } from "@/components/KhatmaView";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { startAdhanService } from "@/lib/AdhanNotificationService";
import { syncDailyReminder } from "@/lib/dailyReminder";
import { AdhanAlert } from "@/components/hub/AdhanAlert";
import { LanguageContext, directionFor, translate, useI18n, type CopyKey, type Language } from "@/lib/i18n";
import { loadLanguage } from "@/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { BadgeProvider } from "@/context/BadgeContext";
import { RecitationProvider, recitationStore, unifiedMode, useRecitationStore, useWordColors, type RecitedWord } from "@/context/RecitationContext";
import { isJudged, passageTokenKeys } from "@/lib/wordColors";
import { QuranSearchModal, type SearchTarget } from "@/components/QuranSearchModal";
import { passageFinished, practiceWordResults, tally } from "@/lib/surahCompletion";
import { SURAH_END_SILENCE_MS } from "@/lib/recordingParts";
import { setMicActive } from "@/lib/recordingActivity";
import { WelcomeModal } from "@/components/WelcomeModal";
import { SplashScreen } from "@/components/SplashScreen";
import { SettingsModal } from "@/components/SettingsModal";
import { Dashboard, type StudyTarget } from "@/components/Dashboard";
import { MushafReader } from "@/components/MushafReader";
import { IslamicHubView, type HubSection } from "@/components/IslamicHubView";
import { BadgesModal } from "@/components/badges/BadgesModal";
import { BadgeCelebration } from "@/components/badges/BadgeCelebration";
import { initBadges } from "@/lib/badges";
import { speechEngineFor, useRecognizer } from "@/lib/speechEngine";
import { ReciterSelectModal } from "@/components/ReciterSelectModal";
import { SheikhControls } from "@/components/ReciterPill";
import { useKeepAwake } from "@/lib/wakeLock";
import { InviteDialog } from "@/components/InviteDialog";
import { WhisperModelStatus } from "@/components/WhisperModelStatus";
import { GOLD_GRADIENT, GOLD_LIGHT } from "@/components/ornaments";
import { useAuth } from "@/lib/useAuth";
import { type UserSession } from "@/lib/authService";
import { DEFAULT_SETTINGS, applyTheme, getSettings, updateSettings, useSettings } from "@/lib/settings";
import { loadProgress, recordAttempt } from "@/lib/progressStorage";
import { accuracyOf, recordingForRange, saveRecording, useRecordings } from "@/lib/audioStorage";
import { RecitationPlayerBar } from "@/components/RecitationPlayerBar";
import { ayahResults } from "@/lib/practiceResults";
import { ayahMarker, toArabicDigits, type Ayah } from "@/lib/quranService";
import { useSurahList, useSurahText } from "@/lib/useQuran";
import { useAyahPlayer } from "@/lib/useAyahPlayer";
import { getReciter } from "@/lib/reciterManager";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quran Muallem - معلم القرآن · Learn Quran with the help of AI" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "مصحف المدينة، تسميع وحفظ بالذكاء الاصطناعي، عشرة قرّاء، والقبلة — مجاني ومحلي على جهازك. Mushaf, AI recitation & Hifz, 10 reciters, Qibla — free and local-first." },
      { property: "og:title", content: "Quran Muallem - معلم القرآن" },
      { property: "og:description", content: "مصحف المدينة، تسميع وحفظ بالذكاء الاصطناعي، عشرة قرّاء، والقبلة — مجاني ومحلي على جهازك." },
    ],
  }),
  component: App,
});

type Tab = AppTab;
type PracticeMode = "RECITATION_MODE" | "MEMORIZATION_MODE";
type PracticeTarget = { surahId: number; fromAyah: number; toAyah: number; mode: PracticeMode };
/** Where the Mushaf opens: a verse (and mode / words to mark); `jumpId` changes on every request. */
type MushafTarget = { surahId: number; focus?: number | undefined; mode?: PracticeMode | undefined; mark?: string[] | undefined; jumpId: number };

/** At most this many verses per practice range (keeps live matching fast on phones). */
const MAX_RANGE = 15;

export function App() {
  const settings = useSettings();
  const language = settings.language;
  useEffect(() => { void loadLanguage(language); }, [language]);
  // Adhan notifications stay planned (7 days ahead) without opening the prayer screen.
  useEffect(() => { startAdhanService(language); }, [language]);
  // «تذكيرات»: the daily wird reminder (app only), re-planned when it or the language changes.
  useEffect(() => {
    if (settings === DEFAULT_SETTINGS) return;
    void syncDailyReminder(settings.dailyReminder, settings.dailyReminderTime, { title: translate(language, "reminderTitle"), body: translate(language, "reminderBody") }).catch(() => {});
  }, [settings.dailyReminder, settings.dailyReminderTime, language]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = directionFor(language); }, [language]);
  // Apply the theme once the saved settings are loaded (until then app-main.tsx has set the saved one).
  useEffect(() => { if (settings !== DEFAULT_SETTINGS) applyTheme(settings.theme); }, [settings]);

  const [tab, setTab] = useState<Tab>("home");
  /** Open section of the Islamic hub (null = the hub's overview). */
  const [hubSection, setHubSection] = useState<HubSection | null>(null);
  const [mushaf, setMushaf] = useState<MushafTarget>({ surahId: 1, jumpId: 0 });
  const [practice, setPractice] = useState<PracticeTarget>({ surahId: 1, fromAyah: 1, toAyah: 3, mode: "RECITATION_MODE" });
  const auth = useAuth();
  const [renameOpen, setRenameOpen] = useState(false);
  // Welcome screen: on every start, and again right after signing in.
  const [splash, setSplash] = useState<{ reason: "start" | "login"; name?: string | null } | null>({ reason: "start" });
  const [settingsOpen, setSettingsOpen] = useState<"manual" | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  // Badges overview; `surah` opens that badge's details first.
  const [badgesOpen, setBadgesOpen] = useState<{ surah: number | null } | null>(null);
  useEffect(() => { void initBadges(); }, []);

  // Open the Mushaf where the user stopped last time.
  useEffect(() => {
    void loadProgress().then((p) => {
      const last = p.lastPosition;
      if (!last) return;
      setMushaf((cur) => ({ surahId: last.surahId, focus: last.ayahId, jumpId: cur.jumpId + 1 }));
      setPractice((cur) => ({ ...cur, surahId: last.surahId, fromAyah: last.ayahId, toAyah: last.ayahId + 2, mode: last.mode === "MEMORIZATION_MODE" ? "MEMORIZATION_MODE" : "RECITATION_MODE" }));
    });
  }, []);

  // Global burger menu (all screens except the Mushaf, which has its own with page controls).
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  /** Mushaf ↔ Recite: switching views opens the passage recited last in the other view (exact verses, mode). */
  const synced = useRef(0);
  const syncTo = useCallback((t: Tab) => {
    const r = recitationStore.activeRange.get();
    if (!r || r.at <= synced.current) return;
    if (t === "practice" && r.view === "mushaf") {
      synced.current = r.at;
      setPractice({ surahId: r.surah, fromAyah: r.from, toAyah: Math.min(r.to, r.from + MAX_RANGE - 1), mode: r.mode });
    } else if (t === "mushaf" && r.view === "practice") {
      synced.current = r.at;
      setMushaf((cur) => ({ surahId: r.surah, focus: r.from, mode: r.mode, jumpId: cur.jumpId + 1 }));
    }
  }, []);
  const switchTab = useCallback((t: Tab) => { syncTo(t); setTab(t); }, [syncTo]);
  // «إدارة التنزيلات» in the settings: open the reciters library.
  useEffect(() => {
    const go = () => { setHubSection("reciters" as HubSection); switchTab("hub"); };
    window.addEventListener("qm:open-reciters", go);
    return () => window.removeEventListener("qm:open-reciters", go);
  }, [switchTab]);
  const go = useCallback((t: Tab) => { if (t === "hub") setHubSection(null); switchTab(t); window.scrollTo({ top: 0 }); }, [switchTab]);
  const jump = useCallback((target: { surahId: number; focus?: number | undefined; mark?: string[] | undefined; mode?: PracticeMode | undefined }) => {
    // An explicit target wins over the last recited passage.
    synced.current = Math.max(synced.current, recitationStore.activeRange.get()?.at ?? 0);
    setMushaf((cur) => ({ ...target, jumpId: cur.jumpId + 1 }));
  }, []);
  const onSearchResult = useCallback((r: SearchTarget) => {
    jump({ surahId: r.surahId, focus: r.ayah, mark: r.words?.map((w) => `${r.surahId}:${r.ayah}:${w}`) });
    go("mushaf");
  }, [jump, go]);
  /** Opens the Mushaf at a page (Khatma "next page", menu juz / page). */
  const openPage = useCallback((page: number) => {
    void loadMushaf().then((m) => {
      const v = m.pageVerses(Math.min(TOTAL_PAGES, Math.max(1, page)))[0];
      if (v) jump({ surahId: v.surah, focus: v.ayah });
      go("mushaf");
    }).catch(() => {});
  }, [go, jump]);

  const open = useCallback((t: StudyTarget) => {
    if (t.mode === "READING") { jump({ surahId: t.surahId, focus: t.fromAyah }); setTab("mushaf"); }
    else {
      const to = Math.max(t.toAyah, Math.min(t.fromAyah + 2, t.toAyah + 2));
      synced.current = Math.max(synced.current, recitationStore.activeRange.get()?.at ?? 0);
      setPractice({ surahId: t.surahId, fromAyah: t.fromAyah, toAyah: Math.min(to, t.fromAyah + MAX_RANGE - 1), mode: t.mode });
      setTab("practice");
    }
    window.scrollTo({ top: 0 });
  }, [jump]);

  return (
    <LanguageContext.Provider value={language}><RecitationProvider><BadgeProvider>
      <div lang={language} dir={directionFor(language)} className="min-h-screen bg-background">
        <AdhanAlert />
        <div className="mx-auto flex min-h-screen max-w-md flex-col bg-hero">
          {/* Global header on every screen (the full-screen Mushaf has the same burger in its own top row) */}
          <div className={cn("sticky top-0 z-30 -mb-1 flex items-center gap-2 bg-gradient-to-b from-[var(--hq-emerald-deep)] via-[var(--hq-emerald-deep)]/90 to-transparent px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]", tab === "mushaf" && "hidden")}>
            <BurgerButton onClick={() => setMenuOpen(true)} label={translate(language, "menu")} />
            {auth.status === "signedIn" ? <AccountMenu session={auth.session} onRename={() => setRenameOpen(true)} /> : <span />}
            <span className="flex-1" />
            <TopButton onClick={() => setSearchOpen(true)} label={translate(language, "searchTitle")}><Search className="h-4 w-4" /></TopButton>
            <TopButton onClick={() => setSettingsOpen("manual")} label={translate(language, "settingsTitle")}><Settings className="h-4 w-4" /></TopButton>
            <LanguageSelector />
          </div>
          <main key={tab} className={cn("flex-1 pb-28 animate-in fade-in slide-in-from-bottom-2 duration-300", tab === "mushaf" ? "px-1.5 pb-0 pt-[max(0.5rem,env(safe-area-inset-top))]" : "px-5 pt-5")}>
            {tab === "home" && <Dashboard userName={auth.session?.provider === "guest" ? null : auth.session?.name || null} onOpen={open} onInvite={() => setInviteOpen(true)} onBadges={() => setBadgesOpen({ surah: null })} />}
            {tab === "mushaf" && (
              <MushafReader surahId={mushaf.surahId} focusAyah={mushaf.focus} focusMode={mushaf.mode} mark={mushaf.mark} jumpId={mushaf.jumpId} onPractice={open}
                onNavigate={go} onSettings={() => setSettingsOpen("manual")} onInvite={() => setInviteOpen(true)} onSearch={() => setSearchOpen(true)} />
            )}
            {tab === "practice" && <PracticeScreen target={practice} onTargetChange={setPractice} />}
            {tab === "khatma" && <KhatmaView onOpenPage={openPage} />}
            {tab === "hub" && <IslamicHubView section={hubSection} onSection={setHubSection} onRetest={open} />}
          </main>
          {/* Full-screen Mushaf: the tab bar is replaced by the burger menu */}
          {tab !== "mushaf" && <BottomNav tab={tab} setTab={go} />}
          {tab !== "mushaf" && (
            <MushafMenu open={menuOpen} onClose={() => setMenuOpen(false)} current={tab} page={1} surah={mushaf.surahId} juz={1}
              onPage={openPage} onSurah={(s2) => { jump({ surahId: s2, focus: 1 }); go("mushaf"); }}
              onJuz={(j) => { void loadMushaf().then((m) => openPage(m.juzStartPage(j))).catch(() => {}); }}
              onNavigate={go} onSettings={() => setSettingsOpen("manual")} onInvite={() => setInviteOpen(true)} onSearch={() => setSearchOpen(true)} />
          )}
          <QuranSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={onSearchResult} />
        </div>
        {/* First launch (no saved session): must choose a method. Later (guest → account): closable. */}
        <WelcomeModal open={!splash && auth.status === "signedOut"} mode="start"
          onDone={(s) => { setSplash({ reason: "login", name: s.name || null }); setTab("home"); }} />
        <WelcomeModal open={renameOpen} mode="rename" currentName={auth.session?.name ?? ""} onOpenChange={setRenameOpen} />
        {splash && (
          <SplashScreen key={splash.reason} ready={auth.status !== "loading"} minMs={splash.reason === "start" ? 2800 : 2200}
            name={splash.name} onDone={() => setSplash(null)} />
        )}
        <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
        <BadgesModal open={badgesOpen !== null} initialSurah={badgesOpen?.surah ?? null} onOpenChange={(o) => { if (!o) setBadgesOpen(null); }}
          onOpenSurah={(s) => { jump({ surahId: s, focus: 1 }); setTab("mushaf"); window.scrollTo({ top: 0 }); }} />
        {!splash && <BadgeCelebration onShowAll={(s) => setBadgesOpen({ surah: s })} />}
        <SettingsModal open={settingsOpen !== null} onOpenChange={(o) => { if (!o) setSettingsOpen(null); }} />
      </div>
    </BadgeProvider></RecitationProvider></LanguageContext.Provider>
  );
}

function TopButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <Button variant="outline" onClick={onClick} aria-label={label} className="h-10 w-10 rounded-full border-accent/40 bg-card p-0 text-accent">{children}</Button>
  );
}

function AccountMenu({ session, onRename }: { session: UserSession; onRename: () => void }) {
  const { t, language } = useI18n();
  const name = session.name.trim() || t("guest");
  const initial = (name.trim()[0] ?? "؟").toUpperCase();
  return (
    <DropdownMenu dir={directionFor(language)}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={t("account")} className="h-10 gap-2 rounded-full border-accent/40 bg-card ps-1 pe-3 text-foreground">
          <Avatar className="h-8 w-8 border border-accent/50">
            <AvatarFallback className="bg-gold font-medium text-accent-foreground">{initial}</AvatarFallback>
          </Avatar>
          <span className="max-w-[7.5rem] truncate text-sm">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-medium">{name}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("welcomeLocalNote")}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onRename} className="gap-2"><PenLine className="h-4 w-4" />{t("changeName")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { t } = useI18n();
  const items: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: "home", label: t("start"), icon: Home },
    { id: "mushaf", label: t("navMushaf"), icon: BookOpen },
    { id: "practice", label: t("navPractice"), icon: Mic },
    { id: "khatma", label: t("navKhatma"), icon: Target },
    { id: "hub", label: t("navHub"), icon: LayoutGrid },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur">
      <div className="grid grid-cols-5">
        {items.map(({ id, label, icon: Icon }) => (
          <button type="button" key={id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}
            className={cn("flex min-w-0 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[0.66rem] leading-tight transition-colors",
              tab === id ? "text-accent" : "text-muted-foreground hover:text-foreground")}>
            <Icon className="h-5 w-5" />
            <span className="max-w-full truncate">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ================================================================== */
/* Practice: dual-mode recitation with live highlighting               */
/* ================================================================== */

const speechErrorKey = (code: SpeechErrorCode | null): CopyKey | null =>
  code === "not-allowed" ? "errMic" : code === "audio-capture" ? "errNoMic" : code === "network" ? "errSpeechNetwork" : code === "unsupported" ? "errUnsupported" : code ? "errFailed" : null;

/**
 * Recitation interface. Words are matched live against the transcript (diacritics stripped for matching,
 * full Uthmani Tashkeel kept for display):
 * - RECITATION_MODE (وضع القراءة والتسميع): the text is visible and coloured green / orange / red as you recite.
 * - MEMORIZATION_MODE (وضع الحفظ والاختبار): words stay hidden (•••) and are unveiled as you recite them correctly.
 * Speech: the browser's live recognition where available, otherwise Whisper with the user's own key
 * (optionally re-transcribed every few seconds for live highlighting). A Sheikh can play along.
 */
export function PracticeScreen({ target, onTargetChange }: { target: PracticeTarget; onTargetChange: (t: PracticeTarget) => void }) {
  const { t, language } = useI18n();
  const settings = useSettings();
  const list = useSurahList();
  const text = useSurahText(target.surahId);
  const meta = list[target.surahId - 1];
  const count = text.data?.ayahs.length ?? meta?.versesCount ?? 1;
  const from = Math.min(target.fromAyah, count);
  const to = Math.min(Math.max(target.toAyah, from), count, from + MAX_RANGE - 1);
  const ayat: Ayah[] = useMemo(() => text.data?.ayahs.slice(from - 1, to) ?? [], [text.data, from, to]);
  const texts = useMemo(() => ayat.map((a) => a.text), [ayat]);
  const masked = target.mode === "MEMORIZATION_MODE";

  const speech = useSpeechRecognition({ lang: "ar-SA" });
  const { useWhisper, live } = speechEngineFor(settings, speech);
  const [whisperText, setWhisperText] = useState("");
  // Phoneme engine (Zipformer): canonical Hafs phonemes of every word, when the verse text is the Mushaf's.
  const recognizer = useRecognizer();
  const lexicon = usePhonemeLexicon();
  const [mushafWords, setMushafWords] = useState<Mushaf | null>(null);
  // Also needed for the badges (words are counted like the Mushaf in both views).
  useEffect(() => { void loadMushaf().then(setMushafWords).catch(() => {}); }, []);
  const refs = useMemo(() => {
    if (!lexicon || !mushafWords || !ayat.length) return null;
    const out: (string | null)[] = [];
    for (const a of ayat) {
      const words = mushafWords.words(target.surahId, a.number);
      if (words.join(" ") !== a.text) return null;
      out.push(...phonemeRefs(lexicon, target.surahId, a.number, words));
    }
    return out;
  }, [lexicon, mushafWords, ayat, target.surahId]);
  const [textKind, setTextKind] = useState<TranscriptKind>("text");
  const whisper = useTranscribingRecorder((txt, _final, kind) => { setWhisperText(txt); setTextKind(kind); },
    { live, keepAudio: true, engine: recognizer === "zipformer" && refs ? "zipformer" : "whisper" });
  const { stopListening, resetTranscript, startListening } = speech;

  const fullTranscript = useWhisper ? whisperText : speech.liveTranscript;
  // After an automatic jump to the recited verse the recording goes on; the new passage is judged from
  // where the matched recitation starts (phoneme characters / words of the transcript are skipped).
  const [base, setBase] = useState<{ kind: "phonemes" | "text"; pos: number } | null>(null);
  const transcript = useMemo(() => {
    if (!base) return fullTranscript;
    if (base.kind === "phonemes") return fullTranscript.slice(base.pos);
    return fullTranscript.trim().split(/\s+/).slice(base.pos).join(" ");
  }, [fullTranscript, base]);
  const profile = useVoiceProfile(); // re-judge when a word is added to the voice profile
  const match = useMemo(() => (useWhisper && textKind === "phonemes" && refs
    ? matchLivePhonemes(transcript, texts, refs, { final: !whisper.recording })
    : matchLive(transcript, texts)), [transcript, texts, profile, textKind, refs, whisper.recording]); // eslint-disable-line react-hooks/exhaustive-deps
  const listening = useWhisper ? whisper.recording : speech.isListening;
  // v38: while reciting, red / orange appear only once their verse is finished (liveMistakes.ts).
  const verseOf = useMemo(() => tokenVerses(texts), [texts]);
  const liveStatuses = useMemo(() => (listening ? deferLiveMistakes(match.statuses, verseOf, match.cursor) : match.statuses), [listening, match.statuses, match.cursor, verseOf]);
  // Word colours shared with the Mushaf (RecitationContext): a passage recited there shows the same
  // green / orange / red here; a new recitation replaces them verse by verse as the reciter reaches them.
  const colors = useWordColors();
  const tokenKeys = useMemo(() => passageTokenKeys(target.surahId, ayat, mushafWords ? (s2, a) => mushafWords.words(s2, a) : null, (tok) => !!normalizeArabic(tok)),
    [target.surahId, ayat, mushafWords]);
  // v38 «ألوان أحكام التجويد»: coloured words of the passage (a token is coloured only if its text is the word's).
  const tajweedWords = useTajweedWords(settings.tajweedColors && !!mushafWords, useMemo(() => ayat.map((a) => ({ surah: target.surahId, ayah: a.number })), [ayat, target.surahId]),
    (s2, a2) => mushafWords?.words(s2, a2).length ?? -1);
  const tokenTexts = useMemo(() => ayat.flatMap((a) => a.text.split(" ")), [ayat]);
  const tajweedOf = (i: number) => {
    const k = tokenKeys[i];
    const segs = k ? tajweedWords.get(k) : undefined;
    return segs && segs.map((x) => x.text).join("") === tokenTexts[i] ? segs : undefined;
  };
  /** Verses («s:a») whose saved colours are hidden after «إعادة» until they are recited again (v38). */
  const [cleared, setCleared] = useState<ReadonlySet<string>>(() => new Set());
  /** v38: review of the mistakes after the stop. */
  const [review, setReview] = useState<{ items: ReviewItem[]; stats: { correct: number; near: number; wrong: number } } | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  /** The last review, to open again with «مراجعة الأخطاء» after closing it. */
  const [reviewReady, setReviewReady] = useState<{ items: ReviewItem[]; stats: { correct: number; near: number; wrong: number } } | null>(null);
  const shown = useMemo((): LiveStatus[] => {
    const live = listening || match.statuses.some(isJudged);
    // Owner key of each token (a waqf sign belongs to the word before it).
    let owner: string | null = null;
    const owners = tokenKeys.map((k) => (owner = k ?? owner));
    const verse = (k: string | null) => (k ? k.slice(0, k.lastIndexOf(":")) : "");
    let reached = -1;
    if (live) { match.statuses.forEach((st, i) => { if (isJudged(st)) reached = i; }); if (listening) reached = Math.max(reached, match.cursor); }
    const liveVerses = new Set(owners.slice(0, reached + 1).map(verse));
    const bad = (st: LiveStatus) => st === "ERROR" || st === "WARNING";
    return tokenKeys.map((k, i) => {
      // «كشف الأخطاء» off → no red / orange; «تظليل الأخطاء الماضية» off → earlier mistakes not shown.
      if (live && liveVerses.has(verse(owners[i] ?? null))) { const st = liveStatuses[i] ?? "PENDING"; return !settings.errorDetection && bad(st) ? "PENDING" : st; }
      const st: LiveStatus = (k && !cleared.has(verse(k)) && colors.get(k)?.st) || "PENDING";
      return bad(st) && (!settings.showPastMistakes || !settings.errorDetection) ? "PENDING" : st;
    });
  }, [listening, match.statuses, liveStatuses, match.cursor, tokenKeys, colors, cleared, settings.errorDetection, settings.showPastMistakes]);
  // Light vibration when a word turns red/orange while reciting (recognition keeps running).
  useMistakeHaptics(liveStatuses, listening);
  const [wordFix, setWordFix] = useState<WordFix | null>(null);
  useEffect(() => { if (listening) { setWordFix(null); setReview(null); } }, [listening]);
  const tapWord = (i: number) => {
    const heard = match.heard[i] ?? (tokenKeys[i] ? colors.get(tokenKeys[i]!)?.heard : null) ?? null;
    let o = 0;
    for (const a of ayat) {
      const words = a.text.split(" ");
      if (i < o + words.length) {
        const word = words[i - o] ?? "";
        const phonemes = textKind === "phonemes" ? refs?.[i] ?? undefined : undefined;
        // Word number as Quran.com counts it: waqf signs printed as separate tokens are not words.
        const wordNo = words.slice(0, i - o + 1).filter((w) => normalizeArabic(w)).length;
        const st = shown[i];
        setWordFix(word ? { id: `${target.surahId}:${a.number}:${wordNo}`, word, heard: heard ?? null, surah: target.surahId, ayah: a.number, phonemes, status: st === "WARNING" ? "WARNING" : "ERROR" } : null);
        return;
      }
      o += words.length;
    }
  };
  const processing = useWhisper && whisper.transcribing;

  const [repeat, setRepeat] = useState(false);
  const [reciterOpen, setReciterOpen] = useState(false);
  const recordings = useRecordings();
  // The Sheikh reads on to the end of the surah (until paused / stopped); with "repeat" he loops the range.
  const player = useAyahPlayer({ reciterId: settings.reciterId, surah: target.surahId, from, to: count, repeat, repeatTo: to });
  // Screen stays on while reciting or listening.
  useKeepAwake(listening || player.playing || player.loading);

  const [saved, setSaved] = useState<{ count: number; accuracy: number } | null>(null);
  // Back from another tab: the last recitation of this passage (and its word colours) comes back.
  const store = useRecitationStore();
  const passageKey = `${target.surahId}:${from}-${to}:${target.mode}`;
  const snap = useRef(store.practice?.key === passageKey ? store.practice : null);
  const [hints, setHints] = useState<Set<number>>(() => new Set(snap.current?.hints ?? []));
  const reset = useCallback(() => { session.current = false; stopListening(); resetTranscript(); setWhisperText(""); setBase(null); whisper.cancel(); setSaved(null); setHints(new Set()); setWordFix(null); setReview(null); setReviewReady(null); }, [stopListening, resetTranscript, whisper.cancel]); // eslint-disable-line react-hooks/exhaustive-deps
  /**
   * v38 «إعادة»: start the passage again from scratch — the running recitation is dropped (nothing saved),
   * timer and score go back to 0 and the passage shows no colours (saved colours of these verses are hidden
   * until they are recited again).
   */
  const resetSession = () => { reset(); setCleared(new Set(ayat.map((a) => `${target.surahId}:${a.number}`))); };
  // One-tap hint: each tap reveals exactly one more hidden word (the next one not yet recited or shown),
  // with no limit; recording and recognition keep running. A word shown by a hint counts as "almost right".
  const giveHint = () => {
    let j = match.cursor;
    const words = ayat.flatMap((a) => a.text.split(" "));
    while (j < words.length && (hints.has(j) || match.statuses[j] === "CORRECT" || !normalizeArabic(words[j] ?? ""))) j++;
    if (j >= words.length) return;
    setHints((cur) => new Set(cur).add(j));
  };
  // Keyed by passage (not a "first run" flag): React StrictMode runs effects twice on mount.
  const viewKey = useRef<string | null>(null);
  useEffect(() => {
    const key = `${passageKey}|${useWhisper}`;
    if (viewKey.current === null) {
      viewKey.current = key;
      const s = snap.current;
      if (s && useWhisper) { setWhisperText(s.transcript); setTextKind(s.kind); }
      return;
    }
    if (viewKey.current === key) return;
    viewKey.current = key;
    // Jumped while reciting: keep recording. The passage settles in steps (new surah → its text loads →
    // the verse range is clamped), so every change shortly after the jump is part of it.
    if (Date.now() < autoJump.current) return;
    reset();
  }, [target.surahId, from, to, target.mode, useWhisper]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- auto-detect the recited verse anywhere in the Quran (like the Mushaf) ---- */
  // The passage chosen above is only a start: when the reciter recites another place from memory, ≥ 5 words
  // are matched against all 114 surahs (≥ 85 %, one unique place); the passage switches to that surah and
  // verse, the recording goes on and is judged from there, and a short note says what was recognised.
  const autoJump = useRef(0);
  const [detected, setDetected] = useState<{ surah: number; ayah: number } | null>(null);
  const locateAfter = useRef(0);
  const liveRef = useRef({ transcript, match, target, from, kind: (useWhisper && textKind === "phonemes" ? "phonemes" : "text") as "phonemes" | "text" });
  liveRef.current = { transcript, match, target, from, kind: useWhisper && textKind === "phonemes" ? "phonemes" : "text" };
  useEffect(() => {
    if (!listening || !transcript || !mushafWords) return;
    if (match.recited >= 3 && match.accuracy >= 60) return; // on track in the chosen passage
    const timer = setTimeout(() => {
      if (Date.now() < locateAfter.current) return;
      const kind = liveRef.current.kind;
      const mw = mushafWords;
      const source = kind === "phonemes"
        ? () => loadQuranPhonemes().then((l) => l.surahs)
        : async () => Array.from({ length: 114 }, (_, si) => Array.from({ length: mw.versesCount(si + 1) }, (_, ai) => mw.words(si + 1, ai + 1)));
      void locatorIndex(kind, source).then((ix) => {
        const live = liveRef.current;
        if (live.kind !== kind || (live.match.recited >= 3 && live.match.accuracy >= 60)) return;
        const hit = locateRecitation(ix, live.transcript);
        if (!hit) return;
        const same = hit.surah === live.target.surahId && hit.ayah === live.from;
        if (same && hit.startRaw === 0) return;
        locateAfter.current = Date.now() + 3000;
        setBase((cur) => ({ kind, pos: (cur?.kind === kind ? cur.pos : 0) + hit.startRaw }));
        if (!same) {
          autoJump.current = Date.now() + 8000;
          onTargetChange({ ...live.target, surahId: hit.surah, fromAyah: hit.ayah, toAyah: hit.ayah + MAX_RANGE - 1 });
          setDetected({ surah: hit.surah, ayah: hit.ayah });
        }
      }).catch(() => {});
    }, 450);
    return () => clearTimeout(timer);
  }, [transcript, listening]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!detected) return;
    const id = setTimeout(() => setDetected(null), 4000);
    return () => clearTimeout(id);
  }, [detected]);
  useEffect(() => {
    if (viewKey.current === null) return;
    store.practice = { key: passageKey, transcript: useWhisper ? whisperText : "", kind: textKind, hints: [...hints] };
  }, [store, passageKey, whisperText, textKind, hints, useWhisper]);

  // Surah completed: the passage ends with the surah's last ayah and its last word was reached →
  // microphone off, success vibration and a soft chime.
  const [surahDone, setSurahDone] = useState(false);
  const lastToken = useMemo(() => {
    if (to !== count) return -1;
    const words = ayat.flatMap((a) => a.text.split(" "));
    for (let i = words.length - 1; i >= 0; i--) if (normalizeArabic(words[i] ?? "")) return i;
    return -1;
  }, [ayat, to, count]);
  useEffect(() => { if (listening) setSurahDone(false); setMicActive(listening); }, [listening]);
  useEffect(() => () => setMicActive(false), []);
  // v29: at the surah end the microphone stays on for 2 s. Silence → the recording stops by itself (then
  // the completion sound and any new badge). The reader goes on reciting → this surah is saved as its own
  // recording and the passage moves on to the next surah, recording without a break.
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { if (!listening && silenceTimer.current) { clearTimeout(silenceTimer.current); silenceTimer.current = null; } }, [listening]);
  useEffect(() => {
    if (!listening || surahDone || !passageFinished(match.statuses, lastToken)) return;
    setSurahDone(true);
    // Same engine call as the Mushaf: silver/gold if the whole surah is done (sound once the mic is off).
    void store.finishSurah(unifiedMode(target.mode), target.surahId, practiceWordResults(target.surahId, ayat, match.statuses, mushafWords ? (s, a) => mushafWords.words(s, a) : null, unifiedMode(target.mode), hints));
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (!useWhisper) { toggleMicRef.current(); return; } // browser recognizer: no audio level to wait on
    silenceTimer.current = setTimeout(() => {
      silenceTimer.current = null;
      if (!whisperRef.current.recording) return;
      if (whisperRef.current.voicedLast(SURAH_END_SILENCE_MS / 1000 - 0.2) < 0.3 || target.surahId >= 114) { if (getSettings().autoStopSurahEnd) toggleMicRef.current(); return; }
      continueNextSurah();
    }, SURAH_END_SILENCE_MS);
  }, [listening, match.statuses, lastToken, surahDone]); // eslint-disable-line react-hooks/exhaustive-deps
  const whisperRef = useRef(whisper);
  whisperRef.current = whisper;
  /** The reader went on past the surah end: save this surah, then judge the next surah from here on. */
  const continueNextSurah = () => {
    const { match: m, ayat: a, from: f, to: tt } = latest.current;
    savePassage(m, a, f, tt, whisper.cut);
    const kind = useWhisper && textKind === "phonemes" ? "phonemes" : "text";
    const full = fullTranscript;
    setBase({ kind, pos: kind === "phonemes" ? full.length : (full.trim() ? full.trim().split(/\s+/).length : 0) });
    autoJump.current = Date.now() + 8000;
    setSurahDone(false);
    onTargetChange({ ...target, surahId: target.surahId + 1, fromAyah: 1, toAyah: MAX_RANGE });
    setDetected({ surah: target.surahId + 1, ayah: 1 });
  };

  // Save the attempt to the progress tracker when a recitation ends.
  const session = useRef(false);
  const latestHints = useRef(hints);
  latestHints.current = hints;
  const latestMushaf = useRef(mushafWords);
  latestMushaf.current = mushafWords;
  /** Canonical phonemes per token while the phoneme engine judges (for the review's diagnosis). */
  const refsRef = useRef<(string | null)[] | null>(null);
  refsRef.current = textKind === "phonemes" ? refs : null;
  const latest = useRef({ match, ayat, from, to });
  latest.current = { match, ayat, from, to };
  useEffect(() => { if (listening) { session.current = true; setSaved(null); } }, [listening]);
  useEffect(() => {
    if (listening || processing || !session.current) return;
    // Give the browser recognizer a moment to deliver its last words.
    const timer = setTimeout(() => {
      session.current = false;
      const { match: m, ayat: a, from: f, to: tt } = latest.current;
      savePassage(m, a, f, tt, whisper.takeAudio, true);
    }, useWhisper ? 0 : 900);
    return () => clearTimeout(timer);
  }, [listening, processing, target.surahId, target.mode, useWhisper]);
  /**
   * Saves a recited passage: its own recording (`take`: the rest after the stop, or a cut while the
   * microphone goes on into the next surah), progress, word colours for both views.
   */
  function savePassage(m: typeof match, a: Ayah[], f: number, tt: number, take: () => Promise<{ blob: Blob; seconds: number } | null>, final = false) {
      // Only the verses actually reached (judged words), so a part never claims verses it did not cover.
      let reachedTo = f;
      { let o = 0; a.forEach((x) => { const n = x.text.split(" ").length; if (m.statuses.slice(o, o + n).some((st) => st && st !== "PENDING")) reachedTo = x.number; o += n; }); }
      void take().then((kept) => { if (kept && getSettings().saveRecordings) void saveRecording({ surah: target.surahId, fromAyah: f, toAyah: Math.max(f, Math.min(tt, reachedTo)), ...kept, accuracy: accuracyOf(tally(m.statuses)) ?? undefined, mode: target.mode === "MEMORIZATION_MODE" ? "memorization" : "reading" }); });
      const mw = latestMushaf.current;
      store.recordWords(unifiedMode(target.mode), practiceWordResults(target.surahId, a, m.statuses, mw ? (s, x) => mw.words(s, x) : null, unifiedMode(target.mode), latestHints.current));
      // Same colours in the Mushaf; this passage becomes the one the Mushaf opens at.
      const tk = passageTokenKeys(target.surahId, a, mw ? (s, x) => mw.words(s, x) : null, (tok) => !!normalizeArabic(tok));
      const recited: RecitedWord[] = [];
      tk.forEach((key, i) => {
        if (!key) return;
        const st = m.statuses[i] ?? "PENDING";
        recited.push({ key, status: st === "CORRECT" && latestHints.current.has(i) ? "WARNING" : st, heard: m.heard[i] ?? null });
      });
      store.commitWords(recited, target.mode, "practice");
      const judgedVerses = new Set(recited.filter((r) => r.status !== "PENDING").map((r) => r.key.slice(0, r.key.lastIndexOf(":"))));
      if (judgedVerses.size) setCleared((c) => (c.size ? new Set([...c].filter((v) => !judgedVerses.has(v))) : c));
      // v38: after the stop, the review of every red / orange word (not when the passage moves on).
      if (final && getSettings().errorDetection) {
        const words = a.flatMap((x) => x.text.split(" "));
        const items: ReviewItem[] = [];
        tk.forEach((key, i) => {
          const st = m.statuses[i];
          if (!key || (st !== "ERROR" && st !== "WARNING")) return;
          items.push({ key, word: words[i] ?? "", heard: m.heard[i] ?? null, expected: refsRef.current?.[i] ?? null, status: st });
        });
        const r = items.length ? { items, stats: tally(m.statuses) } : null;
        setReview(r); setReviewReady(r);
      }
      const results = ayahResults(a, m.statuses.map((st, i): LiveStatus => (st === "CORRECT" && latestHints.current.has(i) ? "WARNING" : st)), m.done);
      if (!results.length) return;
      void recordAttempt({ surahId: target.surahId, mode: target.mode, results });
      const words = results.reduce((s, r) => s + r.totalWords, 0);
      setSaved({ count: results.length, accuracy: Math.round(results.reduce((s, r) => s + r.accuracy * r.totalWords, 0) / Math.max(1, words)) });
  }

  // Stop automatically once the whole passage was recited: browser recognizer only, on final text after a
  // short calm. Whisper (live results can be wrong) never stops by itself.
  const finalOnly = !useWhisper && speech.interimTranscript === "";
  useEffect(() => {
    if (useWhisper || !match.done || !listening || !finalOnly) return;
    const timer = setTimeout(() => stopListening(), 1500);
    return () => clearTimeout(timer);
  }, [match.done, listening, finalOnly, useWhisper, transcript, stopListening]);

  const toggleMicRef = useRef<() => void>(() => {});
  toggleMicRef.current = () => toggleMic();
  const toggleMic = () => {
    if (text.status !== "ready") return;
    if (useWhisper) { if (!whisper.recording) { setWhisperText(""); setBase(null); } whisper.toggle(); return; }
    if (speech.isListening) stopListening();
    else { if (match.done || match.recited) resetTranscript(); setBase(null); startListening(); }
  };
  // v38 «أعد الآية» / «أعد التلاوة»: once the passage has settled (its reset ran), the microphone starts.
  useEffect(() => {
    if (retryAt == null || text.status !== "ready" || listening) return;
    const id = setTimeout(() => { setRetryAt(null); toggleMicRef.current(); }, 120);
    return () => clearTimeout(id);
  }, [retryAt, text.status, passageKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const errorKey = useWhisper ? whisper.error : speechErrorKey(speech.error);
  const setRange = (f: number, tt: number) => onTargetChange({ ...target, fromAyah: f, toAyah: Math.min(Math.max(tt, f), f + MAX_RANGE - 1) });
  const num = (n: number) => (language === "ar" ? toArabicDigits(n) : String(n));

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-4">
      {/* «تم التعرف على سورة الكهف - الآية ١» — after an automatic jump to the recited verse */}
      {detected && (
        <div role="status" aria-live="polite" data-auto-detected={`${detected.surah}:${detected.ayah}`}
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-top-2"
          style={{ top: "calc(env(safe-area-inset-top) + 64px)" }}>
          <span className="rounded-full px-4 py-2 text-sm font-semibold text-emerald-950 shadow-xl" style={{ background: GOLD_GRADIENT }}>
            {t("autoDetected").replace("{surah}", (language === "ar" ? list[detected.surah - 1]?.nameArabic : list[detected.surah - 1]?.nameSimple) ?? String(detected.surah)).replace("{ayah}", num(detected.ayah))}
          </span>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-semibold">{masked ? t("hifzModeLong") : t("reciteModeLong")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{masked ? t("hifzSub") : t("reciteSub")}</p>
      </div>

      {/* Sheikh player at the top: play / pause · Sheikh (same as in the Mushaf) · repeat the range */}
      <SheikhControls reciterId={settings.reciterId} playing={player.playing} loading={player.loading} failed={player.failed}
        onToggle={() => { if (text.status === "ready") player.toggle(); }} onReciter={() => setReciterOpen(true)}
        repeat={repeat} onRepeat={() => setRepeat((r) => !r)}
        detail={player.playing ? `${t("playing")} ${num(player.ayah)}` : undefined} />

      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
        {([["RECITATION_MODE", "modeRecitation"], ["MEMORIZATION_MODE", "modeMemorization"]] as const).map(([id, key]) => (
          <button key={id} type="button" role="tab" aria-selected={target.mode === id} onClick={() => onTargetChange({ ...target, mode: id })}
            className={cn("rounded-xl py-2.5 text-sm font-medium transition-colors", target.mode === id ? "bg-gold text-accent-foreground shadow-glow" : "text-muted-foreground hover:text-foreground")}>
            {t(key)}
          </button>
        ))}
      </div>

      {/* Surah & verse range */}
      <div className="grid grid-cols-2 gap-2">
        <select aria-label={t("surah")} value={target.surahId} onChange={(e) => onTargetChange({ ...target, surahId: +e.target.value, fromAyah: 1, toAyah: 3 })}
          className="col-span-2 rounded-xl border border-input bg-card px-3 py-2.5 text-sm">
          {list.map((s) => <option key={s.id} value={s.id}>{language === "ar" ? `${toArabicDigits(s.id)}. ${s.nameArabic}` : `${s.id}. ${s.nameSimple}`}</option>)}
        </select>
        <select aria-label={t("from")} value={from} onChange={(e) => { const v = +e.target.value; setRange(v, Math.max(to, v)); }} className="rounded-xl border border-input bg-card px-3 py-2 text-sm">
          {Array.from({ length: count }, (_, i) => <option key={i} value={i + 1}>{t("verse")} {t("from")} {num(i + 1)}</option>)}
        </select>
        <select aria-label={t("to")} value={to} onChange={(e) => setRange(from, +e.target.value)} className="rounded-xl border border-input bg-card px-3 py-2 text-sm">
          {Array.from({ length: Math.min(MAX_RANGE, count - from + 1) }, (_, i) => from + i).map((n) => <option key={n} value={n}>{t("to")} {num(n)}</option>)}
        </select>
      </div>

      <LiveMetrics match={match} onReset={resetSession} />

      {/* Start / stop right above the surah title; it stays reachable (sticky) while the text scrolls along */}
      <div className={cn("-mx-1 rounded-3xl px-1 transition-colors", listening && "sticky top-[calc(max(1rem,env(safe-area-inset-top))+3.25rem)] z-20 bg-background/85 shadow-lg backdrop-blur")}>
        <MicButton recording={listening} busy={processing || text.status !== "ready"} getLevel={useWhisper ? whisper.getLevel : undefined} wave={!useWhisper} compact={listening}
          paused={useWhisper && whisper.paused} onPause={useWhisper ? () => { if (whisper.paused) whisper.resume(); else whisper.pause(); } : undefined}
          statusText={useWhisper ? (settings.whisperLive ? t("listeningWhisperLive") : t("recording")) : t("listening")} onClick={toggleMic} label={t("record")} />
      </div>

      <div className="flex flex-1 flex-col justify-center rounded-3xl border border-accent/25 bg-card/80 p-5">
        <p className="mb-3 text-center font-quran text-xl" style={{ color: GOLD_LIGHT }}>سُورَةُ {meta?.nameArabic}</p>
        {text.status === "loading" && <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("loadingSurah")}</p>}
        {text.status === "error" && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <p>{t(text.error === "offline" ? "surahOffline" : "surahFailed")}</p>
            <button type="button" onClick={text.retry} className="mt-3 rounded-full px-4 py-2 text-sm text-emerald-950" style={{ background: GOLD_GRADIENT }}>{t("retry")}</button>
          </div>
        )}
        {text.status === "ready" && (
          <LiveText ayat={ayat} statuses={shown} tajweedOf={settings.tajweedColors ? tajweedOf : undefined}
            clean={settings.mushafStyle === "clean" ? { fontSize: settings.quranFontSize } : undefined} cursor={match.cursor} masked={masked} hints={hints} active={listening} playingAyah={player.playing ? player.ayah : null}
            onWordTap={listening ? undefined : tapWord} />
        )}
        {wordFix && <VoiceWordFix fix={wordFix} onClose={() => setWordFix(null)} className="mt-3" />}
        {surahDone && !listening ? <p role="status" className="mt-4 text-center text-sm font-semibold text-success">{t("surahComplete").replace("{name}", language === "ar" ? meta?.nameArabic ?? "" : meta?.nameSimple ?? "")}</p>
          : match.done && !listening && <p className="mt-4 text-center text-sm text-success">{t("passageDone")}</p>}
      </div>

      {saved && (
        <p role="status" className="rounded-xl border border-accent/40 bg-card p-3 text-center text-sm text-accent animate-in fade-in">
          {t("attemptSaved")} · {num(saved.count)} {t("verses")} · {num(saved.accuracy)}%
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">{masked ? t("memorizeHint") : t("readAlongHint")}</p>
      {!masked && <div className="flex flex-wrap gap-2 text-xs"><Legend cls="bg-success" t={t("correct")} /><Legend cls="bg-tashkeel" t={t("warning")} /><Legend cls="bg-destructive" t={t("missing")} /></div>}
      {!listening && shown.some((st) => st === "ERROR" || st === "WARNING") && <p className="text-center text-xs text-accent">{t("voiceTapHint")}</p>}

      {player.playing && listening && <p className="flex items-center justify-center gap-2 text-xs text-accent"><Headphones className="h-3.5 w-3.5" />{t("headphonesHint")}</p>}

      {useWhisper && <WhisperModelStatus model={settings.whisperModel} compact />}
      {masked && text.status === "ready" && (
        <button type="button" onClick={giveHint} disabled={match.done}
          className="mx-auto flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-4 py-1.5 text-sm text-accent disabled:opacity-40">
          <Lightbulb className="h-4 w-4" />{t("hintShort")}{hints.size > 0 && <span className="text-accent/70"> · {num(hints.size)}</span>}
        </button>
      )}
      {/* my recording of this passage: timer · play · delete (the big microphone below records) */}
      <RecitationPlayerBar showRecord={false} recording={listening} elapsed={whisper.elapsed} onRecord={toggleMic} busy={processing}
        saved={recordingForRange(recordings, target.surahId, from, to)} canKeep={useWhisper} />
      <RecorderFeedback transcribing={processing} transcript={useWhisper && textKind === "text" ? whisper.transcript : ""} error={errorKey} />
      <p className="text-center text-xs leading-relaxed text-muted-foreground">{t("whisperPrivacy")}</p>
      {recognizer === "zipformer" && <p className="text-center text-xs leading-relaxed text-muted-foreground">{t("zfDisclaimer")}</p>}
      {review && !listening && (
        <SessionReview items={review.items} stats={review.stats} onClose={() => setReview(null)}
          onRetryVerse={(_s, a) => { setReview(null); reset(); setCleared(new Set()); setRange(a, Math.max(a, to)); setRetryAt(Date.now()); }}
          onRetryAll={() => { setReview(null); resetSession(); setRetryAt(Date.now()); }}
          onDetails={(it) => { setReview(null); const i = tokenKeys.indexOf(it.key); if (i >= 0) tapWord(i); }} />
      )}
      {!review && !listening && reviewReady && (
        <button type="button" onClick={() => setReview(reviewReady)} data-review-open="" className="mx-auto flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-4 py-1.5 text-sm text-accent">
          {t("srOpen")} · {num(reviewReady.items.length)}
        </button>
      )}
      <ReciterSelectModal open={reciterOpen} onOpenChange={setReciterOpen} selectedId={settings.reciterId} surah={target.surahId}
        onSelect={(id) => { void updateSettings({ reciterId: id }); }} />
    </div>
  );
}

function LevelMeter({ active, getLevel }: { active: boolean; getLevel: () => number }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const weights = [0.45, 0.7, 0.9, 1, 0.9, 0.7, 0.45];
    const tick = () => {
      const level = getLevel();
      bars.current.forEach((bar, i) => {
        if (bar) bar.style.transform = `scaleY(${Math.max(0.12, Math.min(1, level * (weights[i] ?? 1) * (0.85 + 0.3 * Math.random())))})`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, getLevel]);
  if (!active) return null;
  return (
    <div role="meter" aria-label="Input level" aria-valuemin={0} aria-valuemax={1} dir="ltr" className="flex h-10 items-center justify-center gap-1.5">
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} ref={(el) => { bars.current[i] = el; }} className="h-10 w-1.5 origin-center rounded-full bg-success transition-transform duration-75" style={{ transform: "scaleY(0.12)" }} />
      ))}
    </div>
  );
}

function MicButton({ recording, busy = false, onClick, label, getLevel, wave = false, statusText, compact = false, paused = false, onPause }: {
  recording: boolean; busy?: boolean; onClick: () => void; label: string; getLevel?: (() => number) | undefined; wave?: boolean; statusText?: string;
  /** Smaller while reciting, so the verses keep most of the screen. */
  compact?: boolean;
  /** Pause / resume while reciting (the session and its colours are kept). */
  paused?: boolean;
  onPause?: (() => void) | undefined;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("flex items-center", compact ? "flex-row justify-center gap-3 py-1.5" : "flex-col gap-3 py-2")}>
      <Button variant="ghost" onClick={onClick} disabled={busy} aria-label={recording ? t("stop") : label}
        className={cn("relative flex shrink-0 items-center justify-center rounded-full transition [&_svg]:size-9", compact ? "h-14 w-14 [&_svg]:size-6" : "h-24 w-24",
          recording ? "bg-destructive text-destructive-foreground" : "bg-gold text-accent-foreground shadow-glow")}>
        {recording && !paused && <span className="animate-ring absolute inset-0 rounded-full bg-destructive" />}
        {recording ? <Square className={cn("relative", compact ? "h-6 w-6" : "h-8 w-8")} /> : <Mic className="relative h-10 w-10" />}
      </Button>
      {recording && onPause && (
        <Button variant="ghost" onClick={onPause} aria-pressed={paused} data-recite-pause="" aria-label={paused ? t("reciteResume") : t("recitePause")}
          className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 [&_svg]:size-4", compact ? "h-11" : "h-12", paused ? "bg-gold text-accent-foreground shadow-glow" : "border border-accent/40 text-accent")}>
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}<span className="text-sm">{paused ? t("reciteResume") : t("recitePause")}</span>
        </Button>
      )}
      <div className={cn("flex flex-col items-center gap-1.5", compact && "items-start")}>
        {getLevel && <LevelMeter active={recording && !paused} getLevel={getLevel} />}
        {wave && recording && !paused && <ListeningWave />}
        <p className="text-sm text-muted-foreground">{recording ? (paused ? t("recitePausedStatus") : statusText ?? t("recording")) : label}</p>
      </div>
    </div>
  );
}

const statusClass: Record<WordStatus, string> = {
  CORRECT: "bg-success/15 text-success",
  WARNING: "bg-orange-950/45 text-orange-300 ring-1 ring-orange-400/35",
  ERROR: "bg-red-950/60 text-red-300 ring-1 ring-red-400/40",
};

/**
 * Ayah text in large Uthmani type (full Tashkeel), tinted word by word. `masked` hides every word that has not
 * been recited correctly yet; `cursor` is the word expected next; the verse the Sheikh is reciting gets a gold marker.
 */
function LiveText({ ayat, statuses, cursor, masked, hints, active, playingAyah, onWordTap, tajweedOf, clean }: {
  /** v38 «ألوان أحكام التجويد»: coloured segments of a token (when its text matches). */
  tajweedOf?: ((index: number) => TajweedSeg[] | undefined) | undefined;
  /** v38 «نص قرآني سلس»: clear script at this size. */
  clean?: { fontSize: number } | undefined;
  ayat: Ayah[]; statuses: LiveStatus[]; cursor: number; masked: boolean; hints?: Set<number>; active: boolean; playingAyah: number | null;
  /** Tap on a word marked wrong or almost right (voice profile). */
  onWordTap?: ((index: number) => void) | undefined;
}) {
  // While reciting, the word expected next is kept in the middle of the screen (smooth auto-scroll),
  // so the reciter never has to scroll by hand.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const el = box.current?.querySelector<HTMLElement>("[data-cursor]");
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mid = window.innerHeight * 0.45;
    if (Math.abs(r.top + r.height / 2 - mid) > window.innerHeight * 0.12) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [cursor, active]);
  let offset = 0;
  return (
    <div ref={box} dir="rtl" lang="ar" className={cn("space-y-5 text-center leading-[2.4]", clean ? "font-arabic" : "font-quran text-[2.1rem]")} style={clean ? { fontSize: clean.fontSize } : undefined}>
      {ayat.map((a) => {
        const words = a.text.split(" ");
        const start = offset; offset += words.length;
        return (
          <p key={a.number}>
            {words.map((w, j) => {
              const index = start + j;
              const status = statuses[index] ?? "PENDING";
              const letters = normalizeArabic(w).length;
              const hinted = !!hints?.has(index) && status !== "CORRECT";
              // Memorization hides only words not judged yet; a wrong or skipped word is shown in red so
              // the reciter can read it and continue (never dots for a mistake).
              const hidden = masked && letters > 0 && status === "PENDING" && !hinted;
              const isCursor = active && index === cursor;
              return (
                <span key={j} data-status={status} data-cursor={isCursor || undefined}
                  onClick={onWordTap && (status === "ERROR" || status === "WARNING") ? () => onWordTap(index) : undefined}
                  role={onWordTap && (status === "ERROR" || status === "WARNING") ? "button" : undefined}
                  className={cn("mx-0.5 inline-block rounded-lg px-1 py-0.5 transition-all duration-300",
                    status !== "PENDING" && statusClass[status],
                    hidden && "font-sans tracking-[0.2em]",
                    hidden && status === "PENDING" && "text-muted-foreground/60",
                    hinted && status === "PENDING" && "text-accent underline decoration-dotted underline-offset-8",
                    isCursor && "ring-2 ring-accent/70 animate-pulse")}>
                  {hidden ? "•".repeat(Math.min(6, Math.max(2, letters)))
                    : status === "PENDING" && tajweedOf?.(index) ? tajweedOf(index)!.map((sg, k) => (sg.cls ? <span key={k} className={`tj-${sg.cls}`}>{sg.text}</span> : sg.text))
                    : w}
                </span>
              );
            })}{" "}
            <span className={cn("mx-1 whitespace-nowrap rounded-full px-1 align-middle text-[0.8em] transition", playingAyah === a.number && "bg-amber-300/25 ring-1 ring-amber-300")}
              style={{ color: GOLD_LIGHT }}>
              {ayahMarker(a.number)}
            </span>
          </p>
        );
      })}
    </div>
  );
}

/** Animated "microphone is listening" indicator (the Web Speech API does not expose the audio level). */
function ListeningWave() {
  return (
    <div aria-hidden="true" dir="ltr" className="flex h-10 items-center justify-center gap-1.5">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="animate-wave h-10 w-1.5 origin-center rounded-full bg-success" style={{ animationDelay: `${(i % 5) * 120}ms` }} />
      ))}
    </div>
  );
}

function LiveMetrics({ match, onReset }: { match: LiveMatch; onReset: () => void }) {
  const { t } = useI18n();
  const { correct, warning, error, extra } = match.counts;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const tone = match.recited === 0 ? "text-muted-foreground" : match.accuracy >= 85 ? "text-success" : match.accuracy >= 60 ? "text-tashkeel" : "text-destructive";
  const progress = match.total ? (match.recited / match.total) * 100 : 0;
  return (
    <div className="sticky top-2 z-10 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 backdrop-blur">
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={match.accuracy} aria-label={t("accuracy")} className={cn("relative h-16 w-16 shrink-0", tone)}>
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="6" className="stroke-muted" />
          <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="6" strokeLinecap="round" stroke="currentColor"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - match.accuracy / 100)} className="transition-[stroke-dashoffset] duration-500" />
        </svg>
        <span dir="ltr" className="absolute inset-0 flex items-center justify-center font-sans text-sm font-semibold">{match.accuracy}%</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm"><span className="font-medium">{t("accuracy")}</span> · <span dir="ltr">{match.recited}/{match.total}</span> {t("wordsRecited")}</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${progress}%` }} /></div>
        <div className="flex flex-wrap gap-1.5 text-xs" dir="ltr">
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">{correct}</span>
          <span className="rounded-full bg-tashkeel/15 px-2 py-0.5 text-tashkeel">{warning}</span>
          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-destructive">{error}</span>
          {extra > 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">+{extra}</span>}
        </div>
      </div>
      {/* v38 «إعادة»: start the passage again from scratch (timer, score, colours) */}
      <Button variant="ghost" onClick={onReset} aria-label={t("resetSession")} data-recite-reset="" className="h-10 shrink-0 gap-1.5 rounded-full border border-border px-3"><RotateCcw className="h-4 w-4" /><span className="text-xs">{t("resetSession")}</span></Button>
    </div>
  );
}

function RecorderFeedback({ transcribing, transcript, error }: { transcribing: boolean; transcript: string; error: CopyKey | null }) {
  const { t } = useI18n();
  return (
    <>
      {transcribing && <p className="flex items-center justify-center gap-2 text-sm text-accent"><Sparkles className="h-4 w-4 animate-pulse" /> {t("transcribing")}</p>}
      {error && <p role="alert" className={cn("rounded-xl border bg-card p-3 text-sm", error === "errSilent" || error === "errEmpty" ? "border-accent/50 text-accent" : "border-destructive/40 text-destructive")}>{t(error)}</p>}
      {transcript && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4 animate-in fade-in">
          <h3 className="text-xs font-medium text-accent">{t("transcript")}</h3>
          <p dir="rtl" lang="ar" className="font-arabic text-2xl leading-[2.2]">{transcript}</p>
        </div>
      )}
    </>
  );
}

function Legend({ cls, t }: { cls: string; t: string }) {
  return <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1"><span className={cn("h-2 w-2 rounded-full", cls)} />{t}</span>;
}
