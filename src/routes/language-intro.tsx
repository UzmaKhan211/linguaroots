import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { finishOnboarding } from "@/lib/progress";

export const Route = createFileRoute("/language-intro")({
  head: () => ({
    meta: [
      { title: "About Khowar | LinguaRoots" },
      { name: "description", content: "A few facts about Khowar, the language of the Chitral valley, before your first conversation." },
      { property: "og:title", content: "About Khowar | LinguaRoots" },
      { property: "og:description", content: "A few facts about Khowar, the language of the Chitral valley, before your first conversation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LanguageIntro,
});

const facts = [
  ["Where", "The Chitral valley and nearby valleys of northern Pakistan"],
  ["Who", "Hundreds of thousands of speakers, plus families around the world"],
  ["How", "Passed down mostly by speaking, from elders to children"],
];

function LanguageIntro() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center bg-background px-6 pb-10 pt-8">
      <p className="text-sm font-bold uppercase tracking-wider text-accent">About Khowar</p>
      <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight">A language of the mountains</h1>
      <div className="mt-6 space-y-3">
        {facts.map(([k, v], i) => (
          <div key={k} className="pop-in flex gap-4 rounded-3xl border bg-card p-4 shadow-soft" style={{ animationDelay: `${150 + i * 180}ms` }}>
            <span className="w-14 shrink-0 font-display text-lg font-semibold text-primary">{k}</span>
            <span className="text-base">{v}</span>
          </div>
        ))}
      </div>
      <p className="fade-up mt-4 text-base text-muted-foreground" style={{ animationDelay: "750ms" }}>
        Every phrase you learn here was recorded by a real Khowar speaker.
      </p>
      <button
        type="button"
        onClick={async () => {
          await finishOnboarding({ ageConfirmed: true });
          navigate({ to: "/", replace: true });
        }}
        className="mt-8 min-h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground"
      >
        Start learning
      </button>
    </div>
  );
}
