/**
 * Salat Mode (وضع الصلاة, v42): a silent companion during prayer.
 *
 * State machine (one rakʿah after the other):
 *
 *   RECITING_FATIHA ──«ولا الضالين» / «آمين»──▶ ACTIVE_SURAH_TRACKING ──«الله أكبر» / «سمع الله لمن حمده»──▶ IN_RUKU_OR_SUJUD
 *         ▲                                                                                                        │
 *         └───────────────────────────── «بسم الله الرحمن الرحيم» / «الحمد لله رب العالمين» ─────────────────────┘
 *
 *  - RECITING_FATIHA: passive. Never a prompt, also not in the pause after «آمين» while the next surah is chosen.
 *  - ACTIVE_SURAH_TRACKING: the view locates the recited passage anywhere in the Quran (`onLocated`) and
 *    judges it word by word. Only once at least one word of it was recited, a silence ≥ `silenceMs` (no
 *    takbīr, not at the surah end) asks for a prompt: the next 2–3 words (or the whole verse). A run of
 *    wrong words (e.g. a similar verse, mutashābihāt) followed by a 2-second pause asks for the opening words
 *    of the expected verse.
 *  - IN_RUKU_OR_SUJUD: every prompt is muted until the next rakʿah opens with the basmala / al-Fātiḥah.
 *
 * Pure logic (no React, no audio): the view feeds transcripts, matches and the clock, and acts on the returned
 * events. Positions are in the transcript's raw units (phonemes: characters; text: words) — the units of
 * `useRecitation().rebaseBy`. Every event that says `rebase` means: judge only what comes after that position.
 */
import { transcriptCore, type LocatorKind } from "@/lib/ayahLocator";
import type { LiveMatch, LiveStatus } from "@/lib/quranMatcher";

export type SalatState = "IDLE" | "RECITING_FATIHA" | "ACTIVE_SURAH_TRACKING" | "IN_RUKU_OR_SUJUD";
export type PromptMode = "words" | "ayah";
export type SalatConfig = { silenceMs: number; promptMode: PromptMode };
export const DEFAULT_SALAT_CONFIG: SalatConfig = { silenceMs: 3500, promptMode: "words" };
export const SILENCE_RANGE_MS = [2000, 6000] as const;
/** Pause after a run of wrong words before the correct opening is prompted. */
export const MISTAKE_PAUSE_MS = 2000;
/** Wrong words in a row that count as having slipped into another verse. */
export const MISTAKE_RUN = 2;

export type PhraseId = "fatihaEnd" | "ameen" | "takbir" | "samiAllah" | "tasbihRuku" | "tasbihSujud" | "basmala" | "hamdala";
/** Spoken phrases, per engine: Zipformer phonemes (as in quran_phonemes.json) and plain Arabic text. */
export const PHRASES: Record<PhraseId, Record<LocatorKind, string>> = {
  fatihaEnd: { phonemes: "وَلَضضَااااااللِۦۦۦۦن", text: "ولا الضالين" },
  ameen: { phonemes: "ءَاامِۦۦۦۦن", text: "امين" },
  takbir: { phonemes: "للَااهُءَكبَر", text: "الله اكبر" },
  samiAllah: { phonemes: "سَمِعَللَااهُلِمَنحَمِدَه", text: "سمع الله لمن حمده" },
  tasbihRuku: { phonemes: "سُبحَاانَرَببِيَلعَظِۦۦۦۦم", text: "سبحان ربي العظيم" },
  tasbihSujud: { phonemes: "سُبحَاانَرَببِيَلءَعلَاا", text: "سبحان ربي الاعلى" },
  basmala: { phonemes: "بِسمِللَااهِررَحمَاانِررَحِۦۦۦۦم", text: "بسم الله الرحمن الرحيم" },
  hamdala: { phonemes: "ءَلحَمدُلِللَااهِرَببِلعَاالَمِۦۦۦۦن", text: "الحمد لله رب العالمين" },
};
/** Allowed edit cost per core character of a phrase (short phrases: at least 1). */
const TOLERANCE: Record<PhraseId, number> = { fatihaEnd: 0.2, ameen: 0.15, takbir: 0.17, samiAllah: 0.2, tasbihRuku: 0.2, tasbihSujud: 0.2, basmala: 0.2, hamdala: 0.2 };

export type PhraseHit = { id: PhraseId; start: number; end: number; cost: number };

/** Free-start, free-end approximate search of `q` in `t` (Sellers); best end, then its start. */
export function approxFind(q: readonly number[], t: readonly number[]): { cost: number; start: number; end: number } | null {
  if (!q.length || !t.length) return null;
  const m = t.length;
  let prev = new Float32Array(m + 1), prevO = new Int32Array(m + 1);
  for (let j = 0; j <= m; j++) prevO[j] = j;
  for (let i = 1; i <= q.length; i++) {
    const row = new Float32Array(m + 1), o = new Int32Array(m + 1);
    row[0] = i; o[0] = 0;
    for (let j = 1; j <= m; j++) {
      const sub = prev[j - 1]! + (q[i - 1] === t[j - 1] ? 0 : 1), del = prev[j]! + 1, ins = row[j - 1]! + 1;
      if (sub <= del && sub <= ins) { row[j] = sub; o[j] = prevO[j - 1]!; }
      else if (del <= ins) { row[j] = del; o[j] = prevO[j]!; }
      else { row[j] = ins; o[j] = o[j - 1]!; }
    }
    prev = row; prevO = o;
  }
  let cost = Infinity, end = 0;
  for (let j = 1; j <= m; j++) if (prev[j]! < cost) { cost = prev[j]!; end = j; }
  return { cost, start: prevO[end]!, end };
}

const patternCache = new Map<string, number[]>();
function pattern(kind: LocatorKind, id: PhraseId): number[] {
  const key = `${kind}:${id}`;
  let p = patternCache.get(key);
  if (!p) { p = transcriptCore(kind, PHRASES[id][kind]).codes; patternCache.set(key, p); }
  return p;
}

/**
 * Finds the earliest of `ids` in `transcript` from raw position `from` on. Returns raw start / end (end:
 * the first raw position after the phrase).
 */
export function findPhrase(kind: LocatorKind, transcript: string, ids: readonly PhraseId[], from = 0): PhraseHit | null {
  const { codes, raw } = transcriptCore(kind, transcript);
  let first = 0;
  while (first < raw.length && raw[first]! < from) first++;
  const t = codes.slice(first);
  let best: PhraseHit | null = null;
  for (const id of ids) {
    const q = pattern(kind, id);
    const r = approxFind(q, t);
    if (!r || r.cost > Math.max(1, Math.floor(TOLERANCE[id] * q.length))) continue;
    // The phrase must be (nearly) complete: its last characters were heard.
    if (r.end - r.start < q.length * 0.7) continue;
    const start = raw[first + r.start]!;
    const lastRaw = raw[first + r.end - 1]!;
    const end = kind === "phonemes" ? lastRaw + 1 : lastRaw + 1;
    if (!best || start < best.start) best = { id, start, end, cost: r.cost };
  }
  return best;
}

export type SalatEvent =
  | { type: "state"; state: SalatState; rakah: number }
  /** Judge from this raw position of the current transcript on (and forget earlier word colours). */
  | { type: "rebase"; pos: number }
  /** Prompt words: from flat target token `token`, `reason` stall or mistake. */
  | { type: "prompt"; token: number; reason: "stall" | "mistake"; mode: PromptMode };

export type Located = { surah: number; ayah: number };

export type TickInput = {
  now: number;
  /** Seconds of voice heard in the last `silenceMs` (VAD); undefined when unknown. */
  voiced?: number;
  /** Latest match against the current targets (ACTIVE_SURAH_TRACKING only). */
  match?: LiveMatch | null;
  /** Flat target tokens (to tell a recited «أكبر» from a takbīr). */
  tokens?: readonly string[];
  /** A prompt is playing (no new prompt, no silence counting). */
  prompting?: boolean;
};

const hasAkbar = (s: string) => /[اأ]ك[ْ]?ب[َ]?ر/.test(s.replace(/[ً-ْٰ۟-ۭ]/g, ""));

export class SalatPrayerTracker {
  state: SalatState = "IDLE";
  rakah = 0;
  located: Located | null = null;
  config: SalatConfig;
  private scanFrom = 0;
  private lastLen = 0;
  private lastSpeechAt = 0;
  private lastCursor = -1;
  private progressAt = 0;
  private recitedSinceLocate = false;
  private promptsAtCursor = 0;
  private lastPromptAt = 0;
  private mistakePromptedAt = -1;
  private pendingFatiha: { pos: number; at: number } | null = null;
  /** v43: no locating, no prompts (al-Fātiḥah only, e.g. the 3rd / 4th rakʿah of a fard prayer). */
  passive = false;

  constructor(config: Partial<SalatConfig> = {}) { this.config = { ...DEFAULT_SALAT_CONFIG, ...config }; }

  setConfig(c: Partial<SalatConfig>) { this.config = { ...this.config, ...c }; }

  start(now: number): SalatEvent[] {
    this.rakah = 1;
    return this.enter("RECITING_FATIHA", now);
  }

  stop(): SalatEvent[] {
    this.state = "IDLE"; this.located = null;
    return [{ type: "state", state: "IDLE", rakah: this.rakah }];
  }

  /** A new recording began (e.g. after the size limit): positions start from 0 again, the phase stays. */
  restartTranscript(now: number) { this.scanFrom = 0; this.lastLen = 0; this.lastSpeechAt = now; this.lastCursor = -1; this.progressAt = now; }

  /** Manual takbīr (the user taps the screen): same as hearing «الله أكبر». */
  manualTakbir(now: number, pos: number): SalatEvent[] {
    if (this.state === "IN_RUKU_OR_SUJUD" || this.state === "IDLE") return [];
    return [...this.enter("IN_RUKU_OR_SUJUD", now), { type: "rebase", pos }];
  }

  private enter(state: SalatState, now: number): SalatEvent[] {
    this.state = state;
    this.located = null;
    this.recitedSinceLocate = false;
    this.lastCursor = -1;
    this.promptsAtCursor = 0;
    this.mistakePromptedAt = -1;
    this.progressAt = now;
    this.lastSpeechAt = now;
    this.scanFrom = 0;
    this.lastLen = 0;
    this.pendingFatiha = null;
    return [{ type: "state", state, rakah: this.rakah }];
  }

  /**
   * New (rebased) transcript. Detects the phase changes; returns the events. `tokens` / `cursor`: current
   * targets and the matcher's cursor, so a «أكبر» inside the recited verse is not taken for a takbīr.
   */
  onTranscript(kind: LocatorKind, transcript: string, now: number, opts: { tokens?: readonly string[]; cursor?: number } = {}): SalatEvent[] {
    if (this.state === "IDLE") return [];
    if (transcript.length !== this.lastLen) { if (transcript.length > this.lastLen) this.lastSpeechAt = now; this.lastLen = transcript.length; }
    const from = this.scanFrom;

    // Takbīr / tasmīʿ: always first — the instant it is heard, everything is muted.
    if (this.state === "RECITING_FATIHA" || this.state === "ACTIVE_SURAH_TRACKING") {
      // A takbīr said quietly may be missed; the tasbīḥ of rukūʿ / sujūd that follows tells it, too.
      // v43: the opening takbīr (takbīrat al-iḥrām) comes before al-Fātiḥah — during al-Fātiḥah only a
      // takbīr after its first words counts.
      let scanAt = from;
      if (this.state === "RECITING_FATIHA") {
        const begun = findPhrase(kind, transcript, ["hamdala", "fatihaEnd"], from);
        scanAt = begun ? Math.max(from, begun.end) : Number.POSITIVE_INFINITY;
      }
      const hit = Number.isFinite(scanAt) ? findPhrase(kind, transcript, ["takbir", "samiAllah", "tasbihRuku", "tasbihSujud"], scanAt) : null;
      if (hit && !(hit.id === "takbir" && this.akbarExpected(opts.tokens, opts.cursor))) {
        return [...this.enter("IN_RUKU_OR_SUJUD", now), { type: "rebase", pos: hit.end }];
      }
    }

    if (this.state === "RECITING_FATIHA") {
      const end = findPhrase(kind, transcript, ["fatihaEnd"], from);
      if (end) {
        // «آمين» right after belongs to the Fātiḥah, too.
        const ameen = findPhrase(kind, transcript, ["ameen"], end.end);
        const pos = ameen && ameen.start - end.end <= (kind === "phonemes" ? 12 : 2) ? ameen.end : end.end;
        // The last sounds of «الضالين» (the long ī, the n) may still be on their way: commit once the reader
        // went on, or after a short quiet moment (`tick`).
        const rawLen = kind === "phonemes" ? transcript.length : transcript.trim().split(/\s+/).filter(Boolean).length;
        if (rawLen - pos >= (kind === "phonemes" ? 10 : 2)) { this.pendingFatiha = null; return this.fatihaDone(now, pos); }
        this.pendingFatiha = { pos, at: now };
      }
      return [];
    }

    // Takbīr not heard at all, but al-Fātiḥah begins again: that is the next rakʿah.
    if (this.state === "ACTIVE_SURAH_TRACKING") {
      const open = findPhrase(kind, transcript, ["hamdala"], from);
      if (open && !this.hamdExpected(opts.tokens, opts.cursor)) {
        const basmala = findPhrase(kind, transcript, ["basmala"], Math.max(0, from));
        this.rakah++;
        const pos = basmala && basmala.start < open.start ? basmala.start : open.start;
        return [...this.enter("RECITING_FATIHA", now), { type: "rebase", pos }];
      }
      return [];
    }

    if (this.state === "IN_RUKU_OR_SUJUD") {
      const open = findPhrase(kind, transcript, ["basmala", "hamdala"], from);
      if (open) {
        this.rakah++;
        return [...this.enter("RECITING_FATIHA", now), { type: "rebase", pos: open.start }];
      }
      // Keep the scan window short: tasbīḥ / tashahhud before the next rakʿah are never searched twice.
      const rawLen = kind === "phonemes" ? transcript.length : transcript.trim().split(/\s+/).filter(Boolean).length;
      this.scanFrom = Math.max(0, rawLen - (kind === "phonemes" ? 160 : 30));
      return [];
    }
    return [];
  }

  private fatihaDone(now: number, pos: number): SalatEvent[] {
    return [...this.enter("ACTIVE_SURAH_TRACKING", now), { type: "rebase", pos }];
  }

  /**
   * Safety net when «ولا الضالين» was not heard clearly: the recitation was located outside al-Fātiḥah while
   * the Fātiḥah phase is still on → the second surah has begun.
   */
  fatihaPassed(now: number, pos: number): SalatEvent[] {
    if (this.state !== "RECITING_FATIHA") return [];
    return [...this.enter("ACTIVE_SURAH_TRACKING", now), { type: "rebase", pos }];
  }

  /** The recited passage was found (`ACTIVE_SURAH_TRACKING`); the view rebases and sets the targets. */
  onLocated(at: Located, now: number) {
    if (this.state !== "ACTIVE_SURAH_TRACKING") return;
    this.located = at;
    this.recitedSinceLocate = false;
    this.lastCursor = -1;
    this.promptsAtCursor = 0;
    this.mistakePromptedAt = -1;
    this.progressAt = now;
  }

  /** Clock / match update: returns a prompt when one is due. */
  tick(input: TickInput): SalatEvent[] {
    const { now, match, voiced, prompting } = input;
    if (this.state === "RECITING_FATIHA" && this.pendingFatiha && now - Math.max(this.pendingFatiha.at, this.lastSpeechAt) >= 900) {
      const pos = this.pendingFatiha.pos;
      this.pendingFatiha = null;
      return this.fatihaDone(now, pos);
    }
    if (this.passive) return []; // v43: Fātiḥah-only rakʿah (3rd / 4th of a fard prayer)
    if (this.state !== "ACTIVE_SURAH_TRACKING" || !this.located || !match) return [];
    if (match.cursor !== this.lastCursor) {
      if (this.lastCursor >= 0 && match.cursor > this.lastCursor) this.recitedSinceLocate = true;
      if (match.recited > 0) this.recitedSinceLocate = true;
      this.lastCursor = match.cursor;
      this.progressAt = now;
      this.promptsAtCursor = 0;
    }
    if (prompting) { this.lastSpeechAt = now; return []; }
    if (!this.recitedSinceLocate || match.done) return [];
    const quietFor = now - Math.max(this.lastSpeechAt, this.progressAt, this.lastPromptAt);
    const quiet = voiced == null || voiced < 0.35;

    // Slipped into another verse: a run of wrong words just before the cursor, then a 2-second pause.
    const run = trailingErrors(match.statuses, match.cursor);
    if (run >= MISTAKE_RUN && quiet && quietFor >= MISTAKE_PAUSE_MS && this.mistakePromptedAt !== match.cursor) {
      this.mistakePromptedAt = match.cursor;
      this.lastPromptAt = now;
      return [{ type: "prompt", token: match.cursor - run, reason: "mistake", mode: this.config.promptMode }];
    }

    // Stalled: silence ≥ threshold, and the last thing heard was recited text (moved the cursor) — sounds
    // that matched nothing (perhaps a quiet takbīr) never lead to a prompt. Again for the same place only
    // after the reader tried once more.
    const lastWasRecitation = this.progressAt >= this.lastSpeechAt - 1500;
    const triedAgain = this.promptsAtCursor === 0 || this.lastSpeechAt > this.lastPromptAt;
    if (quiet && quietFor >= this.config.silenceMs && lastWasRecitation && triedAgain && this.promptsAtCursor < 2) {
      this.promptsAtCursor++;
      this.lastPromptAt = now;
      return [{ type: "prompt", token: match.cursor, reason: "stall", mode: this.config.promptMode }];
    }
    return [];
  }

  /* ───── v43: the motion sensors (SalatMotionTracker) ───── */

  /** Prompting off / on for this rakʿah. */
  setPassive(passive: boolean) { this.passive = passive; }

  /** The sensors count the rakʿāt: their number wins over the one counted from speech. */
  syncRakah(n: number) { if (n > 0) this.rakah = n; }

  /** Rukūʿ / sujūd seen by the sensors: mute the recitation prompting (same as hearing «الله أكبر»). */
  motionMute(now: number, pos: number): SalatEvent[] {
    if (this.state !== "RECITING_FATIHA" && this.state !== "ACTIVE_SURAH_TRACKING") return [];
    return [...this.enter("IN_RUKU_OR_SUJUD", now), { type: "rebase", pos }];
  }

  /** Stood up for rakʿah `n` (sensors): al-Fātiḥah again, unless speech already started it. */
  motionNewRakah(now: number, pos: number, n: number): SalatEvent[] {
    if (this.state === "IDLE") return [];
    if (this.state === "RECITING_FATIHA") { this.rakah = n; return [{ type: "state", state: this.state, rakah: n }]; }
    this.rakah = n;
    return [...this.enter("RECITING_FATIHA", now), { type: "rebase", pos }];
  }

  private hamdExpected(tokens?: readonly string[], cursor?: number) {
    if (!tokens || cursor == null) return false;
    for (let i = Math.max(0, cursor - 6); i < Math.min(tokens.length, cursor + 6); i++) if (/حَمْدُ|حمد/.test(tokens[i]!.replace(/[\u0670\u06DF-\u06ED]/g, ""))) return true;
    return false;
  }

  private akbarExpected(tokens?: readonly string[], cursor?: number) {
    if (!tokens || cursor == null || this.state !== "ACTIVE_SURAH_TRACKING") return false;
    for (let i = Math.max(0, cursor - 4); i < Math.min(tokens.length, cursor + 4); i++) if (hasAkbar(tokens[i]!)) return true;
    return false;
  }
}

/** Wrong words in a row right before `cursor` (judged words only). */
export function trailingErrors(statuses: readonly LiveStatus[], cursor: number): number {
  let n = 0;
  for (let i = Math.min(cursor, statuses.length) - 1; i >= 0; i--) {
    if (statuses[i] === "ERROR") n++;
    else break;
  }
  return n;
}

export type SalatVerse = { surah: number; ayah: number; words: readonly string[]; /** Word number (1-based) of each flat token. */ tokenWord: readonly number[] };

/** Flat matcher tokens of a verse (`words.join(" ").split(" ")`, like the matchers) with their word numbers. */
export function salatVerse(surah: number, ayah: number, words: readonly string[]): SalatVerse {
  const tokenWord: number[] = [];
  words.forEach((w, i) => { for (const part of w.split(" ")) if (part) tokenWord.push(i + 1); });
  return { surah, ayah, words, tokenWord };
}

/**
 * Words to prompt for flat token `token` of `verses`. Words mode: the next 2–3 words of that verse (3, or
 * what is left of it); ayah mode: the whole verse. Mistake prompts start at the verse's first word.
 */
export function promptSpan(verses: readonly SalatVerse[], token: number, mode: PromptMode, reason: "stall" | "mistake"):
  { surah: number; ayah: number; fromWord: number; toWord: number; text: string } | null {
  let t = Math.max(0, token);
  for (const v of verses) {
    if (t < v.tokenWord.length) {
      const n = v.words.length;
      if (mode === "ayah") return { surah: v.surah, ayah: v.ayah, fromWord: 1, toWord: n, text: v.words.join(" ") };
      const from = reason === "mistake" ? 1 : v.tokenWord[t]!;
      const to = Math.min(n, from + 2);
      return { surah: v.surah, ayah: v.ayah, fromWord: from, toWord: to, text: v.words.slice(from - 1, to).join(" ") };
    }
    t -= v.tokenWord.length;
  }
  return null;
}
