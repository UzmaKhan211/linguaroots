<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Audio playback controls use the shared Button audio variant so lessons and Dictionary stay visually consistent.
- Lesson content lives as CSV in `src/content/<language>/` and is parsed by `src/lib/content.ts`; screens never hard-code Khowar text, so new scenarios/languages are data changes.
- Each scenario is a unit of three sequential lessons (words from warm_up.csv, phrases from phrases.csv, then the conversation); words and phrases share the `TeachMatch` component and each lesson unlocks the next, so new units only need data.
- Lesson access uses the shared lessonUnlocked rule and LessonAccess wrapper before mounting restricted screens, so direct links cannot trigger playback or rewards for locked lessons; TeachMatch completes only after all matching rounds.
- Coming-soon languages live in `src/lib/languages.ts` as names only; no phrases or lessons behind them.
- Dictionary uses its own CSV parser, consolidating normalized Roman words while retaining all scenario/item/source references for learned badges; dictionary-only CDN audio mappings preserve existing lesson clips with overlapping names. Learned badges derive only from completed warm-up membership because conversation progress does not track which individual lines were skipped.
- Mobile-first shell (`AppShell`, max 440px, 44px+ tap targets); all colours are semantic tokens in `src/styles.css`.
- Pronunciation scoring runs fully in the browser (`src/lib/scoring.ts` pure DSP, `src/lib/audio.ts` browser decode); learner recordings never leave the device.
- Progress is kept on the device and mirrored to the account when signed in (src/lib/progress.ts); on sign-in the two merge, so guests never lose work. Mid-conversation place is saved as line ids and rebuilt with resumeFrom, so lesson edits safely fall back to a fresh start.

- Rewards (XP, streak) are granted by the award_xp database function, with fixed amounts per reward kind; users cannot write XP directly, so totals stay trustworthy. src/lib/rewards.ts only shows a device preview.
- Clips added from /admin live in the private `lesson-audio` storage bucket at <language>/<file>; `src/lib/lessonAudio.ts` falls back to it when a bundled clip is missing, so content stays data.
- Admin access is the `admin` role in `user_roles`, checked with `has_role`; storage writes are gated by that role in policies.
- Profile (/profile) is the home for name, character avatar, language choice and account settings; /settings redirects there. Avatars are bundled character images in `src/assets/avatars/`, registered in `src/lib/avatars.ts`, and stored as an `avatar:<id>` key in `profiles.avatar_path`; no photo uploads.
- Registration destinations are determined by account profile state through `src/lib/signup.ts`, with `/choose-companion` before language choice; this keeps email confirmation and OAuth callbacks consistent across devices without repeating setup for existing learners. Profile edits only persist through its Save changes action.
- Learning screens require a signed-in account via `RequireAccount` (used by AppShell and lesson routes); signed-out visitors go to /welcome. Why: no guest mode, so every learner has synced progress.
