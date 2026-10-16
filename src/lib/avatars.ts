import bear from "@/assets/avatars/bear.png";
import dove from "@/assets/avatars/dove.png";
import eagle from "@/assets/avatars/eagle.png";
import fox from "@/assets/avatars/fox.png";
import goat from "@/assets/avatars/goat.png";
import ibex from "@/assets/avatars/ibex.png";
import leopard from "@/assets/avatars/leopard.png";
import marmot from "@/assets/avatars/marmot.png";

export interface AvatarOption {
  id: string;
  label: string;
  src: string;
}

export const AVATARS: AvatarOption[] = [
  { id: "bear", label: "Bear", src: bear },
  { id: "dove", label: "Dove", src: dove },
  { id: "eagle", label: "Eagle", src: eagle },
  { id: "fox", label: "Fox", src: fox },
  { id: "goat", label: "Markhor", src: goat },
  { id: "ibex", label: "Ibex", src: ibex },
  { id: "leopard", label: "Snow leopard", src: leopard },
  { id: "marmot", label: "Marmot", src: marmot },
];

export const DEFAULT_AVATAR = AVATARS[0].id;

const AVATAR_PREFIX = "avatar:";
const PENDING_KEY = "lr-pending-avatar";

export function avatarSrc(avatarPath: string | null | undefined): string | null {
  if (!avatarPath?.startsWith(AVATAR_PREFIX)) return null;
  const id = avatarPath.slice(AVATAR_PREFIX.length);
  return AVATARS.find((a) => a.id === id)?.src ?? null;
}

export function avatarPathValue(id: string): string {
  return `${AVATAR_PREFIX}${id}`;
}

/** Avatar picked on the sign-up form, before the account exists. */
export function setPendingAvatar(id: string) {
  try {
    localStorage.setItem(PENDING_KEY, id);
  } catch {
    /* ignore */
  }
}

export function takePendingAvatar(): string | null {
  try {
    const v = localStorage.getItem(PENDING_KEY);
    if (v) localStorage.removeItem(PENDING_KEY);
    return v;
  } catch {
    return null;
  }
}
