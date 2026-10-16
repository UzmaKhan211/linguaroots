import { fetchLessonAudio } from "@/lib/lessonAudio";
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
      fetchLessonAudio(url)
        .then((b) => (b ? b.arrayBuffer() : null))
        .then((b) => (b ? decodeToMono16k(b) : null))
        .catch(() => null),
    );
  }
  return refCache.get(url)!;
}

const KEY = "lr:scoring-config-v2"; // v2: older saved lab settings belong to the old scoring
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

/** Other phrases by the same speaker, used to cancel out voice differences when scoring. */
export async function loadCohort(urls: string[], exclude: string, max = 8): Promise<Float32Array[]> {
  const pick = [...new Set(urls)].filter((u) => u !== exclude);
  const step = Math.max(1, Math.floor(pick.length / max));
  const chosen = pick.filter((_, i) => i % step === 0).slice(0, max);
  const out = await Promise.all(chosen.map(loadReference));
  return out.filter((x): x is Float32Array => !!x);
}

/** Raw microphone: browser voice processing changes the sound and makes scoring unfair. */
export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true, channelCount: 1 },
};

export async function loadCohortKeyed(urls: string[], exclude: string, max = 8) {
  const pick = [...new Set(urls)].filter((u) => u !== exclude);
  const step = Math.max(1, Math.floor(pick.length / max));
  const chosen = pick.filter((_, i) => i % step === 0).slice(0, max);
  const out = await Promise.all(chosen.map(async (key) => ({ key, audio: await loadReference(key) })));
  return out.filter((x): x is { key: string; audio: Float32Array } => !!x.audio);
}
