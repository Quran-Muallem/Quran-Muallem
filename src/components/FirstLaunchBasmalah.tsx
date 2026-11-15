/**
 * v56: on the very first launch of a fresh install the app opens with «بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ»
 * recited by Sheikh Abdul Basit Abdul Samad (bundled: public/audio/basmalah_abdul_basit.mp3, so it also
 * works offline). Strictly once: the flag is set the moment playback begins and is checked before any audio
 * is created. If the WebView blocks autoplay, the first touch/click starts it ({ once: true }).
 * Users updating from an older version (they already have settings) never hear it — that is not a first launch.
 */
import { useEffect, useRef, useState } from "react";

export const FIRST_LAUNCH_KEY = "qm_first_launch_basmalah_done";

/** Decided once at module load, before the app writes its first settings. */
const SHOULD_PLAY = (() => {
  try {
    if (localStorage.getItem(FIRST_LAUNCH_KEY) === "true") return false;
    if (localStorage.getItem("hifz.settings") !== null) { localStorage.setItem(FIRST_LAUNCH_KEY, "true"); return false; } // update, not a fresh install
    return true;
  } catch { return false; }
})();

const AUDIO_URL = `${import.meta.env.BASE_URL ?? "/"}audio/basmalah_abdul_basit.mp3`.replace(/\/{2,}/g, "/");

export function FirstLaunchBasmalah({ language }: { language: string }) {
  const [show, setShow] = useState(SHOULD_PLAY);
  const [waitingTap, setWaitingTap] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!SHOULD_PLAY) return;
    try { if (localStorage.getItem(FIRST_LAUNCH_KEY) === "true") { setShow(false); return; } } catch { /* ignore */ }
    const audio = new Audio(AUDIO_URL);
    audio.preload = "auto";
    let hideTimer = 0;
    const markDone = () => {
      if (started.current) return;
      started.current = true;
      setWaitingTap(false);
      try { localStorage.setItem(FIRST_LAUNCH_KEY, "true"); } catch { /* ignore */ }
    };
    const finish = () => { hideTimer = window.setTimeout(() => setShow(false), 1200); };
    audio.addEventListener("playing", markDone);
    audio.addEventListener("ended", finish);
    audio.addEventListener("error", () => { markDone(); finish(); });
    const onGesture = () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("click", onGesture);
      if (started.current) return;
      void audio.play().catch(() => { markDone(); finish(); });
    };
    void audio.play().catch(() => {
      // autoplay blocked: the first touch / click starts it
      setWaitingTap(true);
      window.addEventListener("pointerdown", onGesture, { once: true });
      window.addEventListener("click", onGesture, { once: true });
    });
    return () => {
      window.clearTimeout(hideTimer);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("click", onGesture);
      audio.pause();
    };
  }, []);

  if (!show) return null;
  const ar = language === "ar";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-4 pt-[max(0.9rem,env(safe-area-inset-top))]" role="status" aria-live="polite" data-first-basmalah="">
      <div className="pointer-events-auto w-full max-w-md animate-in fade-in slide-in-from-top-4 rounded-3xl px-5 py-4 text-center shadow-2xl duration-700"
        style={{ background: "linear-gradient(160deg,#0f3a2d 0%,#0b2a21 100%)", boxShadow: "0 0 0 1.5px #d4af37, 0 18px 40px rgba(0,0,0,.35)" }}>
        <p dir="rtl" lang="ar" className="font-quran text-[1.9rem] leading-[1.9] text-[#f3d27a]">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <p dir="rtl" lang="ar" className="mt-1 font-arabic text-[1rem] text-[#e9dcb8]">الشيخ عبد الباسط عبد الصمد</p>
        {!ar && <p className="text-xs text-[#cdbf99]">Sheikh Abdul Basit Abdul Samad</p>}
        {waitingTap && <p className="mt-1 text-xs text-[#f3d27a]/80" aria-hidden="true">▶︎ 👆</p>}
      </div>
    </div>
  );
}
