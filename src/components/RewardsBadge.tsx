import { useEffect, useState } from "react";
import { Flame, Sprout } from "lucide-react";
import { dayKey, displayStreak, getRewards, type Rewards } from "@/lib/rewards";

/** Warm, quiet encouragement — XP and practice days, never a scoreboard. */
export function RewardsBadge({ className = "" }: { className?: string }) {
  const [r, setR] = useState<Rewards | null>(null);
  useEffect(() => {
    setR(getRewards());
    const on = (e: Event) => setR((e as CustomEvent<Rewards>).detail);
    window.addEventListener("lr:rewards", on);
    return () => window.removeEventListener("lr:rewards", on);
  }, []);
  if (!r) return null;
  const streak = displayStreak(r, dayKey());
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-leaf-soft px-3 text-sm font-bold text-primary">
        <Sprout className="size-4" aria-hidden /> {r.xp} XP
      </span>
      <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-clay-soft px-3 text-sm font-bold text-accent">
        <Flame className="size-4" aria-hidden />
        {streak > 1 ? `${streak} days in a row` : streak === 1 ? "You practiced today" : "Practice today to start"}
      </span>
    </div>
  );
}
