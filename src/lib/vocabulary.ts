import { parseCsv } from "./csv";
import { warmupItems, type WarmupItem } from "./content";
import vocabCsv from "@/content/khowar/Vocab.csv?raw";
import audio25 from "@/assets/dictionary/wu-25.mp3.asset.json";
import audio26 from "@/assets/dictionary/wu-26.mp3.asset.json";
import audio27 from "@/assets/dictionary/wu-27.mp3.asset.json";
import audio28 from "@/assets/dictionary/wu-28.mp3.asset.json";
import audio29 from "@/assets/dictionary/wu-29.mp3.asset.json";

export interface VocabularyItem {
  id: string;
  itemId: string;
  scenarioId: string;
  roman: string;
  english: string;
  category: string;
  audioFile: string;
  sourceTurnId: string;
  culturalNote: string;
}

export function buildVocabulary(csv: string): VocabularyItem[] {
  return parseCsv(csv).filter((r) => r.item_id && r.khowar_roman).map((r) => ({
    id: `${r.scenario_id}:${r.item_id}:${r.source_turn_id}`,
    itemId: r.item_id,
    scenarioId: r.scenario_id,
    roman: r.khowar_roman,
    english: r.english || r.engish || "",
    category: r.category.toLowerCase() === "daily life" ? "Daily Life" : r.category,
    audioFile: r.audio_file,
    sourceTurnId: r.source_turn_id,
    culturalNote: r.cultural_note || "",
  }));
}

export const vocabulary = buildVocabulary(vocabCsv);
export const vocabularyCategories = [...new Set(vocabulary.map((w) => w.category))].sort((a, b) => a.localeCompare(b));

// New recordings are dictionary-only; repeated filenames never replace lesson clips.
const dictionaryAudio: Record<string, string> = {
  "wu-25.mp3": audio25.url,
  "wu-26.mp3": audio26.url,
  "wu-27.mp3": audio27.url,
  "wu-28.mp3": audio28.url,
  "wu-29.mp3": audio29.url,
};
export function vocabularyAudioUrl(item: VocabularyItem) {
  if (item.scenarioId === "grandma-phone-call" && dictionaryAudio[item.audioFile]) {
    return dictionaryAudio[item.audioFile];
  }
  return `/audio/khowar/${item.audioFile}`;
}

/** Only completed warm-ups are a reliable word-level record; skipped chat lines aren't learned. */
export function isVocabularyLearned(item: VocabularyItem, completedWarmups: ReadonlySet<string>, warmups: WarmupItem[] = warmupItems) {
  return completedWarmups.has(item.scenarioId) && warmups.some((w) =>
    w.scenarioId === item.scenarioId && w.id === item.itemId && w.roman === item.roman,
  );
}

export function filterVocabulary(items: VocabularyItem[], category: string, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  return items.filter((w) => (category === "All" || w.category === category) &&
    (!needle || `${w.roman} ${w.english}`.toLocaleLowerCase().includes(needle)));
}