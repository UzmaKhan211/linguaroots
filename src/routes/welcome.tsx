import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Hand } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/LogoMark";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome | LinguaRoots" },
      { name: "description", content: "Discover why indigenous languages matter and start learning yours." },
      { property: "og:title", content: "Welcome | LinguaRoots" },
      { property: "og:description", content: "Discover why indigenous languages matter and start learning yours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Welcome,
});

const STEPS = 4;

function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background px-6 pb-10 pt-6">
      <div className="flex min-h-11 items-center justify-between">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="inline-flex min-h-11 items-center gap-1 font-bold" aria-label="Back">
            <ArrowLeft className="size-5" aria-hidden /> Back
          </button>
        ) : (
          <span />
        )}
        <ol className="flex gap-2" aria-label={`Step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <li
              key={i}
              className={`size-2.5 rounded-full ${i === step ? "w-6 bg-primary" : i < step ? "bg-primary/60" : "bg-muted"} transition-all motion-reduce:transition-none`}
            />
          ))}
        </ol>
      </div>

      <div key={step} className="fade-up flex flex-1 flex-col justify-center">
        {step === 0 && (
          <div className="flex flex-col items-center text-center">
            <LogoMark className="pop-in float-soft h-28 w-auto" />
            <Wordmark className="fade-up mt-5 h-8 w-auto" />
            <h1 className="fade-up mt-8 text-[2rem] font-semibold leading-tight" style={{ animationDelay: "200ms" }}>
              Keep your family's language alive.
            </h1>
            <p className="fade-up mt-3 text-lg text-muted-foreground" style={{ animationDelay: "320ms" }}>
              Learn everyday Khowar phrases through short, friendly conversations.
            </p>
            <Primary onClick={next}>Let's begin</Primary>
          </div>
        )}

        {step === 1 && <EndangeredFact onNext={next} />}
        {step === 2 && <GenerationsFact onNext={next} />}
        {step === 3 && (
          <div className="flex flex-col items-center text-center">
            <LogoMark className="pop-in h-20 w-auto" />
            <h1 className="fade-up mt-6 text-[1.75rem] font-semibold leading-tight">Every phrase you learn keeps a language going.</h1>
            <p className="fade-up mt-3 text-lg text-muted-foreground" style={{ animationDelay: "150ms" }}>
              Make a free account so your progress is saved on every device.
            </p>
            <Primary onClick={() => navigate({ to: "/auth" })}>Create my account</Primary>
            <button
              type="button"
              onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
              className="mt-4 min-h-11 px-4 font-bold text-primary underline underline-offset-4"
            >
              Already have an account? Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Primary({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-8 min-h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function EndangeredFact({ onNext }: { onNext: () => void }) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <p className="text-sm font-bold uppercase tracking-wider text-accent">Did you know?</p>
      <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight">The world speaks about 7,000 languages.</h1>
      <p className="mt-2 text-lg text-muted-foreground">How many of them are at risk of being lost?</p>
      <button
        type="button"
        onClick={() => setShown(true)}
        aria-label="Reveal how many languages are at risk"
        className="relative mt-6 grid grid-cols-10 gap-2 rounded-3xl border bg-card p-5 shadow-soft transition-transform active:scale-[0.98] motion-reduce:transition-none"
      >
        {Array.from({ length: 50 }, (_, i) => {
          const atRisk = shown && i % 10 < 4;
          return (
            <span
              key={i}
              className={`aspect-square rounded-full transition-all duration-500 motion-reduce:transition-none ${atRisk ? "scale-75 bg-accent" : shown ? "bg-primary/70" : "bg-primary/40"}`}
              style={{ transitionDelay: `${(i % 10) * 40 + Math.floor(i / 10) * 30}ms` }}
            />
          );
        })}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 motion-reduce:transition-none ${shown ? "opacity-0" : "opacity-100"}`}
        >
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-base font-bold text-primary-foreground shadow-soft motion-safe:animate-pulse">
            <Hand className="size-5" aria-hidden /> Tap to reveal
          </span>
        </span>
      </button>
      {shown && (
        <p className="pop-in mt-4 text-lg" role="status">
          <span className="font-display text-3xl font-semibold text-accent">About 4 in 10</span>
          <br />
          are endangered, according to UNESCO. Many are indigenous languages kept alive by families at home.
        </p>
      )}
      <Primary onClick={shown ? onNext : () => setShown(true)}>{shown ? "Continue" : "Reveal the answer"}</Primary>
    </>
  );
}

function GenerationsFact({ onNext }: { onNext: () => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const options = ["One", "Three", "Ten"];
  const correct = 1;
  return (
    <>
      <p className="text-sm font-bold uppercase tracking-wider text-accent">Quick guess</p>
      <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight">
        When families move abroad, how many generations does it often take for a home language to fade?
      </h1>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {options.map((o, i) => {
          const isRight = pick !== null && i === correct;
          return (
            <button
              key={o}
              type="button"
              onClick={() => setPick(i)}
              disabled={pick !== null}
              className={`min-h-16 rounded-3xl border-2 bg-card text-lg font-bold ${isRight ? "border-primary ring-2 ring-primary/30" : pick === i ? "border-accent" : ""}`}
            >
              {o}
              {isRight && <span className="block text-sm text-primary">✓ Answer</span>}
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <div className="mt-6" role="status">
          <div className="flex h-24 items-end justify-center gap-6" aria-hidden>
            {[88, 48, 14].map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="grow-up w-12 rounded-t-2xl bg-primary" style={{ height: `${h}px`, animationDelay: `${i * 200}ms`, opacity: 1 - i * 0.25 }} />
                <span className="text-xs font-bold text-muted-foreground">Gen {i + 1}</span>
              </div>
            ))}
          </div>
          <p className="pop-in mt-4 text-lg">
            {pick === correct ? "That's right. " : "It's often just three. "}
            Grandparents speak it, parents understand it, and children often lose it. Learning a few phrases helps keep the thread going.
          </p>
        </div>
      )}
      <Primary onClick={onNext} disabled={pick === null}>Continue</Primary>
    </>
  );
}
