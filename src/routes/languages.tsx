import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { languages } from "@/lib/languages";

export const Route = createFileRoute("/languages")({
  head: () => ({
    meta: [
      { title: "Languages — LinguaRoots" },
      { name: "description", content: "Khowar is live. More heritage languages are coming soon." },
      { property: "og:title", content: "Languages — LinguaRoots" },
      { property: "og:description", content: "Khowar is live. More heritage languages are coming soon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LanguagesPage,
});

function LanguagesPage() {
  return (
    <AppShell>
      <h1 className="fade-up text-[2rem] font-semibold">Your languages</h1>
      <p className="fade-up mt-2 text-muted-foreground">
        Khowar is ready to practise. Others are on their way.
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-3">
        {languages.map((l, i) => {
          const live = l.status === "available";
          return (
            <li
              key={l.id}
              className={`fade-up flex min-h-36 flex-col rounded-3xl border p-4 ${
                live ? "border-primary bg-leaf-soft" : "border-dashed bg-card"
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span
                className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  live ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {live ? <Check className="size-3.5" aria-hidden /> : <Clock className="size-3.5" aria-hidden />}
                {live ? "Live" : "Coming soon"}
              </span>
              <span className="mt-auto font-display text-xl font-semibold">{l.name}</span>
              <span className="text-sm text-muted-foreground">{l.region}</span>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
