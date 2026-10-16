import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { closeness, distanceToScore, passes, DEFAULT_CONFIG, type ScoringConfig } from "@/lib/scoring";
import { decodeToMono16k, getScoringConfig, loadReference, saveScoringConfig } from "@/lib/audio";
import { optimiseConfig, parseTakeName } from "@/lib/calibration";

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

type Take = { name: string; phraseId: string; category: string; shouldPass: boolean; dist: number };

function Lab() {
  const [takes, setTakes] = useState<Take[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [cfg, setCfg] = useState<ScoringConfig>(DEFAULT_CONFIG);
  const [progress, setProgress] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setCfg(getScoringConfig()), []);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list);
    const refs = new Map<string, Float32Array>();
    for (const f of files) {
      const p = parseTakeName(f.name);
      if (p.kind === "reference") {
        try { refs.set(p.phraseId, await decodeToMono16k(await f.arrayBuffer())); } catch { /* skip */ }
      }
    }
    const out: Take[] = [];
    const skip: string[] = [];
    let i = 0;
    for (const f of files) {
      i++;
      const p = parseTakeName(f.name);
      if (p.kind === "reference") continue;
      setProgress(`Scoring ${i} of ${files.length}…`);
      if (p.kind === "unknown") { skip.push(`${f.name} (name not recognised)`); continue; }
      let ref = refs.get(p.phraseId) ?? null;
      if (!ref) ref = await loadReference(`/audio/khowar/${p.phraseId}.mp3`);
      if (!ref) { skip.push(`${f.name} (no example recording for ${p.phraseId})`); continue; }
      try {
        const data = await decodeToMono16k(await f.arrayBuffer());
        out.push({ name: f.name, phraseId: p.phraseId, category: p.category, shouldPass: p.shouldPass, dist: closeness(data, ref).dist });
      } catch {
        skip.push(`${f.name} (couldn't read)`);
      }
    }
    setTakes((t) => [...t, ...out]);
    setSkipped((s) => [...s, ...skip]);
    setProgress(null);
  };

  const byPhrase = useMemo(() => {
    const m = new Map<string, Take[]>();
    for (const t of takes) m.set(t.phraseId, [...(m.get(t.phraseId) ?? []), t]);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [takes]);

  const isOk = (t: Take) => passes(distanceToScore(t.dist, cfg)) === t.shouldPass;
  const shouldPass = takes.filter((t) => t.shouldPass);
  const shouldFail = takes.filter((t) => !t.shouldPass);
  const suggestion = optimiseConfig(shouldPass.map((t) => t.dist), shouldFail.map((t) => t.dist));

  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Scoring lab</h1>
      <p className="mt-2 text-muted-foreground">
        Add all your takes at once. Names like <span className="font-mono text-sm">gft-01__friend_ok__1.mp3</span> are
        sorted automatically; the example recording comes from the app (or add <span className="font-mono text-sm">gft-01.mp3</span>). Everything stays on this device.
      </p>

      <section className="mt-6 rounded-3xl border bg-card p-4">
        <label className="font-bold">
          Add recordings
          <input type="file" accept="audio/*" multiple disabled={!!progress} className="mt-2 block w-full text-sm" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
        </label>
        {progress && <p className="mt-2 text-sm" aria-live="polite">{progress}</p>}
        {takes.length > 0 && (
          <button type="button" onClick={() => { setTakes([]); setSkipped([]); }} className="mt-3 min-h-11 rounded-full border-2 px-4 text-sm font-bold">
            Clear all
          </button>
        )}
      </section>

      {takes.length > 0 && (
        <section className="mt-4 rounded-3xl border bg-leaf-soft p-4">
          <p className="font-bold">Overall, with current settings</p>
          <p className="mt-1 text-sm">
            Good, okay and noisy takes passing: <b>{shouldPass.filter(isOk).length} of {shouldPass.length}</b>
          </p>
          <p className="text-sm">
            Mumbled and wrong takes held back: <b>{shouldFail.filter(isOk).length} of {shouldFail.length}</b>
          </p>
          <p className="text-sm text-muted-foreground">{byPhrase.length} phrases tested</p>
        </section>
      )}

      <section className="mt-4 rounded-3xl border bg-card p-4">
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
          <button type="button" onClick={() => setCfg(suggestion.config)} className="mt-3 min-h-11 w-full rounded-full border-2 bg-card font-bold">
            Use best settings for all phrases ({suggestion.config.perfect} / {suggestion.config.pass}) — {Math.round(suggestion.accuracy * 100)}% sorted as expected
          </button>
        )}
        <button type="button" onClick={() => { saveScoringConfig(cfg); setSaved(true); }} className="mt-3 min-h-12 w-full rounded-full bg-primary font-bold text-primary-foreground">
          Save settings on this device
        </button>
        {saved && <p className="mt-2 text-sm">Saved. Share these two numbers with me to make them the default for everyone.</p>}
      </section>

      <section className="mt-4 space-y-4">
        {byPhrase.map(([id, list]) => (
          <details key={id} className="rounded-3xl border bg-card p-4">
            <summary className="cursor-pointer font-bold">
              {id} — {list.filter(isOk).length} of {list.length} as expected
            </summary>
            <ul className="mt-2 space-y-1 text-sm">
              {list.map((t, i) => {
                const s = distanceToScore(t.dist, cfg);
                return (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{t.category.replace("_", " ")} · {t.name}</span>
                    <span className="font-bold whitespace-nowrap">{s}% {isOk(t) ? "✓ as expected" : "✗ not as expected"}</span>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </section>

      {skipped.length > 0 && (
        <section className="mt-4 rounded-3xl border bg-card p-4">
          <p className="font-bold">Skipped ({skipped.length})</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{skipped.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </section>
      )}
    </AppShell>
  );
}
