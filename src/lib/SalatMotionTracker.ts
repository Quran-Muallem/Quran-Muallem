/**
 * Salat Mode, v43: rakʿah counter from the phone's motion sensors (the phone is in a pocket).
 *
 *   QIYAM ➔ RUKU ➔ ITIDAL ➔ SUJUD_1 ➔ JALSA ➔ SUJUD_2 ➔ QIYAM (next rakʿah) | TASHAHHUD
 *
 * How the posture is read (accelerometer incl. gravity, @capacitor/motion = the WebView's devicemotion):
 *  - gravity = low-pass filtered acceleration (time constant per placement; loose jacket pockets: slower);
 *  - tilt θ = angle between gravity now and gravity while standing (3-second calibration) — independent of
 *    how the phone sits in the pocket;
 *  - height h (chest / jacket only): every movement between two still moments is integrated twice along
 *    gravity (velocity forced back to 0 at the end), giving the change in height; anchors: standing = 0,
 *    sujūd = −1 m. Sitting and standing look the same to a chest pocket (torso upright); h tells them apart.
 *
 * Bands (θ from standing):
 *  - chest / shirt pocket (torso): upright < 35° · rukūʿ 55–115° · sujūd ≥ 115° or (bent and h < −0.55 m)
 *  - trouser pocket (thigh): standing < 18° (rukūʿ cannot be told from standing) · sujūd 22–62° · sitting ≥ 68°
 *  - jacket pocket: like the chest, wider bands, slower filter.
 * A posture counts only after it was held for 1.2 s (0.6 s right after a spoken «الله أكبر»).
 *
 * Counting: a rakʿah is complete with its second sujūd. Standing up after it starts the next rakʿah;
 * standing up once the target is complete → «سبحان الله» (too many). Sitting after a second sujūd when the
 * target is not reached: legitimate middle tashahhud (2nd rakʿah of a 3/4-rakʿah prayer, every 2nd in
 * Qiyām al-Layl) for up to 90 s, otherwise 8 s → «سبحان الله» (too few). Each reminder once per sitting.
 *
 * Pure logic in `MotionCore` (tests feed synthetic samples); `startMotionSensors` connects the sensors.
 */

export type Placement = "chest" | "trousers" | "jacket";
export type PrayerId = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "qiyam";
export type Posture = "CALIBRATING" | "QIYAM" | "RUKU" | "ITIDAL" | "SUJUD_1" | "JALSA" | "SUJUD_2" | "TASHAHHUD";
/** What the sensor alone can say. */
export type RawPosture = "STAND" | "BOW" | "PROSTRATE" | "SIT";

export const PRAYER_RAKAAT: Record<Exclude<PrayerId, "qiyam">, number> = { fajr: 2, dhuhr: 4, asr: 4, maghrib: 3, isha: 4 };
export const QIYAM_OPTIONS = [2, 4, 6, 8, null] as const; // null = open
export const HOLD_MS = 1200;
export const HOLD_AFTER_TAKBIR_MS = 600;
export const CALIBRATION_MS = 3000;
export const TOO_FEW_MS = 8000;
export const MIDDLE_TASHAHHUD_MAX_MS = 90_000;

type Bands = { tau: number; upright: number; bowMin: number; sujudMin: number; sujudMax?: number; sitMin?: number };
const BANDS: Record<Placement, Bands> = {
  chest: { tau: 0.35, upright: 35, bowMin: 55, sujudMin: 115 },
  jacket: { tau: 0.7, upright: 40, bowMin: 50, sujudMin: 110 },
  trousers: { tau: 0.35, upright: 18, bowMin: 999, sujudMin: 22, sujudMax: 62, sitMin: 68 },
};
const QUIET_LIN = 0.9; // m/s² (smoothed) of acceleration without gravity: turning / swinging the phone
const QUIET_AV = 0.15; // m/s² up / down (smoothed): even a slow rise from sitting counts as movement
const QUIET_MS = 1000; // long enough not to split one (slow) movement where its acceleration crosses zero

/** Rakʿāt of a prayer (null: open Qiyām al-Layl). */
export function targetRakaat(prayer: PrayerId, qiyamCount: number | null): number | null {
  return prayer === "qiyam" ? qiyamCount : PRAYER_RAKAAT[prayer];
}
/** Fard rakʿāt 3 and 4 (and the 3rd of Maghrib): al-Fātiḥah only — recitation prompting stays passive. */
export const fatihaOnlyRakah = (prayer: PrayerId, rakah: number) => prayer !== "qiyam" && prayer !== "fajr" && rakah >= 3;

export type MotionEvent =
  | { type: "calibrated" }
  | { type: "posture"; posture: Posture; rakah: number }
  /** RUKU / SUJUD reached: Quran prompting must be silent. */
  | { type: "mute" }
  /** Stood up for a new rakʿah. */
  | { type: "newRakah"; rakah: number }
  | { type: "tooMany"; completed: number }
  | { type: "tooFew"; completed: number };

type V3 = [number, number, number];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3) => Math.sqrt(dot(a, a));
const angle = (a: V3, b: V3) => { const n = norm(a) * norm(b); return n ? (Math.acos(Math.max(-1, Math.min(1, dot(a, b) / n))) * 180) / Math.PI : 0; };

export class MotionCore {
  readonly placement: Placement;
  readonly target: number | null;
  readonly prayer: PrayerId;
  posture: Posture = "CALIBRATING";
  rakah = 1;
  /** Tilt from standing (°) and estimated height change (m), for the status / tests. */
  tilt = 0;
  height = 0;
  private b: Bands;
  private startAt: number | null = null;
  private calib: V3[] = [];
  private calibStill = 0;
  private base: V3 | null = null;
  private g: V3 | null = null;
  private gMag = 9.81;
  private lastT = 0;
  // movement segments (height)
  private moving = false;
  private quietSince = 0;
  private seg: { t: number; av: number }[] = [];
  private pre: { t: number; av: number }[] = [];
  private avS = 0;
  private anchor: number | null = null;
  private linS = 0;
  // stable posture
  private stable: RawPosture | null = null;
  private cand: RawPosture | null = null;
  private candSince = 0;
  private cueAt = -1e9;
  // counting
  private sujud = 0;
  private bowed = false;
  private sitSince = 0;
  private reminded = false;

  constructor(o: { placement: Placement; prayer: PrayerId; target: number | null }) {
    this.placement = o.placement; this.prayer = o.prayer; this.target = o.target;
    this.b = BANDS[o.placement];
  }

  get calibrated() { return !!this.base; }
  /** Rakʿāt finished so far (after the 2nd sujūd of the current one, it counts too). */
  get completed() { return this.rakah - 1 + (this.sujud >= 2 ? 1 : 0); }

  /** A spoken «الله أكبر» (from the recitation tracker): the next posture change may be confirmed sooner. */
  speechCue(t: number) { this.cueAt = t; }

  /** One accelerometer sample (m/s², incl. gravity) at time `t` (ms). */
  push(t: number, a: V3): MotionEvent[] {
    if (this.startAt == null) this.startAt = t;
    const dt = this.lastT ? Math.min(0.2, Math.max(0.001, (t - this.lastT) / 1000)) : 0.016;
    this.lastT = t;

    // 1. Calibration: 3 s of standing still (restarts while the phone is moved, e.g. into the pocket).
    if (!this.base) {
      const mean = this.calib.length ? this.calib.reduce<V3>((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]).map((x) => x / this.calib.length) as V3 : a;
      const still = Math.abs(norm(a) - 9.81) < 1.2 && angle(a, mean) < 8;
      if (!still) { this.calib = []; this.calibStill = t; return []; }
      if (!this.calib.length) this.calibStill = t;
      this.calib.push(a);
      if (t - this.calibStill < CALIBRATION_MS) return [];
      this.base = this.calib.reduce<V3>((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]).map((x) => x / this.calib.length) as V3;
      this.g = [...this.base];
      this.gMag = norm(this.base);
      this.stable = "STAND"; this.posture = "QIYAM"; this.height = 0;
      return [{ type: "calibrated" }, { type: "posture", posture: "QIYAM", rakah: this.rakah }];
    }

    // 2. Low-pass gravity, tilt, vertical acceleration.
    const alpha = dt / (this.b.tau + dt);
    const g = this.g!;
    for (let i = 0; i < 3; i++) g[i] = g[i]! + alpha * (a[i]! - g[i]!);
    this.tilt = angle(g, this.base);
    const lin: V3 = [a[0] - g[0], a[1] - g[1], a[2] - g[2]];
    // Vertical acceleration from the magnitude: turning the phone does not change |a|, moving up / down
    // does (+ = up, in either sign convention of the platform). The filtered gravity lags while turning,
    // so a projection on it would read every bow as a fall.
    const av = norm(a) - this.gMag;
    const out: MotionEvent[] = [];

    // 3. Height from movement segments (chest / jacket).
    if (this.placement !== "trousers") {
      // Smoothed over ~0.25 s, so sensor noise and the sway of standing are not taken for movement.
      const k = dt / (0.25 + dt);
      this.avS += k * (av - this.avS);
      this.linS += k * (norm(lin) - this.linS);
      const quiet = this.linS < QUIET_LIN && Math.abs(this.avS) < QUIET_AV;
      // The last 0.8 s before a movement is noticed belong to it (its first, gentle acceleration).
      this.pre.push({ t, av });
      while (this.pre.length && t - this.pre[0]!.t > 800) this.pre.shift();
      if (!quiet) { if (!this.moving) { this.moving = true; this.seg = [...this.pre]; } else this.seg.push({ t, av }); this.quietSince = 0; }
      else if (this.moving) {
        this.seg.push({ t, av });
        if (!this.quietSince) this.quietSince = t;
        if (t - this.quietSince >= QUIET_MS) {
          this.moving = false;
          // A posture confirmed during this movement fixed the height already (e.g. sujūd = −1 m).
          this.height = this.anchor ?? Math.max(-1.3, Math.min(0.25, this.height + segmentRise(this.seg)));
          this.anchor = null; this.seg = [];
        }
      }
    }

    // 4. Raw posture candidate → stable after the hold time.
    const raw = this.classify();
    if (raw !== this.cand) { this.cand = raw; this.candSince = t; }
    const hold = t - this.cueAt < 2500 ? HOLD_AFTER_TAKBIR_MS : HOLD_MS;
    // Standing vs sitting through a chest / jacket pocket depends on the height: wait until the movement ended.
    const needsHeight = this.placement !== "trousers" && (raw === "STAND" || raw === "SIT");
    if (raw && raw !== this.stable && t - this.candSince >= hold && !(needsHeight && this.moving)) {
      this.stable = raw;
      out.push(...this.onPosture(raw, t));
    }

    // 5. Lingering in the sitting after a second sujūd.
    if (this.posture === "TASHAHHUD" && !this.reminded && this.target != null) {
      const done = this.completed;
      if (done < this.target) {
        const middle = this.prayer === "qiyam" ? done % 2 === 0 : done === 2 && this.target > 2;
        if (t - this.sitSince >= (middle ? MIDDLE_TASHAHHUD_MAX_MS : TOO_FEW_MS)) { this.reminded = true; out.push({ type: "tooFew", completed: done }); }
      }
    }
    return out;
  }

  private classify(): RawPosture | null {
    const th = this.tilt, b = this.b;
    if (this.placement === "trousers") {
      if (th < b.upright) return "STAND";
      if (th >= b.sujudMin && th <= (b.sujudMax ?? 180)) return "PROSTRATE";
      if (th >= (b.sitMin ?? 180)) return "SIT";
      return null;
    }
    if (th < b.upright) return this.height > -0.3 ? "STAND" : "SIT";
    if (th >= b.sujudMin || (th >= b.bowMin && this.height < -0.55)) return "PROSTRATE";
    if (th >= b.bowMin) return "BOW";
    return null;
  }

  private setHeight(h: number) { this.height = h; if (this.moving) this.anchor = h; }

  private set(p: Posture, out: MotionEvent[]) { if (p !== this.posture) { this.posture = p; out.push({ type: "posture", posture: p, rakah: this.rakah }); } }

  private onPosture(raw: RawPosture, t: number): MotionEvent[] {
    const out: MotionEvent[] = [];
    if (raw === "STAND") {
      if (this.sujud >= 2) {
        const completed = this.rakah;
        this.rakah++; this.sujud = 0; this.bowed = false; this.reminded = false;
        this.setHeight(0);
        this.set("QIYAM", out);
        out.push({ type: "newRakah", rakah: this.rakah });
        if (this.target != null && completed >= this.target) out.push({ type: "tooMany", completed });
      } else if (this.bowed && this.sujud === 0) this.set("ITIDAL", out);
      else if (this.sujud === 0) { this.setHeight(Math.max(this.height, -0.1)); this.set("QIYAM", out); }
    } else if (raw === "BOW") {
      if (this.sujud === 0) { this.bowed = true; this.setHeight(Math.min(this.height, -0.2)); this.set("RUKU", out); out.push({ type: "mute" }); }
    } else if (raw === "PROSTRATE") {
      this.setHeight(-1);
      if (this.sujud === 0) { this.sujud = 1; this.set("SUJUD_1", out); out.push({ type: "mute" }); }
      else if (this.sujud === 1 && this.posture === "JALSA") { this.sujud = 2; this.set("SUJUD_2", out); out.push({ type: "mute" }); }
    } else if (raw === "SIT") {
      if (this.sujud === 1) this.set("JALSA", out);
      else if (this.sujud >= 2 && this.posture !== "TASHAHHUD") { this.sitSince = t; this.set("TASHAHHUD", out); }
    }
    return out;
  }
}

/** Height change of one movement (m): double integration along gravity, velocity forced to 0 at the end. */
export function segmentRise(seg: readonly { t: number; av: number }[]): number {
  if (seg.length < 3) return 0;
  const v: number[] = [0];
  for (let i = 1; i < seg.length; i++) {
    const dt = (seg[i]!.t - seg[i - 1]!.t) / 1000;
    v.push(v[i - 1]! + ((seg[i]!.av + seg[i - 1]!.av) / 2) * dt);
  }
  const T = (seg[seg.length - 1]!.t - seg[0]!.t) / 1000 || 1;
  const drift = v[v.length - 1]! / T;
  let h = 0;
  for (let i = 1; i < seg.length; i++) {
    const dt = (seg[i]!.t - seg[i - 1]!.t) / 1000;
    const t0 = (seg[i - 1]!.t - seg[0]!.t) / 1000, t1 = (seg[i]!.t - seg[0]!.t) / 1000;
    h += (((v[i - 1]! - drift * t0) + (v[i]! - drift * t1)) / 2) * dt;
  }
  return Math.max(-1.4, Math.min(1.4, h));
}

/* ───────────── sensors ───────────── */

type AccelEvent = { accelerationIncludingGravity?: { x: number | null; y: number | null; z: number | null } | null };

/**
 * iOS asks for motion access, and only inside a tap: call this from the Start button. Android / desktop
 * need no permission. Resolves false when access was refused.
 */
export async function requestMotionPermission(): Promise<boolean> {
  const D = (globalThis as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
  if (D?.requestPermission) {
    // iOS: a dialog (inside the tap). Newer Chromium has the method too and answers at once.
    try { return (await D.requestPermission()) === "granted"; } catch { return !/iPad|iPhone|iPod/.test(navigator.userAgent); }
  }
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

/**
 * Starts the accelerometer (@capacitor/motion: `accel`, i.e. devicemotion incl. gravity) and feeds `core`.
 * Returns a stop function. `onEvents` receives every non-empty batch of events.
 */
export async function startMotionSensors(core: MotionCore, onEvents: (e: MotionEvent[]) => void): Promise<() => void> {
  const { Motion } = await import("@capacitor/motion");
  const handle = await Motion.addListener("accel", (ev: AccelEvent) => {
    const g = ev.accelerationIncludingGravity;
    if (!g || g.x == null || g.y == null || g.z == null) return;
    const out = core.push(performance.now(), [g.x, g.y, g.z]);
    if (out.length) onEvents(out);
  });
  return () => { void handle.remove(); };
}
