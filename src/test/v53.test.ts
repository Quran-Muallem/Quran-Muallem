import { describe, it, expect } from "vitest";
import { PROPHETS, QURAN_STORIES, STORY_LANGS } from "@/lib/stories";
import { KIDS_TAFSIR } from "@/lib/kidsTafsir";
import MIRACLES from "@/data/miracles.json";
import { MIRACLE_IDS } from "@/components/stories/MiracleIcon";
import { instantLiveMistakes, firstNewError } from "@/lib/liveMistakes";
import fs from "node:fs";
import path from "node:path";

const full = (t: unknown, where: string) => {
  for (const l of STORY_LANGS) expect((t as Record<string, string>)[l], `${where}.${l}`).toBeTruthy();
};

describe("v53 – 13-language stories", () => {
  it("every prophet & Quran story is fully localized incl. deep sections", () => {
    for (const s of [...PROPHETS, ...QURAN_STORIES]) {
      full(s.name, `${s.id}.name`);
      full(s.era, `${s.id}.era`);
      full(s.lesson, `${s.id}.lesson`);
      s.chapters.forEach((c, i) => { full(c.title, `${s.id}.ch${i}.title`); full(c.text, `${s.id}.ch${i}.text`); });
      expect(s.context, `${s.id}.context`).toBeTruthy();
      full(s.context, `${s.id}.context`);
      expect(s.reflections?.length, `${s.id}.reflections`).toBe(3);
      s.reflections!.forEach((r, i) => full(r, `${s.id}.refl${i}`));
    }
  });
  it("every kids tafsir entry is fully localized", () => {
    for (const e of KIDS_TAFSIR) for (const k of ["title", "say", "story", "deed"] as const) full(e[k], `${e.id}.${k}`);
  });
  it("every prophet has a miracle icon and localized miracle name", () => {
    const M = MIRACLES as Record<string, Record<string, string>>;
    for (const p of PROPHETS) {
      expect(MIRACLE_IDS).toContain(p.id);
      full(M[p.id], `miracle.${p.id}`);
    }
  });
});

describe("v53 – no 4-point sparkles", () => {
  it("source has no ✨ ✦ ✧ 🌟", () => {
    const bad = /[✨✦✧🌟]/u;
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((f) => {
      const p = path.join(d, f.name);
      return f.isDirectory() ? walk(p) : /\.(tsx?|json|css)$/.test(f.name) ? [p] : [];
    });
    const hits = walk(path.resolve(__dirname, "..")).filter((p) => !p.includes(`${path.sep}test${path.sep}`) && bad.test(fs.readFileSync(p, "utf8")));
    expect(hits).toEqual([]);
  });
});

describe("v53 – instant correction", () => {
  it("only words behind the cursor are judged; first new error is reported once", () => {
    const st = ["CORRECT", "ERROR", "ERROR", "PENDING"] as never[];
    const out = instantLiveMistakes(st, 2) as string[];
    expect(out[1]).toBe("ERROR");
    expect(out[2]).toBe("PENDING");
    const ann = new Set<number>();
    expect(firstNewError(st, ann)).toBe(1);
  });
});
