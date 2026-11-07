/**
 * "Delete all my data": removes everything the app stored on this device (profile, local accounts,
 * progress, settings, recordings, voice profile, cached Quran text, downloaded audio and speech model files).
 * Required by the app stores for apps that let users create accounts.
 */
import { isNativePlatform } from "@/lib/storage";
import { signOut } from "@/lib/authService";

const PREFIX = "hifz.";

export async function deleteAllData(): Promise<void> {
  try { await signOut(); } catch { /* continue */ }

  // Key/value data (Capacitor Preferences in the app, localStorage everywhere).
  if (isNativePlatform()) {
    try { await (await import("@capacitor/preferences")).Preferences.clear(); } catch { /* plugin missing */ }
  }
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch { /* storage blocked */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }

  // IndexedDB (Quran text cache) and Cache Storage (speech model files).
  try {
    const dbs = (await indexedDB.databases?.()) ?? [{ name: "quran-muallem" }, { name: "hifz-quran-ai" }];
    await Promise.all(dbs.map((d) => d.name && new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(d.name!);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    })));
  } catch { /* ignore */ }
  try { if (typeof caches !== "undefined") for (const name of await caches.keys()) await caches.delete(name); } catch { /* ignore */ }

  // Downloaded recitations (native file system).
  if (isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      await Filesystem.rmdir({ path: "audio", directory: Directory.Data, recursive: true });
    } catch { /* nothing downloaded */ }
    // The user's own recitation recordings.
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      await Filesystem.rmdir({ path: "recordings", directory: Directory.Data, recursive: true });
    } catch { /* none */ }
  }
}
