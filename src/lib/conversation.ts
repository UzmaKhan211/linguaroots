import type { Turn, WarmupItem } from "./content";

export type Step =
  | { type: "line"; turn: Turn }
  | { type: "choose"; options: Turn[] }
  | { type: "end" };

const choicesFor = (charId: string, all: Turn[]) =>
  all
    .filter((t) => t.speaker === "learner" && t.promptedBy === charId)
    .sort((a, b) => a.optionOrder - b.optionOrder);

/** What happens when the conversation arrives at a given line id. */
export function stepAt(id: string | null, all: Turn[]): Step {
  const t = id ? all.find((x) => x.id === id) : undefined;
  if (!t) return { type: "end" };
  if (t.speaker === "character") return { type: "line", turn: t };
  return { type: "choose", options: t.promptedBy ? choicesFor(t.promptedBy, all) : [t] };
}

/** After the relative speaks: follow next line, else offer replies, else finish. */
export function afterLine(turn: Turn, all: Turn[]): Step {
  if (turn.nextTurnId) return stepAt(turn.nextTurnId, all);
  const options = choicesFor(turn.id, all);
  return options.length ? { type: "choose", options } : { type: "end" };
}

/** After the learner replies. */
export function afterChoice(turn: Turn, all: Turn[]): Step {
  if (turn.isEnd || !turn.nextTurnId) return { type: "end" };
  return stepAt(turn.nextTurnId, all);
}

export interface QuizQuestion {
  item: WarmupItem;
  options: string[]; // Roman Khowar, only from real items
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tap questions: English prompt, pick the Roman Khowar. Distractors come only from other real items. */
export function buildQuiz(items: WarmupItem[], rand: () => number = Math.random, size = 3): QuizQuestion[] {
  const norm = (s: string) => s.trim().toLowerCase();
  return items.map((item) => {
    const pool = [...new Set(items.map((i) => i.roman.trim()))].filter((r) => norm(r) !== norm(item.roman));
    const options = shuffle([item.roman.trim(), ...shuffle(pool, rand).slice(0, size - 1)], rand);
    return { item, options };
  });
}
