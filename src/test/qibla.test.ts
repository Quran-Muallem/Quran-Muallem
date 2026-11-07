import { describe, expect, it } from "vitest";
import { angleDiff, compassPoint, distanceToKaaba, qiblaBearing, smoothHeading } from "@/lib/qibla";

describe("qibla math", () => {
  // Reference values (great-circle initial bearing), within 0.5°.
  it.each([
    ["Berlin", 52.52, 13.405, 136.68],
    ["London", 51.5074, -0.1278, 118.99],
    ["New York", 40.7128, -74.006, 58.48],
    ["Jakarta", -6.2088, 106.8456, 295.15],
    ["Cairo", 30.0444, 31.2357, 136.14],
  ])("%s", (_name, lat, lon, expected) => {
    expect(Math.abs(angleDiff(qiblaBearing(lat as number, lon as number), expected as number))).toBeLessThan(0.5);
  });
  it("distance Berlin → Kaaba ≈ 4,130 km", () => expect(Math.round(distanceToKaaba(52.52, 13.405) / 10) * 10).toBe(4130));
  it("wraps angles and smooths across north", () => {
    expect(angleDiff(10, 350)).toBe(20);
    expect(angleDiff(350, 10)).toBe(-20);
    expect(smoothHeading(359, 1, 0.5)).toBeCloseTo(0, 5);
    expect(compassPoint(136, "en")).toBe("SE");
    expect(compassPoint(136, "ar")).toBe("جنوب شرق");
  });
});
