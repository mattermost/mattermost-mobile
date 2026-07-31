# Mobile E2E Skipped Tests Tracker — local update notes

Append-only notes for a human to copy into the
[Mobile E2E Skipped Tests Tracker](https://mattermost.atlassian.net/wiki/spaces/Security/pages/4783538198/Mobile+E2E+Skipped+Tests+Tracker).

## SEC-10781 / Branch 1 — `fix/detox-matcher-visibility-cluster`

- **SEC-10993** (MM-T851, BACK_INDEX) — Owner: QA. Unskipped MM-T851 and MM-T250_1.
  Mechanism: `navigation.header.back` matched multiple stacked headers (expo-router
  keeps dismissed screens mounted off-screen). Fix: shared `NavigationHeader.tapBackButton(index)`
  helper; `ThreadScreen.back()` routes through it (index 1→0), `ChannelScreen.back()` uses
  `tapBackButton(0)` (base screen). Verified 6× green on iOS (iPhone 17 Pro / iOS 26.3,
  server 11.10) — 3× baseline + 3× post-fix for each test. Android deferred to CI
  (no local API-35 emulator image). Helper is the shared API SEC-11015 will reuse.

- **SEC-11015** (remaining BACK_INDEX cluster) — Owner: QA. Unskipped MM-T1750,
  MM-T4784_3, MM-T4865_2, MM-T373, MM-T5294_10 (MM-T250_1 was unskipped under
  SEC-10993). All six share the ThreadScreen.back()→ChannelScreen.back()
  duplicate-`navigation.header.back` mechanism and are fixed by the shared
  `NavigationHeader.tapBackButton` helper landed in SEC-10993 — no second helper
  was needed. Verified 2× green on iOS for all five newly-unskipped cases
  (server 11.10). MM-T5294_10 also tracked under SEC-10996 (cascade isolation,
  separate mechanism) — left unskipped here on back-index; re-skip + defer to
  SEC-10996 if it regresses on cascade. Android deferred to CI.