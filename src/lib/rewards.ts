import { supabase } from "@/integrations/supabase/client";

/** XP never goes down. A missed day sets the streak back to 1 (today counts), never 0. */
export const XP = { warmup: 20, line: 10, scenario: 50 } as const;

export type Rewards = { xp: number; streak: number; lastDay: string | null };

const KEY = "lr:rewards";

export function dayKey(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!)) / 86400000);
}

/** Pure: apply a day of practice to the streak. */
export function nextStreak(prev: Rewards, today: string): Pick<Rewards, "streak" | "lastDay"> {
  if (!prev.lastDay) return { streak: 1, lastDay: today };
  const gap = daysBetween(prev.lastDay, today);
  if (gap <= 0) return { streak: Math.max(1, prev.streak), lastDay: prev.lastDay };
  if (gap === 1) return { streak: prev.streak + 1, lastDay: today };
  return { streak: 1, lastDay: today };
}

/** Pure: add XP (negative amounts are ignored) and count today. */
export function award(prev: Rewards, amount: number, today: string): Rewards {
  return { xp: prev.xp + Math.max(0, Math.floor(amount)), ...nextStreak(prev, today) };
}

/** Pure: shown streak — if the last practice was before yesterday, it will restart at 1. */
export function displayStreak(r: Rewards, today: string) {
  if (!r.lastDay) return 0;
  return daysBetween(r.lastDay, today) <= 1 ? r.streak : 0;
}

/** Pure merge of device and account: XP is the larger, streak follows the most recent day. */
export function mergeRewards(a: Rewards, b: Rewards): Rewards {
  const xp = Math.max(a.xp, b.xp);
  if (!a.lastDay) return { ...b, xp };
  if (!b.lastDay) return { ...a, xp };
  if (a.lastDay === b.lastDay) return { xp, streak: Math.max(a.streak, b.streak), lastDay: a.lastDay };
  return a.lastDay > b.lastDay ? { ...a, xp } : { ...b, xp };
}

export function getRewards(): Rewards {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? "null") as Rewards | null;
    if (r && typeof r.xp === "number") return r;
  } catch {
    /* ignore */
  }
  return { xp: 0, streak: 0, lastDay: null };
}

function save(r: Rewards) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("lr:rewards", { detail: r }));
}

async function push(r: Rewards) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  await supabase.from("profiles").update({ xp: r.xp, streak: r.streak, last_active_day: r.lastDay }).eq("id", uid);
}

export function earn(amount: number) {
  const r = award(getRewards(), amount, dayKey());
  save(r);
  void push(r);
  return r;
}

export async function syncRewards(uid: string) {
  const { data } = await supabase.from("profiles").select("xp, streak, last_active_day").eq("id", uid).maybeSingle();
  const remote: Rewards = { xp: data?.xp ?? 0, streak: data?.streak ?? 0, lastDay: data?.last_active_day ?? null };
  const m = mergeRewards(getRewards(), remote);
  save(m);
  await push(m);
}
