import { useCallback, useEffect, useRef, useState } from "react";
import { getAyahAudioUrl, getReciter } from "@/lib/reciterManager";
import { endSession, sheikhAudio, stopSheikhAudio, updateSession } from "@/lib/audioPlayback";
import { getSurahMeta } from "@/lib/quranService";

export type VerseRef = { surah: number; ayah: number };
const key = (v: VerseRef) => `${v.surah}:${v.ayah}`;

/**
 * Plays the verses of the current Mushaf page one after another with the chosen Sheikh.
 * At the end of the page `onPageEnd` is called (e.g. to turn the page); playback then continues
 * on the new page, skipping a verse that was already played across the page break.
 */
export function usePagePlayer({ reciterId, verses, onPageEnd }: { reciterId: string; verses: VerseRef[]; onPageEnd?: (() => void) | undefined }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<VerseRef | null>(null);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);
  const continueOnNextPage = useRef(false);
  const lastPlayed = useRef<string | null>(null);
  const cfg = useRef({ reciterId, verses, onPageEnd });
  cfg.current = { reciterId, verses, onPageEnd };

  const stopAudio = () => { if (audio.current) stopSheikhAudio(); audio.current = null; };
  /** Lock screen / notification with play / pause / stop / next / previous verse. */
  const announce = (v: VerseRef, isPlaying: boolean) => {
    const meta = getSurahMeta(v.surah), r = getReciter(cfg.current.reciterId);
    const indexOf = () => { const c = stateRef.current.current; return c ? cfg.current.verses.findIndex((x) => x.surah === c.surah && x.ayah === c.ayah) : -1; };
    updateSession({ title: `${meta?.nameArabic ?? ""} · ${v.ayah}`, artist: r.nameArabic, album: meta?.nameSimple }, isPlaying, {
      onPlay: () => { const c = stateRef.current.current; void playIndex(Math.max(0, c ? indexOf() : 0)); },
      onPause: () => { token.current++; stopAudio(); setPlaying(false); setLoading(false); continueOnNextPage.current = false; const c = stateRef.current.current; if (c) announce(c, false); },
      onStop: () => { token.current++; stopAudio(); setPlaying(false); setLoading(false); continueOnNextPage.current = false; endSession(); },
      onNext: () => { void playIndex(indexOf() + 1); },
      onPrevious: () => { void playIndex(Math.max(0, indexOf() - 1)); },
    });
  };

  const playIndex = useCallback(async (i: number) => {
    const my = ++token.current;
    stopAudio();
    const { verses: vs, reciterId: r } = cfg.current;
    const v = vs[i];
    if (!v) {
      setPlaying(false); setCurrent(null);
      if (cfg.current.onPageEnd) { continueOnNextPage.current = true; cfg.current.onPageEnd(); }
      else endSession(); // last page of the Mushaf
      return;
    }
    setCurrent(v); setLoading(true); setFailed(false);
    try {
      const url = await getAyahAudioUrl(r, v.surah, v.ayah);
      if (my !== token.current) return;
      // The shared element keeps playing with the screen off / app in the background (audioPlayback.ts).
      const a = sheikhAudio(url);
      audio.current = a;
      a.onended = () => { if (my === token.current) { lastPlayed.current = key(v); void playIndex(i + 1); } };
      a.onerror = () => { if (my === token.current) { setPlaying(false); setLoading(false); setFailed(true); } };
      await a.play();
      if (my !== token.current) { a.pause(); return; }
      setPlaying(true); setLoading(false);
      announce(v, true);
    } catch {
      if (my === token.current) { setPlaying(false); setLoading(false); setFailed(true); }
    }
  }, []);

  // New page: continue automatically if the previous page ended while playing.
  const pageKey = verses.map(key).join(",");
  useEffect(() => {
    if (!continueOnNextPage.current) { token.current++; if (audio.current) endSession(); stopAudio(); setPlaying(false); setLoading(false); setCurrent(null); return; }
    continueOnNextPage.current = false;
    const start = verses[0] && key(verses[0]) === lastPlayed.current ? 1 : 0;
    void playIndex(start);
  }, [pageKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Changing the Sheikh keeps the position: the verse being played starts again with the new voice.
  const stateRef = useRef({ playing, loading, current });
  stateRef.current = { playing, loading, current };
  const firstReciter = useRef(true);
  useEffect(() => {
    if (firstReciter.current) { firstReciter.current = false; return; }
    const { playing: p, loading: l, current: c } = stateRef.current;
    if ((p || l) && c) {
      const i = cfg.current.verses.findIndex((x) => x.surah === c.surah && x.ayah === c.ayah);
      void playIndex(Math.max(0, i));
    } else { token.current++; stopAudio(); setPlaying(false); }
  }, [reciterId, playIndex]);
  useEffect(() => () => { token.current++; if (audio.current) endSession(); stopAudio(); }, []);

  const playFrom = useCallback((v?: VerseRef) => {
    const vs = cfg.current.verses;
    const i = v ? Math.max(0, vs.findIndex((x) => x.surah === v.surah && x.ayah === v.ayah)) : 0;
    void playIndex(i);
  }, [playIndex]);
  const pause = useCallback(() => { token.current++; stopAudio(); setPlaying(false); setLoading(false); continueOnNextPage.current = false; const c = stateRef.current.current; if (c) announce(c, false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = useCallback(() => (playing || loading ? pause() : playFrom(current ?? undefined)), [playing, loading, pause, playFrom, current]);

  return { playing, loading, current, failed, playFrom, pause, toggle };
}
