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
  (MM-T1750, MM-T4784_3, MM-T4865_2, MM-T373, MM-T5294_10) landed on
  `fix/detox-matcher-visibility-cluster` (commit c5c8fc086); the 6th, MM-T250_1, was
  unskipped under SEC-10993 (same shared `NavigationHeader.tapBackButton` mechanism) —
  so all 6 are unskipped, attributed across SEC-11015 (5) and SEC-10993 (1, MM-T250_1).
  This branch (`fix/detox-android-back-index-gap`, commit 30df89dd8) adds the ANDROID
  unskip for MM-T4865_2 (verified 2x green on Android, live PR-9996 server 11.10.0, flag
  ON) — the same test that was iOS-unskipped on `fix/detox-matcher-visibility-cluster`.
  The two branches are complementary, not duplicate: iOS unskips there, the Android
  MM-T4865_2 unskip here. The other 4 Android cases (MM-T1750, MM-T4784_3, MM-T373,
  MM-T5294_10) remain Android-deferred-to-CI as in wave 1.

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
- **MM-66375** (manage_own_channel_membership, SEC-11049) — **UNSKIPPED, 2x green**
  (2026-08-06). The earlier FAIL was re-checked against the ticket's own documented cause
  ("tutorial pressBack on API 35 — a test-flow issue, not product"). The device.log from
  the failing run showed the onboarding tutorial (`tutorial_highlight`, a React Native
  Modal) was present and stole Espresso's window focus, so `manage_members.screen` was
  not matchable. The previous test order called `closeTutorial()` AFTER `open()`'s
  `toBeVisible`, which threw first. Fix: dismiss the tutorial inside
  `ManageChannelMembersScreen.open()` (after the members tap, before `toBeVisible`).
  `open()` is only called by this test, so the blast radius is one test. Verified 2x green
  on Android (API-35 emulator, live PR-9996 server 11.10.0, flag ON). The
  classification-overlay theory is retracted; the product/screen-testID theory from the
  prior report is also retracted (the tutorial, not a testID mismatch, was the blocker).

  **Both-platforms update (2026-08-07):** re-ran MM-66375 on iOS (iPhone 17 Pro / iOS 26.3,
  fresh v793 binary, live server) 2x green. The `open()` reorder runs unconditionally on iOS
  too; on iOS no tutorial is present and `closeTutorial()` is a no-op there (verified, not
  assumed) — no timing issue introduced. MM-66375 is CLOSED on BOTH platforms (Android 2x
  green + iOS 2x green). NOTE: SEC-11049 as a whole is still PARTIAL (this is MM-66375's
  contribution toward it; the other SEC-11049 tests remain as documented) — do not mark
  SEC-11049 closed.
- **MM-T4675_2** (server_login, SEC-11048) — **FAIL, kept skipped.** Real Android failure:
  `channel_list.servers.server_icon` is never found (polled null) during the multi-server
  add/switch/logout flow. NOT the overlay. **Timing evidence vs the ticket:** the ticket's
  documented mechanism for MM-T4675_2 is "add-server/login/logout exceeds the 300s Jest
  timeout." The local failure ran only 37.3s before failing (Jest timeout is 240s locally /
  300s in CI) — far from the timeout, so the local icon-not-found is a genuinely separate
  failure mode from the CI 300s-timeout symptom, not what a near-timeout looks like. This
  is new evidence distinguishing the local failure from the documented CI symptom.
  Test-fix territory (server-list item matcher or rendering/timing in the multi-server
  flow); needs isolation of the exact step. Artifact: artifacts/android.emu.debug.2026-08-06
  14-51-59Z/.

### SEC-11048 remaining two tests (2026-08-06, live PR-9996 servers, flag ON)

- **MM-T4774_5** (smoke_test/channels.e2e.ts, iOS) — **UNSKIPPED, 2x green.** The
  waitFor-polling fix added after CI 30437339535 (never exercised because its shard was
  cancelled) works on iOS. Verified 2x green on iPhone 17 Pro / iOS 26.3 with the fresh
  v793 binary against a live PR-9996 server (11.10.0). Android already passes.
- **MM-T4886_4** (smoke_test/autocomplete.e2e.ts, Android) — **FAIL, kept skipped.**
  Re-verified live on API-35 / live PR-9996 server 11.10.0: still FAILS, matching the CI
  30424009936 symptom — after typing "/", `Autocomplete.toBeVisible`
  (waitFor autocomplete.atIndex(0) toBeVisible(1), 10s) times out; the slash autocomplete
  never becomes visible on Android. Test ran 17s (not a Jest timeout). iOS passes. Owner:
  QA/PE — the slash autocomplete does not render on Android; needs isolation of whether
  the autocomplete component mounts at all on Android (test-fix) or a product rendering
  issue. Kept skipped. Artifact: artifacts/android.emu.debug.2026-08-06 16-26-02Z/.

**SEC-11048 per-test verdict (all 4 tracked tests):** MM-T5604_1 = unskipped (2x green
Android); MM-T4675_2 = FAIL kept skipped (Android, separate failure mode from the CI
300s-timeout, new evidence); MM-T4774_5 = unskipped (2x green iOS); MM-T4886_4 = FAIL kept
skipped (Android, matches CI symptom). 2/4 green-and-unskipped, 2/4 documented-and-skipped
with real mechanisms. SEC-11048 is NOT fully closed (2 Android failures remain, both with
isolated mechanisms and artifacts).

MM-T4785_3 (message_reply, SEC-11014) is OUT of scope for this pass (separate discarded
scrollElementIntoView change) and remains skipped.
