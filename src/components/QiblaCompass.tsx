import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Compass, Info as InfoIcon, LocateFixed, Loader2, MapPin, RotateCw } from "lucide-react";
import { GoldFrame, GOLD, GOLD_GRADIENT, GOLD_LIGHT, EMERALD_DEEP, alpha } from "@/components/ornaments";
import { angleDiff, compassPoint, distanceToKaaba, normalizeDeg, qiblaBearing, smoothHeading } from "@/lib/qibla";
import { isNativePlatform, kv } from "@/lib/storage";
import { toArabicDigits } from "@/lib/quranService";
import { useI18n, type CopyKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { getPosition, type Position } from "@/lib/location";
const POS_KEY = "hifz.qibla.lastPosition";
/** Within ± this many degrees counts as facing the Qibla. */
const ALIGN_TOLERANCE = 5;

type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
type PermissionRequester = { requestPermission?: () => Promise<"granted" | "denied" | "default"> };

/* ------------------------------------------------------------------ */
/* Sensors                                                             */
/* ------------------------------------------------------------------ */

const screenAngle = () => (typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle : (window as unknown as { orientation?: number }).orientation ?? 0) || 0;

/**
 * Live compass heading (degrees from north, clockwise) from the device orientation sensors.
 * iOS: webkitCompassHeading (needs a permission tap). Android/Chrome: deviceorientationabsolute.
 */
function useHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "needs-permission" | "active" | "unsupported" | "denied">("idle");
  const last = useRef<number | null>(null);

  const listen = useCallback(() => {
    if (typeof window === "undefined") return () => {};
    let gotAbsolute = false;
    const onEvent = (e: Event, absolute: boolean) => {
      const ev = e as OrientationEventWithCompass;
      let h: number | null = null;
      if (typeof ev.webkitCompassHeading === "number" && !Number.isNaN(ev.webkitCompassHeading)) {
        h = ev.webkitCompassHeading; // already compensates screen orientation on iOS
        setAccuracy(typeof ev.webkitCompassAccuracy === "number" ? ev.webkitCompassAccuracy : null);
      } else if (ev.alpha != null && (absolute || ev.absolute)) {
        gotAbsolute = true;
        h = normalizeDeg(360 - ev.alpha + screenAngle());
      } else if (ev.alpha != null && !gotAbsolute) {
        return; // relative-only orientation cannot point north
      }
      if (h == null) return;
      last.current = smoothHeading(last.current, h);
      setHeading(last.current);
      setState("active");
    };
    const abs = (e: Event) => onEvent(e, true);
    const rel = (e: Event) => onEvent(e, false);
    window.addEventListener("deviceorientationabsolute", abs);
    window.addEventListener("deviceorientation", rel);
    const timer = setTimeout(() => setState((s) => (s === "active" ? s : "unsupported")), 2500);
    return () => { window.removeEventListener("deviceorientationabsolute", abs); window.removeEventListener("deviceorientation", rel); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const req = (window.DeviceOrientationEvent as unknown as PermissionRequester | undefined)?.requestPermission;
    if (!("DeviceOrientationEvent" in window)) { setState("unsupported"); return; }
    if (typeof req === "function") { setState("needs-permission"); return; }
    return listen();
  }, [listen]);

  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  /** iOS 13+: must be called from a tap. */
  const requestPermission = useCallback(async () => {
    const req = (window.DeviceOrientationEvent as unknown as PermissionRequester).requestPermission;
    try {
      const r = await req?.();
      if (r === "granted") { cleanup.current?.(); cleanup.current = listen(); } else setState("denied");
    } catch { setState("denied"); }
  }, [listen]);

  return { heading, accuracy, state, requestPermission };
}

async function haptic() {
  try {
    if (isNativePlatform()) { const { Haptics, ImpactStyle } = await import("@capacitor/haptics"); await Haptics.impact({ style: ImpactStyle.Heavy }); return; }
  } catch { /* fall through */ }
  navigator.vibrate?.([40, 60, 40]);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * 100 % offline Qibla compass: GPS position (works without internet) + great-circle bearing to
 * the Kaaba + live device heading. Gives haptic and visual feedback when aligned.
 */
export function QiblaCompass() {
  const { t, language } = useI18n();
  const [pos, setPos] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<CopyKey | null>(null);
  const { heading, accuracy, state, requestPermission } = useHeading();
  const wasAligned = useRef(false);

  const locate = useCallback(async () => {
    setLocating(true); setLocError(null);
    try {
      const p = await getPosition();
      setPos(p);
      void kv.setJson(POS_KEY, p);
    } catch (e) {
      setLocError((e as Error).message === "denied" ? "qiblaLocDenied" : "qiblaLocFailed");
    } finally { setLocating(false); }
  }, []);

  useEffect(() => {
    void kv.getJson<Position | null>(POS_KEY, null).then((saved) => { if (saved) setPos(saved); });
    void locate();
  }, [locate]);

  const bearing = pos ? qiblaBearing(pos.lat, pos.lon) : null;
  const distance = pos ? distanceToKaaba(pos.lat, pos.lon) : null;
  const relative = bearing != null && heading != null ? angleDiff(bearing, heading) : null;
  const aligned = relative != null && Math.abs(relative) <= ALIGN_TOLERANCE;

  useEffect(() => {
    if (aligned && !wasAligned.current) void haptic();
    wasAligned.current = aligned;
  }, [aligned]);

  const n = (x: number, digits = 0) => { const s = x.toFixed(digits); return language === "ar" ? toArabicDigits(s).replace(".", "٫") : s; };
  const dialRotation = heading != null ? -heading : 0;
  const native = isNativePlatform();

  return (
    <div className="space-y-5 pb-8">
      <header className="text-center">
        <h1 className="font-arabic text-3xl" style={{ color: GOLD_LIGHT }}>{t("qiblaTitle")}</h1>
        <p className="mt-1 text-sm text-emerald-100/70">{t("qiblaSub")}</p>
      </header>

      {/* Web / PWA: browsers pass compass data on with limits (iOS Safari, desktop) — the Android app reads the sensor directly. */}
      {!native && (
        <p role="note" data-qibla-web-notice className="flex items-start gap-2 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-3 text-sm leading-relaxed text-amber-100">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{t("qiblaWebNotice")}
        </p>
      )}

      <GoldFrame className={cn("transition-shadow duration-500", aligned ? "shadow-[0_0_70px_-5px_rgba(52,211,153,.75)]" : "shadow-[0_0_50px_-15px_rgba(251,191,36,.5)]")}>
        <div className="flex flex-col items-center px-4 py-6">
          <div className="relative aspect-square w-full max-w-[19rem]" role="img"
            aria-label={bearing != null ? `${t("qiblaBearing")} ${n(bearing)}°` : t("qiblaTitle")}>
            {/* Dial rotates with the device so North stays north */}
            <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full transition-transform duration-150 ease-out" style={{ transform: `rotate(${dialRotation}deg)` }}>
              <defs>
                <radialGradient id="dial-bg" cx="50%" cy="45%" r="60%">
                  <stop offset="0" stopColor="var(--hq-emerald-hi)" /><stop offset=".7" stopColor="var(--hq-emerald)" /><stop offset="1" stopColor={EMERALD_DEEP} />
                </radialGradient>
                <linearGradient id="ring-gold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={GOLD_LIGHT} /><stop offset=".5" stopColor="#fde68a" /><stop offset="1" stopColor={GOLD} />
                </linearGradient>
                <linearGradient id="needle-gold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor={GOLD} />
                </linearGradient>
              </defs>
              <circle cx="150" cy="150" r="146" fill="url(#dial-bg)" stroke="url(#ring-gold)" strokeWidth="5" />
              <circle cx="150" cy="150" r="132" fill="none" stroke={GOLD_LIGHT} strokeOpacity=".55" strokeWidth="1" />
              {Array.from({ length: 72 }, (_, i) => {
                const major = i % 9 === 0, mid = i % 3 === 0;
                return <line key={i} x1="150" y1={major ? 20 : mid ? 24 : 27} x2="150" y2="33" stroke={GOLD_LIGHT} strokeOpacity={major ? 1 : mid ? 0.7 : 0.35} strokeWidth={major ? 2 : 1} transform={`rotate(${i * 5} 150 150)`} />;
              })}
              {/* eight-point star rosette */}
              <g opacity=".22" fill="none" stroke={GOLD_LIGHT} strokeWidth="1.2">
                <rect x="95" y="95" width="110" height="110" /><rect x="95" y="95" width="110" height="110" transform="rotate(45 150 150)" />
              </g>
              {(["N", "E", "S", "W"] as const).map((d, i) => (
                <text key={d} x="150" y="56" textAnchor="middle" transform={`rotate(${i * 90} 150 150)`}
                  className="font-arabic" fontSize="17" fill={d === "N" ? "#fca5a5" : "#fef3c7"}>
                  {language === "ar" ? ["ش", "ق", "ج", "غ"][i] : d}
                </text>
              ))}
              {/* Qibla needle at the computed bearing */}
              {bearing != null && (
                <g transform={`rotate(${bearing} 150 150)`}>
                  <path d="M150 64 L160 150 L150 166 L140 150 Z" fill="url(#needle-gold)" stroke="#78350f" strokeWidth=".8" />
                  <path d="M150 166 L156 150 L150 236 L144 150 Z" fill="var(--hq-emerald-deep)" stroke={GOLD} strokeWidth=".8" opacity=".8" />
                  {/* Kaaba */}
                  <g transform="translate(150 50)">
                    <rect x="-11" y="-11" width="22" height="20" rx="1.5" fill="#111" stroke={GOLD_LIGHT} strokeWidth="1.4" />
                    <rect x="-11" y="-6" width="22" height="3.2" fill={GOLD_LIGHT} />
                  </g>
                </g>
              )}
              <circle cx="150" cy="150" r="7" fill="url(#ring-gold)" stroke="#78350f" strokeWidth="1" />
            </svg>
            {/* fixed index at the top = where the phone points */}
            <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1">
              <div className={cn("h-0 w-0 border-x-[9px] border-t-[14px] border-x-transparent transition-colors", aligned ? "border-t-emerald-300" : "border-t-amber-300")} />
            </div>
          </div>

          <div className="mt-5 text-center" aria-live="polite">
            {aligned ? (
              <p className="text-lg font-semibold text-emerald-300 animate-in fade-in">{t("qiblaAligned")} ✓</p>
            ) : relative != null ? (
              <p className="text-sm text-emerald-50">
                {t(relative > 0 ? "qiblaTurnRight" : "qiblaTurnLeft")} <span className="font-semibold" dir="ltr">{n(Math.abs(relative))}°</span>
              </p>
            ) : null}
            {bearing != null && (
              <p className="mt-1 text-sm text-emerald-100/75">
                {t("qiblaBearing")}: <span dir="ltr" className="font-semibold" style={{ color: GOLD_LIGHT }}>{n(bearing, 1)}°</span> ({compassPoint(bearing, language)})
              </p>
            )}
          </div>
        </div>
      </GoldFrame>

      {state === "needs-permission" && (
        <button type="button" onClick={() => void requestPermission()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-emerald-950" style={{ background: GOLD_GRADIENT }}>
          <Compass className="h-4 w-4" />{t("qiblaEnableCompass")}
        </button>
      )}
      {(state === "unsupported" || state === "denied") && (
        <p className="rounded-2xl bg-black/20 p-3 text-sm leading-relaxed text-amber-100" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.40)}` }}>
          {t(state === "denied" ? "qiblaCompassDenied" : "qiblaNoCompass")}
        </p>
      )}
      {state === "active" && accuracy != null && accuracy > 25 && (
        <p className="flex items-center gap-2 rounded-2xl bg-black/20 p-3 text-sm text-amber-100"><RotateCw className="h-4 w-4 shrink-0" />{t("qiblaCalibrate")}</p>
      )}

      <section className="grid grid-cols-2 gap-2.5">
        <Info icon={<MapPin className="h-4 w-4" />} label={t("qiblaDistance")} value={distance != null ? `${n(distance)} ${t("km")}` : "—"} />
        <Info icon={<LocateFixed className="h-4 w-4" />} label={t("qiblaPosition")}
          value={pos ? `${n(Math.abs(pos.lat), 2)}°${pos.lat >= 0 ? (language === "ar" ? "ش" : "N") : (language === "ar" ? "ج" : "S")} ${n(Math.abs(pos.lon), 2)}°${pos.lon >= 0 ? (language === "ar" ? "ق" : "E") : (language === "ar" ? "غ" : "W")}` : "—"} />
      </section>

      <button type="button" onClick={() => void locate()} disabled={locating}
        className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm text-amber-100 hover:bg-black/25 disabled:opacity-60" style={{ boxShadow: `inset 0 0 0 1px ${GOLD}` }}>
        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}{t("qiblaRelocate")}
      </button>
      {locError && <p role="alert" className="text-sm text-red-200">{t(locError)}{pos ? ` ${t("qiblaUsingSaved")}` : ""}</p>}
      <p className="text-xs leading-relaxed text-emerald-100/55">{t("qiblaNote")}</p>
    </div>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3" style={{ boxShadow: `inset 0 0 0 1px ${alpha(GOLD, 0.33)}` }}>
      <p className="flex items-center gap-1.5 text-xs text-emerald-100/65"><span style={{ color: GOLD_LIGHT }}>{icon}</span>{label}</p>
      <p className="mt-1 text-sm font-medium text-emerald-50" dir="auto">{value}</p>
    </div>
  );
}

export default QiblaCompass;
