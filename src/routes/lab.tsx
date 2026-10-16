import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { closeness, distanceToScore, passes, suggestConfig, DEFAULT_CONFIG, type ScoringConfig } from "@/lib/scoring";
import { decodeToMono16k, getScoringConfig, saveScoringConfig } from "@/lib/audio";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "Scoring lab — LinguaRoots" },
      { name: "description", content: "Calibrate closeness scoring with sample takes." },
      { property: "og:title", content: "Scoring lab — LinguaRoots" },
      { property: "og:description", content: "Calibrate closeness scoring with sample takes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Lab,
});

const GROUPS = [
  { id: "reference", label: "Perfect reference takes", shouldPass: true },
  { id: "friends", label: "Friends' takes (good and okay)", shouldPass: true },
  { id: "noisy", label: "Noisy but clear takes", shouldPass: true },
  { id: "wrong", label: "Wrong phrases", shouldPass: false },
  { id: "mumbled", label: "Mumbled takes", shouldPass: false },
] as const;

type Result = { name: string; dist: number };

function Lab() {
  const [ref, setRef] = useState<{ name: string; data: Float32Array } | null>(null);
  const [results, setResults] = useState<Record<string, Result[]>>({});
  const [cfg, setCfg] = useState<ScoringConfig>(DEFAULT_CONFIG);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setCfg(getScoringConfig()), []);

  const decode = async (f: File) => decodeToMono16k(await f.arrayBuffer());

  const addTakes = async (group: string, files: FileList | null) => {
    if (!files || !ref) return;
    setBusy(true);
    const out: Result[] = [];
    for (const f of Array.from(files)) {
      try {
        out.push({ name: f.name, dist: closeness(await decode(f), ref.data).dist });
      } catch {
        out.push({ name: f.name + " (couldn't read)", dist: Infinity });
      }
    }
    setResults((r) => ({ ...r, [group]: [...(r[group] ?? []), ...out] }));
    setBusy(false);
  };

  const passing = GROUPS.filter((g) => g.shouldPass).flatMap((g) => (results[g.id] ?? []).map((r) => r.dist));
  const failing = GROUPS.filter((g) => !g.shouldPass).flatMap((g) => (results[g.id] ?? []).map((r) => r.dist));
  const suggestion = suggestConfig(passing, failing);

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Scoring lab</h1>
      <p className="mt-2 text-muted-foreground">
        Pick one line's example recording, then add sample takes to each group. Everything stays on this device.
      </p>

      <section className="mt-6 rounded-3xl border bg-card p-4">
        <label className="font-bold">
          1. Example recording for the line
          <input
            type="file"
            accept="audio/*"
            className="mt-2 block w-full text-sm"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setRef({ name: f.name, data: await decode(f) });
              setResults({});
            }}
          />
        </label>
        {ref && <p className="mt-2 text-sm text-muted-foreground">Using {ref.name}</p>}
      </section>

      <section className="mt-4 space-y-4">
        {GROUPS.map((g) => (
          <div key={g.id} className="rounded-3xl border bg-card p-4">
            <p className="font-bold">{g.label}</p>
            <p className="text-sm text-muted-foreground">{g.shouldPass ? "Should pass" : "Should not pass"}</p>
            <input
              type="file"
              accept="audio/*"
              multiple
              disabled={!ref || busy}
              className="mt-2 block w-full text-sm"
              onChange={(e) => addTakes(g.id, e.target.files)}
            />
            <ul className="mt-2 space-y-1 text-sm">
              {(results[g.id] ?? []).map((r, i) => {
                const s = distanceToScore(r.dist, cfg);
                const ok = passes(s) === g.shouldPass;
                return (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{r.name}</span>
                    <span className="font-bold whitespace-nowrap">
                      {s}% {ok ? "✓ as expected" : "✗ not as expected"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-3xl border bg-leaf-soft p-4">
        <p className="font-bold">Settings</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold">
            Scores 100% at
            <input type="number" step="0.1" value={cfg.perfect} onChange={(e) => setCfg({ ...cfg, perfect: +e.target.value })} className="mt-1 w-full rounded-xl border bg-card p-2" />
          </label>
          <label className="text-sm font-semibold">
            Scores 70% at
            <input type="number" step="0.1" value={cfg.pass} onChange={(e) => setCfg({ ...cfg, pass: +e.target.value })} className="mt-1 w-full rounded-xl border bg-card p-2" />
          </label>
        </div>
        {suggestion && (
          <button type="button" onClick={() => setCfg(suggestion)} className="mt-3 min-h-11 w-full rounded-full border-2 bg-card font-bold">
            Use suggested settings ({suggestion.perfect} / {suggestion.pass})
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            saveScoringConfig(cfg);
            setSaved(true);
          }}
          className="mt-3 min-h-12 w-full rounded-full bg-primary font-bold text-primary-foreground"
        >
          Save settings on this device
        </button>
        {saved && <p className="mt-2 text-sm">Saved. Share these two numbers with me to make them the default for everyone.</p>}
      </section>
    </AppShell>
  );
}
