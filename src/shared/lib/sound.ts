let ctx: AudioContext | null = null;

function getCtx() {
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Call from a user gesture so later chimes are allowed to play. */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

/** Rising three-note chime for new orders. Synthesised, no audio file. */
export function chime() {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  [659, 988, 1319].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    const s = t + i * 0.13;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.28, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.4);
    o.connect(g).connect(c.destination);
    o.start(s);
    o.stop(s + 0.45);
  });
}
