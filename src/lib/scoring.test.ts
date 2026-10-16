import { describe, expect, it } from "vitest";
import { closeness, distanceToScore, passes, showSelfCheck, suggestConfig, SAMPLE_RATE } from "./scoring";

function tone(freqs: number[], seconds = 0.6) {
  const n = Math.floor(SAMPLE_RATE * seconds);
  const x = new Float32Array(n);
  const seg = Math.floor(n / freqs.length);
  for (let i = 0; i < n; i++) {
    const f = freqs[Math.min(freqs.length - 1, Math.floor(i / seg))]!;
    x[i] = 0.5 * Math.sin((2 * Math.PI * f * i) / SAMPLE_RATE);
  }
  return x;
}

describe("scoring rules", () => {
  const cfg = { perfect: 4, pass: 14 };
  it("pass mark is 70%", () => {
    expect(passes(70)).toBe(true);
    expect(passes(69)).toBe(false);
  });
  it("distance at the pass setting scores exactly 70", () => {
    expect(distanceToScore(14, cfg)).toBe(70);
    expect(distanceToScore(4, cfg)).toBe(100);
  });
  it("self-check appears only after 3 failed tries", () => {
    expect(showSelfCheck(2)).toBe(false);
    expect(showSelfCheck(3)).toBe(true);
  });
  it("identical audio scores 100, a different sound scores lower", () => {
    const ref = tone([300, 600, 900]);
    expect(closeness(ref, ref, cfg).score).toBe(100);
    expect(closeness(tone([1500, 200, 2500]), ref, cfg).dist).toBeGreaterThan(closeness(ref, ref, cfg).dist);
  });
  it("suggested pass setting sits between passing and failing takes", () => {
    const c = suggestConfig([3, 5, 8], [12, 15])!;
    expect(c.perfect).toBe(3);
    expect(c.pass).toBe(10);
  });
});
