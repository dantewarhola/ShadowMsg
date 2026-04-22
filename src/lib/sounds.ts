// Generates sounds using the Web Audio API — no audio files needed

let ctx: AudioContext | null = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playMessageReceived() {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(880, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(1100, c.currentTime + 0.08);
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
    o.start(c.currentTime);
    o.stop(c.currentTime + 0.25);
  } catch {}
}

export function playMessageSent() {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(660, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.06);
    g.gain.setValueAtTime(0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    o.start(c.currentTime);
    o.stop(c.currentTime + 0.15);
  } catch {}
}

export function playPanic() {
  try {
    const c = getCtx();
    for (let i = 0; i < 3; i++) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220 + i * 80, c.currentTime + i * 0.12);
      g.gain.setValueAtTime(0.15, c.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.1);
      o.start(c.currentTime + i * 0.12);
      o.stop(c.currentTime + i * 0.12 + 0.1);
    }
  } catch {}
}
