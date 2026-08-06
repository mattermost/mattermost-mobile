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

  **Cross-branch split (6/6 unskipped):** SEC-11015's 6 tracked tests are MM-T1750,
  MM-T4784_3, MM-T4865_2, MM-T373, MM-T5294_10, MM-T250_1. The 5 iOS unskips above
  landed on this branch (commit c5c8fc086); the 6th, MM-T250_1, was unskipped under
  SEC-10993 (same shared NavigationHeader.tapBackButton mechanism) -- so all 6 are
  unskipped, attributed across SEC-11015 (5) and SEC-10993 (1, MM-T250_1). The ANDROID
  unskip for MM-T4865_2 (verified 2x green on Android, live PR-9996 server 11.10.0, flag
  ON) landed on a sibling branch fix/detox-android-back-index-gap (commit 30df89dd8) --
  the same test iOS-unskipped here. The two branches are complementary, not duplicate:
  iOS unskips here, the Android MM-T4865_2 unskip there. The other 4 Android cases
  (MM-T1750, MM-T4784_3, MM-T373, MM-T5294_10) remain Android-deferred-to-CI as above.

- **SEC-11049** (duplicate user_item + visibility thresholds, 6 tests; was mis-tagged
  Feature/PE) — Owner: QA for all six.
  - Unskipped (verified 2× green iOS): MM-T4730_2, MM-T4730_3 (create_direct_message),
    MM-66375 (manage_own_channel_membership). Matchers are unambiguous on iOS once the
    search spinner is ridden out via waitFor; skips were stale.
  - Kept Android-gated (rule 6: can't verify Android locally — no API-35 emulator),
    re-classified to QA with the mechanism named in the skip comment, verification
    pending CI / a local Android emulator: MM-T4730_4 (empty-state text <50% on-screen,
    Android edge-to-edge insets — body already uses toExist()), MM-T63374 (deactivated-
    user search list item matcher / No-matches text <50%), MM-T1719_1 (manageButton <15%
    on-screen after archive — fix shape: toExist() on Android).
  - No shared visibility helper landed: the only threshold cases are Android-only and
    unverifiable here; deferred to when Android can be run (overlaps SEC-11014/SEC-11048).