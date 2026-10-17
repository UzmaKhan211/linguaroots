import { createFileRoute, notFound } from "@tanstack/react-router";
import { getScenario, getWarmup } from "@/lib/content";
import { TeachMatch } from "@/components/TeachMatch";
import { RequireAccount } from "@/components/RequireAccount";

export const Route = createFileRoute("/scenario/$scenarioId_/warmup")({
  loader: ({ params }) => {
    const scenario = getScenario(params.scenarioId);
    if (!scenario) throw notFound();
    return { scenario, items: getWarmup(scenario.id) };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `Lesson 1, Words: ${loaderData.scenario.title} | LinguaRoots` : "Unavailable | LinguaRoots";
    const desc = "Learn the key words for this unit, then pair each one with its meaning.";
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
  component: WordsLesson,
});

function WordsLesson() {
  const { scenario, items } = Route.useLoaderData();
  return <RequireAccount><TeachMatch scenario={scenario} items={items} kind="words" /></RequireAccount>;
}
