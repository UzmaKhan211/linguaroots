import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Lock } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { languages } from "@/lib/languages";

export const Route = createFileRoute("/choose-language")({
  head: () => ({
    meta: [
      { title: "Choose a language | LinguaRoots" },
      { name: "description", content: "Pick the heritage language you want to learn. Khowar is ready now, more are on the way." },
      { property: "og:title", content: "Choose a language | LinguaRoots" },
      { property: "og:description", content: "Pick the heritage language you want to learn. Khowar is ready now, more are on the way." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChooseLanguage,
});

/** Available languages first, then coming-soon ones in alphabetical order. */
export function orderLanguages<T extends { name: string; status: string }>(list: T[]): T[] {
  const ready = list.filter((l) => l.status === "available");
  const soon = list.filter((l) => l.status !== "available").sort((a, b) => a.name.localeCompare(b.name));
  return [...ready, ...soon];
}

function ChooseLanguage() {
  const list = orderLanguages(languages);
  return (
    <div className="mx-auto min-h-screen w-full max-w-[440px] bg-background px-6 pb-10 pt-8">
      <LogoMark className="pop-in h-14 w-auto" />
      <h1 className="fade-up mt-5 text-[1.75rem] font-semibold leading-tight">Which language would you like to learn?</h1>
      <p className="fade-up mt-2 text-lg text-muted-foreground">More languages are on the way.</p>
      <ul className="mt-6 space-y-3">
        {list.map((l, i) => {
          const ready = l.status === "available";
          const inner = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-xl font-semibold">{l.name}</span>
                <span className="block text-sm text-muted-foreground">{l.region}</span>
              </span>
              {ready ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                  Start <ChevronRight className="size-4" aria-hidden />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-bold text-muted-foreground">
                  <Lock className="size-3.5" aria-hidden /> Coming soon
                </span>
              )}
            </>
          );
          return (
            <li key={l.id} className="fade-up" style={{ animationDelay: `${100 + i * 70}ms` }}>
              {ready ? (
                <Link
                  to="/language-intro"
                  className="flex min-h-20 items-center gap-3 rounded-3xl border-2 border-primary bg-card p-5 shadow-soft"
                >
                  {inner}
                </Link>
              ) : (
                <div aria-disabled="true" className="flex min-h-20 items-center gap-3 rounded-3xl border bg-card/60 p-5 opacity-60">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
