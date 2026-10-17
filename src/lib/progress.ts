import { supabase } from "@/integrations/supabase/client";
import { syncRewards } from "@/lib/rewards";

/**
 * Progress lives on the device (so guests work offline) and is mirrored to the
 * learner's account when signed in. On sign-in, device and account progress merge.
 */
const warmKey = (id: string) => `lr:warmup-done:${id}`;
const phraseKey = (id: string) => `lr:phrases-done:${id}`;
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
    window.dispatchEvent(new Event("lr:progress"));
  } catch {
    /* ignore */
  }
};

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

type Step = "words" | "phrases" | "conversation";

/** Completion is recorded by the backend, which checks lessons happen in order. */
async function pushStep(scenarioId: string, step: Step) {
  const uid = await currentUserId();
  if (!uid) return;
  await supabase.rpc("complete_lesson", { _scenario: scenarioId, _step: step });
}

async function pushResume(scenarioId: string) {
  const uid = await currentUserId();
  if (!uid) return;
  await supabase.rpc("save_resume", { _scenario: scenarioId, _resume: getResume(scenarioId) as never });
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
  void pushResume(scenarioId);
}

export function isWarmupDone(scenarioId: string) {
  return get(warmKey(scenarioId)) === "1";
}
export function markWarmupDone(scenarioId: string) {
  set(warmKey(scenarioId), "1");
  void pushStep(scenarioId, "words");
}
export function isPhrasesDone(scenarioId: string) {
  return get(phraseKey(scenarioId)) === "1";
}
export function markPhrasesDone(scenarioId: string) {
  set(phraseKey(scenarioId), "1");
  void pushStep(scenarioId, "phrases");
}
export function completedCount(scenarioId: string) {
  return Number(get(doneKey(scenarioId)) ?? 0) || 0;
}
export function markScenarioCompleted(scenarioId: string) {
  set(doneKey(scenarioId), String(completedCount(scenarioId) + 1));
  void pushStep(scenarioId, "conversation");
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
  const remote = new Map((rows ?? []).map((r) => [r.scenario_id, { warmupDone: r.warmup_done, phrasesDone: r.phrases_done, completed: r.completed_count, resume: r.resume as unknown }]));
  const ids = new Set([...scenarioIds, ...remote.keys()]);
  for (const id of ids) {
    const r = remote.get(id);
    // Device-only completions go through the backend's in-order check.
    if (isWarmupDone(id) && !r?.warmupDone) await pushStep(id, "words");
    if (isPhrasesDone(id) && !r?.phrasesDone) await pushStep(id, "phrases");
    if (completedCount(id) > 0 && !(r?.completed)) await pushStep(id, "conversation");
    const rr = r?.resume;
    const resume = pickResume(getResume(id), isResume(rr) ? rr : null);
    set(resumeKey(id), resume ? JSON.stringify(resume) : null);
    if (resume && resume !== rr) await pushResume(id);
  }
  // The account is the source of truth for completion after merging.
  const { data: fresh } = await supabase.from("scenario_progress").select("*").eq("user_id", uid);
  const freshMap = new Map((fresh ?? []).map((r) => [r.scenario_id, r]));
  for (const id of ids) {
    const f = freshMap.get(id);
    set(warmKey(id), f?.warmup_done ? "1" : null);
    set(phraseKey(id), f?.phrases_done ? "1" : null);
    set(doneKey(id), f?.completed_count ? String(f.completed_count) : null);
  }

  await syncRewards(uid);

  // Setup is finished on the account only by finishOnboarding, so a brand-new
  // account never inherits "done" from this device and always sees the companion step.
  if (profile?.onboarded_at && !isOnboarded()) {
    set(PREFS_KEY, JSON.stringify({ relative: profile.relative ?? undefined, ageConfirmed: profile.age_confirmed }));
    set(ONBOARD_KEY, "1");
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

/** Pure: how far a learner is in one unit of three lessons (words, phrases, conversation). */
export function scenarioStage(wordsDone: boolean, completed: number, phrasesDone = false): { percent: number; label: string } {
  if (completed > 0) return { percent: 100, label: "Practice again" };
  if (phrasesDone) return { percent: 67, label: "Lesson 3: Conversation" };
  if (wordsDone) return { percent: 33, label: "Lesson 2: Phrases" };
  return { percent: 0, label: "Lesson 1: Words" };
}

/** Pure: a lesson opens once the one before it is done. */
export function lessonUnlocked(lesson: 1 | 2 | 3, wordsDone: boolean, phrasesDone: boolean) {
  if (lesson === 1) return true;
  if (lesson === 2) return wordsDone;
  return wordsDone && phrasesDone;
}
