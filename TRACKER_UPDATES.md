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
  Android verified green (local API-35 emulator, fresh server
  mobile-pr-9996-site-3): MM-T4862_3 + MM-T4862_4 PASS. Both platforms green.

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
  change beyond the comments. Follow-up (verification pack): still NOT closed — no new
  swipe-reveal fix was applied (building one blind, without the 3-server CI artifact
  showing the Remove/Logout overlap geometry at the failed tap, violates the
  evidence-first rule). The branch is pushed and ready for CI, but I cannot trigger the
  3-server CI run myself (E2E/Run label is a user/Matterwick action). Next step: apply
  E2E/Run label, capture the 3-server shard failure artifact, then build the targeted
  fix (tap Remove at a point not overlapped by Logout, per SEC-11010) and verify green
  before dropping the iOS it.skip.

  **Live-attempt update (2026-08-05, 3-server env now available):** With 5 distinct
  PR-9996 server URLs in detox/.env, hasThreeDistinctServers / itWithThreeServers now
  resolves true on both platforms, so the 3-server env gate is no longer the blocker —
  the gated suite executes. The three iOS-skipped tests (MM-T4691_5/6/7) were temporarily
  un-skipped and the whole file was run on iOS (iPhone 17 Pro / iOS 26.3, flag ON). Result:
  RED, but NOT at the swipe-reveal. ALL 7 tests in server_list.e2e.ts (including
  MM-T4691_1…_4, which are NOT part of SEC-11017 and pass in CI) failed at
  ServerListScreen.open() → ChannelListScreen.serverIcon.tap() with "View is not
  visible... does not pass visibility percent threshold (100)" — the 24×24 server icon
  is ~8px clipped top-left (view bounds {{8,8},{24,24}}). The 3-retry loop in open()
  exhausted all attempts. Artifacts captured: DETOX_VISIBILITY_*SCREEN/_TEST.png +
  device.log under artifacts/ios.sim.debug.2026-08-06 14-22-03Z/. This is a DIFFERENT
  mechanism than the CI swipe-reveal failure (which was the revealed Logout/Remove
  action unhittable AFTER a swipe). Prime suspect: the local iOS app binary is stale —
  mobile-artifacts/Mattermost.app is v786 / Jul 23, while current source is v793 (7
  build numbers behind); _1…_4 pass in CI with fresh builds but fail locally with this
  binary, so the binary is the variable. No swipe-reveal fix was guessed (evidence-first:
  the captured symptom is the server icon, not the swipe action). The temp un-skip was
  reverted; the iOS it.skip stays. Next step: rebuild the iOS debug binary from current
  source and re-run server_list.e2e.ts on iOS — if _1…_4 then pass and only _5/6/7 fail
  at the swipe, the SEC-11017 swipe-reveal is isolated and the targeted fix can be
  built against that artifact. SEC-11017 stays NOT closed; the swipe-reveal itself is
  still unverified locally because the upstream server-icon hittability must be resolved
  first (rebuild the binary).

  **Fresh-binary update (2026-08-06):** The iOS debug binary was rebuilt from current
  source (v793, was v786/Jul 23) via `npm run pod-install` (Ruby 3.2.0) + `npm run ios`,
  and copied to mobile-artifacts/Mattermost.app. Re-ran server_list.e2e.ts on iOS
  (iPhone 17 Pro / iOS 26.3, flag ON). Result: the stale-binary server-icon block is
  GONE — MM-T4691_1/_2/_3/_4 now PASS (ServerListScreen.open() works). The TRUE
  SEC-11017 symptom is now exposed and isolated: MM-T4691_5/_6/_7 FAIL at the
  swipe-reveal, NOT at server-list open. Precise mechanism (MM-T4691_5, line 274-276):
  `waitFor(server_list.server_item.server_1.remove.option).toBeVisible(100)` times
  out at 10s — after swiping left on the server item, the Remove option never reaches
  100% visibility (Logout overlaps it during the reveal). This is exactly the
  SEC-11010 conclusion (revealed action unhittable because a sibling overlaps it),
  now confirmed with a fresh artifact on a fresh binary (artifacts/ios.sim.debug.
  2026-08-06 16-07-49Z/, DETOX_VISIBILITY_UITransitionView screenshots). MM-T4691_6
  fails the same way at the Logout option; MM-T4691_7 fails at the Add-Server action
  visibility. The temp un-skip was reverted; the iOS it.skip stays. The targeted fix
  (tap Remove at a point not overlapped by Logout, per SEC-11010) is now UNBLOCKED —
  the exact failing testID and the overlap are captured. Building it needs the
  Remove/Logout frame geometry from the screenshot (not guessed blind). SEC-11017
  stays NOT closed: real swipe-reveal failure confirmed and isolated; fix is the next
  step with the artifact in hand.

- **SEC-11012** (markdown scroll / Back a11y / expand hittability, MM-T4895_1,
  MM-T4899_2/4/5, MM-T1442_1) — Owner: QA. Unskipped 4 of 5; MM-T4899_2 kept as a
  residual. Brought the SEC-10993 shared NavigationHeader.tapBackButton helper onto
  this branch (navigation_header.ts, thread.ts, channel.ts — identical to Branch 1 so
  they merge cleanly) and refactored TableScreen.back() to index-qualify
  navigation.header.back (topmost 1 → base 0 → native) — fixing MM-T1442_1's
  duplicate-Back-node dismissal. MM-T4895_1 / MM-T4899_4 / MM-T4899_5 were stale skips
  (pass on iOS now) — unskipped, verified 2x green. MM-T4899_2 (expanded-table
  horizontal scroll can't reveal the right column) kept skipped: reproduced — the
  right column renders at content x=392 in a 581px table inside a 402px viewport,
  but both the incremental whileElement().scroll and scrollTo('right') (with a
  layout-settle wait) leave it clipped by a superview; not a duplicate-back/hit-test
  issue, needs deeper layout investigation (or PE if a real user also can't reveal
  it). iOS verified (iPhone 17 Pro / iOS 26.3, 11.10 server); Android verified green
  (local API-35 emulator, fresh server mobile-pr-9996-site-3): MM-T1442_1,
  MM-T4895_1, MM-T4899_4, MM-T4899_5 PASS. Both platforms green.

### SEC-11017 geometry-fix attempt (2026-08-07) -- BLOCKED on tooling

Attempted the targeted tap-point fix (SEC-11010 conclusion: tap Remove at a point not
overlapped by Logout) on the fresh v793 binary.

- Heuristic attempt: lower the visibility wait to toBeVisible(40) and tap the Remove
  option's top-left via element.tap({x:0, y:0}) (away from Logout on the right). FAILED --
  toBeVisible(40) itself times out: the Remove option is under 40% visible after the swipe
  (Logout overlaps it almost entirely), same severe clipping as the autocomplete case.
- Geometry-based fix: BLOCKED on tooling. The view-hierarchy dump is disabled by default in
  this harness (detoxDisableHierarchyDump=YES), and enabling it (detoxDisableHierarchyDump=NO)
  plus --log-level verbose did NOT produce a readable view-hierarchy file or print element
  frames. The DETOX_VISIBILITY screenshots are PNGs, not machine-readable. So the
  Remove/Logout frame geometry cannot be read from the current artifacts to compute a
  precise tapAtLocation point.

SEC-11017 stays NOT closed: real swipe-reveal failure confirmed and isolated, but the
targeted fix requires either (a) a readable view-hierarchy artifact (enable the hierarchy
plugin / a JSON dump) or (b) a human reading the DETOX_VISIBILITY screenshot to read the
Remove/Logout frames. Temp changes reverted; _5/_6/_7 stay iOS-skipped. Not guessed blind.
