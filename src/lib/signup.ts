import { avatarSrc } from "@/lib/avatars";

/** Account state, not device state, decides which registration step comes next. */
export function signupDestination(profile: { avatar_path: string | null; onboarded_at: string | null } | null) {
  if (profile?.onboarded_at) return "/" as const;
  if (!avatarSrc(profile?.avatar_path)) return "/choose-companion" as const;
  return "/choose-language" as const;
}