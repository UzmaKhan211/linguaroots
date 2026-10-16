import { PASS_MARK } from "@/lib/scoring";

/** Speech-tool ratio cut-offs, tuned on the user's 176 lab takes (best split at ~0.77). */
export const SPEECH_RATIO = { perfect: 0.45, pass: 0.77 };

/** Map a speech ratio (lower = closer) to 0–100, landing exactly on PASS_MARK at the pass cut-off. */
export function speechRatioToScore(ratio: number, cfg = SPEECH_RATIO): number {
  if (!Number.isFinite(ratio)) return 0;
  const s = 100 - ((ratio - cfg.perfect) / (cfg.pass - cfg.perfect)) * (100 - PASS_MARK);
  return Math.round(Math.max(0, Math.min(100, s)));
}
