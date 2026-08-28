# PR #10050 — four-line diagnoses (CI run 33036930610)

Format per detox/CLAUDE.md: (1) tap dispatched? (2) handler ran? (3) side effect? (4) UI re-rendered? → test | detox | app.

## FIXED (test bugs)

### MM-T107 — message length alert not dismissed (ios22)
1. Tap dispatched: YES — `Alert.okButton.tap()` succeeded as an action.
2. Handler ran: YES — button action fired.
3. Side effect: NO — the UIAlertController stayed on screen (failure hierarchy: `_UIAlertControllerPhoneTVMacView` label="Message Length" visible at 270×140, OK×4, no tab_bar).
4. UI re-rendered: NO — alert persisted; next step's `tapBackButton` hit the alert ("not hittable" ×3) → catch → `tab_bar.home.tab` "No elements found" @ channel.ts:241.
→ **test** (alert dismissal must verify dismissal; sibling MM-T4781_3 proves `dismissMessageLengthAlert` works). Fixed in message_draft.e2e.ts.

### MM-T1433_1 — code block tap "not hittable" (ios16)
1. Tap dispatched: NO — Detox refused: "View is not hittable at its visible point … view point {164, 17.333}".
2. Handler ran: N/A.
3. Side effect: N/A.
4. UI re-rendered: N/A — the block sat at y≈17.3 under the status-bar inset after a momentum-0.5 scroll rubber-banded the short list.
→ **test** (momentum 0 for exact-pixel scroll; boundary try/catch pre-existing). Fixed in code_block_dismisses_keyboard.e2e.ts.

### MM-T5294_2 / MM-T5294_3 — modifier search results raced (android3)
1. Tap dispatched: YES — device.log final attempt: modifier corner-tap performed (00:15:05.789), text typed, at-mention suggestion tapped (00:15:10.674), return key (00:15:11.228).
2. Handler ran: YES — search request issued.
3. Side effect: YES (server-side search executed; results not yet delivered).
4. UI re-rendered: NO at assert time — bare `expect(postListPostItem).toBeVisible()` failed "was null" 1.2s after the return key (results fetch still in flight).
→ **test** (missing wait; sibling MM-T5294_4 waits `TWO_SEC` before the same assertion). Fixed in search_messages.e2e.ts.

## ABANDONED (app bugs)

### MM-T4781_4 — thread reply draft never opens (ios22) → MM-70004
1. Tap dispatched: YES — `parentPostListPostItem.tap()` (message_draft.e2e.ts:209) with no Detox error.
2. Handler ran: NO — failure hierarchy (111KB): channel screen settled, parent post present, ZERO thread elements across 3 expectation polls (3322–3329: `thread.screen` TOEXIST failures).
3. Side effect: NONE (no navigation, no overlay in hierarchy).
4. UI re-rendered: NO thread route mounted.
→ **app** (press-delivery). Ticketed MM-70004. No test-side fix without retry loops.

### MM-T4990_4 / MM-T3891 — custom status clear button (ios7) → MM-70007
1. Tap dispatched: YES (clear button tap in verifyStatusCleared path).
2. Handler ran: NO — failure hierarchy shows the full status row (🔥 + text + duration) still rendered; app stayed on account screen.
3. Side effect: NONE — status not cleared.
4. UI re-rendered: NO.
→ **app** (press never delivered to nested absolute-positioned touchable inside the account row). Prior fix attempts 6a269a9ae / 79023fb93 / 845355baf did not resolve; MM-70007 tracks it.

### MM-T4909_3 — edited mention never repaints (ios8) → new evidence for app investigation
1. Tap dispatched: YES — save tap 05:53:48.000 (invokeResult OK).
2. Handler ran: YES — `editPost` completed; modal closed at 05:53:53.7 (`handleUIUpdates` only calls `onClose()` on success), so the local `post.update` write completed.
3. Side effect: YES — server has the edit (waitForPostMessage + search-index waits passed).
4. UI re-rendered: NO — failure hierarchy at 05:53:54.4 and for 12+ polls over 10s shows the pre-edit text `Own mention 4e2215 @userdef9d0`; no `edit` fragment anywhere. The `postBodyKey` observation (704f88d71, in the tested build) should have re-keyed the memoized row; it did not fire on iOS.
→ **app** (WatermelonDB → withObservables chain not repainting the Recent Mentions row on iOS). Needs on-device debugging; not fixable test-side without a timeout bump.

### MM-T5294_12 — 300s timeout (ios10) → SEC-10997
1. Tap dispatched: YES — `tap channel.post_draft.post.input` at 05:38:09.171.
2. Handler ran: DEFERRED — the action's acknowledgment arrived ~103s later (05:38:09→05:39:52: zero WS events of any type; app never reported idle).
3. Side effect: eventually YES — pin verified at 05:41:26, unpin tapped 05:42:09.
4. UI re-rendered: YES, but too late — accumulated stall blew the 300s jest budget.
→ **app** (JS-thread stall / busy loop). Already ticketed SEC-10997.

### MM-T5602_1 / MM-T5604_1 / MM-T5608_1 — Add-a-bookmark sheet never opens (android4)
1. Tap dispatched: YES — `add_bookmark.button` tap({x:1,y:1}) at 00:14:50.1 (after a swallowed 75%-visibility failure at 00:14:48.8 — button clipped at the scroll edge).
2. Handler ran: NO — `channel_bookmark.type.link` polled every ~0.5s for 20s (00:14:50→00:15:10) never found; no error alert (afterEach probes empty).
3. Side effect: NONE — options sheet (GENERIC_BOTTOM_SHEET with AddBookmarkOptions) never mounted.
4. UI re-rendered: NO sheet.
→ **app** (corner tap on a clipped button misses the press target; needs on-device verification of the channel-info bottom inset / edge-to-edge clipping — the same class as the channel-list "rows under the tab bar" issue fixed for openChannel).
---

# PR #10050 — four-line diagnoses, round 3 (CI run 33173240310, head 9334aad35)

Evidence dirs: /tmp/e2e-ev/{a4,a12,a14,i2,i3,i8,i15,i17,i18}. Screenshots could not be visually
read this round (no image support in the session); every diagnosis below rests on device.log,
detox.log viewHierarchy XML (iOS) / DetoxWSClient matcher traffic (Android), and jest-results.

## FIXED (test bugs)

### MM-T5602_1 / MM-T5604_1 / MM-T5608_1 — Add-a-bookmark sheet never opens (android4)
1. Tap dispatched: YES — `Performing 'detoxsingletap click' action on view (view.getTag() is
   "channel_info.add_bookmark.button" and view has effective visibility <VISIBLE>)` at
   09:14:25.625 (MM-T5602_1 device.log); a second tap at 09:14:35 (the old catch-retry) — both
   performed; RNClickAction's own 75%-visibility constraint passed (DetoxAction.java:63-80:
   tapAtLocation = view.getLocationOnScreen() + (1dp, 1dp); getConstraints =
   isDisplayingAtLeast(75)).
2. Handler ran: NO — `channel_bookmark.type.link` polled every ~0.5s for 2×10s
   (assertMatcher IDs #307–#318+, all "not null"); the gorhom sheet never mounted; zero
   ReactNativeJS activity after the tap.
3. Side effect: NONE.
4. UI re-rendered: NO sheet.
   Corroborating: `Detected a possibly overly-running fling! (#iterations=2)` at 09:14:25.596,
   12ms before the tap — the scroll-up recovery left the scroll view in motion; the 75% check
   passed with the button clipped at the viewport TOP, so the {x:1,y:1} corner tap landed in
   the clipped region (tapAtLocation is top-left + offset) and the rneui Pressable never got
   the touch. Root test bug found upstream: `scrollToBookmarks()` waits for
   `channel_info.bookmarks.list`, which does NOT exist on an empty channel, then fell through
   to `scrollTo('bottom')` — scrolling the button (right under the title) out of the viewport.
→ **test**. Fixed in channel_info.ts: (a) scrollToBookmarks early-returns when the AddBookmark
button itself is visible (empty-channel case); (b) tapAddBookmark scrolls to 100% visibility
from either edge, settles HALF_SEC, and taps the CENTER once; the 15-iteration retry loop and
the second-tap catch (forbidden patterns) were removed. Center of a ≥75%-visible button is
always inside its visible area; iOS passes the same flow today.

### MM-T107 (Android) — draft input gone when typing the extra char (android4)
1. Action dispatched: YES — `ReplaceTextAction` succeeded 09:31:07.713; `DetoxTypeTextAction 'a'`
   dispatched 09:31:07.722.
2. Handler ran: YES — the app's `checkMessageLength` (post_input.tsx:239-272) fired on
   onChangeText and called `Alert.alert(...)`; `postLocalNotification` at 09:31:08.400.
3. Side effect: YES — the native "Message Length" AlertDialog opened; it covers the draft
   input, which is why the input stopped matching.
4. UI re-rendered: YES — that is the failure: typeText('a') requires the input
   "effective visibility <VISIBLE>" and got zero views (jest-results: "No views in hierarchy
   found matching: view.getTag() is 'channel.post_draft.post.input'…").
→ **test**: on Android replaceText of an over-limit string opens the alert immediately; the
extra keystroke is iOS-only (iOS raises the alert on the following keystroke). Guarded
`typeText('a')` with isIos(); the Android flow then asserts + dismisses the alert it already has.

### MM-T4201 — textarea behind the keyboard (ios2; the round-2 unskip)
1. Action dispatched: YES — fillTextElement scrolled the dialog 200px, waited 500ms, then
   waited for `AppFormElement.textarea_field.input` TOBEVISIBLE(75) for 10s.
2. Handler ran: YES — the dialog rendered all six fields (failure hierarchy: text_field y=0,
   required_text y=108, email y=216, number y=325, password y=433, textarea_field y=541 h=193,
   all visibility="visible").
3. Side effect: YES — the software keyboard was OPEN: 62 UIKeyboard notifications with
   `UIKeyboardFrameEndUserInfoKey = {{0, 583}, {402, 291}}` (device.log). The keyboard occludes
   window y ∈ [583, 874].
4. UI re-rendered: YES — but the textarea's window frame was [606, 731]
   (hierarchy walk: safe area y=56, scroll view h=712, content h=1057, offset -44, input at
   content y=594) — fully behind the keyboard; the fixed 200px scroll left it there.
→ **test**. Fixed in interactive_dialog.ts fillTextElement: for password/textarea scroll the
dialog scroll view to its END (content 1057 in a 712 viewport → max offset 345 puts the field
at viewport y≈249–374, clear of the keyboard) instead of a fixed 200px.

## ABANDONED (app bugs / environment), evidence per artifact

### MM-T4691_4 / _5 / _6 / _7 + MM-T4675_2 — iOS swipe-reveal (ios18 + ios3) → SEC-11017
1. Swipe dispatched: YES — `swipe left slow/fast` on `server_list.server_item.*` completed as an
   action (detox.log action sequence).
2. Handler ran: the row's `onServerPressed` ran INSTEAD of the RNGH pan — direct evidence:
   MM-T4691_7's failure hierarchy shows `channel_list_header.server_display_name text="Server 3"`
   (expected "Server 1"): the only app path that activates Server 3 is
   `onServerPressed` → switchToServer (server_item.tsx:249-284). The synthesized swipe
   registered as a PRESS on the row's Pressable.
3. Side effect: YES — `dismissBottomSheet()` (active row) / switch+dismiss (inactive row):
   MM-T4675_2's helper threw `No elements found for MATCHER(id == "server_list.screen")` at
   server_list.ts:331 immediately after the swipe; MM-T4691_4/_5 failure hierarchies contain
   ONLY `channel_list.screen` — the sheet was gone for the whole 10s wait.
4. UI re-rendered: YES — back to the channel list; the revealed options never existed.
→ **detox/test**: Detox-synthesized horizontal swipes on the RNGH Swipeable rows inside the
gorhom bottom-sheet scrollable do not activate the pan on iOS; the touch degrades to a row
press (Android passes the same swipes). Mechanism for WHY the pan loses (RNGH↔gorhom gesture
arbitration under synthesized touches) NOT ESTABLISHED from artifacts — establishing it needs
on-device instrumentation of the gesture recognizers. What would settle it: logging
PanGestureHandler activation vs Pressable press for a synthesized swipe on this row. No
test-side fix exists without forbidden patches (retry loops around the same gesture / second
tap); no app change is justified while the arbitration mechanism is unproven. ABANDON:
G-A1..G-A5 → SEC-11017 (existing ticket) with this run's evidence; MM-T4691_7 is a cascade
(header shows Server 3 after 4691_6's accidental switch) and shares the ABANDON.

### MM-T3891 / MM-T4990_4 — account-row clear does not update the UI (ios8 + android14) → MM-70007
1. Tap dispatched: YES — iOS: `Sending UIEvent type: 0` + `send gesture actions` 13:13:48.478-488;
   Android: `Performing 'detoxsingletap click'` on `account.custom_status.clear.button`
   (09:12:47.780 and 09:14:29.375).
2. Handler ran: YES — this round KILLS the round-2 "press never delivered" theory: the iOS
   device.log shows DELETE /users/me/status/custom resuming 13:13:48.501 and returning
   **status 200** at 13:13:48.668 (CFNetwork task .<58>), followed by
   `[handlePreferencesChangedEvent] PREFERENCES_CHANGED custom_status/recent_custom_statuses`
   at 13:13:48.758. `clearCustomStatus` ran; the server cleared the status.
3. Side effect: PARTIAL — server-side cleared; the local user record never converged. The
   fetchMe pair that unsetCustomStatus issues only hit the network at 13:13:52.837/842 (~4s
   after the DELETE; JS thread stalled — DTXJSTimerSyncResource: 300ms timers timing out after
   ~1.5s), and even after it completed the row kept the old status. Android: 437
   "not not null" polls over 10s; no navigation (kills the nested-touchable
   "navigates instead" hypothesis — custom_status.screen never appeared).
4. UI re-rendered: NO — the clear control persisted 10s+ on both platforms
   (iOS: NOT-TOEXIST TIMEOUT(10s) at custom_status.e2e.ts:611).
→ **app** (local-state convergence after unsetCustomStatus: DELETE 200 + preference event, but
props.customStatus never reaches the rendered Account row). Three prior app-side attempts
(6a269a9ae, 79023fb93, 845355baf) did not resolve. The exact drop point (stale-closure write vs
user_updated resurrection vs the 4s JS stall ordering) cannot be established from CI artifacts;
needs on-device debugging. ABANDON: G-C3 → MM-70007.

### MM-T4909_3 — edited mention never repaints (ios15 + android12) → MM-70005
1. Tap dispatched: YES — EditPostScreen.save completed (waitForPostMessage +
   waitForPostMessageInSearch both passed — the edit is on the server AND in the search index).
2. Handler ran: YES (edit saved).
3. Side effect: YES — server + search index updated before the UI check.
4. UI re-rendered: NO — iOS failure hierarchy at verifyPostEdited: the row
   `recent_mentions.post_list.post.wsg4gnr5kfbp3pbpmmrwwq5x9r` still renders
   `text="Own mention 7890b8 @user32a089"` (no " edit" fragment anywhere in the hierarchy).
   Android: the same step times out on `postListPostItem` toExist (recent_mentions.ts:173).
→ **app** (search-backed mentions feed does not re-render the edited row on either platform).
Same symptom as round 2 (notes above); MM-70005 tracks it. Diff vs passing MM-T5294_10 (round 2,
analogue-diffs.md §2): search results re-render, recent mentions does not. ABANDON: G-D2.

### MM-T5294_12 — 300s timeout (ios11) → SEC-10997
1. Tap dispatched: YES — the final unacknowledged action was
   `invoke: {"type":"action","action":"tap","atIndex":0,"predicate":{…"navigation.header.back"…}}`
   (detox joblog, 14:04:06).
2. Handler ran: DEFERRED — from 14:00:22 to 14:04:06 Detox logged "The app is busy" heartbeats
   every ~20s (main dispatch queue with 1–4 pending work items, Main Run Loop awake, JS Run
   Loop awake, "Runloop Perform Block" in flight) — ~4 minutes of continuous busy.
3. Side effect: N/A — the app never went idle; jest killed the test at 330s.
4. UI re-rendered: N/A.
→ **app** (JS/main-thread stall). Passing analogue MM-T5294_11 (same file, same back-navigation
steps) passed at 222s immediately before. Re-confirms round 2's 103s stall (SEC-10997) with a
4-minute footprint. ABANDON: G-E2.

### MM-T1433_1 — code block below the viewport / keyboard never opens (ios17)
1. Action dispatched: YES — the toBeVisible(75) wait resolved the element
   (`RCTViewComponentView 0x120ea5c60` in the failure message).
2. Handler ran: N/A (no tap reached).
3. Side effect: N/A.
4. UI state at check: the code block (328×34) sat at window y≈1004 in an 874-high window
   (failure-hierarchy ancestor chain: flat_list y=796 h=796, inner scroll offset -44, post
   y=72, block y=36) — ~130px BELOW the viewport. Also: the software keyboard never opens on
   the CI simulator — device.log has ZERO UIKeyboardWillShow and a single zero-height
   notification (`UIKeyboardFrameEndUserInfoKey = {{0, 874}, {402, 0}}`) — so the
   "reveal the code block above the keyboard" premise cannot be exercised, and the keyboard
   assertion at the end of the test would be vacuous.
   The passing analogue (MM-T4895_1/_2, markdown_code.e2e.ts:86-88) asserts only toExist for
   exactly this reason: "the message input bar can clip a short block below even the 50%
   visibility threshold".
→ **detox/environment + app layout under a 0-height keyboard** (post list frame at y=796 with
the keyboard absent needs on-device investigation). ABANDON: G-B2 — a test-side fix cannot
exercise the keyboard-dismissal behavior without a software keyboard; raising the scroll/visibility
budget would be a forbidden timeout bump. MM-T1433_1 needs the CI simulator's software keyboard
enabled (Detox launchArgs) or an app-side investigation of the KeyboardController layout.
