# Mobile E2E Skipped Tests Tracker — local update notes

Append-only notes for a human to copy into the
[Mobile E2E Skipped Tests Tracker](https://mattermost.atlassian.net/wiki/spaces/Security/pages/4783538198/Mobile+E2E+Skipped+Tests+Tracker).

## SEC-10781 / Branch 3 — `fix/mobile-e2e-diagnosis-cluster`

- **SEC-11046** (MM-T3196_1 manage-members) — Owner: QA-pending classification,
  no fix landed. RETRACTS the first-pass "reporting artifact" claim. Direct shard-level
  evidence (from the shard's own log, not the aggregate rollup): MM-T3196_1 GENUINELY
  FAILS on both platforms — iOS 30437339535 machine-7-os-iOS (job 90536293389) and
  Android 30447839548 machine-7-api-35 (job 90566569840) each show "MM-T3196_1 [FAIL]",
  "Tests: 1 failed", exit code 1, yet both GitHub job conclusions are 'success'. The
  iOS failure-time viewHierarchy shows the app on the CHANNEL LIST (not the channel
  screen) while the test waits for the "X was removed from the channel" system message
  in post_list. Mechanism: after removing a member the app lands on the channel list,
  not the channel screen, so the removal message is absent and the wait times out; the
  toBeVisible→waitForElementToExist swap didn't help (message genuinely absent). CI-infra
  anomaly flagged for a separate follow-up: the machine-7 shard jobs are marked
  'success' despite exit code 1 + a failing test — the job conclusion does NOT gate on
  the Detox step exit code (could misreport other failing tests). QA vs PE: undetermined
  without a live run — code hypothesis is that the removal confirm auto-dismisses the
  manage-members sheet, making the test's explicit close() an extra pop to channel list
  (QA); if not, the app's close() over-pops (PE). Next step: a live repro on a stable
  server (iOS) to confirm the auto-dismiss and apply the matching fix. Test stays
  skipped (rule 6).

- **SEC-11047** (classification banner Android suite, MM-T6209_1…MM-T6213_1) —
  Owner: QA-pending env investigation. Status: the observe()/observeSavedPostsByIds
  theory is RULED OUT (suite passed both with and without those app changes; failed
  on only one of three runs with identical code — same code, opposite outcomes). The
  suite's UI flow only navigates and asserts a banner; the suite still sets up
  classification via API and creates posts, so this does not by itself rule out a
  product cause. The 20-min classification lock / 30-min Jest timeout makes lock
  contention / slow acquire a plausible mechanism. Local repro blocked (no API-35
  emulator + ephemeral server torn down). Next step: diff the Android env (emulator
  state, ordering, prior specs in the shard) between passing 30437339535 and failing
  30447839548, and check lock-acquire timing. Suite stays describe.skip on Android
  (rule 6). No code change beyond the skip comment.

- **SEC-11016** (offline setURLBlacklist does not block WebSocket, MM-T6207_1) —
  Owner: QA (test infra). Spike write-up (no unskip): Detox device.setURLBlacklist
  fails NEW URL-based requests, but the WebSocket is a long-lived socket already OPEN
  by the time the blacklist is applied (it connects after login); the blacklist does
  not close an established socket, so the server keeps pushing the new classification
  value over the WS and the app cache updates while the test believes the network is
  cut — the stale-value assertion is untrustworthy. Proposed approaches: (1) apply
  setURLBlacklist before launchApp / before the WS opens so the WS handshake itself
  is blocked; (2) a native network-level cut (simulator network conditioner / DNS) that
  severs HTTP + WS; (3) an app-side test hook that disables WS under E2E. Test stays
  it.skip until one approach is proven. No code change beyond the spike comment.