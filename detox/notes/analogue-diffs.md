# PR #10050 — failing vs passing analogue diffs (CI run 33036930610)

Per detox/CLAUDE.md: every failing test has a passing sibling. Diff first.

## Cluster ios22 — message_draft.e2e.ts

| Test | Verdict | Analogue |
|------|---------|----------|
| MM-T107 (alert over limit) | TEST bug — fixed | **MM-T4781_3 in the SAME FILE (line 142)** uses `Alert.dismissMessageLengthAlert()` (which verifies the title is gone afterwards) and PASSES. MM-T107 used a bare `Alert.okButton.tap()`. |
| MM-T4781_4 (draft from thread) | APP bug — ABANDON → MM-70004 | MM-T4781_3 (draft in main channel) passes; MM-T4781_4's only difference is opening a thread first. Failure hierarchy: tap at message_draft.e2e.ts:209 dispatched (no Detox error), no overlay, zero thread elements after 3 expectation polls, no JS errors → press delivered, handler never ran. |

## Cluster ios16 — code_block_dismisses_keyboard.e2e.ts

| Test | Verdict | Analogue |
|------|---------|----------|
| MM-T1433_1 (tap code block) | TEST bug — fixed | **markdown_code.e2e.ts (MM-T4895_1/2, passing)** never taps the block and never momentum-scrolls (comment: `toBeVisible(50)` is "fragile"). MM-T1433_1 scrolled with momentum 0.5 → fling rubber-bands the short list → block parked at y≈17.3 (status-bar/dynamic-island zone) → tap fails "not hittable at its visible point". Fix: momentum 0 (exact px), keep pre-existing boundary try/catch. |

## Cluster ios8 — recent_mentions.e2e.ts

| Test | Verdict | Analogue |
|------|---------|----------|
| MM-T4909_3 (edit mention) | APP bug — ABANDON | `verifyPostEdited` line 173 is the item+text existence poll; the app's `editPost` action (`app/actions/remote/post.ts:995`) writes the new message locally immediately after `patchPost`, and `edit_post.tsx` `handleUIUpdates` only closes the modal on success — so the local write provably completed. The `postBodyKey` fix (704f88d71, in the tested build) observes the body via `observePost` and re-keys the memoized row. Failure hierarchy at 05:53:54.4 (6s after save) and for 12+ polls still shows the ORIGINAL text `Own mention 4e2215 @userdef9d0` — no `edit` fragment anywhere in the hierarchy. Android is not in the failing inventory. |

## Cluster android3 — search_messages.e2e.ts

| Test | Verdict | Analogue |
|------|---------|----------|
| MM-T5294_2 (from: search) | TEST bug — fixed | **MM-T5294_4 in the SAME FILE** does `tapReturnKey()` → `await wait(timeouts.TWO_SEC)` → `toBeVisible()` and PASSES. MM-T5294_2/3 assert immediately after the return key; device.log shows the failure 1.2s after the key press (search request still in flight) → Espresso "was null". |
| MM-T5294_3 (in: search) | TEST bug — fixed | Same as above. |

## Cluster ios7 — custom_status.e2e.ts

| Test | Verdict | Analogue |
|------|---------|----------|
| MM-T4990_4, MM-T3891 | APP bug — ABANDON → MM-70007 | Clear-from-status-screen (MM-T3892) PASSES; both failing tests clear from the account row (nested `TouchableOpacity` inside the row's `TouchableOpacity`, absolutely positioned) — press never delivered. Three prior fix commits (6a269a9ae, 79023fb93, 845355baf) did not fix it. |

## Cluster ios10 — search_message_post_actions.e2e.ts

| Test | Verdict | Analogue |
|------|---------|----------|
| MM-T5294_12 (pin/unpin) | APP bug — ABANDON → SEC-10997 | Same-file siblings pass with identical navigation. detox.log: tap on `channel.post_draft.post.input` at 05:38:09.171 got its acknowledgment deferred 103s (05:38:09→05:39:52 total event silence — app never idle). Pin verification passed at 05:41:26, unpin tapped 05:42:09 — the work completed; the stall blew the 300s jest budget. |

## Cluster android4 — channel_bookmarks.e2e.ts

| Test | Verdict | Analogue |
|------|---------|----------|
| MM-T5602_1, MM-T5604_1, MM-T5608_1 | APP bug — ABANDON (needs on-device inset work) | Visibility-only siblings (MM-T5600_1, MM-T5601_1) and all API-created bookmark tests pass. device.log final attempt: 75%-visibility assertion on `channel_info.add_bookmark.button` fails (clipped), catch swallows, `tap({x:1,y:1})` dispatched at 00:14:50, then `channel_bookmark.type.link` polled every ~0.5s for 20s — never found, no error alert (afterEach probes clean). Corner tap on a clipped button misses the RN press target; the corner-tap was itself the prior dodge for this class. |