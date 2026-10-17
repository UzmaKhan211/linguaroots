export type ActivityRow = { words: boolean; phrases: boolean; conversations: number };

/** Count distinct finished lessons; repeats count only in the conversation total. */
export function summarizeActivity(rows: ActivityRow[]) {
  return rows.reduce((total, row) => ({
    lessons: total.lessons + Number(row.words) + Number(row.phrases) + Number(row.conversations > 0),
    conversations: total.conversations + row.conversations,
    words: total.words || row.words,
    phrases: total.phrases || row.phrases,
    talked: total.talked || row.conversations > 0,
  }), { lessons: 0, conversations: 0, words: false, phrases: false, talked: false });
}