import { useEffect, useRef, useState } from "react";
import { playCorrect, playIncorrect } from "@/lib/sfx";
import { Mic, Square, Play, RotateCcw, CheckCircle2 } from "lucide-react";
import { closenessWithCohort, feedbackMessage, passes, showSelfCheck, PASS_MARK } from "@/lib/scoring";
import { decodeToMono16k, getScoringConfig, loadCohort, loadCohortKeyed, loadReference, MIC_CONSTRAINTS } from "@/lib/audio";
import { loadSpeech, onSpeechProgress, scoreSpeech, speechReady } from "@/lib/speechClient";
import { speechRatioToScore } from "@/lib/speechScore";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/** Store only the number (never the recording) so closeness can be studied later. */
async function saveAttempt(reference: string, score: number, passed: boolean, attempt: number, scorer: string) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("closeness_attempts").insert({
      user_id: data.user.id,
      reference: reference.split("/").pop() ?? reference,
      score,
      passed,
      attempt,
      scorer,
    });
  } catch {
    /* never block the learner */
  }
}

type Phase = "idle" | "recording" | "scoring" | "scored";

/** Record, play back and get a closeness score. Recording never leaves the device. */
export function SayIt({
  referenceUrl,
  cohortUrls = [],
  passMark = PASS_MARK,
  onPass,
  onSelfCheck,
  onSkip,
  onAttempt,
  compact = false,
}: {
  referenceUrl: string;
  cohortUrls?: string[];
  passMark?: number;
  onPass: () => void;
  /** Leave out to hide the self-check (it is paused for now). */
  onSelfCheck?: () => void;
  /** Shown only after 3 attempts below the pass mark (or when recording can't work). */
  onSkip?: () => void;
  onAttempt?: () => void;
  compact?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState<number | null>(null);
  const [fails, setFails] = useState(0);
  const [noRef, setNoRef] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [takeUrl, setTakeUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const attempts = useRef(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [modelPct, setModelPct] = useState<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (speechReady()) return;
    const off = onSpeechProgress((p) => setModelPct(p));
    loadSpeech().then(() => setModelPct(null)).catch(() => setModelPct(null));
    return off;
  }, []);

  useEffect(() => {
    let live = true;
    setNoRef(false);
    loadReference(referenceUrl).then((r) => live && setNoRef(!r));
    void loadCohort(cohortUrls, referenceUrl); // warm the cache
    return () => {
      live = false;
    };
  }, [referenceUrl]);

  useEffect(() => () => {
    if (takeUrl) URL.revokeObjectURL(takeUrl);
  }, [takeUrl]);

  const start = async () => {
    onAttempt?.();
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
        const blob = new Blob(chunks.current, { type: r.mimeType });
        setTakeUrl(URL.createObjectURL(blob));
        const ref = await loadReference(referenceUrl);
        if (!ref) {
          setPhase("scored");
          setScore(null);
          return;
        }
        setPhase("scoring");
        const t0 = performance.now();
        try {
          const take = await decodeToMono16k(await blob.arrayBuffer());
          let s: number;
          let scorer = "accurate";
          try {
            // Accurate listening tool, running in the background worker. Wait briefly if it's still getting ready.
            await Promise.race([loadSpeech(), new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), speechReady() ? 0 : 15000))]);
            const cohort = (await loadCohortKeyed(cohortUrls, "")).filter((c) => c.key !== referenceUrl);
            const r = await scoreSpeech(take, referenceUrl, ref, cohort);
            s = speechRatioToScore(r.ratio);
          } catch {
            scorer = "quick";
            const cohort = await loadCohort(cohortUrls, referenceUrl);
            s = closenessWithCohort(take, ref, cohort, getScoringConfig()).score;
          }
          setScore(s);
          const ok = passes(s, passMark);
          setFeedback(feedbackMessage(ok));
          attempts.current += 1;
          void saveAttempt(referenceUrl, s, ok, attempts.current, scorer);
          if (ok) playCorrect(); else playIncorrect();
          if (!ok) setFails((f) => f + 1);
        } catch {
          setScore(null);
        }
        setPhase("scored");
      };
      rec.current = r;
      setStream(stream);
      r.start();
      setPhase("recording");
    } catch {
      setMicError("We couldn't reach your microphone. You can still carry on by checking how it sounded to you.");
    }
  };

  const stop = () => rec.current?.state === "recording" && rec.current.stop();
  const playTake = () => {
    if (takeUrl) void new Audio(takeUrl).play();
  };
  const passed = score !== null && passes(score, passMark);
  const selfCheck = noRef || !!micError || showSelfCheck(fails);

  return (
    <div className={compact ? "mt-3 space-y-2" : "mt-5 space-y-4"}>
      <div className={compact ? "grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1" : "flex flex-col items-center gap-3"}>
        <div className={compact ? "flex min-h-11 min-w-0 items-center justify-center gap-2" : "flex min-h-14 w-full items-center justify-center gap-3"}>
          {takeUrl && phase === "scored" && !passed && (
            <Button
              type="button"
              variant="audio"
              size="icon"
              onClick={playTake}
              aria-label="Hear yourself"
              className="size-11 shrink-0 rounded-full"
            >
              <Play className="size-5 fill-current" aria-hidden />
            </Button>
          )}
          <div className={compact ? "flex h-8 min-w-0 flex-1 items-center justify-center" : "flex h-14 min-w-0 flex-1 items-center justify-center"} aria-hidden>
            {phase === "recording" && stream ? <LiveWave stream={stream} /> : <IdleWave dim={phase === "scoring"} />}
          </div>
        </div>
        {phase === "scored" && passed && takeUrl ? (
          <Button
            type="button"
            variant="audio"
            onClick={playTake}
            aria-label="Hear yourself"
            className={`fade-up relative flex shrink-0 items-center justify-center rounded-full bg-bark p-0 text-primary-foreground shadow-lift [&_svg]:size-8 ${compact ? "size-14" : "size-20"}`}
          >
            <Play className="ml-1 fill-current" aria-hidden />
          </Button>
        ) : phase === "scored" && passed ? (
          <div
            role="img"
            aria-label="Said correctly"
            className={`fade-up flex items-center justify-center rounded-full border-4 border-primary bg-leaf-soft text-primary shadow-lift ${compact ? "size-14" : "size-20"}`}
          >
            <CheckCircle2 className="size-10" aria-hidden />
          </div>
        ) : (
        <Button
          type="button"
          onClick={phase === "recording" ? stop : start}
          disabled={phase === "scoring"}
          aria-label={phase === "recording" ? "Stop recording" : phase === "idle" ? "Record yourself" : "Try again"}
          variant="audio"
          className={`relative flex shrink-0 items-center justify-center rounded-full p-0 shadow-lift disabled:opacity-60 [&_svg]:size-7 ${compact ? "size-14" : "size-20"} ${
            phase === "recording" ? "bg-bark text-primary-foreground ring-4 ring-bark/30" : "bg-bark text-primary-foreground"
          }`}
        >
          {phase === "recording" && (
            <span className="absolute inset-0 rounded-full bg-bark/40 motion-safe:animate-ping" aria-hidden />
          )}
          {phase === "recording" ? (
            <Square className="relative size-7 fill-current" aria-hidden />
          ) : phase === "scored" ? (
            <RotateCcw className="size-8" aria-hidden />
          ) : (
            <Mic className="size-9" aria-hidden />
          )}
        </Button>
        )}
        <p className={`${compact ? "col-span-2 justify-center text-sm" : "text-base"} flex items-center gap-1.5 font-bold ${phase === "scored" && passed ? "text-primary" : ""}`} aria-live="polite">
          {phase === "recording"
            ? "Listening… tap to stop"
            : phase === "scoring"
              ? "Listening closely…"
              : phase === "scored"
                ? passed
                  ? <><CheckCircle2 className="size-5" aria-hidden /> Well said!</>
                  : "Tap to try again"
                : "Tap and say it"}
        </p>
      </div>

      {modelPct !== null && (
        <p className="text-sm text-muted-foreground" aria-live="polite">Getting the listening tool ready (one time only)… {modelPct}%</p>
      )}

      <div aria-live="polite">
        {phase === "scored" && score !== null && (
          <div
            className={`fade-up rounded-2xl border-2 ${compact ? "px-3 py-2" : "p-4"} ${
              passed ? "border-primary bg-leaf-soft" : fails >= 3 ? "border-destructive bg-card" : "border-sun bg-card"
            }`}
          >
            {passed && !compact && (
              <p className="flex items-center gap-2 font-bold text-primary">
                <CheckCircle2 className="size-6" aria-hidden /> You got it!
              </p>
            )}
            <p className={`font-display ${compact ? "text-base" : "text-xl"} font-semibold ${passed && !compact ? "mt-1" : ""}`}>{feedback}</p>
          </div>
        )}
        {noRef && (
          <p className="rounded-2xl bg-card p-3 text-base">
            The example recording for this line is coming soon, so listen to yourself and decide how close it felt.
          </p>
        )}
        {micError && <p className="rounded-2xl bg-card p-3 text-base">{micError}</p>}
      </div>

      {passed && phase === "scored" && (
        <div className={compact ? "grid grid-cols-2 items-center gap-2" : "space-y-4"}>
          <Button type="button" onClick={onPass} className="min-h-11 w-full rounded-full font-bold">
            Continue
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={start}
            className="min-h-11 w-full rounded-full font-bold text-muted-foreground underline"
          >
            Or record again
          </Button>
        </div>
      )}

      {!passed && selfCheck && onSkip && phase !== "recording" && phase !== "scoring" && (
        <button
          type="button"
          onClick={onSkip}
          className="fade-up min-h-11 w-full rounded-full font-bold text-muted-foreground underline"
        >
          Skip this line
        </button>
      )}

      {!passed && selfCheck && onSelfCheck && (
        <div className="fade-up">
          <p className="font-semibold">Did that sound close to you?</p>
          <button
            type="button"
            onClick={onSelfCheck}
            className="mt-2 min-h-12 w-full rounded-full border-2 border-primary bg-card font-bold"
          >
            Yes, it sounded close. Continue
          </button>
        </div>
      )}
    </div>
  );
}

const BARS = 28;

/** Bars that move with the learner's voice while recording. */
function LiveWave({ stream }: { stream: MediaStream }) {
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0.08));
  useEffect(() => {
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 60) return;
      last = t;
      an.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128);
      const level = Math.min(1, 0.08 + peak * 2.2);
      setLevels((l) => [...l.slice(1), level]);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      src.disconnect();
      void ctx.close();
    };
  }, [stream]);
  return (
    <div className="flex h-full items-center gap-[3px]">
      {levels.map((v, i) => (
        <span key={i} className="w-1.5 rounded-full bg-bark" style={{ height: `${Math.round(v * 100)}%` }} />
      ))}
    </div>
  );
}

/** A quiet, still waveform when not recording. */
function IdleWave({ dim }: { dim: boolean }) {
  return (
    <div className={`flex h-full items-center gap-[3px] ${dim ? "opacity-40" : "opacity-30"}`}>
      {Array.from({ length: BARS }, (_, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-bark"
          style={{ height: `${12 + Math.round(Math.abs(Math.sin(i * 0.7)) * 30)}%` }}
        />
      ))}
    </div>
  );
}
