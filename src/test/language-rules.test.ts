import { describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE, directionFor } from "@/lib/i18n";

describe("Bilingual language rules", () => {
  it("starts in Arabic with RTL direction", () => {
    expect(DEFAULT_LANGUAGE).toBe("ar");
    expect(directionFor(DEFAULT_LANGUAGE)).toBe("rtl");
  });
  it("uses LTR for English", () => expect(directionFor("en")).toBe("ltr"));
});
