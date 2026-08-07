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
  Android verified green (local API-35 emulator, fresh server
  mobile-pr-9996-site-3): MM-T5294_4…_9 PASS. Both platforms green.

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
  Follow-up (verification pack): could NOT get a clean signal — the prior ephemeral cloud
  servers (PR #9930/#9972 sites) are torn down (302 -> /cloud/inactive) and I cannot
  provision Mattermost cloud servers myself, so the hardening (d3584e4b1) remains
  UNVERIFIED on a clean session. NOT closed. Next step: a fresh stable server (or a CI
  run on this branch with E2E/Run) to run MM-T69455_1 + MM-T5725_1 2x per platform with
  cleared device storage; green -> drop it.skip for that platform; red -> fresh artifacts
  and decide hardening-vs-PE.
- **SEC-11051** (Maestro iOS server-connect, MM-T67856_1/_2) — Owner: QA (test-harness);
  follow-up CORRECTS the first-pass "foundation on main covers it" claim. Checked PR #9971
  (ca20a9a20, merged) line-by-line vs the ticket's two requirements: (b) mislabel fix
  SATISFIED — #9971 added wait_for_server_connect_complete.yml with the non-optional
  notVisible:server_form.display_help FIRST, so a failed connect fails in connect context,
  not as 'tab_bar.home.tab is visible'. (a) set-and-verify URL input MISSING —
  _enter_url_and_connect.yml does inputText:SITE_1_URL then taps Connect with NO assertion
  the field equals SITE_1_URL (only re-enters — mitigates dropped keystrokes, does not
  verify). NOT implemented this pass: the set-and-verify would be an unverifiable change to a
  shared subflow used by EVERY iOS Maestro test (assertVisible id+text on
  server_form.server_url.input, or a runScript field-value compare) — if Maestro can't read
  the controlled RN TextInput value as text it always fails and breaks the whole iOS suite,
  and this pass can't run Maestro to confirm (no live server; cold-start TLS is the ticket's
  own subject). To land: add the assertion after inputText and verify on a stable server.
  TLS cold-start: #9971's _connect_check.yml WARMS trust evaluation (runs connect up front)
  but does NOT fix the cancellation (NSURLErrorDomain -1200) — mitigated, not fixed; not
  re-verified this pass (no Maestro run). Dropped-keystroke: mitigated (re-enter), not
  verified-fixed (no set-and-verify). MM-T67856_1/_2 stay iOS-excluded. SEC-11000 (MM-T1325)
  / SEC-11018 (MM-T5611) already iOS-excluded with _DIAGNOSIS_CORRECTION references.

## P3 — branch 8 (fix/detox-recovery-followup) Maestro re-verify — 2026-08-07

Local Maestro run (debug v793 build + Metro, iPhone 17 Pro / iOS 26.3, live PR-9996 iOS
server, setup_local.sh provisioned + seeded). All three branch-8 items are blocked
UPSTREAM by the shared server-connect subflow (connect_server_ios.yml /
_enter_url_and_connect.yml) flakiness, NOT by the ticket-specific assertions.

- **SEC-11051 (set-and-verify URL input):** ATTEMPTED, BLOCKED on a Maestro interpolation
  quirk. Added `assertVisible: text: "${SITE_1_URL}"` to _enter_url_and_connect.yml after
  inputText. Maestro compiles `assertVisible.text` to `textRegex` and resolves
  `${SITE_1_URL}` to the literal "undefined" (confirmed in the commands.json:
  `assertConditionCommand/condition/visible/textRegex = ${SITE_1_URL}` -> error
  "undefined is visible"), while `inputText: ${SITE_1_URL}` interpolates correctly and
  types the real URL. A simple assertVisible cannot do an env-var-derived set-and-verify
  here; it would fail EVERY iOS flow (exactly the regression risk the status note flagged).
  Reverted the subflow change (no regression). Needs a runScript/variable-based assertion
  (read the field value, compare to SITE_1_URL). Full-suite validation also blocked by the
  connect flakiness below. NOT closed.

- **SEC-11000 (MM-T1325, clock_display.yml) re-verify:** FAILED at the server-connect step
  (first connect attempt errored -> server_form.server_url.input.error visible -> retry ->
  retry's "Tap on Enter Server URL" FAILED). The flow NEVER reached the clock/timezone
  assertion. This CONFIRMS the prior "connect-not-login" diagnosis: the failure is at
  connect, not the timezone assertion. The connect flakiness is the ticket's own subject
  (TLS cold-start NSURLErrorDomain -1200 / inputText dropped chars, PE/infra handoff).
  Not a new finding; prior diagnosis holds. Not closed (blocked upstream at connect).

- **SEC-11018 (MM-T5611, channel_bookmark_link_external.yml) re-verify:** FAILED at the
  SAME server-connect step, never reaching the external-browser step. The prior
  "external browser launch did not return to Home tab" diagnosis is NOT reproduced here --
  the current blocker is the shared connect subflow flakiness, identical to SEC-11000.
  So in this local env MM-T5611 is blocked upstream at connect, not at the browser step.
  The external-browser diagnosis is superseded by "blocked at connect" until the connect
  flakiness is resolved (or verified on a CI release build where connect is stable).

Net: all three branch-8 items are blocked upstream by the shared connect-subflow flakiness
(the ticket's own PE/infra subject). SEC-11051 additionally blocked on the Maestro
interpolation quirk. No code change landed this pass (the SEC-11051 assertion was reverted).
None closed.
