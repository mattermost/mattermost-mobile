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

- **SEC-10992** (dismissOptionsSheet hardening, MM-T69455_1 iOS + MM-T5725_1 Android)
  — Owner: QA. Hardened ChannelBookmarkScreen.dismissOptionsSheet with bounded fallback
  dismissal + assert-gone-between-attempts: iOS does a second swipe-down if the first
  didn't clear; Android does a swipe-down fallback after system back; throws if the
  sheet still won't unmount after a legitimate dismiss (no unbounded retries). Zero
  regression risk — the only two callers are the two skipped tests. Both tests stay
  skipped: the documented mechanism (Edit/sheet left in tree) is CI-observed
  (29cdff/59ec6ae/ce729d/bc6df62/a4c0e33) but the local iOS repro of MM-T69455_1 was
  contaminated by an ephemeral-server session loss (artifact: app on the server-connect
  screen mid-test, not the sheet-dismiss mechanism), and there is no local API-35
  emulator for MM-T5725_1. Hardening is staged pending CI verification on a stable
  server; tsc + lint clean. (Closed PR #9893 had the earlier swipe fix; this extends it.)