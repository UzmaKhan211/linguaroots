import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Heart, Mic } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AudioButton } from "@/components/AudioButton";
import { SayIt } from "@/components/SayIt";
import { getScenario, turns, type Turn } from "@/lib/content";
import { afterChoice, afterLine, stepAt, type Step } from "@/lib/conversation";
import { isWarmupDone } from "@/lib/progress";

export const Route = createFileRoute("/scenario/$scenarioId_/talk")({
  loader: ({ params }) => {
    const scenario = getScenario(params.scenarioId);
    if (!scenario) throw notFound();
    return { scenario };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `Talk: ${loaderData.scenario.title} — LinguaRoots` : "Unavailable — LinguaRoots";
    const desc = "Have the conversation, hear your relative and reply in Khowar.";
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
  component: Talk,
});

const relative: Record<string, string> = { grandmother: "Grandma", grandfather: "Grandpa" };

function Talk() {
  const { scenario } = Route.useLoaderData();
  const navigate = useNavigate();
  const who = relative[scenario.character] ?? scenario.character;
  const [history, setHistory] = useState<Turn[]>([]);
  const [step, setStep] = useState<Step>(() => stepAt(scenario.startTurnId, turns));
  const [chosen, setChosen] = useState<Turn | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isWarmupDone(scenario.id)) navigate({ to: "/scenario/$scenarioId", params: { scenarioId: scenario.id }, replace: true });
  }, [scenario.id, navigate]);

  // Relative's lines appear on their own; walk until replies are needed.
  useEffect(() => {
    if (step.type !== "line") return;
    const t = setTimeout(() => {
      setHistory((h) => [...h, step.turn]);
      setStep(afterLine(step.turn, turns));
    }, history.length ? 700 : 200);
    return () => clearTimeout(t);
  }, [step, history.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length, step, chosen]);

  // Only one reply? Open it straight away — nothing to pick.
  useEffect(() => {
    if (step.type === "choose" && step.options.length === 1) setChosen(step.options[0] ?? null);
  }, [step]);
  const single = step.type === "choose" && step.options.length === 1;

  const confirm = () => {
    if (!chosen) return;
    setHistory((h) => [...h, chosen]);
    setStep(afterChoice(chosen, turns));
    setChosen(null);
  };

  return (
    <AppShell>
      <Link
        to="/scenario/$scenarioId"
        params={{ scenarioId: scenario.id }}
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden /> {scenario.title}
      </Link>

      <ol className="mt-4 space-y-4" aria-live="polite">
        {history.map((t, i) => (
          <Bubble key={t.id + i} turn={t} who={who} />
        ))}
      </ol>

      {step.type === "choose" && !chosen && (
        <section className="fade-up mt-6">
          <p className="font-bold text-muted-foreground">
            {step.options.length > 1 ? "Select a response of your choice" : "Respond by saying"}
          </p>
          <ul className="mt-3">
            {step.options.map((o, idx) => (
              <li key={o.id}>
                {idx > 0 && (
                  <div className="flex items-center gap-3 py-2" aria-hidden>
                    <span className="h-px flex-1 bg-border" />
                    <span className="rounded-full bg-muted px-3 py-0.5 text-sm font-bold text-muted-foreground">Or</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setChosen(o)}
                  className="w-full rounded-2xl border-2 bg-card p-4 text-left shadow-soft"
                >
                  <span className="block font-display text-xl font-semibold">{o.roman}</span>
                  <span className="block text-sm text-muted-foreground">{o.english}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {chosen && (
        <section className="fade-up mt-6 rounded-3xl border bg-leaf-soft p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-bold text-primary">
              <Mic className="size-5" aria-hidden /> {single ? "Respond by saying" : "Say it out loud"}
            </p>
            {!single && (
              <button
                type="button"
                onClick={() => setChosen(null)}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border-2 bg-card px-3 text-sm font-bold"
              >
                <ArrowLeft className="size-4" aria-hidden /> Change reply
              </button>
            )}
          </div>
          <p className="mt-2 font-display text-2xl font-semibold">{chosen.roman}</p>
          <p className="text-base text-muted-foreground">{chosen.english}</p>
          <div className="mt-4">
            <AudioButton file={chosen.audioFile} label="Hear it first" />
          </div>
          {chosen.quality === "less-fitting" && (
            <p className="mt-4 rounded-2xl bg-card p-3 text-base">
              This works, though {who} might expect something a little warmer here.
            </p>
          )}
          {chosen.feedbackNote && <p className="mt-4 rounded-2xl bg-card p-3 text-base">{chosen.feedbackNote}</p>}
          <SayIt
            key={chosen.id}
            referenceUrl={`/audio/khowar/${chosen.referenceFile || chosen.audioFile}`}
            passMark={chosen.passThreshold}
            onPass={confirm}
            onSelfCheck={confirm}
          />
        </section>
      )}

      {step.type === "end" && (
        <section className="fade-up mt-8 rounded-3xl border bg-sun-soft p-6 text-center">
          <Heart className="mx-auto size-10 text-accent" aria-hidden />
          <h2 className="mt-3 text-2xl font-semibold">You talked with {who}</h2>
          <p className="mt-2 text-lg">That was a whole conversation in Khowar. They'd be so happy to hear it.</p>
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => {
                setHistory([]);
                setStep(stepAt(scenario.startTurnId, turns));
              }}
              className="min-h-12 rounded-full bg-primary font-bold text-primary-foreground"
            >
              Talk again
            </button>
            <Link to="/" className="flex min-h-12 items-center justify-center rounded-full border-2 bg-card font-bold">
              Choose another situation
            </Link>
          </div>
        </section>
      )}
      <div ref={endRef} />
    </AppShell>
  );
}

function Bubble({ turn, who }: { turn: Turn; who: string }) {
  const me = turn.speaker === "learner";
  return (
    <li className={`fade-up flex ${me ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-3xl p-4 shadow-soft ${
          me ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card"
        }`}
      >
        <p className={`text-xs font-bold uppercase tracking-wider ${me ? "opacity-80" : "text-accent"}`}>
          {me ? "You" : who}
        </p>
        <p className="mt-1 font-display text-xl font-semibold">{turn.roman}</p>
        <p className={`text-sm ${me ? "opacity-85" : "text-muted-foreground"}`}>{turn.english}</p>
        {!me && (
          <div className="mt-2">
            <AudioButton file={turn.audioFile} />
          </div>
        )}
      </div>
    </li>
  );
}
