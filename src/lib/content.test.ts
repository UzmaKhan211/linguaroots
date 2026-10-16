import { describe, it, expect } from "vitest";
import { scenarios, turns, getChoices, getTurn, getWarmup, buildTurns } from "./content";

describe("content data", () => {
  it("loads both Khowar scenarios in order", () => {
    expect(scenarios.map((s) => s.id)).toEqual(["grandma-phone-call", "grandft_inperson_meeting"]);
  });

  it("offers grandma's replies to gpc-03 in set order", () => {
    expect(getChoices("gpc-03").map((t) => t.id)).toEqual(["gpc-04a", "gpc-04b"]);
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
    expect(getWarmup("grandma-phone-call")).toHaveLength(6);
    expect(getWarmup("grandft_inperson_meeting")).toHaveLength(6);
  });

});

import { turns as allTurns } from "./content";
describe("pass mark", () => {
  it("every phrase passes at 50%", () => {
    expect(allTurns.every((t) => t.passThreshold === 50)).toBe(true);
  });
});

import { orderLanguages } from "@/routes/choose-language";
import { describe as dl, it as il, expect as el } from "vitest";
dl("language order", () => {
  il("Khowar first, then coming-soon alphabetically", () => {
    const out = orderLanguages([
      { name: "Pashto", status: "coming-soon" },
      { name: "Khowar", status: "available" },
      { name: "Burushaski", status: "coming-soon" },
    ]).map((l) => l.name);
    el(out).toEqual(["Khowar", "Burushaski", "Pashto"]);
  });
});
