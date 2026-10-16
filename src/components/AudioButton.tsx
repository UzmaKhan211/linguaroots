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
const playWhenFree = (a: HTMLAudioElement, alive: () => boolean, onStart: () => void, onDone: () => void) => {
  autoQueue = autoQueue.then(
    () =>
      new Promise<void>((done) => {
        if (!alive()) {
          onDone();
          return done();
        }
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(stall);
          onDone();
          done();
        };
        a.addEventListener("ended", finish, { once: true });
        a.addEventListener("pause", finish, { once: true });
        // If play() never settles (stalled load), free the queue for the next line.
        const stall = setTimeout(finish, 15000);
        a.play().then(() => {
          clearTimeout(stall);
          onStart();
        }).catch(finish);
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
    if (autoPlay) {
      held = true;
      bump(1);
      a.addEventListener("ended", release, { once: true });
      const tryPlay = () =>
        playWhenFree(a, () => alive, () => alive && setPlaying(true), release);
      if (a.readyState >= 2) void tryPlay();
      else a.addEventListener("canplay", () => alive && void tryPlay(), { once: true });
    }
    // Never hold the screen for more than 20 seconds (missing or silent clip).
    const guard = setTimeout(release, 20000);
    return () => {
      clearTimeout(guard);
      release();
      alive = false;
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
        a.currentTime = 0;
        a.play().then(() => setPlaying(true)).catch(() => setMissing(true));
      }}
    >
      <Volume2 className="size-5" aria-hidden /> {playing ? "Playing…" : label}
    </Button>
  );
}
