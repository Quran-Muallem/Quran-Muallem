import { beforeEach, describe, expect, it } from "vitest";
import {
  emptyProgress, exportProgressJson, getDueRanges, getProgress, getStats, importProgressJson, localDate, parseBackup,
  recordAttempt, resetProgress, setLastPosition, verseStatus,
} from "@/lib/progressStorage";

const day = (iso: string) => new Date(`${iso}T10:00:00`);

describe("progressStorage", () => {
  beforeEach(async () => { localStorage.clear(); await resetProgress(); });

  it("marks verses memorized at ≥90% in memorization mode and schedules reviews", async () => {
    await recordAttempt({ surahId: 112, mode: "MEMORIZATION_MODE", now: day("2026-01-01"), results: [
      { ayahId: 1, accuracy: 100, correctWords: 4, totalWords: 4 },
      { ayahId: 2, accuracy: 70, correctWords: 1, totalWords: 2 },
    ] });
    const p = getProgress();
    expect(verseStatus(p, 112, 1)).toBe("MEMORIZED");
    expect(verseStatus(p, 112, 2)).toBe("NEEDS_REVISION");
    expect(p.verses["112:1"]?.nextReview).toBe("2026-01-02");
    expect(p.lastPosition).toMatchObject({ surahId: 112, ayahId: 2 });
    // On the next day both are due.
    expect(getDueRanges(p, "2026-01-02")).toEqual([{ surahId: 112, fromAyah: 1, toAyah: 2, count: 2, overdueDays: 0 }]);
  });

  it("grows the interval on repeated success", async () => {
    for (const d of ["2026-01-01", "2026-01-02", "2026-01-05"]) {
      await recordAttempt({ surahId: 1, mode: "MEMORIZATION_MODE", now: day(d), results: [{ ayahId: 1, accuracy: 95, correctWords: 4, totalWords: 4 }] });
    }
    expect(getProgress().verses["1:1"]?.intervalDays).toBe(7);
  });

  it("counts streaks by local day and resets after a gap", async () => {
    const r = [{ ayahId: 1, accuracy: 80, correctWords: 3, totalWords: 4 }];
    await recordAttempt({ surahId: 1, mode: "RECITATION_MODE", now: day("2026-03-01"), results: r });
    await recordAttempt({ surahId: 1, mode: "RECITATION_MODE", now: day("2026-03-02"), results: r });
    await recordAttempt({ surahId: 1, mode: "RECITATION_MODE", now: day("2026-03-02"), results: r });
    expect(getProgress().streak.current).toBe(2);
    expect(getStats(getProgress(), "2026-03-03").streak).toBe(2);
    expect(getStats(getProgress(), "2026-03-05").streak).toBe(0);
    await recordAttempt({ surahId: 1, mode: "RECITATION_MODE", now: day("2026-03-05"), results: r });
    expect(getProgress().streak).toMatchObject({ current: 1, longest: 2 });
  });

  it("recitation mode does not mark verses memorized", async () => {
    await recordAttempt({ surahId: 1, mode: "RECITATION_MODE", results: [{ ayahId: 3, accuracy: 100, correctWords: 2, totalWords: 2 }] });
    expect(verseStatus(getProgress(), 1, 3)).toBe("NEW");
    expect(getProgress().verses["1:3"]?.lastAccuracy).toBe(100);
  });

  it("exports, validates and merges backups", async () => {
    await setLastPosition(2, 255, "READING");
    await recordAttempt({ surahId: 67, mode: "MEMORIZATION_MODE", results: [{ ayahId: 1, accuracy: 100, correctWords: 9, totalWords: 9 }] });
    const json = exportProgressJson();
    expect(() => parseBackup("{}")).toThrow();
    expect(() => parseBackup("not json")).toThrow();
    await resetProgress();
    expect(getProgress().verses).toEqual({});
    await importProgressJson(json, "merge");
    expect(verseStatus(getProgress(), 67, 1)).toBe("MEMORIZED");
    await importProgressJson(JSON.stringify({ app: "quran.muallem/progress", exportedAt: "", progress: emptyProgress() }), "replace");
    expect(getProgress().verses).toEqual({});
    // backups made under the old app id still import
    await importProgressJson(json.replace("quran.muallem/progress", "com.hifz.quran.ai/progress"), "merge");
    expect(verseStatus(getProgress(), 67, 1)).toBe("MEMORIZED");
  });

  it("uses local dates", () => expect(localDate(new Date(2026, 0, 9))).toBe("2026-01-09"));
});
