/// <reference lib="webworker" />
/**
 * Runs the speech-listening tool off the main thread so the screen never freezes.
 * Uses the small (~95 MB, cached) model on the regular processor — the big graphics-chip
 * version overloaded phone browsers. Audio arrives as numbers from the page and never leaves the device.
 */
import { frameDtw, normaliseFrames, type Frames } from "./speechDtw";
import { trimSilence } from "./scoring";

const MODEL = "Xenova/hubert-base-ls960";
type Embed = (x: Float32Array) => Promise<Frames>;
let loader: Promise<Embed> | null = null;
const refs = new Map<string, Promise<Frames>>();

function load() {
  if (!loader) {
    loader = (async () => {
      const { AutoModel, AutoProcessor } = await import("@huggingface/transformers");
      const progress_callback = (p: { status: string; progress?: number }) => {
        if (p.status === "progress" && typeof p.progress === "number") postMessage({ type: "progress", pct: Math.round(p.progress) });
      };
      const proc = await AutoProcessor.from_pretrained(MODEL, { progress_callback });
      const model = await AutoModel.from_pretrained(MODEL, { dtype: "q8", device: "wasm", progress_callback });
      return async (x: Float32Array) => {
        const out = (await model(await proc(x))) as { last_hidden_state: { dims: number[]; data: Float32Array } };
        const [, T, D] = out.last_hidden_state.dims as [number, number, number];
        return normaliseFrames(out.last_hidden_state.data, T, D);
      };
    })();
    loader.catch(() => (loader = null));
  }
  return loader;
}

function ref(embed: Embed, key: string, audio?: Float32Array) {
  if (!refs.has(key)) {
    if (!audio) throw new Error("missing reference " + key);
    const p = embed(trimSilence(audio));
    p.catch(() => refs.delete(key));
    refs.set(key, p);
  }
  return refs.get(key)!;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type } = e.data;
  try {
    const embed = await load();
    if (type === "load") return postMessage({ id, ok: true });
    if (type === "warm") {
      for (const it of e.data.items as { key: string; audio: Float32Array }[]) await ref(embed, it.key, it.audio);
      return postMessage({ id, ok: true });
    }
    if (type === "score") {
      const { take, refKey, refAudio, cohort } = e.data as { take: Float32Array; refKey: string; refAudio: Float32Array; cohort: { key: string; audio: Float32Array }[] };
      const t = await embed(trimSilence(take));
      const dist = frameDtw(t, await ref(embed, refKey, refAudio));
      const ds: number[] = [];
      for (const c of cohort) ds.push(frameDtw(t, await ref(embed, c.key, c.audio)));
      ds.sort((a, b) => a - b);
      const ratio = ds.length >= 2 ? dist / ds[Math.floor(ds.length / 2)]! : NaN;
      return postMessage({ id, ok: true, dist, ratio });
    }
  } catch (err) {
    postMessage({ id, ok: false, error: String(err) });
  }
};
