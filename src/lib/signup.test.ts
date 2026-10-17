import { describe, expect, it } from "vitest";
import { hasSignupEmail, signupDestination, signupEmailOptions } from "./signup";

describe("Email-first signup", () => {
  it("allows email verification only after email text is entered", () => {
    expect(hasSignupEmail("")).toBe(false);
    expect(hasSignupEmail("   ")).toBe(false);
    expect(hasSignupEmail("uzma@example.com")).toBe(true);
  });

  it("sends verification back to password creation without requesting a password", () => {
    expect(signupEmailOptions("https://linguaroots.lovable.app")).toEqual({
      shouldCreateUser: true,
      emailRedirectTo: "https://linguaroots.lovable.app/create-password",
    });
  });
});

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
describe("Name step", () => {
  it("asks a new account for a name before the companion", () => {
    expect(signupDestination({ display_name: null, avatar_path: null, onboarded_at: null })).toBe("/choose-name");
  });
  it("treats a blank name as missing", () => {
    expect(signupDestination({ display_name: "  ", avatar_path: null, onboarded_at: null })).toBe("/choose-name");
  });
  it("moves on to the companion once a name is saved", () => {
    expect(signupDestination({ display_name: "Uzma", avatar_path: null, onboarded_at: null })).toBe("/choose-companion");
  });
  it("does not ask existing learners for a name", () => {
    expect(signupDestination({ display_name: null, avatar_path: null, onboarded_at: "2026-10-17" })).toBe("/");
  });
});
