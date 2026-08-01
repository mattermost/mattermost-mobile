# Mobile E2E Skipped Tests Tracker — local update notes

Append-only notes for a human to copy into the
[Mobile E2E Skipped Tests Tracker](https://mattermost.atlassian.net/wiki/spaces/Security/pages/4783538198/Mobile+E2E+Skipped+Tests+Tracker).

## SEC-10781 / Branch 3 — `fix/mobile-e2e-diagnosis-cluster`

- **SEC-11046** (MM-T3196_1 manage-members, existing fix disproven) — Owner: QA-pending
  classification, no fix landed. Investigation: the cited run 30447839548's Detox
  Android machine shards ALL passed (gh-verified) — only the aggregate `detox-android`
  job failed, which looks like a reporting/TSIO issue, not a MM-T3196_1 failure. So
  the failure mechanism is unconfirmed in the available CI artifacts. Local repro is
  blocked (ephemeral test server torn down; no local API-35 emulator). The
  toBeVisible→waitForElementToExist swap was disproven and is NOT re-applied. Next
  step: a fresh repro on a stable server + Android emulator to capture the real
  artifact, then classify QA vs PE. Test stays skipped (rule 6).

- **SEC-11047** (classification banner Android suite, MM-T6209_1…MM-T6213_1) —
  Owner: QA-pending env investigation. Status: the observe()/observeSavedPostsByIds
  theory is RULED OUT (suite passed both with and without those app changes; failed
  on only one of three runs with identical code — same code, opposite outcomes). The
  suite only taps tabs and asserts a banner (never writes a preference), so a product
  change is unlikely. The 20-min classification lock / 30-min Jest timeout makes lock
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