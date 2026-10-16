import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AudioButton } from "@/components/AudioButton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { scenarios, turns, warmupItems } from "@/lib/content";
import { languages } from "@/lib/languages";
import { AUDIO_BUCKET } from "@/lib/lessonAudio";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — LinguaRoots" },
      { name: "description", content: "Audio clips and language interest for LinguaRoots." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — LinguaRoots" },
      { property: "og:description", content: "Audio clips and language interest for LinguaRoots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

type Clip = { file: string; where: string; roman: string; scenarioId: string };
type Status = "app" | "uploaded" | "missing";

function allClips(): Clip[] {
  const map = new Map<string, Clip>();
  for (const t of turns) {
    for (const f of [t.audioFile, t.referenceFile]) {
      if (f && !map.has(f)) map.set(f, { file: f, where: "Conversation", roman: t.roman, scenarioId: t.scenarioId });
    }
  }
  for (const w of warmupItems) {
    if (w.audioFile && !map.has(w.audioFile)) map.set(w.audioFile, { file: w.audioFile, where: "Warm-up", roman: w.roman, scenarioId: w.scenarioId });
  }
  return [...map.values()].sort((a, b) => a.file.localeCompare(b.file));
}

function Admin() {
  const { user, ready } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const clips = useMemo(allClips, []);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [interest, setInterest] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!ready) return;
    if (!user) return setIsAdmin(false);
    void supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [ready, user]);

  const check = useCallback(async () => {
    const { data: stored } = await supabase.storage.from(AUDIO_BUCKET).list("khowar", { limit: 1000 });
    const up = new Set((stored ?? []).map((o) => o.name));
    const out: Record<string, Status> = {};
    await Promise.all(
      clips.map(async (c) => {
        try {
          const r = await fetch(`/audio/khowar/${c.file}`, { method: "HEAD" });
          const ok = r.ok && !(r.headers.get("content-type") ?? "").includes("text/html");
          out[c.file] = ok ? "app" : up.has(c.file) ? "uploaded" : "missing";
        } catch {
          out[c.file] = up.has(c.file) ? "uploaded" : "missing";
        }
      }),
    );
    setStatus(out);
  }, [clips]);

  useEffect(() => {
    if (!isAdmin) return;
    void check();
    void supabase.from("language_interest").select("language_id").then(({ data }) => {
      const counts: Record<string, number> = {};
      for (const r of data ?? []) counts[r.language_id] = (counts[r.language_id] ?? 0) + 1;
      setInterest(counts);
    });
  }, [isAdmin, check]);

  const upload = async (file: string, f: File) => {
    setBusy(file);
    setMsg(null);
    const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(`khowar/${file}`, f, { upsert: true, contentType: f.type || "audio/mpeg" });
    setBusy(null);
    setMsg(error ? `Couldn't upload ${file}: ${error.message}` : `${file} uploaded.`);
    if (!error) void check();
  };

  if (!ready || isAdmin === null) return <AppShell><p className="text-muted-foreground">Checking access…</p></AppShell>;
  if (!isAdmin)
    return (
      <AppShell>
        <h1 className="text-[2rem] font-semibold">Admin</h1>
        <p className="mt-3 text-muted-foreground">This page is only for the LinguaRoots team.</p>
        {!user && (
          <Link to="/auth" className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
            Sign in
          </Link>
        )}
      </AppShell>
    );

  const missing = clips.filter((c) => status[c.file] === "missing").length;
  const shown = onlyMissing ? clips.filter((c) => status[c.file] === "missing") : clips;
  const title = (id: string) => scenarios.find((s) => s.id === id)?.title ?? id;

  return (
    <AppShell>
      <h1 className="text-[2rem] font-semibold">Admin</h1>

      <section className="mt-5 rounded-3xl border bg-card p-5">
        <h2 className="text-xl font-semibold">Language interest</h2>
        <ul className="mt-3 space-y-1">
          {languages.filter((l) => l.status !== "available").map((l) => (
            <li key={l.id} className="flex justify-between"><span>{l.name}</span><span className="font-bold">{interest[l.id] ?? 0}</span></li>
          ))}
        </ul>
      </section>

      <section className="mt-5">
        <h2 className="text-xl font-semibold">Audio clips</h2>
        <p className="mt-1 text-muted-foreground">
          {Object.keys(status).length ? `${clips.length} clips · ${missing} missing` : "Checking clips…"}
        </p>
        <label className="mt-3 flex min-h-11 items-center gap-2 font-semibold">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="size-5" />
          Show only missing clips
        </label>
        <p aria-live="polite" className="min-h-6 font-semibold text-primary">{msg}</p>
        <ul className="mt-2 space-y-3">
          {shown.map((c) => {
            const s = status[c.file];
            return (
              <li key={c.file} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold break-all">{c.file}</p>
                    <p className="text-sm text-muted-foreground">{c.where} · {title(c.scenarioId)}</p>
                    <p className="font-display text-lg">{c.roman}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${s === "missing" ? "bg-clay-soft text-accent" : "bg-leaf-soft text-primary"}`}>
                    {s === "missing" ? <CircleAlert className="size-3.5" aria-hidden /> : <CheckCircle2 className="size-3.5" aria-hidden />}
                    {s === "app" ? "In the app" : s === "uploaded" ? "Uploaded" : s === "missing" ? "Missing" : "…"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {s && s !== "missing" && <AudioButton file={c.file} label="Hear it" />}
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 font-bold">
                    <Upload className="size-4" aria-hidden />
                    {busy === c.file ? "Uploading…" : s === "missing" ? "Upload clip" : "Replace"}
                    <input
                      type="file"
                      accept="audio/*"
                      className="sr-only"
                      disabled={busy !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void upload(c.file, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {s === "app" && <p className="mt-2 text-xs text-muted-foreground">Clips that ship with the app play first; ask in chat to swap one permanently.</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </AppShell>
  );
}
