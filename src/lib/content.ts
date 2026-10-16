import { parseCsv } from "./csv";
import scenariosCsv from "@/content/khowar/Scenarios.csv?raw";
import turnsCsv from "@/content/khowar/Turns.csv?raw";
import warmupCsv from "@/content/khowar/warm_up.csv?raw";

export type Quality = "best" | "acceptable" | "less-fitting";

export interface Scenario {
  id: string;
  title: string;
  situation: string;
  character: string;
  order: number;
  language: string;
  startTurnId: string;
  turnCount: number;
}

export interface Turn {
  id: string;
  scenarioId: string;
  speaker: "character" | "learner";
  roman: string;
  english: string;
  audioFile: string;
  promptedBy: string | null;
  optionOrder: number;
  quality: Quality | null;
  feedbackNote: string | null;
  nextTurnId: string | null;
  isEnd: boolean;
  referenceFile: string | null;
  passThreshold: number;
  culturalNote: string | null;
}

export interface WarmupItem {
  id: string;
  scenarioId: string;
  english: string;
  roman: string;
  audioFile: string;
  sourceTurnId: string;
  culturalNote: string | null;
}

const opt = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export function buildScenarios(csv: string): Scenario[] {
  return parseCsv(csv)
    .filter((r) => r.scenario_id)
    .map((r) => ({
      id: r.scenario_id,
      title: r.scenario_title,
      situation: r.situation,
      character: r.character,
      order: Number(r.scenario_order) || 0,
      language: r.language,
      startTurnId: r.start_turn_id,
      turnCount: Number(r.turn_count) || 0,
    }))
    .sort((a, b) => a.order - b.order);
}

export function buildTurns(csv: string): Turn[] {
  return parseCsv(csv)
    .filter((r) => r.turn_id)
    .map((r) => {
      const q = opt(r.quality);
      return {
        id: r.turn_id,
        scenarioId: r.scenario_id,
        speaker: r.speaker === "learner" ? "learner" : "character",
        roman: r.khowar_roman,
        english: r.english,
        audioFile: r.audio_file,
        promptedBy: opt(r.prompted_by),
        optionOrder: Number(r.option_order) || 1,
        quality: q === "best" || q === "acceptable" || q === "less-fitting" ? q : null,
        feedbackNote: opt(r.feedback_note),
        nextTurnId: opt(r.next_turn_id),
        isEnd: /^(yes|true|1)$/i.test(r.is_end ?? ""),
        referenceFile: opt(r.score_reference_file),
        passThreshold: Number((r.pass_threshold || "70").replace("%", "")) || 70,
        culturalNote: opt(r.cultural_note),
      } satisfies Turn;
    });
}

export function buildWarmup(csv: string): WarmupItem[] {
  return parseCsv(csv)
    .filter((r) => r.item_id)
    .map((r) => ({
      id: r.item_id,
      scenarioId: r.scenario_id,
      english: r.english,
      roman: r.khowar_roman,
      audioFile: r.audio_file,
      sourceTurnId: r.source_turn_id,
      culturalNote: opt(r.cultural_note),
    }));
}

export const scenarios = buildScenarios(scenariosCsv);
export const turns = buildTurns(turnsCsv);
export const warmupItems = buildWarmup(warmupCsv);

const turnById = new Map(turns.map((t) => [t.id, t]));

export const getScenario = (id: string) => scenarios.find((s) => s.id === id);
export const getTurn = (id: string) => turnById.get(id);
export const getWarmup = (scenarioId: string) =>
  warmupItems.filter((w) => w.scenarioId === scenarioId);

/** Learner reply options offered after a character line, in set order. */
export function getChoices(characterTurnId: string, all: Turn[] = turns): Turn[] {
  return all
    .filter((t) => t.speaker === "learner" && t.promptedBy === characterTurnId)
    .sort((a, b) => a.optionOrder - b.optionOrder);
}
