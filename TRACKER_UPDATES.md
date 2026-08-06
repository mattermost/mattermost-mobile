# Tracker updates — fix/detox-rf-migration-residuals

## P2 — RF→Detox migration residuals (2026-08-05, live PR-9996 servers, flag ON)

Both were iOS-only, comment-free skips left over from the RF→Detox migration. Per the
SEC-11022 lesson, the enclosing alias/describe scope was checked first for a hidden skip
comment — neither has one (plain test-level `(isIos() ? it.skip : it)`, describe block not
skipped). Local iOS app binary is v786 / Jul 23 (stale vs source v793); see note below.

- **SEC-11019** — MM-T3205 (channel_settings/channel_members.e2e.ts, "RN apps Remove user
  from private channel"). **Unskipped on iOS.** Live re-verification on iPhone 17 Pro /
  iOS 26.3 against a live PR-9996 server (11.10.0): 2x consecutive green. The migration skip
  was stale. Android continues to cover this case as well. Both platforms now green.

- **SEC-11020** — MM-T4201 (interactive_dialog/interactive_dialog_plugin.e2e.ts, "should
  fill and submit all text field types (Plugin)"). **FAIL on iOS, kept skipped.** Live
  re-verification: `channel.post_draft.post.input` is not found ("No elements found") in the
  beforeEach clearText and again in the test body; the afterEach fallback
  (waitFor postInput toBeVisible) also fails. The artifact shows a Detox visibility check on
  a `PasteInput` RCTUITextView — a paste overlay/banner may be covering the composer so the
  post-input testID is not matchable. This is NOT a universal stale-binary break: MM-T3205
  passed 2x with the same binary, so the binary renders channels fine; the failure is
  specific to the interactive-dialog / post-input flow. Failing assertion: Expected
  channel.post_draft.post.input to exist; Got: no elements found. Owner: QA/test-infra —
  isolate whether a paste overlay blocks the composer testID on iOS, then re-unskip. Android
  still covers this case. Artifact: artifacts/ios.sim.debug.2026-08-06 15-18-58Z/.

### Stale-iOS-binary caveat (affects iOS verification across this pass)

The local iOS debug binary (mobile-artifacts/Mattermost.app) is v786 / Jul 23, while current
source is v793 (7 build numbers behind). For SEC-11017 (server_list) this caused a real
blocker (the channel-list header server icon is clipped on iOS, blocking ServerListScreen.open
and the whole file). MM-T3205 and MM-T4201 operate within a channel (not the server list), so
the binary is adequate for them — MM-T3205 passing 2x confirms the channel screen renders
correctly with this binary. MM-T4201's failure is therefore attributed to the dialog/post-input
flow, not the binary. Rebuilding the iOS binary from current source is still recommended before
any iOS verification is called final, to remove the confounding variable.