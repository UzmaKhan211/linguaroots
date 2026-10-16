import { describe, expect, it } from "vitest";
import { optimiseConfig, parseTakeName } from "./calibration";

describe("parseTakeName", () => {
  it("reads friend takes as should-pass", () => {
    expect(parseTakeName("gft-01__friend_ok__1.mp3")).toEqual({ kind: "take", phraseId: "gft-01", category: "friend_ok", shouldPass: true });
  });
  it("reads noisy takes as should-pass", () => {
    expect(parseTakeName("gpc-03__noisy__1.wav")).toMatchObject({ shouldPass: true });
  });
  it("reads mumbled and wrong takes as should-fail", () => {
    expect(parseTakeName("gft-01__mumble__1.mp3")).toMatchObject({ shouldPass: false });
    expect(parseTakeName("gft-01__wrong_phrase__3.m4a")).toMatchObject({ shouldPass: false });
  });
  it("reads a bare id as the reference", () => {
    expect(parseTakeName("gft-05b.mp3")).toEqual({ kind: "reference", phraseId: "gft-05b" });
  });
});

describe("optimiseConfig", () => {
  it("puts the pass line between good and bad takes", () => {
    const r = optimiseConfig([10, 15, 20], [30, 35])!;
    expect(r.accuracy).toBe(1);
    expect(r.config.pass).toBeGreaterThanOrEqual(20);
    expect(r.config.pass).toBeLessThan(30);
  });
});
