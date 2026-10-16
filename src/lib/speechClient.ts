/** Page-side handle to the speech-listening worker. Browser only. */
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { res: (v: any) => void; rej: (e: unknown) => void }>();
const listeners = new Set<(pct: number) => void>();
let ready = false;

function w() {
  if (!worker) {
    worker = new Worker(new URL("./speech.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
      const d = e.data;
      if (d.type === "progress") return listeners.forEach((l) => l(d.pct));
      const p = pending.get(d.id);
      if (!p) return;
      pending.delete(d.id);
      if (d.ok) p.res(d);
      else p.rej(new Error(d.error));
    };
    worker.onerror = () => {
      pending.forEach((p) => p.rej(new Error("worker failed")));
      pending.clear();
      worker = null;
    };
  }
  return worker;
}

function call(msg: object): Promise<any> {
  const id = ++seq;
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    w().postMessage({ ...msg, id });
  });
}

export const speechReady = () => ready;
export function onSpeechProgress(l: (pct: number) => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}
let loading: Promise<void> | null = null;
export function loadSpeech() {
  loading ??= call({ type: "load" }).then(() => void (ready = true)).catch((e) => { loading = null; throw e; });
  return loading;
}
export const warmSpeech = (items: { key: string; audio: Float32Array }[]) => call({ type: "warm", items });
export const scoreSpeech = (take: Float32Array, refKey: string, refAudio: Float32Array, cohort: { key: string; audio: Float32Array }[]) =>
  call({ type: "score", take, refKey, refAudio, cohort }) as Promise<{ dist: number; ratio: number }>;
