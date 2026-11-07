import { beforeEach, describe, expect, it } from "vitest";
import { cleanName, getAuthState, signOut, startWithName, updateProfile } from "@/lib/authService";

describe("local profile (no login)", () => {
  beforeEach(async () => { localStorage.clear(); await signOut(); });

  it("starts with a name only and keeps it on the device", async () => {
    const s = await startWithName("  Amina   Ben  ");
    expect(s).toMatchObject({ name: "Amina Ben", provider: "local", email: null, avatarUrl: null });
    expect(getAuthState().status).toBe("signedIn");
    expect(JSON.parse(localStorage.getItem("hifz.auth.session") ?? "{}").name).toBe("Amina Ben");
  });

  it("allows an empty name and renaming later", async () => {
    await startWithName("");
    expect(getAuthState().session?.name).toBe("");
    await updateProfile({ name: "يوسف" });
    expect(getAuthState().session?.name).toBe("يوسف");
  });

  it("limits the name length", () => {
    expect(cleanName("x".repeat(60)).length).toBe(40);
  });
});

describe("legal texts & data deletion", () => {
  it("bundled legal texts match legal/*.md (run `npm run legal` after editing)", async () => {
    const fs = await import("node:fs");
    const { LEGAL_TEXTS } = await import("@/lib/legalTexts");
    for (const doc of ["privacy", "terms"] as const) for (const lang of ["en", "ar"] as const) {
      expect(LEGAL_TEXTS[doc][lang]).toBe(fs.readFileSync(`${__dirname}/../../legal/${doc}.${lang}.md`, "utf8"));
    }
    expect(LEGAL_TEXTS.terms.en).toContain("It DOES NOT issue religious rulings (Fatwas) or interpretation of the Quran (Tafsir).");
    expect(LEGAL_TEXTS.terms.ar).toContain("تنبيه هام: دليل التجويد مخصص لتعليم أحكام التلاوة فقط، ولا يقدم الفتاوى الشرعية ولا تفسير القرآن.");
  });

  it("deletes all app data from the device", async () => {
    const { deleteAllData } = await import("@/lib/dataReset");
    await startWithName("Test");
    localStorage.setItem("hifz.progress.v1", "{}"); localStorage.setItem("hifz.settings", "{}"); localStorage.setItem("other.app", "keep");
    await deleteAllData();
    expect(Object.keys(localStorage).filter((k) => k.startsWith("hifz."))).toEqual([]);
    expect(localStorage.getItem("other.app")).toBe("keep");
    expect(getAuthState().status).toBe("signedOut");
  });
});
