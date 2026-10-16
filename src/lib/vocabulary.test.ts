import { describe, expect, it } from "vitest";
import { filterVocabulary, isVocabularyLearned, vocabulary, vocabularyAudioUrl, vocabularyCategories } from "./vocabulary";

describe("dictionary content", () => {
  it("loads all 30 supplied entries, retaining distinct duplicate source IDs", () => {
    expect(vocabulary).toHaveLength(30);
    expect(new Set(vocabulary.map((w) => w.id)).size).toBe(30);
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
});