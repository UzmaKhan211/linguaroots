import { describe, expect, it } from "vitest";
import { signupDestination } from "./signup";

describe("Registration steps", () => {
  it("sends a new account to companion selection before language selection", () => {
    expect(signupDestination({ avatar_path: null, onboarded_at: null })).toBe("/choose-companion");
  });
  it("continues to language selection after a companion is saved", () => {
    expect(signupDestination({ avatar_path: "avatar:fox", onboarded_at: null })).toBe("/choose-language");
  });
  it("does not repeat companion selection for existing learners", () => {
    expect(signupDestination({ avatar_path: null, onboarded_at: "2026-10-17" })).toBe("/");
  });
  it("does not accept an unknown companion as a completed selection", () => {
    expect(signupDestination({ avatar_path: "avatar:unknown", onboarded_at: null })).toBe("/choose-companion");
  });
});