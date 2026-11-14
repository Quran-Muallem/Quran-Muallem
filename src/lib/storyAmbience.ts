/**
 * v49 story atmosphere, generated on the device (no files, no music): a soft nature bed — a gentle breeze
 * with slow waves like a distant stream — at ~10 % volume behind the narrator, plus a soft star chime and a
 * page-turn swish. Web Audio, so it works offline in the app and the browser.
 */
let ctx: AudioContext | null = null;
let bed: { stop: () => void } | null = null;

function audio(): AudioContext | null {
  try {
    const AC = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(2, Math.floor(c.sampleRate * seconds), c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // brown noise
  }
  return buf;
}

export const ambienceOn = () => bed !== null;

/** Starts the nature bed (volume ≈ 0.1). */
export function startAmbience(volume = 0.1) {
  const c = audio();
  if (!c || bed) return;
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 6); src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = 0.4;
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 90;
  const gain = c.createGain(); gain.gain.value = 0;
  // slow «waves»: an LFO on the volume and a second one on the filter
  const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
  const lfoGain = c.createGain(); lfoGain.gain.value = volume * 0.35;
  const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.05;
  const lfo2Gain = c.createGain(); lfo2Gain.gain.value = 220;
  lfo.connect(lfoGain).connect(gain.gain); lfo2.connect(lfo2Gain).connect(lp.frequency);
  src.connect(hp).connect(lp).connect(gain).connect(c.destination);
  const now = c.currentTime;
  gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + 2.5);
  src.start(); lfo.start(); lfo2.start();
  bed = {
    stop: () => {
      const t = c.currentTime;
      gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => { try { src.stop(); lfo.stop(); lfo2.stop(); } catch { /* ignore */ } }, 1400);
    },
  };
}
export function stopAmbience() { bed?.stop(); bed = null; }

/** A soft star chime (two bell partials). */
export function starChime(volume = 0.18) {
  const c = audio(); if (!c) return;
  const t = c.currentTime;
  [[1318.5, 1], [1975.5, 0.5], [2637, 0.25]].forEach(([f, a], i) => {
    const o = c.createOscillator(); o.type = "sine"; o.frequency.value = f!;
    const g = c.createGain(); g.gain.setValueAtTime(0, t + i * 0.09); g.gain.linearRampToValueAtTime(volume * a!, t + i * 0.09 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 1.4);
    o.connect(g).connect(c.destination); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 1.5);
  });
}

/** A gentle page-turn swish. */
export function pageTurn(volume = 0.12) {
  const c = audio(); if (!c) return;
  const t = c.currentTime;
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 0.4);
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(3200, t + 0.28);
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volume, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  src.connect(bp).connect(g).connect(c.destination); src.start(t); src.stop(t + 0.4);
}
