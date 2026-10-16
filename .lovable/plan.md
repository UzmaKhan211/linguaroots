# LinguaRoots build plan

I read the PRD. The core of the app is the learner flow: pick a situation, do the warm-up, have the conversation with audio, then say your reply. Build that first. Accounts, rewards and admin tools come after it works.

## What I need from you (before Phase 1)
- Logo file and colour ideas (upload them here)
- The Scenarios and Turns tables (CSV or spreadsheet)
- The audio clips, or wait until the admin upload page in Phase 5
- The PRD's design/tone section reads as cut off ("The feeling should be..."). Paste the full text if it says more.

## Phases (we stop after each one so you can test)

**Phase 1 - Look and content**
Set up colours, fonts and logo for a 390px phone screen. Load the two scenarios from your data files, so the screens never contain Khowar written into them by hand. Build Home with the situation cards and the Languages screen (Khowar live, others marked coming soon).

**Phase 2 - Warm-up and conversation (works without a microphone)**
- Warm-up: a learn card for each item, then tap questions. Wrong answers use only other real items from your data. Finishing it once unlocks the conversation.
- Conversation: chat bubbles with Roman Khowar large and English below, a play button, 1 to 3 reply cards, branches, a gentle note on less-fitting choices, and a warm finish screen.
- The self-check ("did that sound close?") works from day one.

**Phase 3 - Say-it step and closeness score**
Record on the phone, play back your recording, play the example, and see a closeness percentage worked out on the device. Your recording is never uploaded. A hidden /lab page sets the two scoring settings from your recordings. Must be tested on the preview link, because the microphone needs a secure connection.

**Phase 4 - Onboarding, accounts and saved progress**
Turn on Lovable Cloud. Add a warm onboarding of about a minute with one line to try, an over-13 confirmation, and a choice of relative. Sign in with email, Google or Apple, plus guest mode. Guest progress moves into the new account. Settings has replay onboarding, sign out and delete account. Each person can see only their own data.

**Phase 5 - XP, streak, interest and admin**
- XP for warm-ups, lines and finished scenarios. XP never goes down.
- A daily streak that goes back to 1, not 0, after a missed day.
- Tapping a coming-soon language records interest.
- A hidden admin page, open only to your account, to upload audio and list missing clips.

**Phase 6 - Polish and demo check**
Go through the PRD's success list on a phone using the published link.

## Hard rules applied everywhere
- No invented or AI-generated Khowar.
- Never call a reply "right" or "wrong".
- Recordings stay on the device.
- The app always works without scoring.
- No fake content for other languages.

## Technical notes
- Content lives in typed JSON/CSV data modules (scenarios, turns, warm-up items built from the turns). The branching engine is a pure function with unit tests.
- Audio files are stored in Cloud and named by line id. Until Phase 5, missing clips show a "recording coming soon" state.
- Scoring runs in the browser: MFCC-style features, DTW alignment, then a percentage set by two calibrated values stored in config. The pass mark is 70%.
- Tables: profiles (with xp, streak, last_active_day), learner_languages, scenario_progress, turn_attempts, languages, language_interest, user_roles for admin. RLS on every table.
