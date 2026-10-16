/** Bulk calibration helpers (pure). File names: <phraseId>__<category>__<n>.<ext>; a bare <phraseId>.<ext> is the reference. */
import type { ScoringConfig } from "./scoring";

export const PASS_CATEGORIES = ["self_good", "friend_good", "friend_ok", "noisy"] as const;
export const FAIL_CATEGORIES = ["mumble", "wrong_phrase"] as const;

export type ParsedName =
  | { kind: "reference"; phraseId: string }
  | { kind: "take"; phraseId: string; category: string; shouldPass: boolean }
  | { kind: "unknown" };

export function parseTakeName(fileName: string): ParsedName {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").trim().toLowerCase();
  const parts = base.split("__");
  if (parts.length === 1) return /^[a-z]+-\d+[a-z]?$/.test(base) ? { kind: "reference", phraseId: base } : { kind: "unknown" };
  const [phraseId, category] = parts;
  if (!phraseId || !category) return { kind: "unknown" };
  if ((PASS_CATEGORIES as readonly string[]).includes(category)) return { kind: "take", phraseId, category, shouldPass: true };
  if ((FAIL_CATEGORIES as readonly string[]).includes(category)) return { kind: "take", phraseId, category, shouldPass: false };
  return { kind: "unknown" };
}

/**
 * Best global settings: the pass distance that sorts the most takes correctly
 * (balanced between should-pass and should-fail), perfect = best 10% of should-pass takes.
 */
export function optimiseConfig(passing: number[], failing: number[]): { config: ScoringConfig; accuracy: number } | null {
  const p = passing.filter(Number.isFinite).sort((a, b) => a - b);
  const f = failing.filter(Number.isFinite).sort((a, b) => a - b);
  if (!p.length) return null;
  const candidates = [...new Set([...p, ...f])].sort((a, b) => a - b);
  let best = { t: p[p.length - 1]!, acc: -1 };
  candidates.forEach((c, i) => {
    const next = candidates[i + 1];
    const t = next === undefined ? c : (c + next) / 2; // midpoint between neighbours
    const passOk = p.filter((d) => d <= t).length / p.length;
    const failOk = f.length ? failing.filter((d) => !(d <= t)).length / failing.length : 1;
    const acc = (passOk + failOk) / 2;
    if (acc > best.acc) best = { t, acc };
  });
  const perfect = p[Math.floor(p.length * 0.1)]!;
  return {
    config: { perfect: +perfect.toFixed(2), pass: +Math.max(best.t, perfect + 0.5).toFixed(2) },
    accuracy: best.acc,
  };
}
