import { useEffect, useRef, useState } from "react";
import { Volume2, Clock } from "lucide-react";
import { fetchLessonAudio } from "@/lib/lessonAudio";
import { Button } from "@/components/ui/button";

/** Clips that start on their own wait their turn, so two lines never talk over each other. */
let autoQueue: Promise<void> = Promise.resolve();
let pending = 0;
const bump = (n: number) => {
  pending = Math.max(0, pending + n);
  window.dispatchEvent(new CustomEvent("lr:autoaudio", { detail: pending }));
};
/** True while a line that started on its own is waiting or playing. */
export function useAutoAudioBusy() {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setBusy(pending > 0);
    const on = (e: Event) => setBusy((e as CustomEvent<number>).detail > 0);
    window.addEventListener("lr:autoaudio", on);
    return () => window.removeEventListener("lr:autoaudio", on);
  }, []);
  return busy;
}
/**
 * One shared player for lines that start on their own. Phone browsers (Safari especially)
 * only let a player make sound without a tap once that same player has been started by a tap,
 * so we "unlock" it on the learner's first tap and reuse it for every later line.
 */
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
let shared: HTMLAudioElement | null = null;
let unlocked = false;
const getShared = () => {
  if (!shared && typeof window !== "undefined") {
    shared = new Audio();
    shared.preload = "auto";
  }
  return shared;
};
const unlock = () => {
  const s = getShared();
  if (!s || unlocked) return;
  unlocked = true;
  // Only prime it when nothing is playing, so a line is never cut off.
  if (!s.paused) return;
  s.src = SILENT;
  s.muted = true;
  s.play()
    .then(() => {
      if (s.src === SILENT) s.pause();
      s.muted = false;
    })
    .catch(() => {
      s.muted = false;
      unlocked = false;
    });
};
if (typeof window !== "undefined") {
  for (const ev of ["touchend", "click", "keydown"]) window.addEventListener(ev, unlock, { capture: true, passive: true });
}
/** Stop any line that started on its own (used when the learner taps a Hear it button). */
const stopShared = () => {
  if (shared && !shared.paused) shared.pause();
};

const playWhenFree = (src: () => string, alive: () => boolean, onStart: () => void, onDone: () => void) => {
  autoQueue = autoQueue.then(
    () =>
      new Promise<void>((done) => {
        const s = getShared();
        if (!alive() || !s) {
          onDone();
          return done();
        }
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(stall);
          s.removeEventListener("ended", finish);
          s.removeEventListener("pause", finish);
          s.removeEventListener("error", finish);
          onDone();
          done();
        };
        s.muted = false;
        s.src = src();
        s.currentTime = 0;
        s.addEventListener("ended", finish);
        s.addEventListener("pause", finish);
        s.addEventListener("error", finish);
        // If play() never settles (stalled load), free the queue for the next line.
        const stall = setTimeout(finish, 15000);
        s.play()
          .then(() => {
            clearTimeout(stall);
            // Long clips still get a ceiling so the queue can never stick.
            const len = Number.isFinite(s.duration) ? s.duration * 1000 + 3000 : 30000;
            setTimeout(finish, Math.min(len, 60000));
            onStart();
          })
          .catch(finish);
      }),
  );
};

/** Plays a clip from /audio/<language>/<file> (or from storage if it was added on the admin page). */
export function AudioButton({ file, language = "khowar", label = "Play", autoPlay = false }: { file: string; language?: string; label?: string; autoPlay?: boolean }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [missing, setMissing] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setMissing(false);
    if (!file) return setMissing(true);
    let objectUrl: string | null = null;
    let alive = true;
    const a = new Audio(`/audio/${language}/${file}`);
    a.preload = "metadata";
    a.onerror = () => {
      void fetchLessonAudio(`/audio/${language}/${file}`).then((blob) => {
        if (!alive) return;
        if (!blob) {
          release();
          return setMissing(true);
        }
        objectUrl = URL.createObjectURL(blob);
        a.onerror = () => setMissing(true);
        a.src = objectUrl;
      });
    };
    a.onended = () => setPlaying(false);
    ref.current = a;
    let held = false;
    const release = () => {
      if (held) {
        held = false;
        bump(-1);
      }
    };
    let mine = false;
    if (autoPlay) {
      held = true;
      bump(1);
      a.preload = "auto";
      let queued = false;
      const tryPlay = () => {
        if (queued || !alive) return;
        queued = true;
        playWhenFree(
          () => a.src,
          () => alive,
          () => {
            mine = true;
            if (alive) setPlaying(true);
          },
          () => {
            mine = false;
            if (alive) setPlaying(false);
            release();
          },
        );
      };
      if (a.readyState >= 2) tryPlay();
      else {
        a.addEventListener("canplay", tryPlay, { once: true });
        a.addEventListener("loadeddata", tryPlay, { once: true });
        // Some phones never fire load events with a slow connection; try anyway.
        setTimeout(tryPlay, 1200);
      }
    }
    // Never hold the screen for more than 20 seconds (missing or silent clip).
    const guard = setTimeout(release, 20000);
    return () => {
      clearTimeout(guard);
      release();
      alive = false;
      if (mine) stopShared();
      a.pause();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      ref.current = null;
    };
  }, [file, language, autoPlay]);

  if (missing) {
    return (
      <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-4 text-sm font-semibold text-muted-foreground">
        <Clock className="size-4" aria-hidden /> Recording coming soon
      </span>
    );
  }

  return (
    <Button
      variant="audio"
      type="button"
      onClick={() => {
        const a = ref.current;
        if (!a) return;
        stopShared();
        a.currentTime = 0;
        a.play().then(() => setPlaying(true)).catch(() => setMissing(true));
      }}
    >
      <Volume2 className="size-5" aria-hidden /> {playing ? "Playing…" : label}
    </Button>
  );
}
