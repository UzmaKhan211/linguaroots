import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Clock, Heart } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { languages } from "@/lib/languages";
import { supabase } from "@/integrations/supabase/client";

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

const KEY = "lr:interest";

function LanguagesPage() {
  const [noted, setNoted] = useState<Set<string>>(new Set());
  const [thanks, setThanks] = useState<string | null>(null);

  useEffect(() => {
    try {
      setNoted(new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const note = async (id: string, name: string) => {
    setThanks(`Thank you — we've noted that you'd like ${name}.`);
    if (noted.has(id)) return;
    const next = new Set(noted).add(id);
    setNoted(next);
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
    const { data } = await supabase.auth.getSession();
    await supabase.from("language_interest").insert({ language_id: id, user_id: data.session?.user.id ?? null });
  };

  return (
    <AppShell>
      <h1 className="fade-up text-[2rem] font-semibold">Your languages</h1>
      <p className="fade-up mt-2 text-muted-foreground">
        Khowar is ready to practise. Tap another language to tell us you'd like it next.
      </p>
      <p aria-live="polite" className="mt-3 min-h-6 font-semibold text-primary">{thanks}</p>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {languages.map((l, i) => {
          const live = l.status === "available";
          const wanted = noted.has(l.id);
          const inner = (
            <>
              <span
                className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  live ? "bg-primary text-primary-foreground" : wanted ? "bg-clay-soft text-accent" : "bg-muted text-muted-foreground"
                }`}
              >
                {live ? <Check className="size-3.5" aria-hidden /> : wanted ? <Heart className="size-3.5" aria-hidden /> : <Clock className="size-3.5" aria-hidden />}
                {live ? "Live" : wanted ? "You asked for this" : "Coming soon"}
              </span>
              <span className="mt-auto font-display text-xl font-semibold">{l.name}</span>
              <span className="text-sm text-muted-foreground">{l.region}</span>
            </>
          );
          const cls = `fade-up flex min-h-36 w-full flex-col rounded-3xl border p-4 text-left ${
            live ? "border-primary bg-leaf-soft" : "border-dashed bg-card"
          }`;
          return (
            <li key={l.id} style={{ animationDelay: `${i * 50}ms` }}>
              {live ? (
                <div className={cls}>{inner}</div>
              ) : (
                <button type="button" className={cls} onClick={() => void note(l.id, l.name)} aria-pressed={wanted}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
