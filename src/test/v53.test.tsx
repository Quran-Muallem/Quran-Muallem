import { describe, it, expect, vi } from "vitest";
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
    // v56.3: lucide's four-pointed «Sparkles» icon is the same AI sparkle in another form
    const lucide = walk(path.resolve(__dirname, "..")).filter((p) => !p.includes(`${path.sep}test${path.sep}`) && /\bSparkles\b[^\n]*from "lucide-react"|<Sparkles\b/.test(fs.readFileSync(p, "utf8")));
    expect(lucide).toEqual([]);
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

describe("v53.1 – Android back stack", () => {
  it("a back press closes the top layer only", async () => {
    const { renderHook } = await import("@testing-library/react");
    const { useBackLayer, backStackDepth } = await import("@/lib/backStack");
    const calls: string[] = [];
    const a = renderHook(({ on }) => useBackLayer(on, () => calls.push("menu")), { initialProps: { on: true } });
    const b = renderHook(({ on }) => useBackLayer(on, () => calls.push("settings")), { initialProps: { on: true } });
    expect(backStackDepth()).toBe(2);
    await new Promise((r) => setTimeout(r, 5));
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(calls).toEqual(["settings"]);
    b.rerender({ on: false }); a.unmount();
    expect(backStackDepth()).toBe(0);
  });
});

describe("v54.1 – crash boundary", () => {
  it("shows a card with the error instead of unmounting, and retries", async () => {
    const { render, screen, fireEvent } = await import("@testing-library/react");
    const { CrashBoundary } = await import("@/components/CrashBoundary");
    let boom = true;
    const Bomb = () => { if (boom) throw new Error("kaputt im Mushaf"); return <p>ok</p>; };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<CrashBoundary area="mushaf" copy={{ title: "T", body: "B", retry: "R", home: "H" }}><Bomb /></CrashBoundary>);
    expect(screen.getByRole("alert").textContent).toContain("kaputt im Mushaf");
    expect(JSON.parse(localStorage.getItem("qm.lastCrash")!).area).toBe("mushaf");
    boom = false;
    fireEvent.click(screen.getByText("R"));
    expect(screen.getByText("ok")).toBeTruthy();
    spy.mockRestore();
  });
});
