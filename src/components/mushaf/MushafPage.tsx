import { Fragment, useLayoutEffect, useRef, useState } from "react";
import type { Mushaf } from "@/lib/mushafData";
import type { LiveStatus } from "@/lib/quranMatcher";
import type { TajweedSeg } from "@/lib/tajweedColors";
import type { VerseStatus } from "@/lib/progressStorage";
import { getSurahMeta, toArabicDigits } from "@/lib/quranService";
import { cn } from "@/lib/utils";
import { AyahMedallion, BasmalaLine, GOLD_A, GOLD_B, INK, PageFrame, PageNumber, SurahBanner } from "@/components/mushaf/MushafOrnaments";

const LINES_PER_PAGE = 15;
const BASE = 20; // px, font size used for measuring
const LINE_HEIGHT = 2.0;
/** On very short screens the lines move closer together (down to this) before the font gets smaller. */
const MIN_LINE_HEIGHT = 1.7;
const COMFORT_PX = 15;
/** Natural width (px at BASE) of a typical full Mushaf line in Amiri Quran. */
const TYPICAL_LINE_AT_BASE = 396;
/** Lines narrower than this share of the width are centred. */
const SHORT_LINE = 0.7;

export type WordKey = string; // "surah:ayah:word"

/**
 * One Mushaf page laid out like the printed Madani Mushaf: 15 lines, every line justified edge to edge
 * with the original line breaks, surah banners and Basmala in their line slots, ornate verse medallions.
 * Words can be coloured (recitation), hidden (memorization) and verses highlighted (audio / selection).
 */
export function MushafPage({ mushaf, page, statuses, hidden, hinted, cursor, marked, highlight, verseStatus, recorded, onVerseTap, onWordTap, onWordPlay, maxTextHeight, tajweed, flow }: {
  /** v38 «ألوان أحكام التجويد»: coloured segments per word (words not judged by a recitation use them). */
  tajweed?: Map<WordKey, TajweedSeg[]> | undefined;
  /** v38 «نص قرآني سلس»: flowing text at this font size instead of the 15 justified lines of print. */
  flow?: { fontSize: number; perAyah?: boolean } | undefined;
  /** Tap on a word judged wrong or almost right (e.g. to add it to the voice profile). */
  onWordTap?: ((key: WordKey) => void) | undefined;
  /** v45 Kids Mode: a tap on any word plays it (word-by-word audio). */
  onWordPlay?: ((key: WordKey) => void) | undefined;
  /** Verses with a saved recording of the user get a small dot on their marker. */
  recorded?: ((surah: number, ayah: number) => boolean) | undefined;
  /** Words shown via the hint button. */
  hinted?: Set<WordKey> | undefined;
  mushaf: Mushaf;
  page: number;
  /** Height available for the 15 lines, so the whole page fits on screen like an open book. */
  maxTextHeight?: number | undefined;
  /** Live recitation status per word. */
  statuses?: Map<WordKey, LiveStatus> | undefined;
  /** Words found by the search (gold frame). */
  marked?: Set<WordKey> | undefined;
  /** Words hidden for memorization (until recited correctly). */
  hidden?: Set<WordKey> | undefined;
  cursor?: WordKey | null | undefined;
  /** Verse "s:a" to highlight (playing / selected). */
  highlight?: string | null | undefined;
  verseStatus?: ((surah: number, ayah: number) => VerseStatus) | undefined;
  /** Tap on a verse; `at` is the screen point of the tap (for the verse menu). */
  onVerseTap?: ((surah: number, ayah: number, at: { x: number; y: number }) => void) | undefined;
}) {
  const lines = mushaf.page(page);
  const wrap = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(18);
  /** Common size of all pages: fixes the page height, even on the larger-type opening pages. */
  const [boxSize, setBoxSize] = useState(18);
  const [lineFactor, setLineFactor] = useState(LINE_HEIGHT);
  /** Per-line horizontal condensing for the few lines longer than the page width at the common size. */
  const [squeeze, setSqueeze] = useState<Record<number, { width: number; scale: number }>>({});
  /** Lines with only a few words: centred instead of stretched (print uses kashida, which browsers can't). */
  const [short, setShort] = useState<Record<number, true>>({});
  const centered = page <= 2;

  // One font size for every page (like print), derived from the page width and the screen height.
  // Lines that are naturally longer are condensed slightly; all lines are justified edge to edge.
  useLayoutEffect(() => {
    if (flow) return; // flowing text: no fitting to the printed lines
    const run = () => {
      const box = wrap.current, m = measure.current;
      if (!box || !m) return;
      const avail = box.clientWidth;
      if (!avail) return;
      const byWidth = (BASE * avail) / TYPICAL_LINE_AT_BASE;
      // Short screen: first bring the lines closer together, only then make the type smaller.
      const roomy = maxTextHeight ? maxTextHeight / (LINES_PER_PAGE * LINE_HEIGHT) : Infinity;
      // (Only where the type would otherwise drop below COMFORT_PX: the harakat need the normal spacing.)
      const want = Math.min(COMFORT_PX, 32, byWidth);
      const lf = maxTextHeight && roomy < want ? Math.max(MIN_LINE_HEIGHT, maxTextHeight / (LINES_PER_PAGE * want)) : LINE_HEIGHT;
      const byHeight = maxTextHeight ? maxTextHeight / (LINES_PER_PAGE * lf) : Infinity;
      let fs = Math.max(11, Math.min(32, byWidth, byHeight));
      setLineFactor(lf);
      setBoxSize(fs);
      const widths = Array.from(m.children).map((el) => (el as HTMLElement).scrollWidth);
      if (centered) {
        const max = Math.max(...widths, 1);
        fs = Math.max(11, Math.min(fs * 1.25, (BASE * avail) / (max * 1.08)));
      }
      const next: Record<number, { width: number; scale: number }> = {};
      const shortLines: Record<number, true> = {};
      if (!centered) widths.forEach((w, i) => {
        const natural = (w * fs) / BASE * 1.01;
        if (w && natural > avail) next[i] = { width: natural, scale: avail / natural };
        else if (w && natural < avail * SHORT_LINE) shortLines[i] = true;
      });
      setFontSize(fs);
      setSqueeze(next);
      setShort(shortLines);
    };
    run();
    void document.fonts?.ready.then(run);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
    if (wrap.current) ro?.observe(wrap.current);
    return () => ro?.disconnect();
  }, [page, centered, maxTextHeight, flow]);

  const lineH = fontSize * lineFactor;
  const pageH = boxSize * lineFactor * LINES_PER_PAGE;
  const firstText = lines.find((l) => l.type === "text");
  const headSurah = firstText?.type === "text" ? firstText.segments[0]?.surah : lines.find((l) => l.type === "header")?.surah;
  const headName = headSurah ? getSurahMeta(headSurah)?.nameArabic ?? "" : "";

  const renderTokens = (line: Extract<ReturnType<Mushaf["page"]>[number], { type: "text" }>, measuring: boolean) =>
    line.segments.map((seg, si) => {
      const verseKey = `${seg.surah}:${seg.ayah}`;
      const words = mushaf.words(seg.surah, seg.ayah);
      const isHi = !measuring && highlight === verseKey;
      const tokens = [];
      for (let w = seg.from; w >= 1 && w <= seg.to; w++) {
        const k = `${verseKey}:${w}`;
        const st = measuring ? undefined : statuses?.get(k);
        // Memorization hides only words not judged yet: a correct word appears, and a wrong or skipped
        // word appears too (in red / orange) so the reciter can read what was missed and carry on.
        const isHidden = !measuring && hidden?.has(k) && st !== "CORRECT" && st !== "WARNING" && st !== "ERROR";
        tokens.push(
          <span key={k} data-word={measuring ? undefined : k} data-status={st} data-cursor={!measuring && cursor === k ? "" : undefined}
            onClick={measuring ? undefined : onWordTap && (st === "ERROR" || st === "WARNING") ? () => onWordTap(k) : onWordPlay ? () => onWordPlay(k) : onVerseTap ? (e) => onVerseTap(seg.surah, seg.ayah, { x: e.clientX, y: e.clientY }) : undefined}
            className={cn("relative inline-block cursor-pointer whitespace-nowrap rounded-[0.25em] px-[0.04em] transition-colors duration-300",
              isHi && "bg-amber-200/15 shadow-[0_0_0_0.12em_rgba(253,230,138,.12)]",
              st === "CORRECT" && "text-emerald-300",
              st === "WARNING" && "bg-orange-950/45 text-orange-300 shadow-[inset_0_0_0_1px_rgba(251,146,60,.35)]",
              st === "ERROR" && "bg-red-950/60 text-red-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,.4)]",
              isHidden && "text-transparent",
              !measuring && !isHidden && st !== "CORRECT" && st !== "WARNING" && st !== "ERROR" && hinted?.has(k) && "text-amber-300 underline decoration-dotted decoration-1 underline-offset-[0.4em]",
              !measuring && marked?.has(k) && !isHidden && "bg-amber-300/25 shadow-[0_0_0_0.1em_rgba(252,211,77,.75)]",
              !measuring && cursor === k && "ring-2 ring-amber-300/80 animate-pulse")}>
            {isHidden && <span aria-hidden="true" className="absolute inset-x-[0.08em] top-[38%] bottom-[30%] rounded-full bg-[color-mix(in_srgb,var(--mf-ink)_12%,transparent)]" />}
            {!measuring && !isHidden && (!st || st === "PENDING") && tajweed?.get(k)
              ? tajweed.get(k)!.map((sg, j) => (sg.cls ? <span key={j} className={`tj-${sg.cls}`}>{sg.text}</span> : sg.text))
              : words[w - 1] ?? ""}
          </span>,
        );
      }
      if (seg.endsVerse) {
        const vs = verseStatus?.(seg.surah, seg.ayah);
        tokens.push(
          <span key={`${verseKey}:end`} onClick={onVerseTap && !measuring ? (e) => onVerseTap(seg.surah, seg.ayah, { x: e.clientX, y: e.clientY }) : undefined}
            className={cn("relative inline-flex cursor-pointer rounded-full", isHi && "bg-amber-200/15")}>
            <AyahMedallion n={seg.ayah} tone={vs === "MEMORIZED" ? "memorized" : vs === "NEEDS_REVISION" ? "revision" : "gold"} />
            {!measuring && recorded?.(seg.surah, seg.ayah) && (
              <span className="pointer-events-none absolute -top-[0.1em] end-[-0.05em] h-[0.42em] w-[0.42em] rounded-full ring-2 ring-[var(--mf-paper,#fdf6e3)]"
                style={{ background: "#f59e0b" }} aria-hidden="true" />
            )}
          </span>,
        );
      }
      return <Fragment key={si}>{tokens}</Fragment>;
    });

  if (flow) {
    // Consecutive text lines flow together (words wrap to the screen); banners and Basmala stay blocks.
    const fh = flow.fontSize * 2.05;
    const blocks: ({ kind: "header"; surah: number } | { kind: "basmala" } | { kind: "text"; lines: Extract<ReturnType<Mushaf["page"]>[number], { type: "text" }>[] })[] = [];
    for (const line of lines) {
      if (line.type === "header") blocks.push({ kind: "header", surah: line.surah });
      else if (line.type === "basmala") blocks.push({ kind: "basmala" });
      else { const last = blocks[blocks.length - 1]; if (last?.kind === "text") last.lines.push(line); else blocks.push({ kind: "text", lines: [line] }); }
    }
    return (
      <PageFrame>
        <div className="mb-1 flex items-center justify-between px-1 font-arabic text-[0.78rem]" dir="rtl" style={{ color: GOLD_B }}>
          <span>{headName ? `سُورَةُ ${headName}` : ""}</span>
          <span>الجُزْءُ {toArabicDigits(mushaf.juzOfPage(page))}</span>
        </div>
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD_A}, transparent)` }} />
        <div ref={wrap} data-mushaf-text="" data-mushaf-flow="" data-mushaf-per-ayah={flow.perAyah ? "" : undefined} dir="rtl" lang="ar" className="relative mt-1 qm-flow" style={{ fontSize: flow.fontSize, color: INK }}>
          {blocks.map((b, i) => {
            if (b.kind === "header") return <div key={i} className="flex items-center" style={{ height: fh }}><SurahBanner name={`سُورَةُ ${getSurahMeta(b.surah)?.nameArabic ?? ""}`} height={fh * 0.92} /></div>;
            if (b.kind === "basmala") return <BasmalaLine key={i} height={fh} />;
            if (flow.perAyah) {
              // v45 «آية في كل سطر»: every verse (its part on this page) on its own row.
              const verses: { key: string; line: Extract<ReturnType<Mushaf["page"]>[number], { type: "text" }> }[] = [];
              for (const line of b.lines) for (const seg of line.segments) {
                const key = `${seg.surah}:${seg.ayah}`;
                const last = verses[verses.length - 1];
                if (last?.key === key) last.line.segments.push(seg); else verses.push({ key, line: { type: "text", segments: [seg] } });
              }
              return (
                <div key={i} className="flex flex-col">
                  {verses.map((v) => (
                    <div key={v.key} data-ayah-row={v.key}
                      className={cn("flex flex-wrap items-center justify-start gap-x-[0.3em] border-b px-1 py-[0.35em]", highlight === v.key && "rounded-xl bg-amber-200/10")}
                      style={{ lineHeight: 2.3, borderColor: `color-mix(in srgb, ${GOLD_A} 22%, transparent)` }}>
                      {renderTokens(v.line, false)}
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={i} className="flex flex-wrap items-center justify-start gap-x-[0.3em]" style={{ lineHeight: `${fh}px` }}>
                {b.lines.map((line, li) => <Fragment key={li}>{renderTokens(line, false)}</Fragment>)}
              </div>
            );
          })}
        </div>
        <PageNumber n={page} />
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      {/* running head like the printed Mushaf: surah (right) · juz (left) */}
      <div className="mb-1 flex items-center justify-between px-1 font-arabic text-[0.78rem]" dir="rtl" style={{ color: GOLD_B }}>
        <span>{headName ? `سُورَةُ ${headName}` : ""}</span>
        <span>الجُزْءُ {toArabicDigits(mushaf.juzOfPage(page))}</span>
      </div>
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD_A}, transparent)` }} />

      <div ref={wrap} data-mushaf-text="" dir="rtl" lang="ar" className="relative mt-1 overflow-x-clip font-quran" style={{ fontSize, color: INK, height: centered ? pageH : undefined, minHeight: pageH }}>
        <div className={cn("flex flex-col", centered && "h-full justify-center")} style={{ minHeight: centered ? undefined : pageH }}>
          {lines.map((line, i) => {
            if (line.type === "header") return <div key={i} className="flex items-center" style={{ height: lineH }}><SurahBanner name={`سُورَةُ ${getSurahMeta(line.surah)?.nameArabic ?? ""}`} height={lineH * 0.92} /></div>;
            if (line.type === "basmala") return <BasmalaLine key={i} height={lineH} />;
            return (
              <div key={i} className={cn("flex items-center whitespace-nowrap", centered || short[i] ? "justify-center gap-[0.45em]" : "justify-between")}
                style={{ height: lineH, lineHeight: `${lineH}px`, ...(squeeze[i] ? { width: squeeze[i]!.width, transform: `scaleX(${squeeze[i]!.scale})`, transformOrigin: "right center" } : {}) }}>
                {renderTokens(line, false)}
              </div>
            );
          })}
        </div>
        {/* invisible copy at a fixed size, used to measure the natural width of each line */}
        <div ref={measure} aria-hidden="true" className="pointer-events-none invisible absolute right-0 top-0 w-0 overflow-hidden" style={{ fontSize: BASE }}>
          {lines.map((line, i) => line.type === "text"
            ? <div key={i} className="flex w-max items-center gap-[0.22em] whitespace-nowrap">{renderTokens(line, true)}</div>
            : <div key={i} />)}
        </div>
      </div>
      <PageNumber n={page} />
    </PageFrame>
  );
}

export default MushafPage;
