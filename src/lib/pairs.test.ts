import { describe, expect, it } from "vitest";
import { chunkRounds, seededShuffle } from "./pairs";

describe("chunkRounds", () => {
  it("splits 13 words into rounds of 4, 4, 5", () => {
    expect(chunkRounds([...Array(13).keys()]).map((r) => r.length)).toEqual([4, 4, 5]);
  });
  it("keeps 8 words as two rounds of 4", () => {
    expect(chunkRounds([...Array(8).keys()]).map((r) => r.length)).toEqual([4, 4]);
  });
});

describe("seededShuffle", () => {
  it("keeps every item and is stable for a seed", () => {
    const a = seededShuffle([1, 2, 3, 4], "x");
    expect([...a].sort()).toEqual([1, 2, 3, 4]);
    expect(seededShuffle([1, 2, 3, 4], "x")).toEqual(a);
  });
});
