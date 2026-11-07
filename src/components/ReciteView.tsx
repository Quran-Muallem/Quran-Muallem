/**
 * ReciteView: the Recite (Tasmīʿ) screen for a chosen surah / ayah range.
 * Implementation: PracticeScreen in src/routes/index.tsx. It uses the shared engine in
 * src/context/RecitationContext.tsx (unified READING / MEMORIZATION modes, restored word states,
 * surah end → finishSurah → silver/gold badge) exactly like MushafView.
 */
export { PracticeScreen as ReciteView, PracticeScreen as default } from "@/routes/index";
