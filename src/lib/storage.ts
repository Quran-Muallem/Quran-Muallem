/**
 * Device-local storage, no server involved.
 *
 * - `kv`: small key/value data (settings, API key, progress). Capacitor Preferences in the
 *   native app (survives WebView cache clears), localStorage in the browser.
 * - `idb`: larger data (Quran text cache) in IndexedDB, with an in-memory fallback.
 */

type CapacitorGlobal = { isNativePlatform?: () => boolean; getPlatform?: () => string; convertFileSrc?: (uri: string) => string };
export const capacitorGlobal = (): CapacitorGlobal | undefined =>
  typeof window === "undefined" ? undefined : (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;

export const isNativePlatform = () => capacitorGlobal()?.isNativePlatform?.() === true;
export const platform = (): "ios" | "android" | "web" => {
  const p = capacitorGlobal()?.getPlatform?.();
  return p === "ios" || p === "android" ? p : "web";
};

export type KeyValueStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

const memory = new Map<string, string>();
const webStore: KeyValueStore = {
  async get(key) {
    try { return typeof localStorage === "undefined" ? memory.get(key) ?? null : localStorage.getItem(key); } catch { return memory.get(key) ?? null; }
  },
  async set(key, value) {
    memory.set(key, value);
    try { localStorage.setItem(key, value); } catch { /* private mode / quota: kept in memory until reload */ }
  },
  async remove(key) {
    memory.delete(key);
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

let nativeStorePromise: Promise<KeyValueStore> | null = null;
export function kvStore(): Promise<KeyValueStore> {
  if (!isNativePlatform()) return Promise.resolve(webStore);
  nativeStorePromise ??= import("@capacitor/preferences")
    // If the native plugin is missing or fails (e.g. the native project was not synced after
    // `npm install`), fall back to the WebView's localStorage instead of breaking sign-in & co.
    .then(({ Preferences }): KeyValueStore => ({
      get: async (key) => {
        try { return (await Preferences.get({ key })).value ?? (await webStore.get(key)); } catch { return webStore.get(key); }
      },
      set: async (key, value) => {
        try { await Preferences.set({ key, value }); } catch { await webStore.set(key, value); }
      },
      remove: async (key) => {
        try { await Preferences.remove({ key }); } catch { /* ignore */ }
        await webStore.remove(key);
      },
    }))
    .catch(() => webStore);
  return nativeStorePromise;
}

export const kv = {
  get: async (key: string) => (await kvStore()).get(key),
  set: async (key: string, value: string) => (await kvStore()).set(key, value),
  remove: async (key: string) => (await kvStore()).remove(key),
  async getJson<T>(key: string, fallback: T): Promise<T> {
    const raw = await kv.get(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  setJson: (key: string, value: unknown) => kv.set(key, JSON.stringify(value)),
};

/* ------------------------------------------------------------------ */
/* IndexedDB                                                           */
/* ------------------------------------------------------------------ */

const DB_NAME = "quran-muallem";
const DB_STORE = "cache";
const idbMemory = new Map<string, unknown>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return openDb().then((db) => new Promise<T | undefined>((resolve) => {
    if (!db) return resolve(undefined);
    try {
      const request = run(db.transaction(DB_STORE, mode).objectStore(DB_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    } catch { resolve(undefined); }
  }));
}

export const idb = {
  async get<T>(key: string): Promise<T | undefined> {
    const value = await tx<T>("readonly", (s) => s.get(key) as IDBRequest<T>);
    return value ?? (idbMemory.get(key) as T | undefined);
  },
  async set(key: string, value: unknown): Promise<void> {
    idbMemory.set(key, value);
    await tx("readwrite", (s) => s.put(value, key));
  },
  async delete(key: string): Promise<void> {
    idbMemory.delete(key);
    await tx("readwrite", (s) => s.delete(key));
  },
  async keys(): Promise<string[]> {
    const keys = await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
    return keys ? keys.map(String) : [...idbMemory.keys()];
  },
};

/** Tiny observable store used by settings and progress. */
export function createSignal<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) { value = next; listeners.forEach((l) => l()); },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
