/** v46: navigation helpers shared by the kids screens (handled in routes/index.tsx). */
import { updateSettings } from "@/lib/settings";

/** Kids Mushaf: one verse per line, clear Naskh with full tashkeel, Tajweed colours; tap a verse → kids tafsir. */
export function openKidsMushaf() {
  void updateSettings({ mushafStyle: "lines", quranFont: "naskh", tajweedColors: true });
  window.dispatchEvent(new Event("qm:open-mushaf"));
}

export function openKidsSection(section: "kidsTafsir" | "kidsJourney") {
  window.dispatchEvent(new CustomEvent("qm:open-hub", { detail: section }));
}
