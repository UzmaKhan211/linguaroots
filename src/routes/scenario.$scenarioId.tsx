import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { getScenario, getWarmup } from "@/lib/content";
import { isWarmupDone } from "@/lib/progress";

export const Route = createFileRoute("/scenario/$scenarioId")({
  loader: ({ params }) => {
    const scenario = getScenario(params.scenarioId);
    if (!scenario) throw notFound();
    return { scenario, warmupCount: getWarmup(scenario.id).length };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.scenario.title} | LinguaRoots` : "Unavailable | LinguaRoots";
    const desc = loaderData?.scenario.situation ?? "Practise a real Khowar conversation.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ScenarioIntro,
});

function ScenarioIntro() {
  const { scenario, warmupCount } = Route.useLoaderData();
  const [done, setDone] = useState(false);
  useEffect(() => setDone(isWarmupDone(scenario.id)), [scenario.id]);
  return (
    <AppShell>
      <Link to="/" className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted-foreground">
        <ArrowLeft className="size-5" aria-hidden /> Back
      </Link>
      <h1 className="fade-up mt-4 text-[2rem] font-semibold">{scenario.title}</h1>
      <p className="fade-up mt-3 text-lg text-muted-foreground">{scenario.situation}</p>

      <div className="fade-up mt-8 rounded-3xl border bg-sun-soft p-5">
        <p className="flex items-center gap-2 font-bold text-bark">
          <Sparkles className="size-5" aria-hidden /> Warm-up first
        </p>
        <p className="mt-2 text-base">
          {warmupCount} words and phrases to get comfortable with before you talk.
        </p>
      </div>

      <Link
        to="/scenario/$scenarioId/warmup"
        params={{ scenarioId: scenario.id }}
        className="mt-6 flex min-h-14 w-full items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
      >
        {done ? "Warm up again" : "Start the warm-up"}
      </Link>
      {done ? (
        <Link
          to="/scenario/$scenarioId/talk"
          params={{ scenarioId: scenario.id }}
          className="mt-3 flex min-h-14 w-full items-center justify-center rounded-full border-2 bg-card text-lg font-bold"
        >
          Go to the conversation
        </Link>
      ) : (
        <p className="mt-3 text-center text-base text-muted-foreground">
          The conversation opens after your first warm-up.
        </p>
      )}
    </AppShell>
  );
}
