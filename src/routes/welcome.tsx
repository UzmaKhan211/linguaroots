import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/LogoMark";
import { AudioButton } from "@/components/AudioButton";
import { scenarios, getWarmup } from "@/lib/content";
import { finishOnboarding, getPrefs } from "@/lib/progress";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome | LinguaRoots" },
      { name: "description", content: "Discover why indigenous languages like Khowar matter, then try your first word." },
      { property: "og:title", content: "Welcome | LinguaRoots" },
      { property: "og:description", content: "Discover why indigenous languages like Khowar matter, then try your first word." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Welcome,
});

const STEPS = 7;

function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const relative = getPrefs().relative;
  const [under13, setUnder13] = useState(false);

  const scenario = scenarios.find((s) => s.character === relative) ?? scenarios[0]!;
  const tryItem = getWarmup(scenario.id)[0];
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
        {step === 4 && <GenerationsFact onNext={next} />}
        {step === 3 && (
          <>
            <p className="text-sm font-bold uppercase tracking-wider text-accent">About Khowar</p>
            <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight">A language of the mountains</h1>
            <div className="mt-6 space-y-3">
              {[
                ["Where", "The Chitral valley and nearby valleys of northern Pakistan"],
                ["Who", "Hundreds of thousands of speakers, plus families around the world"],
                ["How", "Passed down mostly by speaking, from elders to children"],
              ].map(([k, v], i) => (
                <div key={k} className="pop-in flex gap-4 rounded-3xl border bg-card p-4 shadow-soft" style={{ animationDelay: `${150 + i * 180}ms` }}>
                  <span className="w-14 shrink-0 font-display text-lg font-semibold text-primary">{k}</span>
                  <span className="text-base">{v}</span>
                </div>
              ))}
            </div>
            <p className="fade-up mt-4 text-base text-muted-foreground" style={{ animationDelay: "750ms" }}>
              Every phrase you learn here was recorded by a real Khowar speaker.
            </p>
            <Primary onClick={next}>Continue</Primary>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-[1.75rem] font-semibold leading-tight">Try your first word</h1>
            <p className="mt-2 text-muted-foreground">Listen, then say it out loud along with the recording.</p>
            {tryItem && (
              <div className="mt-6 rounded-3xl border bg-card p-6 shadow-soft">
                <p className="font-display text-4xl font-semibold">{tryItem.roman}</p>
                <p className="mt-1 text-lg text-muted-foreground">{tryItem.english}</p>
                <div className="mt-4">
                  <AudioButton file={tryItem.audioFile} label="Hear it" />
                </div>
              </div>
            )}
            <Primary onClick={next}>I said it</Primary>
          </>
        )}

        {step === 5 && (
          <>
            <h1 className="text-[1.75rem] font-semibold leading-tight">One quick check</h1>
            <p className="mt-2 text-lg text-muted-foreground">LinguaRoots is for people aged 13 and over.</p>
            {under13 ? (
              <p className="mt-6 rounded-2xl bg-card p-4 text-base" role="status">
                Thank you for being honest. Please ask a parent or caregiver to practice with you on their device.
              </p>
            ) : (
              <>
                <Primary
                  onClick={async () => {
                    await finishOnboarding({ relative, ageConfirmed: true });
                    next();
                  }}
                >
                  I'm 13 or older
                </Primary>
                <button type="button" onClick={() => setUnder13(true)} className="mt-3 min-h-12 w-full rounded-full border-2 bg-card font-bold">
                  I'm under 13
                </button>
              </>
            )}
          </>
        )}

        {step === 6 && (
          <>
            <h1 className="text-[1.75rem] font-semibold leading-tight">Keep your progress safe</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Make a free account to keep your progress on any device. You can also carry on as a guest and save it later.
            </p>
            <Primary onClick={() => navigate({ to: "/auth" })}>Save my progress</Primary>
            <button type="button" onClick={() => navigate({ to: "/" })} className="mt-3 min-h-12 w-full rounded-full border-2 bg-card font-bold">
              Continue as a guest
            </button>
          </>
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
      <p className="mt-2 text-lg text-muted-foreground">How many of them are at risk of being lost? Tap to find out.</p>
      <button
        type="button"
        onClick={() => setShown(true)}
        aria-label="Reveal how many languages are at risk"
        className="mt-6 grid grid-cols-10 gap-2 rounded-3xl border bg-card p-5 shadow-soft"
      >
        {Array.from({ length: 50 }, (_, i) => {
          const atRisk = shown && i % 10 < 4;
          return (
            <span
              key={i}
              className={`aspect-square rounded-full transition-all duration-500 motion-reduce:transition-none ${atRisk ? "scale-75 bg-accent" : "bg-primary/70"}`}
              style={{ transitionDelay: `${(i % 10) * 40 + Math.floor(i / 10) * 30}ms` }}
            />
          );
        })}
      </button>
      {shown && (
        <p className="pop-in mt-4 text-lg" role="status">
          <span className="font-display text-3xl font-semibold text-accent">About 4 in 10</span>
          <br />
          are endangered, according to UNESCO. Many are indigenous languages kept alive by families at home.
        </p>
      )}
      <Primary onClick={onNext} disabled={!shown}>Continue</Primary>
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
            {[100, 55, 15].map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="grow-up w-12 rounded-t-2xl bg-primary" style={{ height: `${h}%`, animationDelay: `${i * 200}ms`, opacity: 1 - i * 0.25 }} />
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
