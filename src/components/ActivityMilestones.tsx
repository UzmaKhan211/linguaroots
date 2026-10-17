import { useEffect, useState } from "react";
import { BookOpen, Check, Flame, MessageCircle, Sprout } from "lucide-react";
import { useRewards } from "@/hooks/useRewards";
import { scenarios } from "@/lib/content";
import { completedCount, isPhrasesDone, isWarmupDone } from "@/lib/progress";
import { summarizeActivity } from "@/lib/activity";

export function ActivityMilestones() {
  const { xp, activeStreak } = useRewards();
  const [activity, setActivity] = useState(() => summarizeActivity([]));
  useEffect(() => {
    const refresh = () => setActivity(summarizeActivity(scenarios.map((s) => ({ words: isWarmupDone(s.id), phrases: isPhrasesDone(s.id), conversations: completedCount(s.id) }))));
    refresh();
    window.addEventListener("lr:progress", refresh);
    return () => window.removeEventListener("lr:progress", refresh);
  }, []);
  const milestones = [
    { label: "First words lesson", done: activity.words, Icon: BookOpen },
    { label: "First phrases lesson", done: activity.phrases, Icon: Sprout },
    { label: "First conversation", done: activity.talked, Icon: MessageCircle },
  ];
  return (
    <section className="mt-8 scroll-mt-[calc(5rem+env(safe-area-inset-top))]" aria-labelledby="activity-title">
      <h2 id="activity-title" className="text-lg font-semibold">Activity &amp; Milestones</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 border-y py-5">
        {[
          { value: xp.toLocaleString(), label: "Total XP", Icon: Sprout, tone: "text-primary" },
          { value: activeStreak, label: "Day streak", Icon: Flame, tone: "text-accent" },
          { value: activity.lessons, label: "Lessons completed", Icon: BookOpen, tone: "text-bark" },
          { value: activity.conversations, label: "Conversations finished", Icon: MessageCircle, tone: "text-primary" },
        ].map(({ value, label, Icon, tone }) => (
          <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className={`mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums ${tone}`}><Icon className="size-5" aria-hidden />{value}</dd></div>
        ))}
      </dl>
      <ul className="mt-4 space-y-3">
        {milestones.map(({ label, done, Icon }) => (
          <li key={label} className="flex items-center gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${done ? "bg-leaf-soft text-primary" : "bg-muted text-muted-foreground"}`}><Icon className="size-5" aria-hidden /></span>
            <span className="flex-1 text-sm font-bold">{label}</span>
            {done ? <span className="flex items-center gap-1 text-sm font-bold text-primary"><Check className="size-4" aria-hidden />Done</span> : <span className="text-xs text-muted-foreground">Not yet</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}