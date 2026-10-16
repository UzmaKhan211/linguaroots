import { describe, expect, it } from "vitest";
import { XP, award, displayStreak, mergeRewards, nextStreak } from "./rewards";

const empty = { xp: 0, streak: 0, lastDay: null };

describe("rewards", () => {
  it("awards the agreed XP amounts", () => {
    expect(XP).toEqual({ warmup: 20, line: 10, scenario: 50 });
  });
  it("XP never goes down", () => {
    expect(award({ xp: 30, streak: 1, lastDay: "2026-10-16" }, -10, "2026-10-16").xp).toBe(30);
  });
  it("first practice starts the streak at 1", () => {
    expect(nextStreak(empty, "2026-10-16").streak).toBe(1);
  });
  it("practising the next day adds one", () => {
    expect(nextStreak({ xp: 0, streak: 3, lastDay: "2026-10-15" }, "2026-10-16").streak).toBe(4);
  });
  it("same day does not add", () => {
    expect(nextStreak({ xp: 0, streak: 3, lastDay: "2026-10-16" }, "2026-10-16").streak).toBe(3);
  });
  it("a missed day goes back to 1, not 0", () => {
    expect(nextStreak({ xp: 0, streak: 9, lastDay: "2026-10-13" }, "2026-10-16").streak).toBe(1);
  });
  it("streak continues across month ends", () => {
    expect(nextStreak({ xp: 0, streak: 2, lastDay: "2026-10-31" }, "2026-11-01").streak).toBe(3);
  });
  it("merge keeps the larger XP and the most recent streak", () => {
    expect(
      mergeRewards({ xp: 100, streak: 5, lastDay: "2026-10-10" }, { xp: 40, streak: 2, lastDay: "2026-10-16" }),
    ).toEqual({ xp: 100, streak: 2, lastDay: "2026-10-16" });
  });
  it("display hides a broken streak", () => {
    expect(displayStreak({ xp: 0, streak: 4, lastDay: "2026-10-10" }, "2026-10-16")).toBe(0);
    expect(displayStreak({ xp: 0, streak: 4, lastDay: "2026-10-15" }, "2026-10-16")).toBe(4);
  });
});
