import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AudioButton } from "@/components/AudioButton";
import { getScenario, getWarmup } from "@/lib/content";
import { buildQuiz } from "@/lib/conversation";
import { markWarmupDone } from "@/lib/progress";

export const Route = createFileRoute("/scenario/$scenarioId_/warmup")({
  loader: ({ params }) => {
    const scenario = getScenario(params.scenarioId);
    if (!scenario) throw notFound();
    return { scenario, items: getWarmup(scenario.id) };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `Warm-up: ${loaderData.scenario.title} — LinguaRoots` : "Unavailable — LinguaRoots";
    const desc = "Get comfortable with the words you'll need before the conversation.";
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
    <div className="flex flex-wrap gap-1.5" aria-label={`Step ${at + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i <= at ? "bg-primary" : "bg-border"}`} />
      ))}
    </div>
  );
}

function Warmup() {
  const { scenario, items } = Route.useLoaderData();
  const navigate = useNavigate();
  const quiz = useMemo(() => buildQuiz(items), [items]);
  const total = items.length * 2;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const next = () => {
    setPicked(null);
    if (i + 1 >= total) {
      markWarmupDone(scenario.id);
      navigate({ to: "/scenario/$scenarioId/talk", params: { scenarioId: scenario.id } });
    } else setI(i + 1);
  };

  const learning = i < items.length;
  const item = (learning ? items[i] : quiz[i - items.length]?.item) ?? items[0];
  const q = learning ? null : quiz[i - items.length];

  return (
    <AppShell>
      <Link
        to="/scenario/$scenarioId"
        params={{ scenarioId: scenario.id }}
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden /> {scenario.title}
      </Link>
      <div className="mt-3">
        <Dots total={total} at={i} />
      </div>

      {learning ? (
        <section key={item.id} className="fade-up mt-8 rounded-3xl border bg-card p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-wider text-accent">New word</p>
          <p className="mt-3 font-display text-4xl font-semibold">{item.roman}</p>
          <p className="mt-2 text-lg text-muted-foreground">{item.english}</p>
          <div className="mt-5">
            <AudioButton file={item.audioFile} />
          </div>
          {item.culturalNote && (
            <p className="mt-5 flex gap-2 rounded-2xl bg-sun-soft p-4 text-base">
              <Info className="mt-0.5 size-5 shrink-0 text-bark" aria-hidden /> {item.culturalNote}
            </p>
          )}
        </section>
      ) : (
        <section key={item.id + "q"} className="fade-up mt-8">
          <p className="text-sm font-bold uppercase tracking-wider text-accent">Which one means</p>
          <p className="mt-1 font-display text-3xl font-semibold">“{item.english}”?</p>
          <ul className="mt-6 space-y-3">
            {q!.options.map((o) => {
              const isAnswer = o === item.roman.trim();
              const show = picked !== null;
              const mark = show && isAnswer ? "match" : show && o === picked ? "tried" : null;
              return (
                <li key={o}>
                  <button
                    type="button"
                    disabled={show}
                    onClick={() => setPicked(o)}
                    className={`flex min-h-14 w-full items-center justify-between rounded-2xl border-2 bg-card px-5 text-left text-xl font-semibold ${
                      mark === "match" ? "border-primary" : "border-border"
                    }`}
                  >
                    {o}
                    {mark === "match" && (
                      <span className="flex items-center gap-1 text-sm font-bold text-primary">
                        <Check className="size-5" aria-hidden /> This one
                      </span>
                    )}
                    {mark === "tried" && <span className="text-sm font-bold text-muted-foreground">Your pick</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {picked && (
            <p className="fade-up mt-4 text-lg" role="status">
              {picked === item.roman.trim()
                ? "Lovely, you've got it."
                : `Close! “${item.roman.trim()}” is the one — you'll remember it next time.`}
            </p>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={next}
        disabled={!learning && !picked}
        className="mt-8 min-h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground disabled:opacity-50"
      >
        {i + 1 >= total ? "Start the conversation" : learning && i + 1 === items.length ? "Let's practise" : "Next"}
      </button>
    </AppShell>
  );
}
