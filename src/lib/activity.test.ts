import { describe, expect, it } from "vitest";
import { summarizeActivity } from "./activity";

describe("activity summary", () => {
  it("counts each completed lesson once even when conversations are replayed", () => {
    expect(summarizeActivity([{ words: true, phrases: true, conversations: 4 }])).toEqual({ lessons: 3, conversations: 4, words: true, phrases: true, talked: true });
  });
  it("starts with no completed milestones", () => {
    expect(summarizeActivity([{ words: false, phrases: false, conversations: 0 }])).toEqual({ lessons: 0, conversations: 0, words: false, phrases: false, talked: false });
  });
  it("combines activity across independent units", () => {
    expect(summarizeActivity([{ words: true, phrases: false, conversations: 0 }, { words: true, phrases: true, conversations: 1 }]).lessons).toBe(4);
  });
});