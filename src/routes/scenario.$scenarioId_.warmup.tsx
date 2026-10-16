import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Sparkles, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getScenario, getWarmup, type WarmupItem } from "@/lib/content";
import { chunkRounds, seededShuffle } from "@/lib/pairs";
import { markWarmupDone } from "@/lib/progress";
import { earn, XP } from "@/lib/rewards";

export const Route = createFileRoute("/scenario/$scenarioId_/warmup")({
  loader: ({ params }) => {
    const scenario = getScenario(params.scenarioId);
    if (!scenario) throw notFound();
    return { scenario, items: getWarmup(scenario.id) };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `Warm-up: ${loaderData.scenario.title} — LinguaRoots` : "Unavailable — LinguaRoots";
    const desc = "Match the words you'll need, then step into the conversation.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: Warmup,
});

function Dots({ total, at }: { total: number; at: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Round ${at + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= at ? "bg-primary" : "bg-border"}`} />
      ))}
    </div>
  );
}

function play(file: string) {
  if (!file) return;
  const a = new Audio(`/audio/khowar/${file}`);
  a.play().catch(() => {});
}

function Warmup() {
  const { scenario, items } = Route.useLoaderData();
  const navigate = useNavigate();
  const rounds = useMemo(() => chunkRounds(items), [items]);
  const [round, setRound] = useState(0);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [pickKh, setPickKh] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [pickEn, setPickEn] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("Now pair each word with its meaning.");
  const [learnAt, setLearnAt] = useState(0);
  const [lastNote, setLastNote] = useState<WarmupItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = rounds[round] ?? [];
  const khTiles = useMemo(() => seededShuffle(current, `${scenario.id}-k-${round}`), [current, scenario.id, round]);
  const enTiles = useMemo(() => seededShuffle(current, `${scenario.id}-e-${round}`), [current, scenario.id, round]);
  const roundDone = current.length > 0 && current.every((it) => matched.has(it.id));
  const isLast = round + 1 >= rounds.length;

  const finish = () => {
    markWarmupDone(scenario.id);
    earn(XP.warmup);
    navigate({ to: "/scenario/$scenarioId/talk", params: { scenarioId: scenario.id } });
  };

  const tryPair = (kh: string | null, en: string | null) => {
    if (timer.current) clearTimeout(timer.current);
    setWrong(false);
    if (!kh || !en) return;
    if (kh === en) {
      const item = current.find((it) => it.id === kh)!;
      setMatched((m) => new Set(m).add(kh));
      setMessage(`Lovely — “${item.roman.trim()}” means “${item.english}”.`);
      setLastNote(item.culturalNote ? item : null);
      setPickKh(null);
      setPickEn(null);
    } else {
      setMessage("Not quite a pair — have another listen and try again.");
      setWrong(true);
      timer.current = setTimeout(() => {
        setPickKh(null);
        setPickEn(null);
        setWrong(false);
      }, 900);
    }
  };

  const nextRound = () => {
    if (isLast) return finish();
    setRound(round + 1);
    setLearnAt(0);
    setPickKh(null);
    setPickEn(null);
    setLastNote(null);
    setMessage("Now pair each word with its meaning.");
  };

  if (!items.length) return null;

  if (learnAt < current.length) {
    const it = current[learnAt]!;
    const lastCard = learnAt + 1 >= current.length;
    return (
      <AppShell>
        <Link
          to="/scenario/$scenarioId"
          params={{ scenarioId: scenario.id }}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-5" aria-hidden /> {scenario.title}
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <Dots total={rounds.length} at={round} />
          <button type="button" onClick={finish} className="min-h-11 px-2 text-sm font-bold text-primary underline-offset-4 hover:underline">
            I'm ready to talk
          </button>
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold">New words</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Word {learnAt + 1} of {current.length} — listen, then we'll pair them up.
        </p>
        <div key={`${round}-${learnAt}`} className="fade-up mt-6">
          <div className="rounded-3xl border-2 border-border bg-card px-6 py-10 text-center">
            <p className="font-display text-4xl font-semibold">{it.roman.trim()}</p>
            <p className="mt-2 text-lg text-muted-foreground">{it.english}</p>
            <button
              type="button"
              onClick={() => play(it.audioFile)}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary px-5 font-bold text-secondary-foreground"
            >
              <Volume2 className="size-5" aria-hidden /> Hear it
            </button>
          </div>
          {it.culturalNote && (
            <aside className="mt-5 px-2">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                <Sparkles className="size-3.5" aria-hidden /> Cultural insight
              </p>
              <p className="mt-1.5 text-base italic leading-relaxed text-muted-foreground">{it.culturalNote}</p>
            </aside>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const n = learnAt + 1;
            setLearnAt(n);
          }}
          className="mt-6 min-h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground"
        >
          {lastCard ? "Let's pair them" : "Next word"}
        </button>
      </AppShell>
    );
  }

  const tile = (selected: boolean, done: boolean) =>
    `relative flex h-24 w-full items-center justify-center rounded-2xl border-2 px-3 py-2 text-center transition-colors ${
      done
        ? "border-primary/40 bg-secondary text-muted-foreground"
        : selected && wrong
          ? "border-destructive bg-card ring-4 ring-destructive/20"
          : selected
            ? "border-primary bg-card ring-4 ring-primary/20"
            : "border-border bg-card"
    }`;

  return (
    <AppShell>
      <Link
        to="/scenario/$scenarioId"
        params={{ scenarioId: scenario.id }}
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden /> {scenario.title}
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <Dots total={rounds.length} at={round} />
        <button type="button" onClick={finish} className="min-h-11 px-2 text-sm font-bold text-primary underline-offset-4 hover:underline">
          I'm ready to talk
        </button>
      </div>

      <h1 className="mt-6 font-display text-3xl font-semibold">Word pairs</h1>
      <p className="mt-2 min-h-14 text-lg" role="status" aria-live="polite">
        {message}
      </p>

      <div key={round} className="fade-up mt-4 grid grid-cols-2 gap-3">
        <ul className="space-y-3" aria-label="Khowar words">
          {khTiles.map((it) => {
            const done = matched.has(it.id);
            const sel = pickKh === it.id;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  disabled={done}
                  aria-pressed={sel}
                  onClick={() => {
                    play(it.audioFile);
                    setPickKh(it.id);
                    tryPair(it.id, pickEn);
                  }}
                  className={tile(sel, done)}
                >
                  <span className="flex flex-col items-center gap-1">
                    <span className="flex items-center gap-1.5 font-display text-xl font-semibold">
                      <Volume2 className="size-4 shrink-0 text-muted-foreground" aria-hidden /> {it.roman.trim()}
                    </span>
                    {done && (
                      <span className="flex items-center gap-1 text-xs font-bold text-primary">
                        <Check className="size-4" aria-hidden /> Paired
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <ul className="space-y-3" aria-label="Meanings">
          {enTiles.map((it) => {
            const done = matched.has(it.id);
            const sel = pickEn === it.id;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  disabled={done}
                  aria-pressed={sel}
                  onClick={() => {
                    setPickEn(it.id);
                    tryPair(pickKh, it.id);
                  }}
                  className={tile(sel, done)}
                >
                  <span className="flex flex-col items-center gap-1">
                    <span className="text-base font-semibold">{it.english}</span>
                    {done && (
                      <span className="flex items-center gap-1 text-xs font-bold text-primary">
                        <Check className="size-4" aria-hidden /> Paired
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>


      {roundDone && (
        <button
          type="button"
          onClick={nextRound}
          className="fade-up mt-6 min-h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground"
        >
          {isLast ? "Start the conversation" : "Next words"}
        </button>
      )}
    </AppShell>
  );
}
