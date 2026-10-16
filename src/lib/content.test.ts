import { describe, it, expect } from "vitest";
import { scenarios, turns, getChoices, getTurn, getWarmup, buildTurns } from "./content";

describe("content data", () => {
  it("loads both Khowar scenarios in order", () => {
    expect(scenarios.map((s) => s.id)).toEqual(["grandma-phone-call", "grandft_inperson_meeting"]);
  });

  it("offers grandma's replies to gpc-03 in set order", () => {
    expect(getChoices("gpc-03").map((t) => t.id)).toEqual(["gpc-04a", "gpc-04b"]);
  });

  it("parses the 70% pass mark on learner lines", () => {
    expect(getTurn("gpc-02")?.passThreshold).toBe(70);
  });

  it("marks the final lines as scenario ends", () => {
    expect(getTurn("gpc-18")?.isEnd).toBe(true);
    expect(getTurn("gft-14")?.isEnd).toBe(true);
  });

  it("keeps quoted commas inside Khowar text", () => {
    expect(getTurn("gpc-04a")?.roman).toBe("Ay Wawi, awa asum ta Novais. Kicha Asus?");
  });

  it("every scenario's start line exists", () => {
    for (const s of scenarios) expect(getTurn(s.startTurnId)).toBeDefined();
  });

  it("every next line points to a real line", () => {
    for (const t of turns) if (t.nextTurnId) expect(getTurn(t.nextTurnId)).toBeDefined();
  });

  it("each scenario has its own warm-up items", () => {
    expect(getWarmup("grandma-phone-call")).toHaveLength(13);
    expect(getWarmup("grandft_inperson_meeting")).toHaveLength(13);
  });

  it("defaults a missing pass mark to 70", () => {
    const [t] = buildTurns("turn_id,speaker,pass_threshold\nx,learner,\n");
    expect(t.passThreshold).toBe(70);
  });
});
