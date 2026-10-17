import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { completedCount, getPrefs, isPhrasesDone, isWarmupDone, scenarioStage } from "@/lib/progress";
import { Phone, Home as HomeIcon, ChevronRight, Check, Sparkles, BookOpen, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { LogoMark } from "@/components/LogoMark";
import { getWarmup, scenarios } from "@/lib/content";
import { AudioButton } from "@/components/AudioButton";
import { signupDestination } from "@/lib/signup";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LinguaRoots | Practice a heritage language with the people you care about" },
      {
        name: "description",
        content: "Learn everyday conversational phrases through warm, friendly chats with family.",
      },
      { property: "og:title", content: "LinguaRoots | Practice a heritage language with the people you care about" },
      {
        property: "og:description",
        content: "Learn everyday conversational phrases through warm, friendly chats with family.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const relativeLabel: Record<string, string> = { grandmother: "Grandma", grandfather: "Grandpa" };

type Row = { id: string; warm: boolean; phrases: boolean; done: number };

function Index() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [relative, setRelative] = useState<string | undefined>();
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        const { data: profile, error } = await supabase.from("profiles").select("display_name, avatar_path, onboarded_at").eq("id", data.session.user.id).maybeSingle();
        if (!active) return;
        const destination = error ? "/" : signupDestination(profile);
        if (destination !== "/") { void navigate({ to: destination, replace: true }); return; }
        setName((profile?.display_name ?? "").trim());
      } else { void navigate({ to: "/welcome", replace: true }); return; }
      setChecked(true);
    })();
    setRelative(getPrefs().relative);
    const refresh = () => setRows(scenarios.map((s) => ({ id: s.id, warm: isWarmupDone(s.id), phrases: isPhrasesDone(s.id), done: completedCount(s.id) })));
    refresh();
    window.addEventListener("lr:progress", refresh);
    return () => { active = false; window.removeEventListener("lr:progress", refresh); };
  }, [navigate]);

  const isNew = rows ? rows.every((r) => !r.warm && r.done === 0) : true;
  const featured = scenarios.find((s) => s.character === relative) ?? scenarios[0]!;
  const learnedWords = rows ? rows.filter((r) => r.warm).flatMap((r) => getWarmup(r.id)) : [];
  const wordsLearned = learnedWords.length;
  const rest = isNew ? scenarios.filter((s) => s.id !== featured.id) : scenarios;

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading">
        <LogoMark className="float-soft h-20 w-auto" />
      </div>
    );
  }

  return (
    <AppShell>
      {isNew ? (
        <section className="fade-up mt-3">
          <h1 className="text-[2rem] font-semibold text-foreground">{name ? `Welcome, ${name}!` : "Welcome!"}</h1>
          <p className="mt-2 font-display text-xl font-semibold text-foreground">Your first conversation is waiting</p>
          <p className="mt-2 text-lg text-muted-foreground">
            Learn a few words and phrases, then have a friendly chat. It only takes a few minutes.
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
              Unit {featured.order} · With {relativeLabel[featured.character] ?? featured.character}
            </span>
            <span className="block font-display text-2xl font-semibold">{featured.title}</span>
            <span className="mt-1 block text-base opacity-90">
              Three short lessons: words, phrases, then a friendly chat.
            </span>
            <span className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary-foreground px-5 font-bold text-primary">
              Start Lesson 1 <ChevronRight className="size-5" aria-hidden />
            </span>
          </Link>
        </section>
      ) : (
        <section className="fade-up mt-3">
          <h1 className="text-[2rem] font-semibold text-foreground">{name ? `Welcome back, ${name}!` : "Welcome back!"}</h1>
          <p className="mt-2 text-balance text-lg text-muted-foreground">Which unit would you like to practice today?</p>
          <Drawer>
            <DrawerTrigger asChild>
              <button
                type="button"
                disabled={wordsLearned === 0}
                className="mt-5 flex w-full items-center gap-3 rounded-3xl border bg-sun-soft p-4 text-left"
              >
                <BookOpen className="size-6 shrink-0 text-bark" aria-hidden />
                <span className="flex-1 text-base text-foreground">
                  <span className="font-bold">{wordsLearned} Khowar words</span> learned so far
                </span>
                {wordsLearned > 0 && (
                  <span className="inline-flex items-center text-sm font-bold text-primary">
                    See words <ChevronRight className="size-4" aria-hidden />
                  </span>
                )}
              </button>
            </DrawerTrigger>
            <DrawerContent className="mx-auto max-w-[440px]">
              <DrawerHeader className="relative pr-16 text-left">
                <DrawerClose
                  aria-label="Close"
                  className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-muted text-foreground"
                >
                  <X className="size-5" aria-hidden />
                </DrawerClose>
                <DrawerTitle className="font-display text-2xl">Your Khowar words</DrawerTitle>
                <DrawerDescription>Tap a word to hear it again.</DrawerDescription>
              </DrawerHeader>
              <ul className="max-h-[60vh] space-y-3 overflow-y-auto px-4 pb-8">
                {learnedWords.map((w) => (
                  <li key={w.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-xl font-semibold text-foreground">{w.roman}</span>
                      <span className="block text-sm text-muted-foreground">{w.english}</span>
                    </span>
                    <AudioButton file={w.audioFile} label="Hear it" />
                  </li>
                ))}
              </ul>
            </DrawerContent>
          </Drawer>
        </section>
      )}

      {isNew && rest.length > 0 && (
        <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-muted-foreground">More units to explore</h2>
      )}

      <ul className={`${isNew ? "mt-3" : "mt-6"} space-y-4`}>
        {rest.map((s, i) => {
          const Icon = /phone|call/i.test(s.id + s.title) ? Phone : HomeIcon;
          const r = rows?.find((x) => x.id === s.id);
          const stage = scenarioStage(!!r?.warm, r?.done ?? 0, !!r?.phrases);
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
                    Unit {s.order} · With {relativeLabel[s.character] ?? s.character}
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
