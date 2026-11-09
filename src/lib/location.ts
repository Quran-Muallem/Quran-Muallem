/** The device position (GPS): Capacitor Geolocation in the app, the browser's geolocation on the web. */
import { isNativePlatform } from "@/lib/storage";

export type Position = { lat: number; lon: number; accuracy: number | null; at: string };

export async function getPosition(): Promise<Position> {
  if (isNativePlatform()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions().catch(() => null);
    if (perm && perm.location !== "granted") await Geolocation.requestPermissions({ permissions: ["location"] });
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
    return { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy ?? null, at: new Date().toISOString() };
  }
  if (!("geolocation" in navigator)) throw new Error("unsupported");
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy, at: new Date().toISOString() }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? "denied" : "unavailable")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  });
}
