/** Soft, warm sound effects made in the browser (no files to download). */
let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, vol = 0.18, type: OscillatorType = "sine") {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Bright two-note chime. */
export function playCorrect() {
  tone(659, 0, 0.25);
  tone(988, 0.12, 0.4);
}

/** Gentle low two-note "hmm", never harsh. */
export function playIncorrect() {
  tone(392, 0, 0.22, 0.14, "triangle");
  tone(330, 0.15, 0.35, 0.12, "triangle");
}

/** Soft phone trill: two short gentle rings. */
export function playPhoneRing() {
  [0, 0.55].forEach((s) => {
    tone(440, s, 0.4, 0.08);
    tone(480, s, 0.4, 0.08);
  });
}

/** Warm welcome chime, like arriving home. */
export function playTeaArrival() {
  tone(523, 0, 0.9, 0.1);
  tone(659, 0.18, 0.9, 0.09);
  tone(784, 0.36, 1.1, 0.08);
}

/** Little rising melody for finishing a warm-up or conversation. */
export function playCelebrate() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.35, 0.16));
  tone(1319, 0.5, 0.7, 0.12);
  tone(1047, 0.5, 0.7, 0.1);
}
