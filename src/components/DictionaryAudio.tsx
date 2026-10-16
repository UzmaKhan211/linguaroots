import { useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DictionaryAudio({ url, word }: { url: string; word: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const clip = new Audio(url);
    clip.preload = "none";
    clip.onended = () => setPlaying(false);
    clip.onpause = () => setPlaying(false);
    clip.onerror = () => { setFailed(true); setPlaying(false); };
    audio.current = clip;
    const stopOthers = (event: Event) => {
      if ((event as CustomEvent<HTMLAudioElement>).detail !== clip) clip.pause();
    };
    window.addEventListener("lr:dictionary-audio", stopOthers);
    return () => { clip.pause(); audio.current = null; window.removeEventListener("lr:dictionary-audio", stopOthers); };
  }, [url]);

  return <div>
    <Button variant="ghost" className="min-h-11 rounded-full bg-bark px-4 text-primary-foreground hover:bg-bark/90 hover:text-primary-foreground" aria-label={`${playing ? "Stop" : "Hear"} ${word}`} onClick={() => {
      const clip = audio.current;
      if (!clip) return;
      if (playing) { clip.pause(); return; }
      setFailed(false);
      window.dispatchEvent(new CustomEvent("lr:dictionary-audio", { detail: clip }));
      clip.currentTime = 0;
      void clip.play().then(() => setPlaying(true)).catch(() => { setFailed(true); setPlaying(false); });
    }}>
      {playing ? <Square aria-hidden /> : <Volume2 aria-hidden />} {playing ? "Playing" : "Hear it"}
    </Button>
    {failed && <p role="status" className="mt-2 text-sm text-muted-foreground">Couldn't play. Tap to try again.</p>}
  </div>;
}