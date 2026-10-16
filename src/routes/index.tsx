import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { completedCount, getPrefs, isOnboarded, isWarmupDone, scenarioStage } from "@/lib/progress";
import { Phone, Home as HomeIcon, ChevronRight, Check, Sparkles, BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RewardsBadge } from "@/components/RewardsBadge";
import { LogoMark, Wordmark } from "@/components/LogoMark";
import { getWarmup, scenarios } from "@/lib/content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LinguaRoots | Practice Khowar with the people you love" },
      {
        name: "description",
        content: "Learn everyday Khowar phrases through warm, friendly conversations with family.",
      },
      { property: "og:title", content: "LinguaRoots | Practice Khowar with the people you love" },
      {
        property: "og:description",
        content: "Learn everyday Khowar phrases through warm, friendly conversations with family.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const relativeLabel: Record<string, string> = { grandmother: "Grandma", grandfather: "Grandpa" };

type Row = { id: string; warm: boolean; done: number };

function Index() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [relative, setRelative] = useState<string | undefined>();
  useEffect(() => {
    if (!isOnboarded()) {
      navigate({ to: "/welcome", replace: true });
      return;
    }
    setRelative(getPrefs().relative);
    setRows(scenarios.map((s) => ({ id: s.id, warm: isWarmupDone(s.id), done: completedCount(s.id) })));
  }, [navigate]);

  const isNew = rows ? rows.every((r) => !r.warm && r.done === 0) : true;
  const featured = scenarios.find((s) => s.character === relative) ?? scenarios[0]!;
  const wordsLearned = rows
    ? rows.filter((r) => r.warm).reduce((n, r) => n + getWarmup(r.id).length, 0)
    : 0;
  const rest = isNew ? scenarios.filter((s) => s.id !== featured.id) : scenarios;

  return (
    <AppShell>
      <header className="fade-up flex items-center gap-3">
        <LogoMark className="h-11 w-auto" />
        <Wordmark className="h-5 w-auto" />
      </header>

      {isNew ? (
        <section className="fade-up mt-8">
          <p className="text-sm font-bold uppercase tracking-wider text-accent">Khowar</p>
          <h1 className="mt-1 text-[2rem] font-semibold text-foreground">Your first conversation is waiting</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Learn a few words, then have a friendly chat. It only takes a few minutes.
          </p>

          <Link
            to="/scenario/$scenarioId"
            params={{ scenarioId: featured.id }}
            className="mt-6 block rounded-3xl bg-primary p-6 text-primary-foreground shadow-lift"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-foreground/15">
              <Sparkles className="size-7" aria-hidden />
            </span>
            <span className="mt-4 block text-sm font-bold opacity-85">
              With {relativeLabel[featured.character] ?? featured.character}
            </span>
            <span className="block font-display text-2xl font-semibold">{featured.title}</span>
            <span className="mt-1 block text-base opacity-90">
              A short warm-up to learn your first {getWarmup(featured.id).length} words.
            </span>
            <span className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary-foreground px-5 font-bold text-primary">
              Begin warm-up <ChevronRight className="size-5" aria-hidden />
            </span>
          </Link>
        </section>
      ) : (
        <section className="fade-up mt-8">
          <h1 className="text-[2rem] font-semibold text-foreground">Welcome back!</h1>
          <p className="mt-1 text-lg text-muted-foreground">Which conversation would you like to practice today?</p>
          <RewardsBadge className="mt-4" />
          <div className="mt-4 flex items-center gap-3 rounded-3xl border bg-sun-soft p-4">
            <BookOpen className="size-6 shrink-0 text-bark" aria-hidden />
            <p className="text-base text-foreground">
              <span className="font-bold">{wordsLearned} Khowar words</span> learned so far
            </p>
          </div>
        </section>
      )}

      {isNew && rest.length > 0 && (
        <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-muted-foreground">Coming up next</h2>
      )}

      <ul className={`${isNew ? "mt-3" : "mt-6"} space-y-4`}>
        {rest.map((s, i) => {
          const Icon = /phone|call/i.test(s.id + s.title) ? Phone : HomeIcon;
          const r = rows?.find((x) => x.id === s.id);
          const stage = scenarioStage(!!r?.warm, r?.done ?? 0);
          return (
            <li key={s.id} className="fade-up" style={{ animationDelay: `${80 + i * 70}ms` }}>
              <Link
                to="/scenario/$scenarioId"
                params={{ scenarioId: s.id }}
                className="group flex items-center gap-4 rounded-3xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <ProgressRing percent={isNew ? 0 : stage.percent} tone={i % 2 === 0 ? "leaf" : "clay"}>
                  {stage.percent === 100 && !isNew ? (
                    <Check className="size-6" aria-hidden />
                  ) : (
                    <Icon className="size-6" aria-hidden />
                  )}
                </ProgressRing>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-muted-foreground">
                    With {relativeLabel[s.character] ?? s.character}
                  </span>
                  <span className="block font-display text-xl font-semibold text-foreground">{s.title}</span>
                  {isNew ? (
                    <span className="mt-1 block text-base text-muted-foreground">{s.situation}</span>
                  ) : (
                    <span className="mt-1 block text-sm font-bold text-primary">
                      {stage.label}
                      <span className="sr-only">, {stage.percent}% done</span>
                    </span>
                  )}
                </span>
                <ChevronRight className="size-6 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}

function ProgressRing({
  percent,
  tone,
  children,
}: {
  percent: number;
  tone: "leaf" | "clay";
  children: ReactNode;
}) {
  const c = 2 * Math.PI * 25;
  return (
    <span
      className={`relative flex size-14 shrink-0 items-center justify-center rounded-full ${
        tone === "leaf" ? "bg-leaf-soft text-primary" : "bg-clay-soft text-accent"
      }`}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56" aria-hidden>
        <circle cx="28" cy="28" r="25" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r="25"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
        />
      </svg>
      {children}
    </span>
  );
}
