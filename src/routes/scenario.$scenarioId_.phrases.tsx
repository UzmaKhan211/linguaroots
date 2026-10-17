import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPhrases, getScenario } from "@/lib/content";
import { LessonAccess } from "@/components/LessonAccess";
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
  return <LessonAccess key={scenario.id} scenarioId={scenario.id} lesson={2}><TeachMatch scenario={scenario} items={items} kind="phrases" /></LessonAccess>;
}
