/**
 * On-device closeness scoring. Pure functions only (no browser APIs) so they can be tested.
 * Pipeline: trim silence -> MFCC frames (mean-normalised) -> DTW alignment -> distance -> percentage.
 */

export const SAMPLE_RATE = 16000;
export const PASS_MARK = 70;
export const SELF_CHECK_AFTER = 3;

/** Two calibrated values: distance that scores 100%, and distance that sits exactly on the pass mark. */
export interface ScoringConfig {
  perfect: number;
  pass: number;
}
export const DEFAULT_CONFIG: ScoringConfig = { perfect: 4, pass: 14 };

const FRAME = 400; // 25 ms
const HOP = 160; // 10 ms
const NFFT = 512;
const MELS = 26;
const CEPS = 13;

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const a = i + k, b = a + len / 2;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
}

const mel = (f: number) => 2595 * Math.log10(1 + f / 700);
const imel = (m: number) => 700 * (10 ** (m / 2595) - 1);

let filters: Float64Array[] | null = null;
function melFilters() {
  if (filters) return filters;
  const lo = mel(60), hi = mel(SAMPLE_RATE / 2);
  const pts = Array.from({ length: MELS + 2 }, (_, i) => Math.floor(((NFFT + 1) * imel(lo + ((hi - lo) * i) / (MELS + 1))) / SAMPLE_RATE));
  filters = [];
  for (let m = 1; m <= MELS; m++) {
    const f = new Float64Array(NFFT / 2 + 1);
    for (let k = pts[m - 1]; k < pts[m]; k++) f[k] = (k - pts[m - 1]) / (pts[m] - pts[m - 1] || 1);
    for (let k = pts[m]; k < pts[m + 1]; k++) f[k] = (pts[m + 1] - k) / (pts[m + 1] - pts[m] || 1);
    filters.push(f);
  }
  return filters;
}

/** Cut quiet lead-in/tail so pauses before speaking don't count. */
export function trimSilence(x: Float32Array): Float32Array {
  const energies: number[] = [];
  for (let i = 0; i + FRAME <= x.length; i += HOP) {
    let e = 0;
    for (let j = 0; j < FRAME; j++) e += x[i + j] * x[i + j];
    energies.push(e / FRAME);
  }
  if (!energies.length) return x;
  const peak = Math.max(...energies);
  const gate = peak * 0.02;
  const first = energies.findIndex((e) => e > gate);
  let last = energies.length - 1;
  while (last > first && energies[last] <= gate) last--;
  return x.slice(first * HOP, last * HOP + FRAME);
}

export function mfcc(signal: Float32Array): Float64Array[] {
  const x = trimSilence(signal);
  const fb = melFilters();
  const out: Float64Array[] = [];
  for (let s = 0; s + FRAME <= x.length; s += HOP) {
    const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
    for (let j = 0; j < FRAME; j++) {
      const pre = x[s + j] - 0.97 * (j ? x[s + j - 1] : 0);
      re[j] = pre * (0.54 - 0.46 * Math.cos((2 * Math.PI * j) / (FRAME - 1)));
    }
    fft(re, im);
    const logMel = fb.map((f) => {
      let e = 0;
      for (let k = 0; k < f.length; k++) if (f[k]) e += f[k] * (re[k] * re[k] + im[k] * im[k]);
      return Math.log(e + 1e-10);
    });
    const c = new Float64Array(CEPS - 1);
    for (let n = 1; n < CEPS; n++) {
      let v = 0;
      for (let m = 0; m < MELS; m++) v += logMel[m] * Math.cos((Math.PI * n * (m + 0.5)) / MELS);
      c[n - 1] = v;
    }
    out.push(c);
  }
  // Mean normalisation removes microphone/room colouring.
  if (out.length) {
    const mean = new Float64Array(CEPS - 1);
    for (const f of out) f.forEach((v, i) => (mean[i] += v / out.length));
    for (const f of out) f.forEach((_, i) => (f[i] -= mean[i]));
  }
  return out;
}

/** Average per-step distance along the best DTW alignment path. */
export function dtwDistance(a: Float64Array[], b: Float64Array[]): number {
  if (!a.length || !b.length) return Infinity;
  const n = a.length, m = b.length;
  const d = (i: number, j: number) => {
    let s = 0;
    for (let k = 0; k < a[i].length; k++) s += (a[i][k] - b[j][k]) ** 2;
    return Math.sqrt(s);
  };
  let prev = new Float64Array(m + 1).fill(Infinity), prevLen = new Float64Array(m + 1);
  prev[0] = 0;
  for (let i = 1; i <= n; i++) {
    const cur = new Float64Array(m + 1).fill(Infinity), curLen = new Float64Array(m + 1);
    for (let j = 1; j <= m; j++) {
      const opts: [number, number][] = [
        [prev[j - 1], prevLen[j - 1]],
        [prev[j], prevLen[j]],
        [cur[j - 1], curLen[j - 1]],
      ];
      let best = opts[0];
      for (const o of opts) if (o[0] < best[0]) best = o;
      cur[j] = best[0] + d(i - 1, j - 1);
      curLen[j] = best[1] + 1;
    }
    prev = cur; prevLen = curLen;
  }
  // Very different lengths (e.g. a different phrase) are penalised.
  const ratio = Math.max(n, m) / Math.min(n, m);
  return (prev[m] / prevLen[m]) * (ratio > 1.8 ? ratio / 1.8 : 1);
}

export function distanceToScore(dist: number, cfg: ScoringConfig): number {
  if (!isFinite(dist)) return 0;
  const span = cfg.pass - cfg.perfect || 1;
  const s = 100 - ((dist - cfg.perfect) / span) * (100 - PASS_MARK);
  return Math.round(Math.max(0, Math.min(100, s)));
}

export function closeness(take: Float32Array, reference: Float32Array, cfg: ScoringConfig = DEFAULT_CONFIG) {
  const dist = dtwDistance(mfcc(take), mfcc(reference));
  return { dist, score: distanceToScore(dist, cfg) };
}

export const passes = (score: number, mark = PASS_MARK) => score >= mark;
export const showSelfCheck = (failedTries: number) => failedTries >= SELF_CHECK_AFTER;

/** Gentle words for a score — never "right" or "wrong". */
export function closenessMessage(score: number, mark = PASS_MARK): string {
  if (score >= 90) return "Beautiful — that sounds just like it.";
  if (score >= mark) return "Lovely, that's really close.";
  if (score >= mark - 20) return "Getting closer. Listen once more and try again.";
  return "Let's hear it again together, then have another go.";
}

/**
 * Suggest settings from labelled sample takes:
 * perfect = typical distance of the best takes; pass = halfway between the worst should-pass and best should-fail take.
 */
export function suggestConfig(passing: number[], failing: number[]): ScoringConfig | null {
  const p = passing.filter(isFinite).sort((a, b) => a - b);
  const f = failing.filter(isFinite).sort((a, b) => a - b);
  if (!p.length) return null;
  const perfect = p[0]!;
  const worstPass = p[p.length - 1]!;
  const pass = f.length ? (worstPass + Math.max(worstPass, f[0]!)) / 2 : worstPass * 1.1;
  return { perfect: +perfect.toFixed(2), pass: +Math.max(pass, perfect + 0.5).toFixed(2) };
}
