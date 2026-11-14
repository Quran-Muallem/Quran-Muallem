/** Navigation helpers shared by the kids screens (handled in routes/index.tsx). */
import { getSettings, updateSettings } from "@/lib/settings";

/** v47: Kids Mushaf = its own one-surah-per-page view in the kids layout (turns Kids Mode on if needed). */
export function openKidsMushaf() {
  if (!getSettings().kidsMode) void updateSettings({ kidsMode: true });
  window.dispatchEvent(new CustomEvent("qm:kids-go", { detail: { tab: "mushaf" } }));
}

export function openKidsSection(section: "kidsTafsir" | "kidsJourney") {
  if (getSettings().kidsMode) { window.dispatchEvent(new CustomEvent("qm:kids-go", { detail: { tab: section === "kidsTafsir" ? "tafsir" : "journey" } })); return; }
  window.dispatchEvent(new CustomEvent("qm:open-hub", { detail: section }));
}
