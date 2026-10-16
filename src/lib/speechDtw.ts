export type Frames = Float32Array[];

export function normaliseFrames(d: Float32Array, T: number, D: number): Frames {
  const frames: Frames = [];
  for (let i = 0; i < T; i++) {
    const v = d.slice(i * D, (i + 1) * D);
    let n = 0;
    for (let k = 0; k < D; k++) n += v[k]! * v[k]!;
    n = Math.sqrt(n) || 1;
    for (let k = 0; k < D; k++) v[k] = v[k]! / n;
    frames.push(v);
  }
  return frames;
}

/** Average cosine distance along the best alignment (0 = identical). */
export function frameDtw(a: Frames, b: Frames): number {
  const n = a.length, m = b.length;
  if (!n || !m) return Infinity;
  let prev = new Float64Array(m + 1).fill(Infinity), pl = new Float64Array(m + 1);
  prev[0] = 0;
  for (let i = 1; i <= n; i++) {
    const cur = new Float64Array(m + 1).fill(Infinity), cl = new Float64Array(m + 1);
    const ai = a[i - 1]!;
    for (let j = 1; j <= m; j++) {
      let bv = prev[j - 1]!, bl = pl[j - 1]!;
      if (prev[j]! < bv) { bv = prev[j]!; bl = pl[j]!; }
      if (cur[j - 1]! < bv) { bv = cur[j - 1]!; bl = cl[j - 1]!; }
      const bj = b[j - 1]!;
      let s = 0;
      for (let k = 0; k < ai.length; k++) s += ai[k]! * bj[k]!;
      cur[j] = bv + (1 - s);
      cl[j] = bl + 1;
    }
    prev = cur; pl = cl;
  }
  return prev[m]! / pl[m]!;
}
