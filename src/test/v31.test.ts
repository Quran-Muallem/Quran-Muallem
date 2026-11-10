import { describe, expect, it } from "vitest";
import { thenSafe } from "@/lib/thenSafe";

/** Like a Capacitor plugin on Android: every property is a native call; `then` never settles. */
function fakeNativePlugin() {
  const calls: string[] = [];
  const p = new Proxy({}, {
    get: (_t, key) => (...args: unknown[]) => { calls.push(String(key)); return key === "then" ? undefined : Promise.resolve({ key, args }); },
  }) as { download(o: object): Promise<{ key: string }>; then?: unknown };
  return { p, calls };
}
const settle = <T,>(pr: Promise<T>, ms = 300) => Promise.race([pr.then((v) => ({ v })), new Promise<"hang">((r) => setTimeout(() => r("hang"), ms))]);

describe("v31 plugin proxies through promises", () => {
  it("a raw plugin returned from a promise never settles (the Android hang)", async () => {
    const { p } = fakeNativePlugin();
    expect(await settle(Promise.resolve().then(() => p))).toBe("hang");
  });
  it("thenSafe: the promise resolves and calls reach the plugin", async () => {
    const { p, calls } = fakeNativePlugin();
    const r = await settle(Promise.resolve().then(() => thenSafe(p)));
    expect(r).not.toBe("hang");
    const plugin = (r as { v: typeof p }).v;
    await expect(plugin.download({ id: "x" })).resolves.toMatchObject({ key: "download" });
    expect(calls).toEqual(["download"]);
  });
});
