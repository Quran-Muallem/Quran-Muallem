/**
 * Soft Sheikh prompts (يفتح عليك): plays words `fromWord`–`toWord` of a verse in the chosen Sheikh's voice,
 * faded in to the chosen volume. Moved here from SalatModeView (v42) in v45 so the hands-free Hifdh mode
 * uses the very same player. Word timings: Quran.com `fields=segments`; offline: the verse file, cut in
 * proportion to the word count.
 */
import { getAyahAudioUrl, getReciter } from "@/lib/reciterManager";
import { verseTimings, stopSheikhAudio, stopWordAudio } from "@/lib/audioPlayback";


let promptEl: HTMLAudioElement | null = null;
let promptTimers: ReturnType<typeof setTimeout>[] = [];
export function stopPrompt() {
  promptTimers.forEach(clearTimeout); promptTimers = [];
  promptEl?.pause();
}

/**
 * Plays words `fromWord`–`toWord` of a verse in the Sheikh's voice, fading in to `volume`. Resolves when it
 * has finished (or failed). Word timings from Quran.com; without them (offline) the verse file is cut in
 * proportion to the word count.
 */
export async function playPrompt(o: { reciterId: string; surah: number; ayah: number; fromWord: number; toWord: number; words: number; volume: number }): Promise<void> {
  stopPrompt(); stopWordAudio(); stopSheikhAudio();
  const reciter = getReciter(o.reciterId);
  let url: string | null = null, fromMs = 0, toMs: number | null = null;
  const timed = reciter.quranComId != null ? await verseTimings(reciter.quranComId, o.surah, o.ayah, true) : null;
  if (timed) {
    const seg = (w: number) => timed.segments.find(([pos]) => pos === w) ?? (timed.segments[0]?.[0] === 0 ? timed.segments.find(([pos]) => pos === w - 1) : undefined);
    const a = seg(o.fromWord), b = seg(o.toWord);
    if (a) { url = timed.url; fromMs = a[1]; toMs = b ? b[2] : null; }
  }
  const proportional = !url;
  if (!url) url = await getAyahAudioUrl(o.reciterId, o.surah, o.ayah);
  promptEl ??= new Audio();
  const el = promptEl;
  el.src = url;
  el.preload = "auto";
  el.volume = 0;
  await new Promise<void>((resolve, reject) => {
    if (el.readyState >= 1) return resolve();
    const ok = () => { off(); resolve(); }, bad = () => { off(); reject(new Error("audio")); };
    const off = () => { el.removeEventListener("loadedmetadata", ok); el.removeEventListener("error", bad); };
    el.addEventListener("loadedmetadata", ok); el.addEventListener("error", bad); el.load();
  });
  if (proportional && Number.isFinite(el.duration) && el.duration > 0 && o.words > 0) {
    const per = (el.duration * 1000) / o.words;
    fromMs = Math.max(0, (o.fromWord - 1) * per - 120);
    toMs = o.toWord >= o.words ? null : o.toWord * per + 150;
  }
  el.currentTime = fromMs / 1000;
  (window as unknown as { __salatPrompt?: unknown }).__salatPrompt = { url, fromMs, toMs, words: [o.surah, o.ayah, o.fromWord, o.toWord] };
  await el.play();
  // Fade in over 600 ms (Android / desktop; iOS keeps its own volume).
  const steps = 12;
  for (let i = 1; i <= steps; i++) promptTimers.push(setTimeout(() => { el.volume = Math.min(1, (o.volume * i) / steps); }, (600 * i) / steps));
  await new Promise<void>((resolve) => {
    const done = () => { el.removeEventListener("ended", done); el.removeEventListener("pause", done); resolve(); };
    el.addEventListener("ended", done); el.addEventListener("pause", done);
    if (toMs != null) {
      const len = Math.max(300, toMs - fromMs + 60);
      // Fade out over the last 250 ms, then stop.
      promptTimers.push(setTimeout(() => { const v = el.volume; for (let i = 1; i <= 5; i++) promptTimers.push(setTimeout(() => { el.volume = Math.max(0, v * (1 - i / 5)); }, 50 * i)); }, Math.max(0, len - 250)));
      promptTimers.push(setTimeout(() => el.pause(), len));
    }
  });
}
