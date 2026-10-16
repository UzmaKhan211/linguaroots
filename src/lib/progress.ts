import { supabase } from "@/integrations/supabase/client";

/**
 * Progress lives on the device (so guests work offline) and is mirrored to the
 * learner's account when signed in. On sign-in, device and account progress merge.
 */
const warmKey = (id: string) => `lr:warmup-done:${id}`;
const doneKey = (id: string) => `lr:completed:${id}`;
const ONBOARD_KEY = "lr:onboarded";
const PREFS_KEY = "lr:prefs";

export type Prefs = { relative?: string | undefined; ageConfirmed?: boolean };

const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

async function pushScenario(scenarioId: string) {
  const uid = await currentUserId();
  if (!uid) return;
  await supabase.from("scenario_progress").upsert({
    user_id: uid,
    scenario_id: scenarioId,
    warmup_done: isWarmupDone(scenarioId),
    completed_count: completedCount(scenarioId),
    updated_at: new Date().toISOString(),
  });
}

export function isWarmupDone(scenarioId: string) {
  return get(warmKey(scenarioId)) === "1";
}
export function markWarmupDone(scenarioId: string) {
  set(warmKey(scenarioId), "1");
  void pushScenario(scenarioId);
}
export function completedCount(scenarioId: string) {
  return Number(get(doneKey(scenarioId)) ?? 0) || 0;
}
export function markScenarioCompleted(scenarioId: string) {
  set(doneKey(scenarioId), String(completedCount(scenarioId) + 1));
  void pushScenario(scenarioId);
}

export function isOnboarded() {
  return get(ONBOARD_KEY) === "1";
}
export function getPrefs(): Prefs {
  try {
    return JSON.parse(get(PREFS_KEY) ?? "{}") as Prefs;
  } catch {
    return {};
  }
}
export async function finishOnboarding(prefs: Prefs) {
  set(PREFS_KEY, JSON.stringify(prefs));
  set(ONBOARD_KEY, "1");
  await pushProfile();
}
export function replayOnboarding() {
  set(ONBOARD_KEY, null);
}

async function pushProfile() {
  const uid = await currentUserId();
  if (!uid || !isOnboarded()) return;
  const p = getPrefs();
  await supabase
    .from("profiles")
    .update({ relative: p.relative ?? null, age_confirmed: !!p.ageConfirmed, onboarded_at: new Date().toISOString() })
    .eq("id", uid);
}

/** Merge rule (pure): a warm-up done anywhere stays done; finished count is the larger. */
export function mergeProgress(
  local: { warmupDone: boolean; completed: number },
  remote: { warmupDone: boolean; completed: number } | undefined,
) {
  return {
    warmupDone: local.warmupDone || !!remote?.warmupDone,
    completed: Math.max(local.completed, remote?.completed ?? 0),
  };
}

/** Called on sign-in: guest progress moves into the account, account progress comes down to the device. */
export async function syncWithAccount(scenarioIds: string[]) {
  const uid = await currentUserId();
  if (!uid) return;
  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.from("scenario_progress").select("*").eq("user_id", uid),
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
  ]);
  const remote = new Map((rows ?? []).map((r) => [r.scenario_id, { warmupDone: r.warmup_done, completed: r.completed_count }]));
  const ids = new Set([...scenarioIds, ...remote.keys()]);
  const upserts = [...ids].map((id) => {
    const m = mergeProgress({ warmupDone: isWarmupDone(id), completed: completedCount(id) }, remote.get(id));
    set(warmKey(id), m.warmupDone ? "1" : null);
    set(doneKey(id), m.completed ? String(m.completed) : null);
    return { user_id: uid, scenario_id: id, warmup_done: m.warmupDone, completed_count: m.completed, updated_at: new Date().toISOString() };
  });
  if (upserts.length) await supabase.from("scenario_progress").upsert(upserts);

  if (profile?.onboarded_at && !isOnboarded()) {
    set(PREFS_KEY, JSON.stringify({ relative: profile.relative ?? undefined, ageConfirmed: profile.age_confirmed }));
    set(ONBOARD_KEY, "1");
  } else {
    await pushProfile();
  }
}

/** On sign-out the device forgets the account's progress so the next person starts fresh. */
export function clearDeviceProgress() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("lr:") && k !== "lr:scoring-config")
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
