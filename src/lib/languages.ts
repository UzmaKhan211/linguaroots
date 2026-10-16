export interface Language {
  id: string;
  name: string;
  region: string;
  status: "available" | "coming-soon";
}

/** Only Khowar has content. Others are names only — no phrases, no lessons. */
export const languages: Language[] = [
  { id: "khowar", name: "Khowar", region: "Chitral, Pakistan", status: "available" },
  { id: "pashto", name: "Pashto", region: "Pakistan & Afghanistan", status: "coming-soon" },
  { id: "burushaski", name: "Burushaski", region: "Hunza & Nagar", status: "coming-soon" },
  { id: "wakhi", name: "Wakhi", region: "Gojal & Wakhan", status: "coming-soon" },
  { id: "kalasha", name: "Kalasha", region: "Chitral valleys", status: "coming-soon" },
];
