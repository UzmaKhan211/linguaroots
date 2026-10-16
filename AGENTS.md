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
- Lesson content lives as CSV in `src/content/<language>/` and is parsed by `src/lib/content.ts`; screens never hard-code Khowar text, so new scenarios/languages are data changes.
- Coming-soon languages live in `src/lib/languages.ts` as names only; no phrases or lessons behind them.
- Mobile-first shell (`AppShell`, max 440px, 44px+ tap targets); all colours are semantic tokens in `src/styles.css`.
- Pronunciation scoring runs fully in the browser (`src/lib/scoring.ts` pure DSP, `src/lib/audio.ts` browser decode); learner recordings never leave the device.
- Progress is kept on the device and mirrored to the account when signed in (src/lib/progress.ts); on sign-in the two merge, so guests never lose work.

- Rewards (XP, streak) follow the same device-first, mirror-to-account pattern in src/lib/rewards.ts; amounts and streak rules are pure functions with tests.
- Clips added from /admin live in the private `lesson-audio` storage bucket at <language>/<file>; `src/lib/lessonAudio.ts` falls back to it when a bundled clip is missing, so content stays data.
- Admin access is the `admin` role in `user_roles`, checked with `has_role`; storage writes are gated by that role in policies.
