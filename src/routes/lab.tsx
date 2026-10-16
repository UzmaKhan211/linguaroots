import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { closenessWithCohort, distanceToScore, ratioToScore, passes, DEFAULT_CONFIG, type ScoringConfig } from "@/lib/scoring";
import { decodeToMono16k, getScoringConfig, loadCohort, loadCohortKeyed, loadReference, saveScoringConfig } from "@/lib/audio";
import { turns as allTurns } from "@/lib/content";

const cohortUrls = allTurns
  .filter((t) => t.speaker === "learner" && (t.referenceFile || t.audioFile))
  .map((t) => `/audio/khowar/${t.referenceFile || t.audioFile}`);
import { loadSpeechModel, speechCloseness } from "@/lib/speechModel";
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

type Take = { name: string; phraseId: string; category: string; shouldPass: boolean; dist: number; ratio: number; sDist?: number; sRatio?: number };

function Lab() {
  const [takes, setTakes] = useState<Take[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [cfg, setCfg] = useState<ScoringConfig>(DEFAULT_CONFIG);
  const [progress, setProgress] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [useSpeech, setUseSpeech] = useState(false);

  useEffect(() => setCfg(getScoringConfig()), []);

  const addFiles = async (list: FileList | null) => {
    if (!list || !list.length) return;
    const files = Array.from(list).filter((f) => !f.name.startsWith("."));
    setLastAdded(null);
    if (useSpeech) {
      setProgress("Downloading the speech-listening tool (one time only)…");
      try {
        await loadSpeechModel((pct) => setProgress(`Downloading the speech-listening tool… ${pct}%`));
      } catch {
        setProgress(null);
        setLastAdded("The speech-listening tool couldn't download. Check your connection and try again.");
        return;
      }
    }
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
        const own = `/audio/khowar/${p.phraseId}.mp3`;
        const r = closenessWithCohort(data, ref, await loadCohort(cohortUrls, own));
        const take: Take = { name: f.name, phraseId: p.phraseId, category: p.category, shouldPass: p.shouldPass, dist: r.dist, ratio: r.ratio };
        if (useSpeech) {
          const sc = await speechCloseness(data, own, ref, await loadCohortKeyed(cohortUrls, own));
          take.sDist = sc.dist;
          take.sRatio = sc.ratio;
        }
        out.push(take);
      } catch {
        skip.push(`${f.name} (couldn't read)`);
      }
    }
    setTakes((t) => [...t, ...out]);
    setSkipped((s) => [...s, ...skip]);
    setProgress(null);
    setLastAdded(`Added ${out.length} take${out.length === 1 ? "" : "s"}${skip.length ? `, skipped ${skip.length} (see the list below)` : ""}.`);
  };

  const byPhrase = useMemo(() => {
    const m = new Map<string, Take[]>();
    for (const t of takes) m.set(t.phraseId, [...(m.get(t.phraseId) ?? []), t]);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [takes]);

  const scoreOf = (t: Take) => Math.max(distanceToScore(t.dist, cfg), Number.isFinite(t.ratio) ? ratioToScore(t.ratio) : 0);
  const isOk = (t: Take) => passes(scoreOf(t)) === t.shouldPass;
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

      <section
        className="mt-6 rounded-3xl border-2 border-dashed bg-card p-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}
      >
        <p className="font-bold">Add recordings</p>
        <p className="text-sm text-muted-foreground">Drag files here, or choose files or a whole folder.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-primary px-4 font-bold text-primary-foreground">
            Choose files
            <input type="file" multiple disabled={!!progress} className="sr-only" onChange={(e) => { const fl = e.target.files; void addFiles(fl); }} />
          </label>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 font-bold">
            Choose a folder
            <input
              type="file"
              multiple
              disabled={!!progress}
              className="sr-only"
              ref={(el) => { if (el) el.setAttribute("webkitdirectory", ""); }}
              onChange={(e) => void addFiles(e.target.files)}
            />
          </label>
        </div>
        <label className="mt-3 flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" checked={useSpeech} disabled={!!progress} onChange={(e) => setUseSpeech(e.target.checked)} className="mt-1 size-5" />
          <span>
            <b>Also test the speech-listening tool</b> — downloads about 95 MB once and is slower (a few minutes for all takes). Sound still stays on this device.
          </span>
        </label>
        {progress && <p className="mt-2 text-sm" aria-live="polite">{progress}</p>}
        {lastAdded && !progress && <p className="mt-2 text-sm" aria-live="polite">{lastAdded}</p>}
        {takes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                // Numbers only — no sound leaves the device.
                const rows = ["file,phrase,category,should_pass,distance,ratio,speech_distance,speech_ratio", ...takes.map((t) => [t.name, t.phraseId, t.category, t.shouldPass, t.dist.toFixed(3), Number.isFinite(t.ratio) ? t.ratio.toFixed(4) : "", t.sDist?.toFixed(4) ?? "", t.sRatio !== undefined && Number.isFinite(t.sRatio) ? t.sRatio.toFixed(4) : ""].join(","))];
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
                a.download = "lab-results.csv";
                a.click();
              }}
              className="min-h-11 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              Download results (numbers only)
            </button>
            <button type="button" onClick={() => { setTakes([]); setSkipped([]); }} className="min-h-11 rounded-full border-2 px-4 text-sm font-bold">
              Clear all
            </button>
          </div>
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
                const s = scoreOf(t);
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
