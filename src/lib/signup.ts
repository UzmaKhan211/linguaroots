import { avatarSrc } from "@/lib/avatars";

export function hasSignupEmail(email: string) {
  return email.trim().length > 0;
}

/** Email ownership is confirmed before a new learner chooses a password. */
export function signupEmailOptions(origin: string) {
  return { shouldCreateUser: true, emailRedirectTo: `${origin}/create-password` };
}

/** Account state, not device state, decides which registration step comes next: name, companion, then language. */
export function signupDestination(
  profile: { display_name?: string | null; avatar_path: string | null; onboarded_at: string | null } | null,
) {
  if (profile?.onboarded_at) return "/" as const;
  if (profile && "display_name" in profile && !profile.display_name?.trim()) return "/choose-name" as const;
  if (!avatarSrc(profile?.avatar_path)) return "/choose-companion" as const;
  return "/choose-language" as const;
}
