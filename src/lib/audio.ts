import { DEFAULT_CONFIG, SAMPLE_RATE, type ScoringConfig } from "./scoring";

/** Browser-only helpers. Call from event handlers / effects only. */

export async function decodeToMono16k(data: ArrayBuffer): Promise<Float32Array> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const buf = await ctx.decodeAudioData(data.slice(0));
    const len = Math.ceil(buf.duration * SAMPLE_RATE);
    const off = new OfflineAudioContext(1, Math.max(1, len), SAMPLE_RATE);
    const src = off.createBufferSource();
    src.buffer = buf;
    src.connect(off.destination);
    src.start();
    const out = await off.startRendering();
    return out.getChannelData(0);
  } finally {
    void ctx.close();
  }
}

const refCache = new Map<string, Promise<Float32Array | null>>();
export function loadReference(url: string) {
  if (!refCache.has(url)) {
    refCache.set(
      url,
      fetch(url)
        .then((r) => (r.ok && !(r.headers.get("content-type") ?? "").includes("text/html") ? r.arrayBuffer() : null))
        .then((b) => (b ? decodeToMono16k(b) : null))
        .catch(() => null),
    );
  }
  return refCache.get(url)!;
}

const KEY = "lr:scoring-config";
export function getScoringConfig(): ScoringConfig {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && typeof v.perfect === "number" && typeof v.pass === "number") return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_CONFIG;
}
export function saveScoringConfig(c: ScoringConfig | null) {
  if (c) localStorage.setItem(KEY, JSON.stringify(c));
  else localStorage.removeItem(KEY);
}
