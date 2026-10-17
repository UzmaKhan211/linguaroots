import { describe, expect, it } from "vitest";
import { buildVocabulary, filterVocabulary, isVocabularyLearned, vocabulary, vocabularyAudioUrl, vocabularyCategories } from "./vocabulary";

describe("dictionary content", () => {
  it("shows each word once while keeping different words with repeated source IDs", () => {
    expect(vocabulary).toHaveLength(29);
    expect(new Set(vocabulary.map((w) => w.id)).size).toBe(29);
    expect(vocabulary.filter((w) => w.roman === "Awa di")).toHaveLength(1);
    expect(vocabulary.find((w) => w.roman === "Awa di")?.sources).toHaveLength(2);
    expect(vocabulary.filter((w) => w.itemId === "wu-25")).toHaveLength(2);
    expect(vocabulary.every((w) => w.english.length > 0)).toBe(true);
  });
  it("keeps the existing Later audio separate from the new On your end audio", () => {
    const later = vocabulary.find((w) => w.english === "Later");
    const newWord = vocabulary.find((w) => w.english === "On your end");
    expect(later).toBeDefined(); expect(newWord).toBeDefined();
    if (!later || !newWord) throw new Error("Missing vocabulary");
    expect(vocabularyAudioUrl(later)).toBe("/audio/khowar/wu-25.mp3");
    expect(vocabularyAudioUrl(newWord)).not.toBe(vocabularyAudioUrl(later));
  });
  it("only marks actual completed warm-up words as learned", () => {
    const grandma = vocabulary.find((w) => w.itemId === "wu-01");
    const extra = vocabulary.find((w) => w.english === "Everyone");
    if (!grandma || !extra) throw new Error("Missing vocabulary");
    expect(isVocabularyLearned(grandma, new Set())).toBe(false);
    expect(isVocabularyLearned(grandma, new Set(["grandma-phone-call"]))).toBe(true);
    expect(isVocabularyLearned(extra, new Set(["grandma-phone-call"]))).toBe(false);
  });
  it("combines category and search, ignoring case", () => {
    expect(filterVocabulary(vocabulary, "Family", "WAWI").map((w) => w.itemId)).toEqual(["wu-01"]);
    expect(filterVocabulary(vocabulary, "Food", "Wawi")).toEqual([]);
    expect(vocabularyCategories.filter((c) => c.toLowerCase() === "daily life")).toHaveLength(1);
  });
  it("sorts words alphabetically by Roman Khowar regardless of case", () => {
    const words = filterVocabulary(vocabulary, "All", "").map((w) => w.roman);
    expect(words.slice(0, 4)).toEqual(["Achi", "Awa", "Awa di", "Baba"]);
    expect(words.at(-1)).toBe("Zhibosi");
    expect(words.indexOf("Shapik")).toBeLessThan(words.indexOf("Shaw"));
  });
  it("merges duplicate words regardless of case or spaces and keeps both learning sources", () => {
    const csv = "item_id,scenario_id,khowar_roman,english,category,audio_file,source_turn_id\nfirst,one,Test word,Meaning,Family,one.mp3,t1\nsecond,two,TEST  WORD,Meaning,Family,two.mp3,t2";
    const items = buildVocabulary(csv);
    expect(items).toHaveLength(1);
    const item = items[0];
    if (!item) throw new Error("Missing merged word");
    const warmups = [{ id: "second", scenarioId: "two", roman: "TEST WORD", english: "Meaning", audioFile: "two.mp3", sourceTurnId: "t2", culturalNote: null }];
    expect(isVocabularyLearned(item, new Set(["two"]), warmups)).toBe(true);
    expect(isVocabularyLearned(item, new Set(["one"]), warmups)).toBe(false);
  });
  it("sorts category filters alphabetically", () => {
    expect(vocabularyCategories).toEqual([
      "Adjectives", "Daily Life", "Family", "Feelings & States", "Food",
      "Place or Perspective", "Pronouns & Possessives", "Questions", "Responses",
      "Terms of Endearment", "Time", "Verbs",
    ]);
  });
});