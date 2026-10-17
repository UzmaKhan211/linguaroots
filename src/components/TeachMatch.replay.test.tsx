import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeachMatch } from "./TeachMatch";
import { getScenario, getWarmup } from "@/lib/content";
import { completedCount, isPhrasesDone, isWarmupDone, lessonUnlocked, markPhrasesDone, markScenarioCompleted, markWarmupDone } from "@/lib/progress";

vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>, useNavigate: () => vi.fn() }));
vi.mock("@/components/AppShell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } } }));
vi.mock("@/lib/rewards", () => ({ earn: vi.fn(), syncRewards: vi.fn() }));
vi.mock("@/lib/sfx", () => ({ playCelebrate: vi.fn(), playCorrect: vi.fn(), playIncorrect: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("completed lessons stay available during replay", () => {
  for (const finishedConversation of [false, true]) {
    it(`preserves later lessons after ${finishedConversation ? "all three lessons" : "Lesson 2"} when Lesson 1 is restarted and completed again`, () => {
      const id = "grandma-phone-call";
      const otherId = "grandft_inperson_meeting";
      const scenario = getScenario(id);
      if (!scenario) throw new Error("Unit 1 missing");
      const items = getWarmup(id);
      markWarmupDone(id);
      markPhrasesDone(id);
      if (finishedConversation) markScenarioCompleted(id);

      const assertAccess = () => {
        expect(isWarmupDone(id)).toBe(true);
        expect(isPhrasesDone(id)).toBe(true);
        expect(lessonUnlocked(2, isWarmupDone(id), isPhrasesDone(id))).toBe(true);
        expect(lessonUnlocked(3, isWarmupDone(id), isPhrasesDone(id))).toBe(true);
        expect(completedCount(id)).toBe(finishedConversation ? 1 : 0);
        expect(lessonUnlocked(1, isWarmupDone(otherId), isPhrasesDone(otherId))).toBe(true);
        expect(isWarmupDone(otherId)).toBe(false);
        expect(isPhrasesDone(otherId)).toBe(false);
      };

      const first = render(<TeachMatch scenario={scenario} items={items} kind="words" />);
      fireEvent.click(screen.getByRole("button", { name: "Next word" }));
      assertAccess();
      first.unmount();
      render(<TeachMatch scenario={scenario} items={items} kind="words" />);
      assertAccess();

      let paired = 0;
      while (paired < items.length) {
        while (screen.queryByRole("button", { name: "Next word" })) {
          fireEvent.click(screen.getByRole("button", { name: "Next word" }));
        }
        fireEvent.click(screen.getByRole("button", { name: "Let's pair them" }));
        const kh = screen.getByRole("list", { name: "Khowar words" });
        const en = screen.getByRole("list", { name: "Meanings" });
        for (const button of within(kh).getAllByRole("button")) {
          const item = items.find((i) => i.roman.trim() === button.textContent?.trim());
          if (!item) throw new Error("Matching item missing");
          fireEvent.click(button);
          fireEvent.click(within(en).getByRole("button", { name: item.english }));
          paired++;
        }
        assertAccess();
        if (paired < items.length) fireEvent.click(screen.getByRole("button", { name: "Next words" }));
      }
      fireEvent.click(screen.getByRole("button", { name: "Go to Lesson 2: Phrases" }));
      assertAccess();
    });
  }
});