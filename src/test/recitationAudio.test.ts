import { beforeEach, describe, expect, it } from "vitest";
import { addToIndex, deleteRecording, getRecordings, recordingForRange, recordingForVerse, saveRecording, recordingUrl, type RecordingMeta } from "@/lib/audioStorage";
import { matchesReciter } from "@/lib/reciterSearch";
import { RECITERS } from "@/lib/reciterManager";

const rec = (id: string, surah: number, from: number, to: number, at: string): RecordingMeta =>
  ({ id, surah, fromAyah: from, toAyah: to, createdAt: at, seconds: 5, mime: "audio/webm", bytes: 100 });

describe("recording index", () => {
  it("finds the newest recording covering a verse or a range", () => {
    const list = [rec("a", 1, 1, 3, "2026-01-01"), rec("b", 1, 2, 5, "2026-02-01"), rec("c", 2, 1, 1, "2026-03-01")];
    expect(recordingForVerse(list, 1, 1)?.id).toBe("a");
    expect(recordingForVerse(list, 1, 3)?.id).toBe("b");
    expect(recordingForVerse(list, 1, 6)).toBe(null);
    expect(recordingForRange(list, 1, 2, 5)?.id).toBe("b");
    expect(recordingForRange(list, 1, 1, 7)?.id).toBe("a"); // same start verse
  });
  it("keeps every attempt (up to the limits per range and in all)", () => {
    const [next, removed] = addToIndex([rec("a", 1, 1, 3, "2026-01-01")], rec("b", 1, 1, 3, "2026-02-01"));
    expect(next.map((r) => r.id)).toEqual(["b", "a"]);
    expect(removed).toEqual([]);
    const [two, gone] = addToIndex([rec("a", 1, 1, 3, "2026-01-01"), rec("b", 1, 1, 3, "2026-02-01")], rec("c", 1, 1, 3, "2026-03-01"), 200, 2);
    expect(two.map((r) => r.id)).toEqual(["c", "b"]);
    expect(gone.map((r) => r.id)).toEqual(["a"]);
    const [capped, dropped] = addToIndex([rec("x", 1, 1, 1, "2026-01-01"), rec("y", 1, 2, 2, "2026-01-02")], rec("z", 1, 3, 3, "2026-01-03"), 2);
    expect(capped.map((r) => r.id)).toEqual(["z", "y"]);
    expect(dropped.map((r) => r.id)).toEqual(["x"]);
  });
});

describe("recording store (web: IndexedDB fallback)", () => {
  beforeEach(() => localStorage.clear());
  it("saves, finds and deletes a recording", async () => {
    const saved = await saveRecording({ surah: 112, fromAyah: 1, toAyah: 4, blob: new Blob(["abc"], { type: "audio/webm" }), seconds: 7.26 });
    expect(saved.seconds).toBe(7.3);
    expect(recordingForVerse(getRecordings(), 112, 3)?.id).toBe(saved.id);
    expect(await recordingUrl(saved)).not.toBe(null);
    await deleteRecording(saved.id);
    expect(recordingForVerse(getRecordings(), 112, 3)).toBe(null);
  });
});

describe("reciter search", () => {
  const find = (q: string) => RECITERS.filter((r) => matchesReciter(r, q)).map((r) => r.id);
  it("matches Arabic (with or without the article and diacritics) and English names", () => {
    expect(find("العفاسي")).toEqual(["alafasy"]);
    expect(find("عفاسي")).toEqual(["alafasy"]);
    expect(find("الحُصَري")).toEqual(["husary"]);
    expect(find("basit")).toEqual(["abdulbasit"]);
    expect(find("Shuraym")).toEqual(["shuraym"]);
    expect(find("")).toHaveLength(10);
  });
});

describe("no external AI services", () => {
  it("no source file talks to an AI or speech cloud API", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const files: string[] = [];
    const walk = (d: string) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(f) && !p.includes(`${path.sep}test${path.sep}`)) files.push(p); } };
    walk(path.join(process.cwd(), "src"));
    expect(files.length).toBeGreaterThan(20);
    const bad = files.filter((f) => /api\.groq\.com|api\.openai\.com|generativelanguage\.googleapis|api\.anthropic\.com/.test(fs.readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });
});
