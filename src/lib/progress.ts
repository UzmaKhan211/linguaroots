// Device-only progress until accounts arrive in Phase 4.
const key = (id: string) => `lr:warmup-done:${id}`;

export function isWarmupDone(scenarioId: string): boolean {
  try {
    return localStorage.getItem(key(scenarioId)) === "1";
  } catch {
    return false;
  }
}

export function markWarmupDone(scenarioId: string) {
  try {
    localStorage.setItem(key(scenarioId), "1");
  } catch {
    /* ignore */
  }
}
