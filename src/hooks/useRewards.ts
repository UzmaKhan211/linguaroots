import { useEffect, useState } from "react";
import { dayKey, displayStreak, getRewards, type Rewards } from "@/lib/rewards";

export function useRewards() {
  const [rewards, setRewards] = useState<Rewards>({ xp: 0, streak: 0, lastDay: null });
  const [today, setToday] = useState(dayKey);
  useEffect(() => {
    const refresh = () => { setRewards(getRewards()); setToday(dayKey()); };
    refresh();
    window.addEventListener("lr:rewards", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener("lr:rewards", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);
  return { ...rewards, activeStreak: displayStreak(rewards, today) };
}