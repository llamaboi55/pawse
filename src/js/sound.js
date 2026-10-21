// Tiny made-up sounds (no recordings): a chirpy "mrrp", a soft "wuf", and a purr.
let ctx = null;
const ac = () => (ctx ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)());

function voice(freqs, dur, type = 'triangle', gain = 0.12) {
  const a = ac();
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  o.type = type;
  f.type = 'lowpass';
  f.frequency.value = 1800;
  freqs.forEach(([at, hz]) => o.frequency.linearRampToValueAtTime(hz, t + at * dur));
  o.frequency.setValueAtTime(freqs[0][1], t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.03);
  g.gain.linearRampToValueAtTime(gain * 0.7, t + dur * 0.6);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(f).connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function call(species) {
  try {
    if (species === 'dog') voice([[0, 260], [0.3, 330], [1, 180]], 0.18, 'sawtooth', 0.08);
    else voice([[0, 520], [0.4, 760], [1, 600]], 0.32);
  } catch {}
}

export function purr(seconds = 1.6) {
  try {
    const a = ac();
    const t = a.currentTime;
    const o = a.createOscillator();
    const lfo = a.createOscillator();
    const lg = a.createGain();
    const g = a.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 52;
    lfo.frequency.value = 24;
    lg.gain.value = 0.05;
    lfo.connect(lg).connect(g.gain);
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.2);
    g.gain.linearRampToValueAtTime(0, t + seconds);
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 300;
    o.connect(f).connect(g).connect(a.destination);
    o.start(t);
    lfo.start(t);
    o.stop(t + seconds);
    lfo.stop(t + seconds);
  } catch {}
}
