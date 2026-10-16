/** Splits warm-up items into evenly sized rounds of about `size` (6 → 3+3, 13 → 4+4+5). */
export function chunkRounds<T>(items: T[], size = 4): T[][] {
  if (!items.length) return [];
  const rem = items.length % size;
  const count = Math.max(1, rem && rem < size / 2 ? Math.floor(items.length / size) : Math.ceil(items.length / size));
  const base = Math.floor(items.length / count);
  const extra = items.length % count;
  const rounds: T[][] = [];
  let i = 0;
  for (let r = 0; r < count; r++) {
    const n = base + (r >= count - extra ? 1 : 0);
    rounds.push(items.slice(i, i + n));
    i += n;
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
