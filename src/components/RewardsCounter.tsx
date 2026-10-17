import { Flame, Sprout, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useRewards } from "@/hooks/useRewards";
import { XP } from "@/lib/rewards";

export function RewardsCounter() {
  const { xp, activeStreak } = useRewards();
  return (
    <Drawer>
      <div className="flex shrink-0 items-center gap-1.5" aria-label="Practice activity">
        <DrawerTrigger asChild>
          <Button variant="ghost" aria-label={`${activeStreak} day streak. About streaks`} className="h-11 rounded-full bg-clay-soft px-3 font-bold text-accent hover:bg-clay-soft hover:text-accent">
            <Flame aria-hidden /> <span className="tabular-nums">{activeStreak}</span>
          </Button>
        </DrawerTrigger>
        <DrawerTrigger asChild>
          <Button variant="ghost" aria-label={`${xp} XP. About XP`} className="h-11 rounded-full bg-leaf-soft px-3 font-bold text-primary hover:bg-leaf-soft hover:text-primary">
            <Sprout aria-hidden /> <span className="tabular-nums">{xp.toLocaleString()} XP</span>
          </Button>
        </DrawerTrigger>
      </div>
      <DrawerContent className="mx-auto max-h-[85dvh] max-w-[440px] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="relative pr-16 text-left">
          <DrawerTitle className="font-display text-2xl">Your practice adds up</DrawerTitle>
          <DrawerDescription>Every word and conversation counts.</DrawerDescription>
          <DrawerClose asChild><Button variant="ghost" size="icon" aria-label="Close activity" className="absolute right-3 top-3 size-11 rounded-full"><X aria-hidden /></Button></DrawerClose>
        </DrawerHeader>
        <div className="space-y-5 px-4">
          <section>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-primary"><Sprout className="size-5" aria-hidden /> {xp.toLocaleString()} XP</h3>
            <p className="mt-2 text-sm text-muted-foreground">XP records your practice. It stays with you, even after a break.</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt>Finish a words or phrases lesson</dt><dd className="shrink-0 font-bold">+{XP.warmup} XP</dd></div>
              <div className="flex justify-between gap-3"><dt>Say a conversation line correctly</dt><dd className="shrink-0 font-bold">+{XP.line} XP</dd></div>
              <div className="flex justify-between gap-3"><dt>Finish a conversation</dt><dd className="shrink-0 font-bold">+{XP.scenario} XP</dd></div>
            </dl>
          </section>
          <section className="border-t pt-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-accent"><Flame className="size-5" aria-hidden /> {activeStreak} {activeStreak === 1 ? "day" : "days"} in a row</h3>
            <p className="mt-2 text-sm text-muted-foreground">Practice on consecutive days to keep your streak going. You can repeat a lesson. After a missed day, your next practice starts a new streak at 1.</p>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}