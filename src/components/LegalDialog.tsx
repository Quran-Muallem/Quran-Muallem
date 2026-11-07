import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { GoldDialog, GOLD, GOLD_LIGHT, alpha } from "@/components/ornaments";
import { useI18n, type CopyKey } from "@/lib/i18n";

export type LegalDoc = "privacy" | "terms";
export const LEGAL_TITLES: Record<LegalDoc, CopyKey> = { privacy: "legalPrivacy", terms: "legalTerms" };

type Texts = Record<LegalDoc, { en: string; ar: string }>;
let cache: Promise<Texts> | null = null;
/** The texts are ~45 KB, so they are loaded only when a document is opened. */
const loadTexts = () => (cache ??= import("@/lib/legalTexts").then((m) => m.LEGAL_TEXTS as unknown as Texts));

/** Shows a legal document in the app's language (generated from legal/*.md). */
export function LegalDialog({ doc, onOpenChange }: { doc: LegalDoc | null; onOpenChange: (open: boolean) => void }) {
  const { t, language } = useI18n();
  const [texts, setTexts] = useState<Texts | null>(null);
  useEffect(() => { if (doc && !texts) void loadTexts().then(setTexts); }, [doc, texts]);
  const src = doc && texts ? (texts[doc] as Record<string, string>)[language] ?? texts[doc][language === "ar" ? "ar" : "en"] : null;
  return (
    <GoldDialog open={doc !== null} onOpenChange={onOpenChange} title={doc ? t(LEGAL_TITLES[doc]) : ""} className="max-w-lg">
      {src ? <Markdown src={src.replace(/^# .*\n+/, "")} /> : <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-200" />}
    </GoldDialog>
  );
}

/* ---------------- tiny Markdown renderer (same subset as scripts/build-legal.mjs) ---------------- */

function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith("**") ? <strong key={i} className="font-semibold text-emerald-50">{part.slice(2, -2)}</strong>
      : part.startsWith("*") && part.endsWith("*") && part.length > 2 ? <em key={i} className="text-emerald-100/60">{part.slice(1, -1)}</em>
      : <Fragment key={i}>{part}</Fragment>);
}

export function Markdown({ src }: { src: string }) {
  const lines = src.split(/\r?\n/);
  const out: ReactNode[] = [];
  for (let i = 0, k = 0; i < lines.length; k++) {
    const l = lines[i]!;
    if (!l.trim()) { i++; continue; }
    const h = l.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      out.push(h[1]!.length <= 2
        ? <h3 key={k} className="mt-5 border-b pb-1 text-base font-semibold" style={{ color: GOLD_LIGHT, borderColor: alpha(GOLD, 0.3) }}>{inline(h[2]!)}</h3>
        : <h4 key={k} className="mt-3 text-sm font-semibold text-emerald-50">{inline(h[2]!)}</h4>);
      i++; continue;
    }
    if (l.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) rows.push(lines[i++]!);
      const cells = (r: string) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const [head, , ...body] = rows;
      out.push(
        <div key={k} className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead><tr>{cells(head ?? "").map((c, j) => <th key={j} className="border px-2 py-1 text-start font-semibold text-emerald-50" style={{ borderColor: alpha(GOLD, 0.3) }}>{inline(c)}</th>)}</tr></thead>
            <tbody>{body.map((r, ri) => <tr key={ri}>{cells(r).map((c, j) => <td key={j} className="border px-2 py-1 align-top" style={{ borderColor: alpha(GOLD, 0.3) }}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>);
      continue;
    }
    if (/^- /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i]!)) items.push(lines[i++]!.slice(2));
      out.push(<ul key={k} className="list-disc space-y-1 ps-5">{items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ul>);
      continue;
    }
    if (l.startsWith(">")) {
      const q: string[] = [];
      while (i < lines.length && lines[i]!.startsWith(">")) q.push(lines[i++]!.replace(/^>\s?/, ""));
      out.push(<blockquote key={k} className="rounded-xl px-3 py-2 font-medium text-amber-50" style={{ background: alpha(GOLD, 0.12), borderInlineStart: `3px solid ${GOLD}` }}>{inline(q.join(" "))}</blockquote>);
      continue;
    }
    const p: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#|\||- |>)/.test(lines[i]!)) p.push(lines[i++]!);
    out.push(<p key={k}>{p.map((x, j) => <Fragment key={j}>{j > 0 && <br />}{inline(x)}</Fragment>)}</p>);
  }
  return <div dir="auto" className="space-y-3 text-sm leading-relaxed text-emerald-50/85">{out}</div>;
}

export default LegalDialog;
