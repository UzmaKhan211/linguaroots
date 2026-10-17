import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, PartyPopper, Sparkles, Volume1, Volume2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import type { Scenario, WarmupItem } from "@/lib/content";
import { chunkRounds, seededShuffle } from "@/lib/pairs";
import { markPhrasesDone, markWarmupDone } from "@/lib/progress";
import { playCelebrate, playCorrect, playIncorrect } from "@/lib/sfx";
import { earn } from "@/lib/rewards";
import { Button } from "@/components/ui/button";

/** Lessons 1 and 2 of a unit: teach each item, then pair Khowar with English. */
function Dots({ total, at }: { total: number; at: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Round ${at + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= at ? "bg-primary" : "bg-border"}`} />
      ))}
    </div>
  );
}

function play(file: string, onEnd?: () => void) {
  if (!file) return onEnd?.();
  const a = new Audio(`/audio/khowar/${file}`);
  a.onended = () => onEnd?.();
  a.onerror = () => onEnd?.();
  a.play().catch(() => onEnd?.());
}

export function TeachMatch({ scenario, items, kind }: { scenario: Scenario; items: WarmupItem[]; kind: "words" | "phrases" }) {
  const isWords = kind === "words";
  const noun = isWords ? "word" : "phrase";
  const pairPrompt = `Now pair each ${noun} with its meaning.`;
  const lessonLabel = isWords ? "Lesson 1 · Words" : "Lesson 2 · Phrases";
  const navigate = useNavigate();
  const rounds = useMemo(() => chunkRounds(items), [items]);
  const [round, setRound] = useState(0);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [pickKh, setPickKh] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);
  const [pickEn, setPickEn] = useState<string | null>(null);
  const [message, setMessage] = useState<string>(pairPrompt);
  const [learnAt, setLearnAt] = useState(0);
  const [lastNote, setLastNote] = useState<WarmupItem | null>(null);
  const [hearing, setHearing] = useState(false);
  const [tilePlaying, setTilePlaying] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = rounds[round] ?? [];
  const khTiles = useMemo(() => seededShuffle(current, `${scenario.id}-k-${round}`), [current, scenario.id, round]);
  const enTiles = useMemo(() => seededShuffle(current, `${scenario.id}-e-${round}`), [current, scenario.id, round]);
  const roundDone = current.length > 0 && current.every((it) => matched.has(it.id));
  const isLast = round + 1 >= rounds.length;

  const [complete, setComplete] = useState(false);
  const finish = () => {
    if (!isLast || !roundDone) return;
    if (isWords) markWarmupDone(scenario.id);
    else markPhrasesDone(scenario.id);
    earn("warmup", `${scenario.id}:${kind}`);
    playCelebrate();
    setComplete(true);
    window.scrollTo({ top: 0 });
  };
  const goNext = () => {
    if (isWords) navigate({ to: "/scenario/$scenarioId/phrases", params: { scenarioId: scenario.id } });
    else navigate({ to: "/scenario/$scenarioId/talk", params: { scenarioId: scenario.id } });
  };

  const tryPair = (kh: string | null, en: string | null) => {
    if (timer.current) clearTimeout(timer.current);
    setWrong(false);
    if (!kh || !en) return;
    if (kh === en) {
      const item = current.find((it) => it.id === kh)!;
      setMatched((m) => new Set(m).add(kh));
      playCorrect();
      setMessage(`Yes! “${item.roman.trim()}” means “${item.english}”.`);
      setLastNote(item.culturalNote ? item : null);
      setPickKh(null);
      setPickEn(null);
    } else {
      setMessage("Not a pair yet. Listen again and have another go.");
      setWrong(true);
      playIncorrect();
      timer.current = setTimeout(() => {
        setPickKh(null);
        setPickEn(null);
        setWrong(false);
      }, 900);
    }
  };

  const nextRound = () => {
    if (isLast) return finish();
    setRound(round + 1);
    setLearnAt(0);
    setPickKh(null);
    setPickEn(null);
    setLastNote(null);
    setMessage(pairPrompt);
  };

  if (!items.length) return null;

  if (complete) {
    const steps = [
      { n: 1, label: "Words", state: isWords ? "done" : "done" },
      { n: 2, label: "Phrases", state: isWords ? "next" : "done" },
      { n: 3, label: "Conversation", state: isWords ? "later" : "next" },
    ] as const;
    return (
      <AppShell lesson>
        <div className="fade-up flex min-h-[70vh] flex-col items-center pt-8 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-leaf-soft text-primary">
            <PartyPopper className="size-10" aria-hidden />
          </span>
          <p className="mt-6 text-sm font-bold uppercase tracking-wider text-accent">
            {isWords ? "Lesson 1 complete" : "Lesson 2 complete"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{isWords ? "You know the words!" : "Phrases done!"}</h1>
          <p className="mt-2 font-bold text-primary">+20 XP</p>
          <p className="mt-4 text-lg text-muted-foreground">
            {isWords
              ? "Next, hear how these words come together in everyday phrases."
              : "You're ready to put it all together in a real conversation."}
          </p>
          <ol className="mt-8 w-full space-y-2 text-left" aria-label="Unit progress">
            {steps.map((s) => (
              <li
                key={s.n}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
                  s.state === "next" ? "border-primary bg-card" : "border-border bg-card"
                } ${s.state === "later" ? "opacity-60" : ""}`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full font-bold ${
                    s.state === "done" ? "bg-primary text-primary-foreground" : s.state === "next" ? "bg-leaf-soft text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.state === "done" ? <Check className="size-5" aria-hidden /> : s.n}
                </span>
                <span className="flex-1 font-semibold">Lesson {s.n}: {s.label}</span>
                <span className="text-sm font-bold text-muted-foreground">
                  {s.state === "done" ? "Done" : s.state === "next" ? "Up next" : ""}
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={goNext}
            className="mt-8 min-h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground"
          >
            {isWords ? "Start Lesson 2: Phrases" : "Start Lesson 3: Conversation"}
          </button>
          <Link
            to="/scenario/$scenarioId"
            params={{ scenarioId: scenario.id }}
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-muted-foreground"
          >
            Back to unit
          </Link>
        </div>
      </AppShell>
    );
  }

  if (learnAt < current.length) {
    const it = current[learnAt]!;
    const lastCard = learnAt + 1 >= current.length;
    return (
      <AppShell lesson>
        <Link
          to="/scenario/$scenarioId"
          params={{ scenarioId: scenario.id }}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-5" aria-hidden /> {scenario.title}
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <Dots total={rounds.length} at={round} />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-wider text-accent">{lessonLabel}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">{isWords ? "New words" : "New phrases"}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {isWords ? "Word" : "Phrase"} {learnAt + 1} of {current.length}. Listen, then we'll pair them up.
        </p>
        <div key={`${round}-${learnAt}`} className="fade-up mt-6">
          <div className="rounded-3xl border-2 border-border bg-card px-6 py-10 text-center">
            <p className="font-display text-4xl font-semibold">{it.roman.trim()}</p>
            <p className="mt-2 text-lg text-muted-foreground">{it.english}</p>
            <Button
              variant="audio"
              type="button"
              onClick={() => {
                setHearing(true);
                play(it.audioFile, () => setHearing(false));
              }}
              className="mt-6 px-5"
            >
              {hearing ? <Volume2 className="size-5 animate-pulse motion-reduce:animate-none" aria-hidden /> : <Volume1 className="size-5" aria-hidden />} Hear it
            </Button>
          </div>
          {it.culturalNote && (
            <aside className="mt-5 px-2">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                <Sparkles className="size-3.5" aria-hidden /> Cultural insight
              </p>
              <p className="mt-1.5 text-base italic leading-relaxed text-muted-foreground">{it.culturalNote}</p>
            </aside>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const n = learnAt + 1;
            setLearnAt(n);
          }}
          className="mt-6 min-h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground"
        >
          {lastCard ? "Let's pair them" : isWords ? "Next word" : "Next phrase"}
        </button>
      </AppShell>
    );
  }

  const tile = (selected: boolean, done: boolean) =>
    `relative flex ${isWords ? "h-24" : "h-32"} w-full items-center justify-center rounded-2xl border-2 px-3 py-2 text-center transition-colors ${
      done
        ? "border-primary/40 bg-secondary text-muted-foreground"
        : selected && wrong
          ? "border-destructive bg-card ring-4 ring-destructive/20"
          : selected
            ? "border-primary bg-card ring-4 ring-primary/20"
            : "border-border bg-card"
    }`;

  return (
    <AppShell lesson>
      <Link
        to="/scenario/$scenarioId"
        params={{ scenarioId: scenario.id }}
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-muted-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden /> {scenario.title}
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <Dots total={rounds.length} at={round} />
      </div>

      <p className="mt-6 text-sm font-bold uppercase tracking-wider text-accent">{lessonLabel}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">{isWords ? "Word pairs" : "Phrase pairs"}</h1>
      <p className="mt-2 min-h-14 text-lg" role="status" aria-live="polite">
        {message}
      </p>

      <div key={round} className="fade-up mt-4 grid grid-cols-2 gap-3">
        <ul className="space-y-3" aria-label={isWords ? "Khowar words" : "Khowar phrases"}>
          {khTiles.map((it) => {
            const done = matched.has(it.id);
            const sel = pickKh === it.id;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  disabled={done}
                  aria-pressed={sel}
                  onClick={() => {
                    setTilePlaying(it.id);
                    play(it.audioFile, () => setTilePlaying((p) => (p === it.id ? null : p)));
                    setPickKh(it.id);
                    tryPair(it.id, pickEn);
                  }}
                  className={tile(sel, done)}
                >
                  <span className="flex flex-col items-center gap-1">
                    <span className={`font-display ${isWords ? "text-xl" : "text-lg leading-snug"} font-semibold`}>
                      {it.roman.trim()}{" "}
                      {tilePlaying === it.id ? (
                        <Volume2 className="inline-block size-6 shrink-0 animate-pulse align-middle text-bark motion-reduce:animate-none" aria-hidden />
                      ) : (
                        <Volume1 className="inline-block size-6 shrink-0 align-middle text-bark" aria-hidden />
                      )}
                    </span>
                    {done && (
                      <span className="flex items-center gap-1 text-xs font-bold text-primary">
                        <Check className="size-4" aria-hidden /> Paired
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <ul className="space-y-3" aria-label="Meanings">
          {enTiles.map((it) => {
            const done = matched.has(it.id);
            const sel = pickEn === it.id;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  disabled={done}
                  aria-pressed={sel}
                  onClick={() => {
                    setPickEn(it.id);
                    tryPair(pickKh, it.id);
                  }}
                  className={tile(sel, done)}
                >
                  <span className="flex flex-col items-center gap-1">
                    <span className="text-base font-semibold">{it.english}</span>
                    {done && (
                      <span className="flex items-center gap-1 text-xs font-bold text-primary">
                        <Check className="size-4" aria-hidden /> Paired
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>


      {roundDone && (
        <button
          type="button"
          onClick={nextRound}
          className="fade-up mt-6 min-h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground"
        >
          {isLast ? "Finish lesson" : isWords ? "Next words" : "Next phrases"}
        </button>
      )}
    </AppShell>
  );
}
