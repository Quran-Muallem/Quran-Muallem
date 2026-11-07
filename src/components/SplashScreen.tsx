import { useEffect, useRef, useState } from "react";
import { Rosette } from "@/components/mushaf/MushafOrnaments";
import { assetUrl, APP_NAME, APP_NAME_ARABIC, APP_NAME_LATIN, APP_SUBTITLE, APP_SUBTITLE_AR } from "@/lib/assets";
import { useI18n } from "@/lib/i18n";

/** The Uthmani basmala (the Quranic spelling: الرَّحْمَـٰنِ). */
const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
const FADE_MS = 550;
/** A tap skips the splash, but only after this long (so it is never just a flash). */
const SKIP_AFTER_MS = 900;

const GOLD_TEXT = {
  backgroundImage: "linear-gradient(180deg, #fff6d6 0%, #f3d27a 40%, #c8952c 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

/** Faint eight-pointed-star lattice used as the background texture. */
const PATTERN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'><g fill='none' stroke='#f3d27a' stroke-width='0.8'><rect x='16' y='16' width='24' height='24'/><rect x='16' y='16' width='24' height='24' transform='rotate(45 28 28)'/><circle cx='28' cy='28' r='4'/><path d='M0 0L8 8M56 0L48 8M0 56L8 48M56 56L48 48'/></g></svg>`,
)}")`;

/**
 * Welcome / loading screen shown on every app start and again after signing in:
 * app logo, the name «معلم القرآن · Quran Muallem», the glowing basmala and a gold progress line.
 *
 * It stays at least `minMs` and until `ready` is true, then fades out and calls `onDone`.
 */
export function SplashScreen({ ready = true, minMs = 2800, name, onDone }: {
  ready?: boolean;
  minMs?: number;
  /** Shown after signing in: "أهلًا بك، …". */
  name?: string | null | undefined;
  onDone: () => void;
}) {
  const { t, language } = useI18n();
  const [elapsed, setElapsed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const started = useRef(Date.now());
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => { const id = setTimeout(() => setElapsed(true), minMs); return () => clearTimeout(id); }, [minMs]);
  useEffect(() => {
    if (!(elapsed && ready) || leaving) return;
    setLeaving(true);
  }, [elapsed, ready, leaving]);
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => done.current(), FADE_MS);
    return () => clearTimeout(id);
  }, [leaving]);

  const skip = () => { if (ready && Date.now() - started.current > SKIP_AFTER_MS) setLeaving(true); };
  const welcome = name ? t("splashWelcomeBack").replace("{name}", name) : t("splashWelcome");

  return (
    <div role="status" aria-live="polite" aria-label={`${APP_NAME} — ${t("splashLoading")}`} onClick={skip}
      className="splash fixed inset-0 z-[100] flex select-none flex-col items-center justify-center overflow-hidden px-6"
      style={{
        background: "radial-gradient(120% 80% at 50% 36%, #145c45 0%, #0b3a2d 46%, #041d17 100%)",
        opacity: leaving ? 0 : 1, transform: leaving ? "scale(1.04)" : "none",
        transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)",
      }}>
      {/* texture + soft light from above */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: PATTERN, backgroundSize: "56px 56px" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{ background: "radial-gradient(60% 70% at 50% 0%, rgba(243,210,122,.16), transparent 70%)" }} />

      <div className="relative flex flex-col items-center text-center">
        {/* logo inside a slowly turning gold rosette */}
        <div className="relative flex h-60 w-60 items-center justify-center">
          <Rosette className="splash-spin absolute inset-0 h-full w-full opacity-40" />
          <span aria-hidden="true" className="splash-halo absolute h-36 w-36 rounded-full" />
          <img src={assetUrl("logo-mark-512.png")} alt="" width={512} height={512} draggable={false}
            className="splash-pop relative h-28 w-28 rounded-[26%]"
            style={{ boxShadow: "0 0 0 2px rgba(243,210,122,.85), 0 0 0 7px rgba(243,210,122,.16), 0 18px 40px -10px rgba(0,0,0,.7)" }} />
        </div>

        <h1 aria-label={APP_NAME} className="splash-rise -mt-2 flex flex-col items-center" style={{ animationDelay: "250ms" }}>
          <span dir="rtl" lang="ar" className="px-4 pb-1 font-arabic text-[3.6rem] font-bold leading-[1.5]"
            style={{ ...GOLD_TEXT, filter: "drop-shadow(0 2px 12px rgba(243,210,122,.35))" }}>{APP_NAME_ARABIC}</span>
          <span dir="ltr" lang="en" className="font-sans text-lg font-semibold uppercase tracking-[0.3em] text-emerald-50/90">{APP_NAME_LATIN}</span>
          <span lang={language} className="mt-1.5 text-sm text-emerald-100/65">{language === "ar" ? APP_SUBTITLE_AR : APP_SUBTITLE}</span>
        </h1>

        <div className="splash-rise mt-1 flex items-center gap-3" style={{ animationDelay: "500ms" }} aria-hidden="true">
          <span className="h-px w-12" style={{ background: "linear-gradient(90deg, transparent, #f3d27a)" }} />
          <span className="h-1.5 w-1.5 rotate-45" style={{ background: "#f3d27a" }} />
          <span className="h-px w-12" style={{ background: "linear-gradient(90deg, #f3d27a, transparent)" }} />
        </div>

        <p dir="rtl" lang="ar" className="splash-rise splash-glow mt-3 px-2 font-quran text-[1.85rem] leading-[2]"
          style={{ ...GOLD_TEXT, animationDelay: "750ms" }}>
          {BASMALA}
        </p>

        <p lang={language} className="splash-rise mt-4 max-w-xs text-base leading-relaxed text-emerald-50/85" style={{ animationDelay: "1050ms" }}>
          {welcome}
        </p>
      </div>

      {/* loading line */}
      <div className="absolute inset-x-0 bottom-[max(3rem,calc(env(safe-area-inset-bottom)+2rem))] flex flex-col items-center gap-3">
        <div className="h-[3px] w-44 overflow-hidden rounded-full bg-white/10">
          <div className="splash-fill h-full rounded-full" style={{ animationDuration: `${minMs}ms`, background: "linear-gradient(90deg, #c8952c, #fff2c4, #f3d27a)" }} />
        </div>
        <span className="text-xs tracking-wide text-emerald-100/55">{t("splashLoading")}</span>
      </div>
    </div>
  );
}

export default SplashScreen;
