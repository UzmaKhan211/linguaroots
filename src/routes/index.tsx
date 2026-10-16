import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { isOnboarded } from "@/lib/progress";
import { Phone, Home as HomeIcon, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RewardsBadge } from "@/components/RewardsBadge";
import { LogoMark, Wordmark } from "@/components/LogoMark";
import { scenarios } from "@/lib/content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LinguaRoots | Practise Khowar with the people you love" },
      {
        name: "description",
        content: "Pick a situation, hear your relative, and practise real Khowar conversations.",
      },
      { property: "og:title", content: "LinguaRoots | Practise Khowar with the people you love" },
      {
        property: "og:description",
        content: "Pick a situation, hear your relative, and practise real Khowar conversations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const relativeLabel: Record<string, string> = { grandmother: "Grandma", grandfather: "Grandpa" };

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isOnboarded()) navigate({ to: "/welcome", replace: true });
  }, [navigate]);
  return (
    <AppShell>
      <header className="fade-up flex items-center gap-3">
        <LogoMark className="h-11 w-auto" />
        <Wordmark className="h-5 w-auto" />
      </header>

      <section className="fade-up mt-8">
        <p className="text-sm font-bold uppercase tracking-wider text-accent">Khowar</p>
        <h1 className="mt-1 text-[2rem] font-semibold text-foreground">
          What situation are you about to be in?
        </h1>
        <RewardsBadge className="mt-4" />
      </section>

      <ul className="mt-6 space-y-4">
        {scenarios.map((s, i) => {
          const Icon = /phone|call/i.test(s.id + s.title) ? Phone : HomeIcon;
          return (
            <li key={s.id} className="fade-up" style={{ animationDelay: `${80 + i * 70}ms` }}>
              <Link
                to="/scenario/$scenarioId"
                params={{ scenarioId: s.id }}
                className="group flex items-center gap-4 rounded-3xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <span
                  className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${
                    i % 2 === 0 ? "bg-leaf-soft text-primary" : "bg-clay-soft text-accent"
                  }`}
                >
                  <Icon className="size-7" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-muted-foreground">
                    With {relativeLabel[s.character] ?? s.character}
                  </span>
                  <span className="block font-display text-xl font-semibold text-foreground">
                    {s.title}
                  </span>
                  <span className="mt-1 block text-base text-muted-foreground">{s.situation}</span>
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
