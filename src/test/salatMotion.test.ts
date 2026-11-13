import { describe, expect, it } from "vitest";
import { MotionCore, segmentRise, targetRakaat, fatihaOnlyRakah, type MotionEvent, type Placement, type PrayerId } from "@/lib/SalatMotionTracker";

/** Postures as (tilt °, height m) per placement. */
const POSE: Record<Placement, Record<string, [number, number]>> = {
  chest: { stand: [0, 0], bow: [88, -0.3], sujud: [128, -1.0], sit: [8, -0.5] },
  jacket: { stand: [0, 0], bow: [85, -0.3], sujud: [125, -1.0], sit: [10, -0.5] },
  trousers: { stand: [0, 0], bow: [6, -0.05], sujud: [42, -0.7], sit: [88, -0.6] },
};

/** Synthetic accelerometer for a sequence of [pose, seconds held]; 1.5 s smooth transitions, 60 Hz, light noise. */
export function simulate(placement: Placement, steps: [string, number][], seed = 1, moveS = 1.5, noiseAmp = 0.12) {
  let r = seed;
  const noise = () => { r = (r * 16807) % 2147483647; return (r / 2147483647 - 0.5) * noiseAmp; };
  // segments: {t0, t1, from, to}
  type P = { th: number; z: number };
  const segs: { t0: number; t1: number; from: P; to: P }[] = [];
  let t = 0, cur: P = { th: 0, z: 0 };
  for (const [pose, hold] of steps) {
    const [th, z] = POSE[placement][pose]!;
    const to = { th, z };
    segs.push({ t0: t, t1: t + moveS, from: cur, to }); t += moveS;
    segs.push({ t0: t, t1: t + hold, from: to, to }); t += hold;
    cur = to;
  }
  const at = (tt: number): P => {
    const sg = segs.find((x) => tt >= x.t0 && tt < x.t1) ?? (tt < 0 ? segs[0]! : segs[segs.length - 1]!);
    const u = Math.min(1, Math.max(0, (tt - sg.t0) / ((sg.t1 - sg.t0) || 1))), e = (1 - Math.cos(Math.PI * u)) / 2;
    if (tt < 0) return sg.from;
    return { th: sg.from.th + (sg.to.th - sg.from.th) * e, z: sg.from.z + (sg.to.z - sg.from.z) * e };
  };
  const dt = 1 / 60, samples: { t: number; a: [number, number, number] }[] = [];
  for (let s = 0; s < t; s += dt) {
    const p = at(s), z0 = at(s - dt).z, z1 = at(s + dt).z;
    const aUp = (z1 - 2 * p.z + z0) / (dt * dt);
    const rad = (p.th * Math.PI) / 180, m = 9.81 + aUp;
    samples.push({ t: s * 1000, a: [noise(), m * Math.cos(rad) + noise(), m * Math.sin(rad) + noise()] });
  }
  return samples;
}

function run(placement: Placement, prayer: PrayerId, target: number | null, steps: [string, number][], moveS = 1.5, seed = 1, noiseAmp = 0.12) {
  const core = new MotionCore({ placement, prayer, target });
  const events: { t: number; e: MotionEvent }[] = [];
  for (const s of simulate(placement, [["stand", 4], ...steps], seed, moveS, noiseAmp)) for (const e of core.push(s.t, s.a)) events.push({ t: s.t, e });
  return { core, events, postures: events.filter((x) => x.e.type === "posture").map((x) => (x.e as { posture: string }).posture) };
}

const rakah = (placement: Placement): [string, number][] => placement === "trousers"
  ? [["stand", 25], ["sujud", 4], ["sit", 3], ["sujud", 4]]
  : [["stand", 25], ["bow", 4], ["stand", 3], ["sujud", 4], ["sit", 3], ["sujud", 4]];

describe("SalatMotionTracker", () => {
  it("integrates a rise of about one metre", () => {
    const seg = Array.from({ length: 121 }, (_, i) => { const t = i / 60; return { t: t * 1000, av: 0.5 * Math.PI * Math.PI / 4 * Math.cos((Math.PI * t) / 2) * 2 / 2 }; });
    // z = 0.5·(1 − cos(πt/2)) → rise 1 m in 2 s; a = 0.5·(π/2)²·cos(πt/2)
    const seg2 = Array.from({ length: 121 }, (_, i) => { const t = i / 60; return { t: t * 1000, av: 0.5 * (Math.PI / 2) ** 2 * Math.cos((Math.PI * t) / 2) }; });
    expect(segmentRise(seg2)).toBeCloseTo(1, 1);
    expect(seg.length).toBe(121);
  });

  for (const placement of ["chest", "jacket", "trousers"] as Placement[]) {
    it(`counts a 2-rakʿah prayer (${placement})`, () => {
      const { core, events, postures } = run(placement, "fajr", 2, [...rakah(placement), ["stand", 3], ...rakah(placement).slice(1), ["sit", 6]]);
      expect(events[0]!.e.type).toBe("calibrated");
      expect(postures).toContain("SUJUD_1");
      expect(postures).toContain("JALSA");
      expect(postures).toContain("SUJUD_2");
      if (placement !== "trousers") expect(postures).toContain("RUKU");
      // A short iʿtidāl is seen through a chest pocket; the jacket's slow filter may skip it (counting does not need it).
      if (placement === "chest") expect(postures).toContain("ITIDAL");
      expect(events.filter((x) => x.e.type === "newRakah").length).toBe(1);
      expect(core.rakah).toBe(2);
      expect(core.posture).toBe("TASHAHHUD");
      expect(events.some((x) => x.e.type === "tooMany" || x.e.type === "tooFew")).toBe(false);
    });

    it(`reminds when standing up for an extra rakʿah (${placement})`, () => {
      const { events } = run(placement, "fajr", 2, [...rakah(placement), ...rakah(placement), ["sit", 3], ["stand", 4]]);
      const tm = events.filter((x) => x.e.type === "tooMany");
      expect(tm.length).toBe(1);
      expect(tm[0]!.e).toMatchObject({ completed: 2 });
    });

    it(`reminds when sitting to end after too few rakʿāt (${placement})`, () => {
      const { events } = run(placement, "dhuhr", 4, [...rakah(placement), ["sit", 12]]);
      expect(events.filter((x) => x.e.type === "tooFew").map((x) => x.e)).toEqual([{ type: "tooFew", completed: 1 }]);
    });
  }

  it("allows the middle tashahhud of a 4-rakʿah prayer, but not forever", () => {
    const short = run("trousers", "isha", 4, [...rakah("trousers"), ...rakah("trousers"), ["sit", 30], ["stand", 5]]);
    expect(short.events.some((x) => x.e.type === "tooFew")).toBe(false);
    expect(short.core.rakah).toBe(3);
    const long = run("trousers", "isha", 4, [...rakah("trousers"), ...rakah("trousers"), ["sit", 95]]);
    expect(long.events.filter((x) => x.e.type === "tooFew").length).toBe(1);
  });

  it("asks for nothing in an open Qiyām al-Layl", () => {
    const { events, core } = run("trousers", "qiyam", null, [...rakah("trousers"), ...rakah("trousers"), ...rakah("trousers"), ["sit", 20]]);
    expect(events.some((x) => x.e.type === "tooFew" || x.e.type === "tooMany")).toBe(false);
    expect(core.rakah).toBe(3);
  });

  it("mutes at rukūʿ and sujūd", () => {
    const { events } = run("chest", "fajr", 2, rakah("chest"));
    expect(events.filter((x) => x.e.type === "mute").length).toBe(3);
  });

  it("knows the prayers' rakʿāt and the Fātiḥah-only rakʿāt", () => {
    expect([targetRakaat("fajr", null), targetRakaat("maghrib", null), targetRakaat("isha", null), targetRakaat("qiyam", 6), targetRakaat("qiyam", null)]).toEqual([2, 3, 4, 6, null]);
    expect([fatihaOnlyRakah("isha", 3), fatihaOnlyRakah("maghrib", 3), fatihaOnlyRakah("isha", 2), fatihaOnlyRakah("fajr", 2), fatihaOnlyRakah("qiyam", 3)]).toEqual([true, true, false, false, false]);
  });

  it("calibrates only once the phone has been still for 3 s", () => {
    const core = new MotionCore({ placement: "chest", prayer: "fajr", target: 2 });
    let t = 0, ev: MotionEvent[] = [];
    for (; t < 2000; t += 16) ev = core.push(t, [Math.sin(t / 50) * 4, 9.81, Math.cos(t / 70) * 4]); // carried into the pocket
    expect(core.calibrated).toBe(false);
    for (; t < 5200; t += 16) ev = ev.concat(core.push(t, [0, 9.81, 0]));
    expect(core.calibrated).toBe(true);
    expect(ev[0]).toEqual({ type: "calibrated" });
  });

  for (const moveS of [1.0, 2.2]) for (const placement of ["chest", "trousers"] as Placement[]) {
    it(`counts 3 rakʿāt of Maghrib with ${moveS} s movements (${placement})`, () => {
      const r = rakah(placement);
      const { core, events } = run(placement, "maghrib", 3, [...r, ...r, ["sit", 20], ...r, ["sit", 10]], moveS, 7);
      expect(core.rakah).toBe(3);
      expect(core.posture).toBe("TASHAHHUD");
      expect(events.some((x) => x.e.type === "tooMany" || x.e.type === "tooFew")).toBe(false);
    });
  }

  for (const placement of ["chest", "jacket", "trousers"] as Placement[]) {
    it(`copes with a noisy sensor (±0.4 m/s², ${placement})`, () => {
      const r = rakah(placement);
      const { core, events } = run(placement, "fajr", 2, [...r, ...r, ["sit", 10]], 1.5, 3, 0.8);
      expect(core.rakah).toBe(2);
      expect(core.posture).toBe("TASHAHHUD");
      expect(events.some((x) => x.e.type === "tooMany" || x.e.type === "tooFew")).toBe(false);
    });
  }
});
