import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isPhrasesDone, isWarmupDone, lessonUnlocked } from "@/lib/progress";

/** Check device progress before mounting a lesson or starting its effects. */
export function LessonAccess({ scenarioId, lesson, children }: { scenarioId: string; lesson: 2 | 3; children: ReactNode }) {
  const navigate = useNavigate();
  const [allowedId, setAllowedId] = useState<string | null>(null);
  useEffect(() => {
    if (lessonUnlocked(lesson, isWarmupDone(scenarioId), isPhrasesDone(scenarioId))) {
      setAllowedId(scenarioId);
    } else {
      setAllowedId(null);
      void navigate({ to: "/scenario/$scenarioId", params: { scenarioId }, replace: true });
    }
  }, [scenarioId, lesson, navigate]);
  return allowedId === scenarioId ? children : null;
}