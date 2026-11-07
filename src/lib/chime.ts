/**
 * A soft completion chime, synthesised with Web Audio (no sound file, works offline): two gentle
 * bell-like sine tones (a rising fifth) with a slow fade, quiet enough not to startle.
 */
let ctx: AudioContext | null = null;

export async function playCompletionChime(volume = 0.16): Promise<void> {
  const AC = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx ??= new AC();
  if (ctx.state === "suspended") { try { await ctx.resume(); } catch { return; } }
  const now = ctx.currentTime + 0.03;
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  // [frequency, start offset, length] — E5 then B5, each with a quiet octave overtone.
  const notes: [number, number, number][] = [[659.25, 0, 1.6], [987.77, 0.22, 2.0]];
  for (const [f, at, len] of notes) {
    for (const [mult, level] of [[1, 1], [2, 0.18]] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f * mult;
      g.gain.setValueAtTime(0.0001, now + at);
      g.gain.exponentialRampToValueAtTime(level, now + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
      osc.connect(g).connect(master);
      osc.start(now + at);
      osc.stop(now + at + len + 0.05);
    }
  }
}
