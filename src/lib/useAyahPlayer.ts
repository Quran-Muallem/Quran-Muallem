import { useCallback, useEffect, useRef, useState } from "react";
import { getAyahAudioUrl, getReciter } from "@/lib/reciterManager";
import { endSession, sheikhAudio, stopSheikhAudio, updateSession } from "@/lib/audioPlayback";
import { getSurahMeta } from "@/lib/quranService";

export type AyahPlayer = {
  playing: boolean;
  loading: boolean;
  /** Ayah currently playing (or last played / next to play). */
  ayah: number;
  failed: boolean;
  play: (ayah?: number) => void;
  pause: () => void;
  toggle: () => void;
  stop: () => void;
};

/**
 * Plays a surah Ayah by Ayah (offline copy when downloaded), so the current Ayah can be highlighted.
 * Plays from `from` to `to`; with `repeat`, the range loops (useful for memorization).
 */
export function useAyahPlayer({ reciterId, surah, from, to, repeat = false, onAyahChange }: {
  reciterId: string; surah: number; from: number; to: number; repeat?: boolean; onAyahChange?: (ayah: number) => void;
}): AyahPlayer {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ayah, setAyah] = useState(from);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const preload = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);
  const cfg = useRef({ reciterId, surah, from, to, repeat, onAyahChange });
  cfg.current = { reciterId, surah, from, to, repeat, onAyahChange };

  /** Lock screen / notification: "Al-Fatiha · 3" by the Sheikh, with play / pause / stop / next / previous. */
  const announce = (n: number, isPlaying: boolean) => {
    const c = cfg.current;
    const meta = getSurahMeta(c.surah), r = getReciter(c.reciterId);
    updateSession({ title: `${meta?.nameArabic ?? ""} · ${n}`, artist: r.nameArabic, album: meta?.nameSimple }, isPlaying, {
      onPlay: () => { const el = audio.current; if (el && el.paused && el.src) void el.play().then(() => { setPlaying(true); announce(ayahRef.current, true); }).catch(() => {}); else void playAyah(ayahRef.current); },
      onPause: () => { audio.current?.pause(); setPlaying(false); announce(ayahRef.current, false); },
      onStop: () => { token.current++; stopAudio(); setPlaying(false); setLoading(false); endSession(); },
      onNext: () => { if (ayahRef.current < cfg.current.to) void playAyah(ayahRef.current + 1); },
      onPrevious: () => { if (ayahRef.current > cfg.current.from) void playAyah(ayahRef.current - 1); },
    });
  };
  const stopAudio = () => { if (audio.current) stopSheikhAudio(); audio.current = null; };

  const playAyah = useCallback(async (n: number) => {
    const my = ++token.current;
    stopAudio();
    const { reciterId: r, surah: s, to: end } = cfg.current;
    setAyah(n); setFailed(false); setLoading(true);
    cfg.current.onAyahChange?.(n);
    try {
      const url = await getAyahAudioUrl(r, s, n);
      if (my !== token.current) return;
      // The shared element keeps playing with the screen off / app in the background (audioPlayback.ts).
      const a = sheikhAudio(url);
      audio.current = a;
      a.onended = () => {
        if (my !== token.current) return;
        const c = cfg.current;
        if (n < c.to) void playAyah(n + 1);
        else if (c.repeat) void playAyah(c.from);
        else { setPlaying(false); audio.current = null; endSession(); }
      };
      a.onerror = () => { if (my === token.current) { setPlaying(false); setLoading(false); setFailed(true); } };
      await a.play();
      if (my !== token.current) { a.pause(); return; }
      setPlaying(true); setLoading(false);
      announce(n, true);
      // Warm up the next Ayah to keep the gap short.
      if (n < end) void getAyahAudioUrl(r, s, n + 1).then((u) => { const p = new Audio(u); p.preload = "auto"; preload.current = p; });
    } catch {
      if (my === token.current) { setPlaying(false); setLoading(false); setFailed(true); }
    }
  }, []);

  // Changing surah / range stops playback and resets to the start of the range.
  useEffect(() => { token.current++; if (audio.current) endSession(); stopAudio(); setPlaying(false); setLoading(false); setAyah(from); }, [surah, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  // Changing the Sheikh keeps the position: if a verse is playing, it starts again with the new voice.
  const playingRef = useRef(false);
  playingRef.current = playing || loading;
  const ayahRef = useRef(ayah);
  ayahRef.current = ayah;
  const firstReciter = useRef(true);
  useEffect(() => {
    if (firstReciter.current) { firstReciter.current = false; return; }
    if (playingRef.current) void playAyah(ayahRef.current);
    else { token.current++; stopAudio(); }
  }, [reciterId, playAyah]);
  useEffect(() => () => { token.current++; if (audio.current) endSession(); stopAudio(); }, []);

  const play = useCallback((n?: number) => {
    const c = cfg.current;
    const start = n ?? ayah;
    if (!n && audio.current && audio.current.paused && audio.current.src) {
      void audio.current.play().then(() => { setPlaying(true); announce(ayahRef.current, true); }).catch(() => setFailed(true));
      return;
    }
    void playAyah(Math.min(Math.max(start, c.from), c.to));
  }, [ayah, playing, playAyah]);

  const pause = useCallback(() => { audio.current?.pause(); setPlaying(false); announce(ayahRef.current, false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const stop = useCallback(() => { token.current++; stopAudio(); setPlaying(false); setLoading(false); endSession(); }, []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  return { playing, loading, ayah, failed, play, pause, toggle, stop };
}
