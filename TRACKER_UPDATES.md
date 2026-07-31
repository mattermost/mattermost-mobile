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

- **SEC-11017** (server list swipe actions unhittable on iOS, MM-T4691_5/6/7) —
  Owner: QA, verification pending CI 3-server shards. Status: investigated but NOT
  fixed or unskipped. The tests are double-gated — `(isIos() ? it.skip : itWithThreeServers)`
  — and the runbook says leave the 3-server env gate alone (tracked under SEC-11004).
  The test already has iOS handling (waitFor Remove/Logout toBeVisible(100) after the
  swipe-reveal, with a comment that Logout overlaps Remove during the reveal animation),
  yet CI 30000635898 still reports the revealed action unhittable. Local verification is
  blocked: itWithThreeServers needs 3 distinct servers (hasThreeDistinctServers), and
  this env has one — so the test cannot run locally regardless of the iOS skip. Per rule 6
  + the evidence-first rule, the iOS skip was NOT removed and no swipe-reveal fix was
  guessed without an artifact. Skip comments updated to point the next investigator
  (who can run 3-server shards) at the SEC-11010 conclusion (Detox-only tap/swipe start
  point in a clipped or overlapped region) to check the CI artifact against. No code
  change beyond the comments.