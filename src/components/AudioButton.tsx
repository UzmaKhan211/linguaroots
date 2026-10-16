import { useEffect, useRef, useState } from "react";
import { Volume2, Clock } from "lucide-react";

/** Plays a clip from /audio/<language>/<file>. Shows "recording coming soon" when the clip isn't there yet. */
export function AudioButton({ file, language = "khowar", label = "Play" }: { file: string; language?: string; label?: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [missing, setMissing] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setMissing(false);
    if (!file) return setMissing(true);
    const a = new Audio(`/audio/${language}/${file}`);
    a.preload = "metadata";
    a.onerror = () => setMissing(true);
    a.onended = () => setPlaying(false);
    ref.current = a;
    return () => {
      a.pause();
      ref.current = null;
    };
  }, [file, language]);

  if (missing) {
    return (
      <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-4 text-sm font-semibold text-muted-foreground">
        <Clock className="size-4" aria-hidden /> Recording coming soon
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        const a = ref.current;
        if (!a) return;
        a.currentTime = 0;
        a.play().then(() => setPlaying(true)).catch(() => setMissing(true));
      }}
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary px-4 font-bold text-secondary-foreground"
    >
      <Volume2 className="size-5" aria-hidden /> {playing ? "Playing…" : label}
    </button>
  );
}
