import { supabase } from "@/integrations/supabase/client";
import { syncRewards } from "@/lib/rewards";

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
    resume: getResume(scenarioId),
    updated_at: new Date().toISOString(),
  });
}

/** A conversation left part way: the lines shown so far and the spoken/skipped tally. */
export type Resume = { history: string[]; spoken: number; skipped: number };
const resumeKey = (id: string) => `lr:resume:${id}`;
const isResume = (v: unknown): v is Resume =>
  !!v && typeof v === "object" && Array.isArray((v as Resume).history) && (v as Resume).history.length > 0;

export function getResume(scenarioId: string): Resume | null {
  try {
    const v: unknown = JSON.parse(get(resumeKey(scenarioId)) ?? "null");
    return isResume(v) ? v : null;
  } catch {
    return null;
  }
}
export function saveResume(scenarioId: string, r: Resume | null) {
  set(resumeKey(scenarioId), r && r.history.length ? JSON.stringify(r) : null);
  void pushScenario(scenarioId);
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

/** Merge rule (pure): keep whichever saved conversation got further. */
export function pickResume(local: Resume | null, remote: Resume | null): Resume | null {
  if (!local) return remote;
  if (!remote) return local;
  return remote.history.length > local.history.length ? remote : local;
}

/** Called on sign-in: guest progress moves into the account, account progress comes down to the device. */
export async function syncWithAccount(scenarioIds: string[]) {
  const uid = await currentUserId();
  if (!uid) return;
  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.from("scenario_progress").select("*").eq("user_id", uid),
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
  ]);
  const remote = new Map((rows ?? []).map((r) => [r.scenario_id, { warmupDone: r.warmup_done, completed: r.completed_count, resume: r.resume as unknown }]));
  const ids = new Set([...scenarioIds, ...remote.keys()]);
  const upserts = [...ids].map((id) => {
    const m = mergeProgress({ warmupDone: isWarmupDone(id), completed: completedCount(id) }, remote.get(id));
    set(warmKey(id), m.warmupDone ? "1" : null);
    set(doneKey(id), m.completed ? String(m.completed) : null);
    const rr = remote.get(id)?.resume;
    const resume = pickResume(getResume(id), isResume(rr) ? rr : null);
    set(resumeKey(id), resume ? JSON.stringify(resume) : null);
    return { user_id: uid, scenario_id: id, warmup_done: m.warmupDone, completed_count: m.completed, resume, updated_at: new Date().toISOString() };
  });
  if (upserts.length) await supabase.from("scenario_progress").upsert(upserts);

  await syncRewards(uid);

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
      .filter((k) => k.startsWith("lr:") && !k.startsWith("lr:scoring-config"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Pure: how far a learner is in one conversation. Warm-up done = halfway, finished once = full. */
export function scenarioStage(warmupDone: boolean, completed: number): { percent: 0 | 50 | 100; label: string } {
  if (completed > 0) return { percent: 100, label: "Practice again" };
  if (warmupDone) return { percent: 50, label: "Ready to talk" };
  return { percent: 0, label: "Start warm-up" };
}
