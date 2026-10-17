import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeachMatch } from "./TeachMatch";
import { getPhrases, getScenario, getWarmup } from "@/lib/content";

const { wordsDone, phrasesDone, navigate, earn } = vi.hoisted(() => ({
  wordsDone: vi.fn(), phrasesDone: vi.fn(), navigate: vi.fn(), earn: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>, useNavigate: () => navigate }));
vi.mock("@/components/AppShell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/progress", () => ({ markWarmupDone: wordsDone, markPhrasesDone: phrasesDone }));
vi.mock("@/lib/rewards", () => ({ earn }));
vi.mock("@/lib/sfx", () => ({ playCelebrate: vi.fn(), playCorrect: vi.fn(), playIncorrect: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("lesson completion", () => {
  for (const kind of ["words", "phrases"] as const) {
    it(`completes ${kind} only after every matching round in Unit 2`, () => {
      const scenario = getScenario("grandft_inperson_meeting");
      if (!scenario) throw new Error("Unit 2 missing");
      const items = kind === "words" ? getWarmup(scenario.id) : getPhrases(scenario.id);
      render(<TeachMatch scenario={scenario} items={items} kind={kind} />);
      expect(wordsDone).not.toHaveBeenCalled();
      expect(phrasesDone).not.toHaveBeenCalled();
      let paired = 0;
      for (let round = 0; round < items.length; round++) {
        while (screen.queryByRole("button", { name: kind === "words" ? "Next word" : "Next phrase" })) {
          fireEvent.click(screen.getByRole("button", { name: kind === "words" ? "Next word" : "Next phrase" }));
        }
        fireEvent.click(screen.getByRole("button", { name: "Let's pair them" }));
        const kh = screen.getByRole("list", { name: kind === "words" ? "Khowar words" : "Khowar phrases" });
        const en = screen.getByRole("list", { name: "Meanings" });
        for (const button of within(kh).getAllByRole("button")) {
          const text = button.textContent?.trim();
          const item = items.find((i) => i.roman.trim() === text);
          if (!item) throw new Error("Matching item missing");
          fireEvent.click(button);
          fireEvent.click(within(en).getByRole("button", { name: item.english, exact: true }));
          paired++;
        }
        expect(wordsDone).not.toHaveBeenCalled();
        expect(phrasesDone).not.toHaveBeenCalled();
        if (paired === items.length) break;
        fireEvent.click(screen.getByRole("button", { name: kind === "words" ? "Next words" : "Next phrases" }));
      }
      expect(paired).toBe(items.length);
      fireEvent.click(screen.getByRole("button", { name: kind === "words" ? "Go to Lesson 2: Phrases" : "Go to Lesson 3: Conversation" }));
      expect(kind === "words" ? wordsDone : phrasesDone).toHaveBeenCalledExactlyOnceWith(scenario.id);
      expect(earn).toHaveBeenCalledExactlyOnceWith("warmup");
    });
  }
});