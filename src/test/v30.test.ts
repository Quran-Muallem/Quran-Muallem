import { describe, expect, it } from "vitest";
import { addToOpen, recordingParts } from "@/lib/recordingParts";
import { DEFAULT_SETTINGS, PLAYBACK_RATES, cleanSettings } from "@/lib/settings";

const w = (key: string, status: "CORRECT" | "WARNING" | "ERROR" | "PENDING") => ({ key, status });

describe("v30 one recording per surah across pages", () => {
  it("Al-Balad over two pages → one part 90:1–20 with the accuracy of all its words", () => {
    const page1 = recordingParts([w("90:1:1", "CORRECT"), w("90:1:2", "CORRECT"), w("90:18:1", "ERROR")]);
    const page2 = recordingParts([w("90:19:1", "CORRECT"), w("90:20:1", "CORRECT"), w("90:20:2", "WARNING")]);
    const open = addToOpen(addToOpen(new Map(), page1), page2);
    const p = open.get(90)!;
    expect([p.fromAyah, p.toAyah]).toEqual([1, 20]);
    expect(p.words).toBe(6);
    expect(p.accuracy).toBe(Math.round(((4 + 0.5) / 6) * 100));
  });
  it("a verse split across the page edge is counted once", () => {
    const open = addToOpen(addToOpen(new Map(), recordingParts([w("90:10:1", "CORRECT")])), recordingParts([w("90:10:2", "CORRECT")]));
    expect(open.get(90)!.verses).toEqual(["90:10"]);
  });
  it("different surahs stay apart", () => {
    const open = addToOpen(new Map(), recordingParts([w("89:30:1", "CORRECT"), w("90:1:1", "CORRECT")]));
    expect([...open.keys()]).toEqual([89, 90]);
  });
});

describe("v30 settings", () => {
  it("defaults and cleaning", () => {
    expect(DEFAULT_SETTINGS.errorDetection).toBe(true);
    expect(DEFAULT_SETTINGS.saveRecordings).toBe(true);
    expect(PLAYBACK_RATES).toEqual([0.5, 0.75, 1, 1.25, 1.5, 1.75]);
    const s = cleanSettings({ ...DEFAULT_SETTINGS, playbackRate: 3, mistakeSoundType: "x", sessionSound: 1 } as never);
    expect(s.playbackRate).toBe(1);
    expect(s.mistakeSoundType).toBe("tone");
    expect(s.sessionSound).toBe(true);
  });
});
