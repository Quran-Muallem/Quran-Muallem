/**
 * Capacitor plugin objects (registerPlugin) are Proxies that answer EVERY property with a native-call
 * wrapper — also `then`. Returned from a promise (`.then(() => plugin)`, `async () => plugin`), JavaScript
 * treats such a plugin as a "thenable" and calls `plugin.then(resolve, reject)`: a native call to a method
 * that does not exist, which never settles. The promise hangs forever.
 *
 * That was the reason (found in v31 with the connection test) why on Android the reciters library kept
 * loading, downloads stayed at «0.0 MB» and the native player never started: every path first awaited
 * the BackgroundAudio plugin. The same affected LocalNotifications (Adhan) and FileTransfer.
 *
 * `thenSafe` wraps a plugin so it can travel through promises: `then` is undefined, everything else is
 * passed on to the plugin.
 */
export function thenSafe<T extends object>(plugin: T): T {
  return new Proxy({} as T, {
    get(_target, key) {
      if (key === "then") return undefined;
      const value = (plugin as Record<PropertyKey, unknown>)[key];
      return typeof value === "function" ? (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(plugin, args) : value;
    },
  });
}
