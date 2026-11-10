/**
 * «اختبار الاتصال» (v31): checks, on the reader's own phone, every way the reciters library reaches
 * cdn.mp3quran.net — so a failing download / playback shows WHERE it fails instead of spinning:
 *  1. environment: platform, whether the app's native audio plugin (BackgroundAudio, v29+) is built in;
 *  2. WebView fetch (first 64 KB, with CORS);
 *  3. WebView <audio> (metadata of the surah file);
 *  4. native download through the plugin (Android app only), the file removed again.
 * Each step has its own timeout; results are plain text the reader can copy and send.
 */
import { backgroundAudio } from "@/lib/audioPlayback";
import { isNativePlatform, platform } from "@/lib/storage";

export const TEST_URL = "https://cdn.mp3quran.net/audio/mishary-alafasy/r1/001.mp3";
export type TestStep = { id: string; ok: boolean | null; detail: string };

const withTimeout = <T,>(p: Promise<T>, ms: number, what: string) =>
  new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout after ${ms / 1000}s (${what})`)), ms);
    p.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
  });
const msg = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

export async function runConnectionTest(onStep: (s: TestStep) => void): Promise<TestStep[]> {
  const out: TestStep[] = [];
  const push = (s: TestStep) => { out.push(s); onStep(s); };
  const native = isNativePlatform();

  // 1 · environment
  let pluginOk = false;
  const na = await backgroundAudio().catch(() => null);
  if (native && na) {
    try { await withTimeout(na.cancelDownload({ id: "probe" }), 4000, "plugin"); pluginOk = true; }
    catch (e) { push({ id: "plugin", ok: false, detail: `BackgroundAudio plugin missing or old (${msg(e)}) – run "node scripts/native-permissions.mjs" before building` }); }
  }
  push({ id: "env", ok: true, detail: `platform=${platform()} native=${native} online=${typeof navigator !== "undefined" ? navigator.onLine : "?"} UA=${typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : ""}` });
  if (native && pluginOk) push({ id: "plugin", ok: true, detail: "BackgroundAudio plugin (native download + player) present" });

  // 2 · WebView fetch
  const t0 = performance.now();
  try {
    const ctrl = new AbortController();
    const res = await withTimeout(fetch(TEST_URL, { headers: { Range: "bytes=0-65535" }, signal: ctrl.signal }), 15000, "fetch");
    const buf = await withTimeout(res.arrayBuffer(), 15000, "body");
    push({ id: "fetch", ok: res.ok, detail: `HTTP ${res.status}, ${buf.byteLength} bytes in ${Math.round(performance.now() - t0)} ms, type=${res.type}` });
  } catch (e) { push({ id: "fetch", ok: false, detail: msg(e) }); }

  // 3 · <audio>
  const t1 = performance.now();
  try {
    const d = await withTimeout(new Promise<number>((resolve, reject) => {
      const a = new Audio();
      a.preload = "metadata";
      a.onloadedmetadata = () => { resolve(a.duration); a.src = ""; };
      a.onerror = () => reject(new Error(`MediaError code ${a.error?.code ?? "?"} ${a.error?.message ?? ""}`));
      a.src = TEST_URL;
      a.load();
    }), 15000, "audio");
    push({ id: "audio", ok: true, detail: `duration ${Math.round(d)} s, ${Math.round(performance.now() - t1)} ms` });
  } catch (e) { push({ id: "audio", ok: false, detail: msg(e) }); }

  // 4 · native download (Android app)
  if (native && pluginOk && na) {
    const t2 = performance.now();
    let got = 0, total = 0;
    const sub = await na.addListener("download", (e) => { if (e.id === "probe-dl") { got = e.received; total = e.total; } });
    try {
      const r = await withTimeout(na.download({ id: "probe-dl", url: TEST_URL, path: "quran-audio/_probe.mp3" }), 30000, `native download, ${got}/${total} bytes`);
      push({ id: "native", ok: true, detail: `${r.bytes} bytes in ${Math.round(performance.now() - t2)} ms` });
    } catch (e) {
      void na.cancelDownload({ id: "probe-dl" }).catch(() => {});
      push({ id: "native", ok: false, detail: `${msg(e)} (received ${got} of ${total} bytes)` });
    } finally { void sub.remove(); }
    try { const { Filesystem, Directory } = await import("@capacitor/filesystem"); await Filesystem.deleteFile({ path: "quran-audio/_probe.mp3", directory: Directory.Data }); } catch { /* not there */ }
  }
  return out;
}

export const reportText = (steps: readonly TestStep[]) =>
  ["Quran Muallem – connection test", ...steps.map((s) => `${s.ok ? "OK " : s.ok === false ? "ERR" : "…  "} ${s.id}: ${s.detail}`)].join("\n");
