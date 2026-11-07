/** Qibla math, fully offline (spherical trigonometry, no servers). */

export const KAABA = { lat: 21.4225, lon: 39.8262 } as const;
const EARTH_RADIUS_KM = 6371.0088;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
export const normalizeDeg = (d: number) => ((d % 360) + 360) % 360;

/**
 * Initial great-circle bearing from (lat, lon) to the Kaaba, in degrees clockwise from true north.
 * θ = atan2( sin Δλ · cos φ₂ , cos φ₁ · sin φ₂ − sin φ₁ · cos φ₂ · cos Δλ )
 */
export function qiblaBearing(lat: number, lon: number): number {
  const φ1 = rad(lat), φ2 = rad(KAABA.lat), Δλ = rad(KAABA.lon - lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return normalizeDeg(deg(Math.atan2(y, x)));
}

/** Great-circle (haversine) distance to the Kaaba in km. */
export function distanceToKaaba(lat: number, lon: number): number {
  const φ1 = rad(lat), φ2 = rad(KAABA.lat), Δφ = rad(KAABA.lat - lat), Δλ = rad(KAABA.lon - lon);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Signed smallest difference a − b in degrees, in (−180, 180]. */
export function angleDiff(a: number, b: number): number {
  const d = normalizeDeg(a - b);
  return d > 180 ? d - 360 : d;
}

/** Low-pass filter on a circle (handles the 359° → 0° wrap). */
export function smoothHeading(previous: number | null, next: number, factor = 0.25): number {
  if (previous == null) return normalizeDeg(next);
  return normalizeDeg(previous + angleDiff(next, previous) * factor);
}

/** 8-point compass label for a bearing. */
export function compassPoint(bearing: number, language: string): string {
  const ar = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"];
  const en = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = Math.round(normalizeDeg(bearing) / 45) % 8;
  return (language === "ar" ? ar : en)[i] ?? "";
}
