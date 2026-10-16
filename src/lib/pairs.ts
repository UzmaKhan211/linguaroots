/** Splits warm-up items into small matching rounds. A tiny leftover joins the last round. */
export function chunkRounds<T>(items: T[], size = 4): T[][] {
  const rounds: T[][] = [];
  for (let i = 0; i < items.length; i += size) rounds.push(items.slice(i, i + size));
  const last = rounds[rounds.length - 1];
  if (rounds.length > 1 && last && last.length < size / 2) {
    rounds.pop();
    rounds[rounds.length - 1]!.push(...last);
  }
  return rounds;
}

/** Deterministic shuffle (same on server and phone) so tiles don't jump on load. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
