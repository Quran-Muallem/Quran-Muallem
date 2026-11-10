// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const settle = <T,>(pr: Promise<T>, ms = 500) => Promise.race([pr.then((v) => ({ v })), new Promise<"hang">((r) => setTimeout(() => r("hang"), ms))]);

describe("v31 with the real @capacitor/core on a simulated Android bridge", () => {
  it("backgroundAudio() resolves to a usable plugin on Android", async () => {
    vi.resetModules();
    const w = window as unknown as Record<string, unknown>;
    w["androidBridge"] = { postMessage: () => {} };
    w["Capacitor"] = { PluginHeaders: [{ name: "BackgroundAudio", methods: [{ name: "stop", rtype: "promise" }, { name: "cancelDownload", rtype: "promise" }] }] };
    const { Capacitor, registerPlugin } = await import("@capacitor/core");
    expect(Capacitor.getPlatform()).toBe("android");
    // (A raw registerPlugin() result returned from a promise hangs here — Capacitor calls the native
    // method "then", which does not exist; see src/lib/thenSafe.ts and v31.test.ts.)
    expect(typeof registerPlugin).toBe("function");
    const { backgroundAudio } = await import("@/lib/audioPlayback");
    const r = await settle(backgroundAudio());
    expect(r).not.toBe("hang");
    expect((r as { v: unknown }).v).not.toBeNull();
  });
});
