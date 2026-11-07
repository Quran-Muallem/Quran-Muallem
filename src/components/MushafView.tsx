/**
 * MushafView: the Mushaf page view (604 pages) with live recitation on the page.
 * Implementation: src/components/MushafReader.tsx. It uses the shared engine in
 * src/context/RecitationContext.tsx (unified READING / MEMORIZATION modes, session totals, surah
 * end → finishSurah → silver/gold badge) exactly like ReciteView.
 */
export { MushafReader as MushafView, MushafReader as default } from "@/components/MushafReader";
