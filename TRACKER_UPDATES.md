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

## P1 — live per-test Android re-verification (2026-08-05, PR-9996 live servers, flag ON)

Re-ran the four Android residuals reverted in commit 66a260ae7 individually on Android
against a live PR-9996 server (11.10.0), FeatureFlagClassificationMarkings ON (normal
config), API-35 emulator. Each treated as fully independent. The classification-overlay
theory is retracted for all four (that error is caught and swallowed; see
PE_FINDING_classification_values_filter.md).

- **MM-T4865_2** (pin_and_unpin_message, SEC-11015) — **2× green.** Unskipped on Android.
  Passes cleanly under normal config; the prior failure was not reproduced.
- **MM-T5604_1** (channel_bookmarks, SEC-11048) — **2× green.** Unskipped on Android.
  Tapping "Add a link" reaches channel_bookmark.screen and the link title auto-populates;
  prior failure not reproduced.
- **MM-66375** (manage_own_channel_membership, SEC-11049) — **FAIL, kept skipped.** Real
  Android-specific failure: after tapping `channel_info.options.members.option`
  successfully, `manage_members.screen` is never found (polled null for 30s). iOS passes.
  NOT the overlay. Mechanism: the Members tap on Android does not navigate to a screen with
  testID `manage_members.screen` (screen testID differs, or navigation target differs).
  Test-fix/PE territory; needs isolation of which screen actually mounts. Artifact:
  artifacts/android.emu.debug.2026-08-06 14-39-27Z/.
- **MM-T4675_2** (server_login, SEC-11048) — **FAIL, kept skipped.** Real Android failure:
  `channel_list.servers.server_icon` is never found (polled null) during the multi-server
  add/switch/logout flow. NOT the overlay. Test-fix territory (server-list item matcher or
  rendering/timing in the multi-server flow); needs isolation of the exact step. Artifact:
  artifacts/android.emu.debug.2026-08-06 14-51-59Z/.

MM-T4785_3 (message_reply, SEC-11014) is OUT of scope for this pass (separate discarded
scrollElementIntoView change) and remains skipped.
