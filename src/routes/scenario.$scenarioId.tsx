import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { getPhrases, getScenario, getWarmup } from "@/lib/content";
import { completedCount, isPhrasesDone, isWarmupDone, lessonUnlocked } from "@/lib/progress";

export const Route = createFileRoute("/scenario/$scenarioId")({
  loader: ({ params }) => {
    const scenario = getScenario(params.scenarioId);
    if (!scenario) throw notFound();
    return { scenario, wordCount: getWarmup(scenario.id).length, phraseCount: getPhrases(scenario.id).length };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `Unit ${loaderData.scenario.order}: ${loaderData.scenario.title} | LinguaRoots` : "Unavailable | LinguaRoots";
    const desc = loaderData?.scenario.situation ?? "Practice a real Khowar conversation.";
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
  component: UnitOverview,
});

type LessonPath = "/scenario/$scenarioId/warmup" | "/scenario/$scenarioId/phrases" | "/scenario/$scenarioId/talk";

function UnitOverview() {
  const { scenario, wordCount, phraseCount } = Route.useLoaderData();
  const [state, setState] = useState({ words: false, phrases: false, talked: false });
  useEffect(() => {
    const refresh = () => setState({ words: isWarmupDone(scenario.id), phrases: isPhrasesDone(scenario.id), talked: completedCount(scenario.id) > 0 });
    refresh();
    window.addEventListener("lr:progress", refresh);
    return () => window.removeEventListener("lr:progress", refresh);
  }, [scenario.id]);

  const lessons: { n: 1 | 2 | 3; title: string; detail: string; to: LessonPath; done: boolean }[] = [
    { n: 1, title: "Words", detail: `${wordCount} key words to learn and pair`, to: "/scenario/$scenarioId/warmup", done: state.words },
    { n: 2, title: "Phrases", detail: `${phraseCount} longer phrases to learn and pair`, to: "/scenario/$scenarioId/phrases", done: state.phrases },
    { n: 3, title: "Conversation", detail: scenario.situation, to: "/scenario/$scenarioId/talk", done: state.talked },
  ];

  return (
    <AppShell>
      <Link to="/" className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted-foreground">
        <ArrowLeft className="size-5" aria-hidden /> Back
      </Link>
      <p className="fade-up mt-4 text-sm font-bold uppercase tracking-wider text-accent">Unit {scenario.order}</p>
      <h1 className="fade-up mt-1 text-[2rem] font-semibold">{scenario.title}</h1>
      <p className="fade-up mt-3 text-lg text-muted-foreground">Three short lessons, one step at a time.</p>

      <ol className="mt-6 space-y-3">
        {lessons.map((l, i) => {
          const open = lessonUnlocked(l.n, state.words, state.phrases);
          const inner = (
            <>
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                  l.done ? "bg-primary text-primary-foreground" : open ? "bg-leaf-soft text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {l.done ? <Check className="size-6" aria-hidden /> : open ? l.n : <Lock className="size-5" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-muted-foreground">Lesson {l.n}</span>
                <span className="block font-display text-xl font-semibold text-foreground">{l.title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {open ? l.detail : `Opens after Lesson ${l.n - 1}`}
                </span>
                <span className="sr-only">{l.done ? ", done" : open ? ", ready" : ", locked"}</span>
              </span>
              {open && <ChevronRight className="size-6 shrink-0 text-muted-foreground" aria-hidden />}
            </>
          );
          const cls = "flex items-center gap-4 rounded-3xl border bg-card p-4";
          return (
            <li key={l.n} className="fade-up" style={{ animationDelay: `${60 + i * 60}ms` }}>
              {open ? (
                <Link to={l.to} params={{ scenarioId: scenario.id }} className={`${cls} shadow-soft transition-shadow hover:shadow-lift`}>
                  {inner}
                </Link>
              ) : (
                <div className={`${cls} opacity-70`} aria-disabled="true">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}
