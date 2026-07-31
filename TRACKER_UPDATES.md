# Mobile E2E Skipped Tests Tracker — local update notes

Append-only notes for a human to copy into the
[Mobile E2E Skipped Tests Tracker](https://mattermost.atlassian.net/wiki/spaces/Security/pages/4783538198/Mobile+E2E+Skipped+Tests+Tracker).

## SEC-10781 / Branch 2 — `fix/detox-hittest-cluster`

- **SEC-11010** (emoji picker search input hittability, MM-T4862_3/_4, iOS) — Owner: QA.
  Mechanism (from artifact): the failure was NOT "search input not hittable for
  typing" — it was EmojiPickerScreen.close() swiping down on the search input.
  The input's top ~2px is clipped by the safe-area/header overlap (view bounds
  {0,0,276,40} vs visible {0,2,276,36}); Detox's default down-swipe starts at
  startY=0 (the clipped point y=1) and fails "not visible around point". A real
  user swipes the visible middle — this is a Detox-only gesture-start issue, not
  an app/real-user bug → test fix. Fix: close() now swipes from the vertical
  center (startY=0.5), safely in the visible area. Unskipped MM-T4862_3 and
  MM-T4862_4; verified 2x green on iOS (iPhone 17 Pro / iOS 26.3, 11.10 server).
  No reusable hit-test helper landed — the mechanism is specific to this
  close-swipe start point; Tasks 2.2/2.3 check their own symptoms (per runbook).
  Android deferred to CI.