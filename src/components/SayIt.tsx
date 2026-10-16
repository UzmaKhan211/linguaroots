import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, RotateCcw } from "lucide-react";
import { closenessWithCohort, closenessMessage, passes, showSelfCheck, PASS_MARK } from "@/lib/scoring";
import { decodeToMono16k, getScoringConfig, loadCohort, loadCohortKeyed, loadReference, MIC_CONSTRAINTS } from "@/lib/audio";
import { loadSpeech, onSpeechProgress, scoreSpeech, speechReady } from "@/lib/speechClient";
import { speechRatioToScore } from "@/lib/speechScore";

type Phase = "idle" | "recording" | "scoring" | "scored";

/** Record, play back and get a closeness score. Recording never leaves the device. */
export function SayIt({
  referenceUrl,
  cohortUrls = [],
  passMark = PASS_MARK,
  onPass,
  onSelfCheck,
}: {
  referenceUrl: string;
  cohortUrls?: string[];
  passMark?: number;
  onPass: () => void;
  onSelfCheck: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState<number | null>(null);
  const [fails, setFails] = useState(0);
  const [noRef, setNoRef] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [takeUrl, setTakeUrl] = useState<string | null>(null);
  const [scoreTime, setScoreTime] = useState<number | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [modelPct, setModelPct] = useState<number | null>(null);

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
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
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
          try {
            // Accurate listening tool, running in the background worker. Wait briefly if it's still getting ready.
            await Promise.race([loadSpeech(), new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), speechReady() ? 0 : 15000))]);
            const cohort = (await loadCohortKeyed(cohortUrls, "")).filter((c) => c.key !== referenceUrl);
            const r = await scoreSpeech(take, referenceUrl, ref, cohort);
            s = speechRatioToScore(r.ratio);
          } catch {
            const cohort = await loadCohort(cohortUrls, referenceUrl);
            s = closenessWithCohort(take, ref, cohort, getScoringConfig()).score;
          }
          setScore(s);
          setScoreTime((performance.now() - t0) / 1000);
          if (!passes(s, passMark)) setFails((f) => f + 1);
        } catch {
          setScore(null);
        }
        setPhase("scored");
      };
      rec.current = r;
      r.start();
      setPhase("recording");
    } catch {
      setMicError("We couldn't reach your microphone. You can still carry on by checking how it sounded to you.");
    }
  };

  const stop = () => rec.current?.state === "recording" && rec.current.stop();
  const passed = score !== null && passes(score, passMark);
  const selfCheck = noRef || !!micError || showSelfCheck(fails);

  return (
    <div className="mt-5 space-y-4">
      {phase === "recording" ? (
        <button
          type="button"
          onClick={stop}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-accent font-bold text-accent-foreground"
        >
          <Square className="size-5" aria-hidden /> Stop recording
          <span className="ml-1 inline-block size-2 rounded-full bg-accent-foreground motion-safe:animate-pulse" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={phase === "scoring"}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-60"
        >
          {phase === "idle" ? <Mic className="size-5" aria-hidden /> : <RotateCcw className="size-5" aria-hidden />}
          {phase === "idle" ? "Record yourself" : phase === "scoring" ? "Listening closely…" : "Try again"}
        </button>
      )}


      {modelPct !== null && (
        <p className="text-sm text-muted-foreground" aria-live="polite">Getting the listening tool ready (one time only)… {modelPct}%</p>
      )}

      {takeUrl && phase !== "recording" && (
        <button
          type="button"
          onClick={() => void new Audio(takeUrl).play()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 bg-card px-4 font-bold"
        >
          <Play className="size-4" aria-hidden /> Hear yourself
        </button>
      )}

      <div aria-live="polite">
        {phase === "scored" && score !== null && (
          <div className="fade-up rounded-2xl bg-card p-4">
            <p className="font-display text-3xl font-semibold">{score}% close</p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${score} percent close`}>
              <div className="h-full rounded-full bg-primary transition-all motion-reduce:transition-none" style={{ width: `${score}%` }} />
            </div>
            <p className="mt-2 text-base">{closenessMessage(score, passMark)}</p>
            {scoreTime !== null && <p className="mt-1 text-xs text-muted-foreground">Listened in {scoreTime.toFixed(1)}s</p>}
          </div>
        )}
        {noRef && (
          <p className="rounded-2xl bg-card p-3 text-base">
            The example recording for this line is coming soon, so listen to yourself and decide how close it felt.
          </p>
        )}
        {micError && <p className="rounded-2xl bg-card p-3 text-base">{micError}</p>}
      </div>

      {passed && (
        <button type="button" onClick={onPass} className="min-h-12 w-full rounded-full bg-primary font-bold text-primary-foreground">
          Continue
        </button>
      )}

      {!passed && selfCheck && (
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
