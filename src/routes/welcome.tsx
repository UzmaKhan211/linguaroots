import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { AudioButton } from "@/components/AudioButton";
import { scenarios, getWarmup } from "@/lib/content";
import { finishOnboarding, getPrefs } from "@/lib/progress";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome — LinguaRoots" },
      { name: "description", content: "A one-minute welcome to practising Khowar with the people you love." },
      { property: "og:title", content: "Welcome — LinguaRoots" },
      { property: "og:description", content: "A one-minute welcome to practising Khowar with the people you love." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Welcome,
});

const relativeLabel: Record<string, string> = { grandmother: "Grandma", grandfather: "Grandpa" };
const STEPS = 5;

function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [relative, setRelative] = useState<string | undefined>(() => getPrefs().relative);
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
          <>
            <LogoMark className="h-16 w-auto self-start" />
            <h1 className="mt-6 text-[2rem] font-semibold leading-tight">Get ready to talk with someone you love.</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Hear your relative, choose what to say, and practise saying it in Khowar. No tests, just gentle practice.
            </p>
            <Primary onClick={next}>Let's begin</Primary>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-[1.75rem] font-semibold leading-tight">Who would you like to talk to first?</h1>
            <div className="mt-6 space-y-3" role="radiogroup" aria-label="Relative">
              {scenarios.map((s) => {
                const on = relative === s.character;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setRelative(s.character)}
                    className={`flex min-h-16 w-full items-center justify-between rounded-3xl border-2 bg-card px-5 text-left ${on ? "border-primary ring-2 ring-primary/30" : ""}`}
                  >
                    <span>
                      <span className="block text-xl font-semibold">{relativeLabel[s.character] ?? s.character}</span>
                      <span className="block text-sm text-muted-foreground">{s.title}</span>
                    </span>
                    <span className="text-sm font-bold">{on ? "✓ Chosen" : ""}</span>
                  </button>
                );
              })}
            </div>
            <Primary onClick={next} disabled={!relative}>Continue</Primary>
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

        {step === 3 && (
          <>
            <h1 className="text-[1.75rem] font-semibold leading-tight">One quick check</h1>
            <p className="mt-2 text-lg text-muted-foreground">LinguaRoots is for people aged 13 and over.</p>
            {under13 ? (
              <p className="mt-6 rounded-2xl bg-card p-4 text-base" role="status">
                Thank you for being honest. Please ask a parent or carer to practise with you on their device.
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

        {step === 4 && (
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
