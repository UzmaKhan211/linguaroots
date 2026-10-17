import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Coffee, Heart, Mic, Phone, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AudioButton, useAutoAudioBusy } from "@/components/AudioButton";
import { SayIt } from "@/components/SayIt";
import { getScenario, turns, type Turn } from "@/lib/content";
import { afterChoice, afterLine, resumeFrom, stepAt, type Step } from "@/lib/conversation";
import { getResume, markScenarioCompleted, saveResume } from "@/lib/progress";
import { LessonAccess } from "@/components/LessonAccess";
import { playCelebrate, playPhoneRing, playTeaArrival } from "@/lib/sfx";
import { earn, XP } from "@/lib/rewards";
import { RewardsBadge } from "@/components/RewardsBadge";
import { loadCohortKeyed, loadReference } from "@/lib/audio";
import { loadSpeech, warmSpeech } from "@/lib/speechClient";

export const Route = createFileRoute("/scenario/$scenarioId_/talk")({
  loader: ({ params }) => {
    const scenario = getScenario(params.scenarioId);
    if (!scenario) throw notFound();
    return { scenario };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `Talk: ${loaderData.scenario.title} | LinguaRoots` : "Unavailable | LinguaRoots";
    const desc = "Have the conversation, hear your relative and reply in Khowar.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: TalkLesson,
});

const relative: Record<string, string> = { grandmother: "Grandma", grandfather: "Grandpa" };

const cohortUrls = turns
  .filter((t) => t.speaker === "learner" && (t.referenceFile || t.audioFile))
  .map((t) => `/audio/khowar/${t.referenceFile || t.audioFile}`);

function TalkLesson() {
  const { scenario } = Route.useLoaderData();
  return <LessonAccess key={scenario.id} scenarioId={scenario.id} lesson={3}><Talk /></LessonAccess>;
}

function Talk() {
  const { scenario } = Route.useLoaderData();
  const navigate = useNavigate();
  const who = relative[scenario.character] ?? scenario.character;
  const [history, setHistory] = useState<Turn[]>([]);
  const [step, setStep] = useState<Step>(() => stepAt(scenario.startTurnId, turns));
  const [chosen, setChosen] = useState<Turn | null>(null);
  const speaking = useAutoAudioBusy();
  const [tally, setTally] = useState({ spoken: 0, skipped: 0 });
  const [restored, setRestored] = useState(0);
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState<"pending" | "showing" | "done">("pending");
  const [connected, setConnected] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const restoredAt = useRef(0);
  const isEnd = step.type === "end";
  useEffect(() => {
    if (!isEnd) return;
    saveResume(scenario.id, null);
    markScenarioCompleted(scenario.id);
    earn("scenario", scenario.id);
    playCelebrate();
  }, [isEnd, scenario.id]);

  // Pick up a conversation left part way.
  useEffect(() => {
    const saved = getResume(scenario.id);
    const r = saved && resumeFrom(saved.history, scenario.startTurnId, turns);
    if (r && saved) {
      setHistory(r.history);
      setStep(r.step);
      setTally({ spoken: saved.spoken, skipped: saved.skipped });
      setRestored(r.history.length);
      restoredAt.current = r.history.length;
    }
    setReady(true);
  }, [scenario.id, scenario.startTurnId]);

  // Save after every line so leaving never loses the place.
  useEffect(() => {
    if (!ready || isEnd || history.length === 0) return;
    saveResume(scenario.id, { history: history.map((t) => t.id), ...tally });
  }, [ready, isEnd, history, tally, scenario.id]);

  const startOver = () => {
    saveResume(scenario.id, null);
    setHistory([]);
    setTally({ spoken: 0, skipped: 0 });
    setRestored(0);
    restoredAt.current = 0;
    setChosen(null);
    setStep(stepAt(scenario.startTurnId, turns));
    setConnected(false);
    setSeconds(0);
    setIntro("showing");
  };

  // Get the listening tool ready and pre-listen to the example clips in the background
  // (off the main screen), so after recording only the learner's take needs processing.
  useEffect(() => {
    void (async () => {
      try {
        const cohort = await loadCohortKeyed(cohortUrls, "");
        await loadSpeech();
        await warmSpeech(cohort);
        const mine = turns.filter((t) => t.scenarioId === scenario.id && t.speaker === "learner" && (t.referenceFile || t.audioFile));
        for (const t of mine) {
          const key = `/audio/khowar/${t.referenceFile || t.audioFile}`;
          const audio = await loadReference(key);
          if (audio) await warmSpeech([{ key, audio }]);
        }
      } catch {
        /* quick scorer is used instead */
      }
    })();
  }, [scenario.id]);


  // Short scene-setting moment before a fresh conversation (skipped when resuming).
  const phone = scenario.character === "grandmother";
  useEffect(() => {
    if (!ready || intro !== "pending") return;
    if (history.length > 0) {
      setIntro("done");
      return;
    }
    setIntro("showing");
  }, [ready, intro, history.length]);
  useEffect(() => {
    if (intro !== "showing") return;
    if (phone) playPhoneRing();
    else playTeaArrival();
    const a = setTimeout(() => setConnected(true), 1300);
    const b = setTimeout(() => setIntro("done"), 2100);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [intro, phone]);

  // Call timer for phone scenarios: ticks once the call connects, freezes at the end.
  const [seconds, setSeconds] = useState(0);
  const callLive = phone && ready && intro === "done" && !isEnd;
  useEffect(() => {
    if (!callLive) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callLive]);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  // Relative's lines appear on their own; walk until replies are needed.
  useEffect(() => {
    if (!ready || intro !== "done" || step.type !== "line") return;
    const t = setTimeout(() => {
      setHistory((h) => [...h, step.turn]);
      setStep(afterLine(step.turn, turns));
    }, history.length ? 700 : 200);
    return () => clearTimeout(t);
  }, [ready, intro, step, history.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length, step, chosen]);

  // Only one reply? Open it straight away — nothing to pick.
  useEffect(() => {
    if (step.type === "choose" && step.options.length === 1) setChosen(step.options[0] ?? null);
  }, [step]);
  const single = step.type === "choose" && step.options.length === 1;

  // Spoken lines earn XP; skipped lines move the chat on without XP.
  const confirm = (skipped = false) => {
    if (!chosen) return;
    if (skipped) setTally((t) => ({ ...t, skipped: t.skipped + 1 }));
    else {
      earn("line", `${scenario.id}:${chosen.id}`);
      setTally((t) => ({ ...t, spoken: t.spoken + 1 }));
    }
    setHistory((h) => [...h, chosen]);
    setStep(afterChoice(chosen, turns));
    setChosen(null);
  };

  return (
    <AppShell>
      <Link
        to="/scenario/$scenarioId"
        params={{ scenarioId: scenario.id }}
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden /> {scenario.title}
      </Link>

      {restored > 0 && !isEnd && (
        <div className="fade-up mt-4 flex items-center justify-between gap-3 rounded-2xl bg-muted p-3">
          <p className="text-base font-semibold text-foreground">Welcome back. Pick up where you left off.</p>
          <button
            type="button"
            onClick={startOver}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border-2 bg-card px-3 text-sm font-bold"
          >
            <RotateCcw className="size-4" aria-hidden /> Start over
          </button>
        </div>
      )}

      {intro === "showing" && (
        <button
          type="button"
          onClick={() => setIntro("done")}
          aria-label="Skip and start the conversation"
          className="fade-up mt-6 flex w-full flex-col items-center rounded-3xl border bg-card p-8 text-center shadow-soft"
        >
          <span className={`flex size-20 items-center justify-center rounded-full bg-bark text-primary-foreground ${connected ? "" : "motion-safe:animate-pulse"}`}>
            {phone ? <Phone className="size-9" aria-hidden /> : <Coffee className="size-9" aria-hidden />}
          </span>
          <span className="mt-4 font-display text-2xl font-semibold" aria-live="polite">
            {phone ? (connected ? `${who} picked up` : `Calling ${who}...`) : connected ? `${who} is here` : `Joining ${who} for tea...`}
          </span>
          <span className="mt-2 text-sm text-muted-foreground">Tap to skip</span>
        </button>
      )}

      {phone && intro === "done" && (
        <div className="fade-up mt-4 flex items-center justify-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
          <Phone className="size-4 text-bark" aria-hidden />
          <span>{isEnd ? "Call ended" : `On call with ${who}`}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums" aria-label={`Call time ${clock}`}>{clock}</span>
        </div>
      )}

      <ol className="mt-4 space-y-4" aria-live="polite">
        {history.map((t, i) => (
          <Bubble key={t.id + i} turn={t} who={who} autoPlay={i >= restoredAt.current} />
        ))}
      </ol>

      {step.type === "choose" && !chosen && !speaking && (
        <section className="fade-up mt-6">
          <p className="font-bold text-muted-foreground">
            {step.options.length > 1 ? "Select a response of your choice" : "Respond by saying"}
          </p>
          <ul className="mt-3">
            {step.options.map((o, idx) => (
              <li key={o.id}>
                {idx > 0 && (
                  <div className="flex items-center gap-3 py-2" aria-hidden>
                    <span className="h-px flex-1 bg-border" />
                    <span className="rounded-full bg-muted px-3 py-0.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">or</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setChosen(o)}
                  className="w-full rounded-2xl border-2 bg-card p-4 text-left shadow-soft"
                >
                  <span className="block font-display text-xl font-semibold">{o.roman}</span>
                  <span className="block text-sm text-muted-foreground">{o.english}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {chosen && !speaking && (
        <section className="fade-up mt-6 rounded-3xl border bg-leaf-soft p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-bold text-primary">
              <Mic className="size-5" aria-hidden /> {single ? "Respond by saying" : "Say it out loud"}
            </p>
            {!single && (
              <button
                type="button"
                onClick={() => setChosen(null)}
                className="inline-flex min-h-11 items-center gap-1 rounded-full border-2 bg-card px-3 text-sm font-bold"
              >
                <ArrowLeft className="size-4" aria-hidden /> Change reply
              </button>
            )}
          </div>
          <p className="mt-2 font-display text-2xl font-semibold">{chosen.roman}</p>
          <p className="text-base text-muted-foreground">{chosen.english}</p>
          <div className="mt-4">
            <AudioButton file={chosen.audioFile} label="Hear it first" />
          </div>
          {chosen.quality === "less-fitting" && (
            <p className="mt-4 rounded-2xl bg-card p-3 text-base">
              This works, though {who} might expect something a little warmer here.
            </p>
          )}
          <SayIt
            key={chosen.id}
            referenceUrl={`/audio/khowar/${chosen.referenceFile || chosen.audioFile}`}
            cohortUrls={cohortUrls}
            passMark={chosen.passThreshold}
            onPass={() => confirm()}
            onSkip={() => confirm(true)}
            onAttempt={() => setRestored(0)}
          />
        </section>
      )}

      {step.type === "end" && (
        <section className="fade-up mt-8 rounded-3xl border bg-sun-soft p-6 text-center">
          <Heart className="mx-auto size-10 text-accent" aria-hidden />
          <h2 className="mt-3 text-2xl font-semibold">You talked with {who}</h2>
          <p className="mt-2 text-lg">That was a whole conversation in Khowar. They'd be so happy to hear it.</p>
          <p className="mt-3 text-lg">
            You said <span className="font-bold">{tally.spoken}</span> {tally.spoken === 1 ? "line" : "lines"} out loud
            {tally.skipped > 0 && (
              <>
                {" "}and skipped <span className="font-bold">{tally.skipped}</span>
              </>
            )}
            .
          </p>
          <p className="mt-1 text-base text-muted-foreground">+{XP.scenario} XP for finishing, plus {XP.line} for every line you said.</p>
          <RewardsBadge className="mt-3 justify-center" />
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={startOver}
              className="min-h-12 rounded-full bg-primary font-bold text-primary-foreground"
            >
              Talk again
            </button>
            <Link to="/" className="flex min-h-12 items-center justify-center rounded-full border-2 bg-card font-bold">
              Choose another situation
            </Link>
          </div>
        </section>
      )}
      <div ref={endRef} />
    </AppShell>
  );
}

function Bubble({ turn, who, autoPlay = false }: { turn: Turn; who: string; autoPlay?: boolean }) {
  const me = turn.speaker === "learner";
  return (
    <li className={`fade-up flex ${me ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-3xl p-4 shadow-soft ${
          me ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card"
        }`}
      >
        <p className={`text-xs font-bold uppercase tracking-wider ${me ? "opacity-80" : "text-accent"}`}>
          {me ? "You" : who}
        </p>
        <p className="mt-1 font-display text-xl font-semibold">{turn.roman}</p>
        <p className={`text-sm ${me ? "opacity-85" : "text-muted-foreground"}`}>{turn.english}</p>
        {!me && (
          <div className="mt-2">
            <AudioButton file={turn.audioFile} autoPlay={autoPlay} />
          </div>
        )}
      </div>
    </li>
  );
}
