/**
 * Experimental on-device speech-listening scorer (HuBERT features + DTW).
 * Browser only: the library and model (~95 MB, cached by the browser) load lazily on first use.
 * Audio is processed on the device; nothing is uploaded.
 */
const MODEL = "Xenova/hubert-base-ls960";

type Frames = Float32Array[];
let loader: Promise<(x: Float32Array) => Promise<Frames>> | null = null;

export function loadSpeechModel(onProgress?: (pct: number) => void) {
  if (!loader) {
    loader = (async () => {
      const { AutoModel, AutoProcessor } = await import("@huggingface/transformers");
      const progress_callback = (p: { status: string; progress?: number }) => {
        if (p.status === "progress" && typeof p.progress === "number") onProgress?.(Math.round(p.progress));
      };
      const proc = await AutoProcessor.from_pretrained(MODEL, { progress_callback });
      const model = await AutoModel.from_pretrained(MODEL, { dtype: "q8", device: "wasm", progress_callback });
      return async (x: Float32Array) => {
        const out = (await model(await proc(x))) as { last_hidden_state: { dims: number[]; data: Float32Array } };
        const [, T, D] = out.last_hidden_state.dims as [number, number, number];
        const d = out.last_hidden_state.data;
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
      };
    })();
    loader.catch(() => (loader = null));
  }
  return loader;
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

const refCache = new Map<string, Promise<Frames>>();
export async function speechCloseness(take: Float32Array, refKey: string, ref: Float32Array, cohort: { key: string; audio: Float32Array }[]) {
  const embed = await loadSpeechModel();
  const cached = (key: string, audio: Float32Array) => {
    if (!refCache.has(key)) refCache.set(key, embed(audio));
    return refCache.get(key)!;
  };
  const t = await embed(take);
  const dist = frameDtw(t, await cached(refKey, ref));
  const ds: number[] = [];
  for (const c of cohort) ds.push(frameDtw(t, await cached(c.key, c.audio)));
  ds.sort((x, y) => x - y);
  const ratio = ds.length >= 2 ? dist / ds[Math.floor(ds.length / 2)]! : NaN;
  return { dist, ratio };
}
