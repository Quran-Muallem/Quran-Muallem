import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { getAyahAudioUrl, getReciter } from "@/lib/reciterManager";
import { claimSheikhAudio, endSession, sessionTexts, sheikhAudio, stopSheikhAudio, updateSession } from "@/lib/audioPlayback";
import { getSurahMeta } from "@/lib/quranService";
import { LanguageContext, translate } from "@/lib/i18n";

export type VerseRef = { surah: number; ayah: number };
const key = (v: VerseRef) => `${v.surah}:${v.ayah}`;

/** The verse after `v` in the Mushaf (next surah after a surah's last verse; null after An-Nas). */
export function nextVerse(v: VerseRef): VerseRef | null {
  const meta = getSurahMeta(v.surah);
  if (meta && v.ayah < meta.versesCount) return { surah: v.surah, ayah: v.ayah + 1 };
  return v.surah < 114 ? { surah: v.surah + 1, ayah: 1 } : null;
}
/** The verse before `v` (last verse of the previous surah before a surah's first verse). */
export function previousVerse(v: VerseRef): VerseRef | null {
  if (v.ayah > 1) return { surah: v.surah, ayah: v.ayah - 1 };
  const prev = getSurahMeta(v.surah - 1);
  return prev ? { surah: prev.id, ayah: prev.versesCount } : null;
}

/**
 * Plays the Mushaf verse after verse with the chosen Sheikh, from the tapped verse on — across page breaks
 * and on to the next surah — until paused / stopped. The audio chain does not depend on the page being
 * rendered (pages are not turned while the screen is off): the next verse is computed and played right away,
 * and `onFollow` only asks the Mushaf to show the page of a verse that is not on the current page.
 */
export function usePagePlayer({ reciterId, verses, onFollow }: { reciterId: string; verses: VerseRef[]; onFollow?: ((v: VerseRef) => void) | undefined }) {
  const language = useContext(LanguageContext);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<VerseRef | null>(null);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);
  const me = useRef(Symbol("player")).current;
  /** The page changed because playback moved on: keep playing. */
  const following = useRef(false);
  const cfg = useRef({ reciterId, verses, onFollow, language });
  cfg.current = { reciterId, verses, onFollow, language };
  const currentRef = useRef<VerseRef | null>(null);

  const stopAudio = () => { if (audio.current) stopSheikhAudio(); audio.current = null; };
  const onPage = (v: VerseRef) => cfg.current.verses.some((x) => x.surah === v.surah && x.ayah === v.ayah);

  /** Lock screen / notification: surah · verse, «بصوت الشيخ …», play / pause / previous / next verse, progress. */
  const announce = (v: VerseRef, isPlaying: boolean) => {
    const c = cfg.current;
    const meta = getSurahMeta(v.surah), r = getReciter(c.reciterId);
    const texts = sessionTexts((k) => translate(c.language, k), { language: c.language, surahArabic: meta?.nameArabic ?? "", surahSimple: meta?.nameSimple ?? "", ayah: v.ayah, reciterArabic: r.nameArabic, reciterEnglish: r.nameEnglish });
    updateSession({ ...texts, album: "Quran Muallem · معلم القرآن" }, isPlaying, {
      onPlay: () => { const el = audio.current; if (el && el.paused && el.src) void el.play().then(() => { setPlaying(true); announce(v, true); }).catch(() => {}); else void playVerse(currentRef.current ?? v); },
      onPause: () => pauseRef.current(),
      onStop: () => { token.current++; stopAudio(); setPlaying(false); setLoading(false); endSession(); },
      onNext: () => { const n = currentRef.current && nextVerse(currentRef.current); if (n) void playVerse(n); },
      onPrevious: () => { const p = currentRef.current && previousVerse(currentRef.current); if (p) void playVerse(p); },
      onSeek: (t) => { if (audio.current) audio.current.currentTime = t; },
    });
  };

  const playVerse = useCallback(async (v: VerseRef, retried = false) => {
    const my = ++token.current;
    claimSheikhAudio(me, () => { token.current++; audio.current = null; setPlaying(false); setLoading(false); });
    stopAudio();
    currentRef.current = v;
    setCurrent(v); setLoading(true); setFailed(false);
    if (!onPage(v) && cfg.current.onFollow) { following.current = true; cfg.current.onFollow(v); }
    try {
      const url = await getAyahAudioUrl(cfg.current.reciterId, v.surah, v.ayah, retried ? 1 : 0);
      if (my !== token.current) return;
      // The shared element keeps playing with the screen off / app in the background (audioPlayback.ts).
      const a = sheikhAudio(url);
      audio.current = a;
      a.onended = () => {
        if (my !== token.current) return;
        const n = nextVerse(v);
        if (n) void playVerse(n);
        else { setPlaying(false); audio.current = null; endSession(); } // end of the Mushaf
      };
      a.onerror = () => { if (my === token.current) { if (!retried) void playVerse(v, true); else { setPlaying(false); setLoading(false); setFailed(true); } } };
      await a.play();
      if (my !== token.current) { a.pause(); return; }
      setPlaying(true); setLoading(false);
      announce(v, true);
      // Warm up the next verse (download / cache) to keep the gap short.
      const n = nextVerse(v);
      if (n) void getAyahAudioUrl(cfg.current.reciterId, n.surah, n.ayah).catch(() => {});
    } catch {
      if (my !== token.current) return;
      if (!retried) { void playVerse(v, true); return; }
      setPlaying(false); setLoading(false); setFailed(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pause = useCallback(() => {
    audio.current?.pause();
    setPlaying(false); setLoading(false);
    const c = currentRef.current;
    if (c) announce(c, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pauseRef = useRef(pause);
  pauseRef.current = pause;

  // A page turned by the reader (not by playback) stops the recitation; one turned by playback keeps it.
  const pageKey = verses.map(key).join(",");
  useEffect(() => {
    if (following.current) { following.current = false; return; }
    const c = currentRef.current;
    if (c && onPage(c)) return;
    if (!audio.current && !loading) { setCurrent(null); currentRef.current = null; return; }
    token.current++; endSession(); stopAudio(); setPlaying(false); setLoading(false); setCurrent(null); currentRef.current = null;
  }, [pageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Changing the Sheikh keeps the position: the verse being played starts again with the new voice.
  const stateRef = useRef({ playing, loading });
  stateRef.current = { playing, loading };
  const firstReciter = useRef(true);
  useEffect(() => {
    if (firstReciter.current) { firstReciter.current = false; return; }
    const c = currentRef.current;
    if ((stateRef.current.playing || stateRef.current.loading) && c) void playVerse(c);
    else { token.current++; stopAudio(); setPlaying(false); }
  }, [reciterId, playVerse]);
  useEffect(() => () => { token.current++; if (audio.current) endSession(); stopAudio(); }, []);

  const playFrom = useCallback((v?: VerseRef) => {
    const start = v ?? cfg.current.verses[0];
    if (!start) return;
    const el = audio.current, c = currentRef.current;
    // Resume a paused verse where it stopped.
    if (!v && el && el.paused && el.src && c) { void el.play().then(() => { setPlaying(true); announce(c, true); }).catch(() => void playVerse(c)); return; }
    void playVerse(start);
  }, [playVerse]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = useCallback(() => (playing || loading ? pause() : audio.current?.src ? playFrom() : playFrom(current ?? undefined)), [playing, loading, pause, playFrom, current]);

  return { playing, loading, current, failed, playFrom, pause, toggle };
}
