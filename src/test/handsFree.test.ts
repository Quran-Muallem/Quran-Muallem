import { describe, expect, it } from "vitest";
import { HandsFreeTracker } from "@/lib/HandsFreeHifdhService";
import type { LiveMatch, LiveStatus } from "@/lib/quranMatcher";

const match = (statuses: LiveStatus[], cursor: number, done = false): LiveMatch => ({
  statuses, cursor, done, counts: { correct: 0, warning: 0, error: 0, extra: 0 }, recited: statuses.filter((s) => s === "CORRECT").length, total: statuses.length, accuracy: 100, heard: [],
});

describe("HandsFreeTracker (v45)", () => {
  it("listens, locks on, prompts after a stall, goes idle and logs", () => {
    const t = new HandsFreeTracker({ silenceMs: 3500, idleMs: 15_000 });
    expect(t.start(0)).toEqual([{ type: "state", state: "IDLE_LISTENING" }]);
    // Noise / talk: nothing located → nothing happens, never a prompt.
    expect(t.tick({ now: 20_000, match: match(["PENDING"], 0), voiced: 0 })).toEqual([]);
    const lock = t.onLocated({ surah: 67, ayah: 1 }, 21_000);
    expect(lock).toEqual([{ type: "state", state: "ACTIVE_MEMORIZATION" }, { type: "locked", surah: 67, ayah: 1 }]);
    const st: LiveStatus[] = ["CORRECT", "CORRECT", "CORRECT", "CORRECT", "PENDING", "PENDING"];
    t.heard(22_000);
    expect(t.tick({ now: 22_000, match: match(st, 4), voiced: 1, ayahOfToken: () => 1 })).toEqual([]);
    expect(t.tick({ now: 25_600, match: match(st, 4), voiced: 0 })).toEqual([{ type: "prompt", token: 4, reason: "stall", mode: "words" }]);
    // 15 s of complete silence after the prompt → idle, with the log entry.
    const idle = t.tick({ now: 41_000, match: match(st, 4), voiced: 0 });
    expect(idle[0]).toMatchObject({ type: "idle", entry: { surah: 67, fromAyah: 1, toAyah: 1, words: 4, prompts: 1 } });
    expect(t.state).toBe("IDLE_LISTENING");
  });

  it("prompts the correct continuation after a slip into a similar verse", () => {
    const t = new HandsFreeTracker({ silenceMs: 5000 });
    t.start(0); t.onLocated({ surah: 2, ayah: 1 }, 0);
    t.heard(1000);
    t.tick({ now: 1000, match: match(["CORRECT", "CORRECT", "ERROR", "ERROR", "PENDING"], 4), voiced: 1 });
    expect(t.tick({ now: 3100, match: match(["CORRECT", "CORRECT", "ERROR", "ERROR", "PENDING"], 4), voiced: 0 })).toEqual([{ type: "prompt", token: 2, reason: "mistake", mode: "words" }]);
  });

  it("logs nothing when no word was recited, and stops cleanly", () => {
    const t = new HandsFreeTracker({ idleMs: 30_000 });
    t.start(0); t.onLocated({ surah: 112, ayah: 1 }, 0);
    expect(t.tick({ now: 29_000, match: match(["PENDING"], 0), voiced: 0 })).toEqual([]);
    expect(t.tick({ now: 31_000, match: match(["PENDING"], 0), voiced: 0 })[0]).toEqual({ type: "idle", entry: null });
    expect(t.stop(32_000)).toEqual([{ type: "state", state: "OFF" }]);
  });

  it("repeats the prompt on a headset button", () => {
    const t = new HandsFreeTracker();
    t.start(0); t.onLocated({ surah: 1, ayah: 1 }, 0);
    expect(t.repeat(100, match(["CORRECT", "PENDING"], 1))).toEqual([{ type: "prompt", token: 1, reason: "stall", mode: "words" }]);
  });
});
