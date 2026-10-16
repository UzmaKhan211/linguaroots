export interface Language {
  id: string;
  name: string;
  region: string;
  status: "available" | "coming-soon";
}

/** Only Khowar has content. Others are names only — no phrases, no lessons. */
export const languages: Language[] = [
  { id: "khowar", name: "Khowar", region: "Chitral, Pakistan", status: "available" },
  { id: "pashto", name: "Pashto", region: "Khyber Pakhtunkhwa, Pakistan", status: "coming-soon" },
  { id: "burushaski", name: "Burushaski", region: "Gilgit Baltistan, Pakistan", status: "coming-soon" },
  { id: "wakhi", name: "Wakhi", region: "Gilgit Baltistan, Pakistan", status: "coming-soon" },
  { id: "kalasha", name: "Kalasha", region: "Chitral, Pakistan", status: "coming-soon" },
];

/** Available languages first, then coming-soon ones in alphabetical order. */
export function orderLanguages<T extends { name: string; status: string }>(list: T[]): T[] {
  const ready = list.filter((l) => l.status === "available");
  const soon = list.filter((l) => l.status !== "available").sort((a, b) => a.name.localeCompare(b.name));
  return [...ready, ...soon];
}

