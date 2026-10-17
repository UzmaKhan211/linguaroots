import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPhrases, getScenario } from "@/lib/content";
import { isWarmupDone } from "@/lib/progress";
import { TeachMatch } from "@/components/TeachMatch";

export const Route = createFileRoute("/scenario/$scenarioId_/phrases")({
  loader: ({ params }) => {
    const scenario = getScenario(params.scenarioId);
    if (!scenario) throw notFound();
    return { scenario, items: getPhrases(scenario.id) };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `Lesson 2, Phrases: ${loaderData.scenario.title} | LinguaRoots` : "Unavailable | LinguaRoots";
    const desc = "Learn longer phrases for this unit, then pair each one with its meaning.";
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
  component: PhrasesLesson,
});

function PhrasesLesson() {
  const { scenario, items } = Route.useLoaderData();
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!isWarmupDone(scenario.id)) navigate({ to: "/scenario/$scenarioId", params: { scenarioId: scenario.id }, replace: true });
    else setOk(true);
  }, [scenario.id, navigate]);
  if (!ok) return null;
  return <TeachMatch scenario={scenario} items={items} kind="phrases" />;
}
