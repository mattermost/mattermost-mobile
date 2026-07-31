# Mobile E2E Skipped Tests Tracker — local update notes

Append-only notes for a human to copy into the
[Mobile E2E Skipped Tests Tracker](https://mattermost.atlassian.net/wiki/spaces/Security/pages/4783538198/Mobile+E2E+Skipped+Tests+Tracker).

## SEC-10781 / Branch 4 — `fix/detox-recovery-hardening-cluster`

- **SEC-10996** (search modifier cascade, MM-T5294_3…_9, iOS) — Owner: QA. Added a
  `beforeEach` recovery that taps the channel-list tab (via SearchMessagesScreen.close())
  to return to a known starting state from wherever the previous case left the app,
  with a ChannelScreen.back() fallback. Unskipped the six collateral cases
  (MM-T5294_4…_9). MM-T5294_3 stays iOS-skipped — it is the cluster root flake
  ("in-search-modifier not hittable", a hit-test issue tracked under Branch 2 /
  SEC-11010/SEC-11017), not fixed by cascade isolation. Verified on iOS (iPhone 17
  Pro / iOS 26.3, 11.10 server): 2x consecutive green for _4…_9, plus an isolation
  proof — a simulated root-flake throw injected into _3 (after its search screen
  opens, leaving it open) made _3 fail while _4…_9 still passed via the recovery.
  Android deferred to CI (no local API-35 emulator).